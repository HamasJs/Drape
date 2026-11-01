import { requireAccount } from '../../../lib/access.ts';
import { AssistantError, errorResponse, guardRequest } from '../../../lib/assistant-server.ts';
import { limitedJson, privateJson } from '../../../lib/http.ts';
import { DEFAULT_PROFILE, validateProfile } from '../../../lib/job-validation.ts';
export async function GET(request:Request){try{
 const {db,user}=await requireAccount(request);const {data,error}=await db.from('profiles').select('data').eq('owner_id',user.id).maybeSingle();
 if(error)throw new AssistantError('Business profile could not be loaded.',503);return privateJson({profile:data?.data||DEFAULT_PROFILE});
}catch(e){return errorResponse(e);}}
export async function PUT(request:Request){try{
 guardRequest(request);const {db,user}=await requireAccount(request);let profile;
 try{profile=validateProfile(await limitedJson(request,16000));}catch(e){if(e instanceof AssistantError)throw e;throw new AssistantError(e instanceof Error?e.message:'Invalid profile.');}
 const {error}=await db.from('profiles').upsert({owner_id:user.id,data:profile,updated_at:new Date().toISOString()});
 if(error)throw new AssistantError('Business profile could not be saved.',503);return privateJson({profile});
}catch(e){return errorResponse(e);}}
