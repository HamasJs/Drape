import { readJobs } from '../../../lib/job-repository.ts';
import { requireAccount } from '../../../lib/access.ts';
import { AssistantError, errorResponse } from '../../../lib/assistant-server.ts';
export async function GET(request:Request){try{
 const {db,user}=await requireAccount(request);
 const [quotes,profile]=await Promise.all([readJobs(db),db.from('profiles').select('data').eq('owner_id',user.id).maybeSingle()]);
 if(profile.error)throw new AssistantError('Export is unavailable. Please try again.',503);
 return new Response(JSON.stringify({exportedAt:new Date().toISOString(),email:user.email,profile:profile.data?.data||{},jobs:quotes},null,2),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="drape-account-export.json"','Cache-Control':'private, no-store'}});
}catch(e){return errorResponse(e);}}
