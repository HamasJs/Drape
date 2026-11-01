import { existsSync } from 'node:fs';
if(existsSync('.env.local'))process.loadEnvFile('.env.local');
const required=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','APP_URL','GEMINI_API_KEY'];
const missing=required.filter(name=>!process.env[name]?.trim());
if(missing.length){console.error('Missing required configuration: '+missing.join(', '));process.exit(1);}
for(const name of ['NEXT_PUBLIC_SUPABASE_URL','APP_URL']){
 try{const value=new URL(process.env[name]);const local=['localhost','127.0.0.1','[::1]'].includes(value.hostname);if(value.protocol!=='https:'&&!(local&&value.protocol==='http:'))throw new Error();if(value.username||value.password||value.search||value.hash||value.pathname!=='/')throw new Error();}catch{console.error(name+' must be a valid origin (HTTPS, or local HTTP), without paths, query strings, or credentials.');process.exit(1);}
}
console.log('Required variables are present. This does not verify credentials, migration, email delivery, backups, or hosted end-to-end behavior.');
