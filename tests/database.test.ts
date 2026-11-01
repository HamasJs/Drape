import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const ownerA='11111111-1111-4111-8111-111111111111',ownerB='22222222-2222-4222-8222-222222222222';
test('PostgreSQL migration: account isolation, immutable pricing, approvals, history and quotas',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon; insert into auth.users values('${ownerA}'),('${ownerB}');`);
 await db.exec(await readFile(new URL('../supabase/migrations/001_production.sql',import.meta.url),'utf8'));
 async function user(id:string){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
 await user(ownerA);
 const id=crypto.randomUUID();const job={id,customer:'Ahmed',phone:'',notes:'',status:'Approved',rates:{Wavy:1},windows:[{id:crypto.randomUUID(),room:'Lounge',width:'243',height:'400',style:'Wavy',confirmed:true}]};
 const result=await db.query<{job:{version:number;rates:{Wavy:number};number:string}}>('select public.save_quote($1::jsonb,0) as job',[JSON.stringify(job)]);
 assert.equal(result.rows[0].job.version,1);assert.equal(result.rows[0].job.rates.Wavy,350);
 assert.equal((await db.query<{total_sar:string}>('select total_sar from public.quotes')).rows[0].total_sar,'850.50');
 await assert.rejects(()=>db.query('select public.save_quote($1::jsonb,0)',[JSON.stringify(job)]),/version conflict/);
 await assert.rejects(()=>db.query('select public.save_quote($1::jsonb,null)',[JSON.stringify(job)]),/invalid version/);
 await db.query('select public.save_quote($1::jsonb,1)',[JSON.stringify({...job,status:'Draft'})]);
 assert.equal((await db.query('select * from public.quote_revisions')).rows.length,2);
 await assert.rejects(()=>db.exec('update public.quotes set total_sar=1'),/permission denied/);
 await assert.rejects(()=>db.query('select public.save_quote($1::jsonb,2)',[JSON.stringify({...job,windows:[{...job.windows[0],confirmed:false}]})]),/unconfirmed/);
 await db.query('insert into public.profiles(owner_id,data) values($1,$2)',[ownerA,JSON.stringify({businessName:'A only',contact:'',address:'',terms:''})]);
 await user(ownerB);
 assert.equal((await db.query('select * from public.quotes')).rows.length,0);
 assert.equal((await db.query('select * from public.quote_revisions')).rows.length,0);
 assert.equal((await db.query('select * from public.profiles')).rows.length,0);
 await assert.rejects(()=>db.query('select public.save_quote($1::jsonb,2)',[JSON.stringify(job)]),/unavailable/);
 await assert.rejects(()=>db.query('insert into public.profiles(owner_id,data) values($1,$2)',[ownerA,'{}']),/row-level security/);
 for(let i=0;i<10;i++)assert.equal((await db.query<{ok:boolean}>('select public.consume_ai_quota() as ok')).rows[0].ok,true);
 assert.equal((await db.query<{ok:boolean}>('select public.consume_ai_quota() as ok')).rows[0].ok,false);
 await db.exec('reset role');await db.exec("update public.ai_daily_budget set request_count=1000");await user(ownerA);
 assert.equal((await db.query<{ok:boolean}>('select public.consume_ai_quota() as ok')).rows[0].ok,false);
 await db.exec('reset role; set role anon');
 await assert.rejects(()=>db.query('select public.save_quote($1::jsonb,0)',[JSON.stringify({...job,id:crypto.randomUUID()})]),/permission denied/);
 await assert.rejects(()=>db.query('select public.consume_ai_quota()'),/permission denied/);
 await assert.rejects(()=>db.exec('select * from public.quotes'),/permission denied/);
 }finally{await db.close();}
});
