import { readJobs } from '../../../lib/job-repository.ts';
import { requireAccount } from '../../../lib/access.ts';
import { AssistantError, errorResponse, guardRequest } from '../../../lib/assistant-server.ts';
import { limitedJson, privateJson } from '../../../lib/http.ts';
import { validateJob } from '../../../lib/job-validation.ts';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{
 const {db}=await requireAccount(request);
 return privateJson({jobs:await readJobs(db)});
}catch(e){return errorResponse(e);}}
export async function POST(request:Request){try{
 guardRequest(request);const {db}=await requireAccount(request);
 let job;try{job=validateJob(await limitedJson(request));}catch(e){if(e instanceof AssistantError)throw e;throw new AssistantError(e instanceof Error?e.message:'Invalid quotation.');}
 const expected=job.version??0;
 if(!Number.isInteger(expected)||expected<0)throw new AssistantError('Invalid quotation version.');
 const {data,error}=await db.rpc('save_quote',{p_job:job,p_expected_version:expected});
 if(error){if(error.message.includes('limit reached'))throw new AssistantError('Save limit reached. Please try again later or contact support.',429);if(error.message.includes('version conflict'))throw new AssistantError('This quote changed in another tab. Reopen the saved quote before saving again. Your current edits are still on screen.',409);console.error('Quotation save failed',{code:error.code});throw new AssistantError('Quotation could not be saved. Please retry or reload your saved jobs.',503);}
 return privateJson({job:data});
}catch(e){return errorResponse(e);}}
