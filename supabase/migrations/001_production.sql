begin;
create table public.profiles (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null,
 updated_at timestamptz not null default now(),
 check (jsonb_typeof(data)='object' and length(data::text)<=12000
   and coalesce(jsonb_typeof(data->'businessName'),'')='string' and length(btrim(data->>'businessName')) between 1 and 150
   and coalesce(jsonb_typeof(data->'contact'),'')='string' and length(data->>'contact')<=200
   and coalesce(jsonb_typeof(data->'address'),'')='string' and length(data->>'address')<=400
   and coalesce(jsonb_typeof(data->'terms'),'')='string' and length(data->>'terms')<=2000)
);
create table public.quotes (
 id uuid primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 payload jsonb not null,
 total_sar numeric(18,2) not null default 0,
 version integer not null default 1,
 updated_at timestamptz not null default now(),
 created_at timestamptz not null default now()
);
create index quotes_owner_updated on public.quotes(owner_id,updated_at desc);
create table public.quote_revisions (
 quote_id uuid not null references public.quotes(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 version integer not null,
 payload jsonb not null,
 total_sar numeric(18,2) not null,
 created_at timestamptz not null default now(),
 primary key(quote_id,version)
);
create index revisions_owner on public.quote_revisions(owner_id,quote_id);
create index revisions_owner_time on public.quote_revisions(owner_id,created_at);
create table public.ai_usage (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 day_start date not null,
 day_count integer not null default 0,
 minute_start timestamptz not null,
 minute_count integer not null default 0
);
create table public.ai_daily_budget (
 day_start date primary key,
 request_count integer not null default 0
);
alter table public.ai_daily_budget enable row level security;
revoke all on public.ai_daily_budget from anon,authenticated;
alter table public.profiles enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_revisions enable row level security;
alter table public.ai_usage enable row level security;
create policy profiles_owner on public.profiles for all to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id);
create policy quotes_owner on public.quotes for select to authenticated using ((select auth.uid())=owner_id);
create policy revisions_owner on public.quote_revisions for select to authenticated using ((select auth.uid())=owner_id);
create policy usage_owner on public.ai_usage for select to authenticated using ((select auth.uid())=owner_id);
revoke all on public.profiles,public.quotes,public.quote_revisions,public.ai_usage from anon,authenticated;
grant select,insert,update on public.profiles to authenticated;
grant select on public.quotes,public.quote_revisions,public.ai_usage to authenticated;

create function public.consume_ai_quota() returns boolean
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); current_day date:=(now() at time zone 'UTC')::date; current_minute timestamptz:=date_trunc('minute',now()); usage public.ai_usage;
begin
 if uid is null then raise exception 'unauthorized'; end if;
 perform pg_advisory_xact_lock(hashtext(uid::text));
 insert into public.ai_usage(owner_id,day_start,minute_start) values(uid,current_day,current_minute) on conflict do nothing;
 select * into usage from public.ai_usage where owner_id=uid for update;
 if usage.day_start<>current_day then usage.day_count:=0; end if;
 if usage.minute_start<>current_minute then usage.minute_count:=0; end if;
 if usage.day_count>=100 or usage.minute_count>=10 then return false; end if;
 insert into public.ai_daily_budget(day_start) values(current_day) on conflict do nothing;
 perform 1 from public.ai_daily_budget where day_start=current_day for update;
 if (select request_count from public.ai_daily_budget where day_start=current_day)>=1000 then return false; end if;
 update public.ai_daily_budget set request_count=request_count+1 where day_start=current_day;
 update public.ai_usage set day_start=current_day,day_count=usage.day_count+1,minute_start=current_minute,minute_count=usage.minute_count+1 where owner_id=uid;
 return true;
end $$;

