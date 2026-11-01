import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { validateProfile, DEFAULT_PROFILE } from "../lib/job-validation.ts";
import { quoteStatus } from "../lib/pricing.ts";
test("shop rates, snapshots, short references and migration preserve history", async () => {
 const db = new PGlite();
 try {
 const uid="11111111-1111-4111-8111-111111111111";
 await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon; insert into auth.users values('${uid}');`);
 await db.exec(await readFile(new URL("../supabase/migrations/001_production.sql",import.meta.url),"utf8"));
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);
 const job={id:crypto.randomUUID(),customer:"Sample",phone:"",notes:"",status:"Approved",windows:[{id:crypto.randomUUID(),room:"Lounge",width:"243",height:"400",style:"Wavy",confirmed:true}]};
 const save=async (data:object,version=0)=>(await db.query<{job:any}>("select public.save_quote($1::jsonb,$2) as job",[JSON.stringify(data),version])).rows[0].job;
 const original=await save(job);
 await db.exec(await readFile(new URL("../supabase/migrations/002_shop_pricing.sql",import.meta.url),"utf8"));
 await db.exec("set role authenticated");
 const migrated=(await db.query<{payload:any}>("select payload from public.quotes")).rows[0].payload;
 assert.match(migrated.number,/^QT-\d{4}-0001$/);
 assert.equal(migrated.legacyNumber,original.number);
 assert.equal((await db.query<{payload:any}>("select payload from public.quote_revisions")).rows[0].payload.number,original.number);
 const profile={...DEFAULT_PROFILE,rates:{American:275,Wavy:420.25,Double:600},priceNote:"Delivery quoted separately",delivery:"Excluded"};
 await db.query("insert into public.profiles(owner_id,data) values($1,$2)",[uid,JSON.stringify(profile)]);
 const fresh=await save({...job,id:crypto.randomUUID(),rates:{Wavy:1},branding:{priceNote:"tampered"}});
 assert.match(fresh.number,/^QT-\d{4}-0002$/);
 assert.equal(fresh.rates.Wavy,420.25);
 assert.equal(fresh.branding.delivery,"Excluded");
 assert.equal((await save(job,1)).rates.Wavy,350);
 await db.query("update public.profiles set data=$1",[JSON.stringify({...profile,rates:{American:1,Wavy:999,Double:1},delivery:"Changed"})]);
 await assert.rejects(()=>db.query("update public.profiles set data=$1",[JSON.stringify({...profile,delivery:{invalid:true}})]),/profiles_shop_pricing/);
 const revision=await save({...fresh,rates:{Wavy:1}},1);
 assert.equal(revision.rates.Wavy,420.25); assert.equal(revision.branding.delivery,"Excluded"); assert.equal(revision.number,fresh.number);
 assert.equal(quoteStatus(revision),"Ready to send");
 await assert.rejects(()=>db.query("select * from public.quote_counters"),/permission denied/);
 } finally {await db.close();}
});
test("shop settings validate money and note limits",()=>{
 for(const value of [-1,0,NaN,Infinity,100001,1.001]) assert.throws(()=>validateProfile({...DEFAULT_PROFILE,rates:{American:value,Wavy:350,Double:550}}));
 assert.throws(()=>validateProfile({...DEFAULT_PROFILE,delivery:"x".repeat(401)}));
 assert.equal(validateProfile({...DEFAULT_PROFILE,rates:{American:0.01,Wavy:350.5,Double:550}}).rates?.American,0.01);
});
