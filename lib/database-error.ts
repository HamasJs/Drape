import { AssistantError } from './assistant-server.ts';
export function databaseError(error:{code?:string},fallback:string):AssistantError{
 console.error('Database request failed',{code:error.code||'unknown'});
 if(['PGRST205','42P01','PGRST202'].includes(error.code||''))return new AssistantError('Database setup is incomplete. Ask the owner to apply the Supabase migration in docs/PRODUCTION.md.',503);
 if(['PGRST204','42703'].includes(error.code||''))return new AssistantError('The database schema is out of date. Ask the owner to check the production migration.',503);
 if(error.code==='42501')return new AssistantError('Database permissions are not configured correctly. Ask the owner to check the Supabase migration.',503);
 return new AssistantError(fallback,503);
}