create function public.save_quote(p_job jsonb,p_expected_version integer default 0) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); qid uuid; previous public.quotes; item jsonb; dimension text; amount numeric:=0; rate numeric; canonical jsonb; new_version integer; existing_count integer;
begin
 if uid is null then raise exception 'unauthorized'; end if;
 if p_expected_version is null or p_expected_version<0 then raise exception 'invalid version'; end if;
 if length(p_job::text)>100000 or jsonb_typeof(p_job)<>'object' then raise exception 'invalid quotation'; end if;
 if coalesce(p_job->>'status','') not in ('Draft','Approved') or coalesce(jsonb_typeof(p_job->'windows'),'')<>'array' then raise exception 'invalid quotation'; end if;
 if coalesce(jsonb_typeof(p_job->'customer'),'')<>'string' or length(p_job->>'customer')>200 or coalesce(jsonb_typeof(p_job->'phone'),'')<>'string' or length(p_job->>'phone')>50 or coalesce(jsonb_typeof(p_job->'notes'),'')<>'string' or length(p_job->>'notes')>4000 then raise exception 'invalid fields'; end if;
 if jsonb_array_length(p_job->'windows')>50 then raise exception 'too many windows'; end if;
 qid:=(p_job->>'id')::uuid;
 if qid is null then raise exception 'invalid id'; end if;
 perform pg_advisory_xact_lock(hashtext(uid::text));
 select * into previous from public.quotes where id=qid for update;
 if found then
  if previous.owner_id<>uid then raise exception 'quotation unavailable'; end if;
  if previous.version<>p_expected_version then raise exception 'version conflict'; end if;
  if previous.version>=1000 then raise exception 'revision limit reached'; end if;
  new_version:=previous.version+1;
 else
  if p_expected_version<>0 then raise exception 'version conflict'; end if;
  select count(*) into existing_count from public.quotes where owner_id=uid;
  if existing_count>=5000 then raise exception 'quotation limit reached'; end if;
  new_version:=1;
 end if;
 if (select count(*) from public.quote_revisions where owner_id=uid and created_at>=now()-interval '1 minute')>=30 or (select count(*) from public.quote_revisions where owner_id=uid and created_at>=(now() at time zone 'UTC')::date)>=500 then raise exception 'save limit reached'; end if;
 if p_job->>'status'='Approved' and (length(btrim(p_job->>'customer'))=0 or jsonb_array_length(p_job->'windows')=0) then raise exception 'missing details'; end if;
 for item in select value from jsonb_array_elements(p_job->'windows') loop
  if coalesce(item->>'style','') not in ('American','Wavy','Double') or coalesce(jsonb_typeof(item->'room'),'')<>'string' or length(item->>'room')>200 or coalesce(jsonb_typeof(item->'confirmed'),'')<>'boolean' or coalesce(item->>'id','')='' then raise exception 'invalid window'; end if;
  perform (item->>'id')::uuid;
  foreach dimension in array array['width','height'] loop
   if coalesce(jsonb_typeof(item->dimension),'')<>'string' then raise exception 'invalid measurement'; end if;
   if item->>dimension<>'' and (item->>dimension !~ '^[0-9]+(\.[0-9]{1,4})?$' or (item->>dimension)::numeric<=0 or (item->>dimension)::numeric>100000) then raise exception 'invalid measurement'; end if;
  end loop;
  if p_job->>'status'='Approved' and (length(btrim(item->>'room'))=0 or item->>'width'='' or item->>'height'='' or item->>'confirmed'<>'true') then raise exception 'unconfirmed measurements'; end if;
  rate:=case item->>'style' when 'American' then 250 when 'Wavy' then 350 else 550 end;
  amount:=amount+round(coalesce(nullif(item->>'width','')::numeric,0)*rate/100,2);
 end loop;
 if (select count(distinct value->>'id') from jsonb_array_elements(p_job->'windows'))<>jsonb_array_length(p_job->'windows') then raise exception 'duplicate windows'; end if;
 canonical:=jsonb_build_object('branding',coalesce((select data from public.profiles where owner_id=uid),jsonb_build_object('businessName','Drape Studio','contact','','address','','terms','')),'id',qid,'number',coalesce(previous.payload->>'number','QT-'||upper(replace(qid::text,'-',''))),'customer',btrim(p_job->>'customer'),'phone',btrim(p_job->>'phone'),'notes',btrim(p_job->>'notes'),'windows',p_job->'windows','status',p_job->>'status','rates',jsonb_build_object('American',250,'Wavy',350,'Double',550),'updatedAt',now(),'version',new_version);
 -- New IDs use plain INSERT: a concurrent cross-owner ID collision must fail,
 -- never turn into an upsert that could overwrite somebody else's payload.
 if previous.id is null then
  insert into public.quotes(id,owner_id,payload,total_sar,version) values(qid,uid,canonical,amount,new_version);
 else
  update public.quotes set payload=canonical,total_sar=amount,version=new_version,updated_at=now() where id=qid and owner_id=uid;
 end if;
 insert into public.quote_revisions(quote_id,owner_id,version,payload,total_sar) values(qid,uid,new_version,canonical,amount);
 return canonical;
end $$;
revoke all on function public.consume_ai_quota() from public,anon;
revoke all on function public.save_quote(jsonb,integer) from public,anon;
grant execute on function public.consume_ai_quota() to authenticated;
grant execute on function public.save_quote(jsonb,integer) to authenticated;
commit;
