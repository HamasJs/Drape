import { requireAccount } from '../../../../../lib/access.ts';
import { AssistantError, errorResponse } from '../../../../../lib/assistant-server.ts';
import { privateJson } from '../../../../../lib/http.ts';
import { UUID } from '../../../../../lib/job-validation.ts';
export async function GET(request:Request,context:{params:Promise<{id:string}>}){try{
 const {db}=await requireAccount(request);const {id}=await context.params;if(!UUID.test(id))throw new AssistantError('Invalid quotation ID.');
 const {data,error}=await db.from('quote_revisions').select('payload,version,created_at,total_sar').eq('quote_id',id).order('version',{ascending:false}).limit(100);
 if(error)throw new AssistantError('History could not be loaded.',503);
 return privateJson({revisions:data});
}catch(e){return errorResponse(e);}}
