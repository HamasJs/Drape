begin;
-- Revision payloads remain unchanged. Current quotes receive a short reference; original IDs are retained.
create function public.valid_shop_pricing(p jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare key text; value numeric;
begin
 if p ? 'rates' then
  if jsonb_typeof(p->'rates')<>'object' then return false; end if;
  foreach key in array array['American','Wavy','Double'] loop
   if coalesce(jsonb_typeof(p->'rates'->key),'')<>'number' then return false; end if;
   value:=(p->'rates'->>key)::numeric;
   if value<=0 or value>100000 or round(value,2)<>value then return false; end if;
  end loop;
 end if;
 foreach key in array array['priceNote','installation','delivery','otherCharges'] loop
  if p ? key and (jsonb_typeof(p->key)<>'string' or length(p->>key)>400) then return false; end if;
 end loop;
 return true;
end $$;
alter table public.profiles add constraint profiles_shop_pricing check(public.valid_shop_pricing(data));
create table public.quote_counters (
 owner_id uuid not null references auth.users(id) on delete cascade,
 year integer not null,
 sequence integer not null check(sequence > 0),
 primary key(owner_id,year)
);
alter table public.quote_counters enable row level security;
revoke all on public.quote_counters from anon,authenticated;
-- Allocate references chronologically per shop/year, preserving original numbers for audit.
do $$
declare q record; seq integer; yr integer;
begin
 for q in select id,owner_id,created_at from public.quotes order by created_at,id loop
  yr:=extract(year from q.created_at at time zone 'Asia/Riyadh');
  insert into public.quote_counters(owner_id,year,sequence) values(q.owner_id,yr,1)
  on conflict(owner_id,year) do update set sequence=public.quote_counters.sequence+1 returning sequence into seq;
  update public.quotes set payload=payload||jsonb_build_object('legacyNumber',payload->>'number','number','QT-'||yr::text||'-'||lpad(seq::text,greatest(4,length(seq::text)),'0')) where id=q.id;
 end loop;
end $$;
create or replace function public.save_quote(p_job jsonb,p_expected_version integer default 0) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); qid uuid; previous public.quotes; item jsonb; dimension text; amount numeric:=0; rate numeric; canonical jsonb; new_version integer; existing_count integer; pricing jsonb; branding jsonb; reference text; seq integer; quote_year integer:=extract(year from now() at time zone 'Asia/Riyadh');
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
 branding:=coalesce(previous.payload->'branding',(select data from public.profiles where owner_id=uid),jsonb_build_object('businessName','Drape Studio','contact','','address','','terms',''));
 pricing:=coalesce(previous.payload->'rates',branding->'rates',pricing);
 for reference in select unnest(array['American','Wavy','Double']) loop
  if coalesce(jsonb_typeof(pricing->reference),'')<>'number' then raise exception 'invalid shop rates'; end if;
  rate:=(pricing->>reference)::numeric;
  if rate<=0 or rate>100000 or round(rate,2)<>rate then raise exception 'invalid shop rates'; end if;
 end loop;
 reference:=previous.payload->>'number';
 if previous.id is null then
  insert into public.quote_counters(owner_id,year,sequence) values(uid,quote_year,1)
  on conflict(owner_id,year) do update set sequence=public.quote_counters.sequence+1 returning sequence into seq;
  reference:='QT-'||quote_year::text||'-'||lpad(seq::text,greatest(4,length(seq::text)),'0');
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
  rate:=(pricing->>(item->>'style'))::numeric;
  amount:=amount+round(coalesce(nullif(item->>'width','')::numeric,0)*rate/100,2);
 end loop;
 if (select count(distinct value->>'id') from jsonb_array_elements(p_job->'windows'))<>jsonb_array_length(p_job->'windows') then raise exception 'duplicate windows'; end if;
 canonical:=jsonb_build_object('branding',branding,'id',qid,'number',reference,'legacyNumber',previous.payload->>'legacyNumber','customer',btrim(p_job->>'customer'),'phone',btrim(p_job->>'phone'),'notes',btrim(p_job->>'notes'),'windows',p_job->'windows','status',p_job->>'status','rates',pricing,'updatedAt',now(),'version',new_version);
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
commit;
