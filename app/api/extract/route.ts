import { extractRequirements } from '../../../lib/extract-service.ts';
import { requireAccount, authorizeAI } from '../../../lib/access.ts';
import { limitedJson } from '../../../lib/http.ts';
import { MAX_DESCRIPTION } from '../../../lib/extraction.ts';
import { AssistantError, errorResponse, guardRequest, apiKey } from '../../../lib/assistant-server.ts';
export const runtime='nodejs';
export async function POST(request:Request){try{
  guardRequest(request);
  if(Number(request.headers.get('content-length'))>40000)throw new AssistantError('Description is too long.',413);
  const account=await requireAccount(request);
  const body=await limitedJson(request,40000) as {text?:unknown};
  if(typeof body?.text!=='string'||!body.text.trim()||body.text.length>MAX_DESCRIPTION)throw new AssistantError(`Enter a description of 1–${MAX_DESCRIPTION} characters.`);
  apiKey();await authorizeAI(request,account);
  return Response.json({extraction:await extractRequirements(body.text)});
}catch(error){return errorResponse(error);}}
