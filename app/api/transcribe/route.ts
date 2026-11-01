import { requestLog } from '../../../lib/request-log.ts';
import { transcribeAudio } from '../../../lib/transcribe-service.ts';
import { requireAccount, authorizeAI } from '../../../lib/access.ts';
import { limitedForm } from '../../../lib/http.ts';
import { AUDIO_TYPES, MAX_AUDIO_BYTES } from '../../../lib/extraction.ts';
import { AssistantError, errorResponse, guardRequest, apiKey } from '../../../lib/assistant-server.ts';
export const runtime='nodejs';
export const maxDuration=90;
export async function POST(request:Request){const log=requestLog('transcribe');try{
 guardRequest(request);
 if(Number(request.headers.get('content-length'))>MAX_AUDIO_BYTES+100000)throw new AssistantError('Recording is too large. Keep audio under 3 MB.',413);
 log.stage('authentication');const account=await requireAccount(request);log.stage('input');apiKey();const form=await limitedForm(request,MAX_AUDIO_BYTES+100000);const audio=form.get('audio');
 if(!(audio instanceof File)||!audio.size)throw new AssistantError('No audio was recorded. Please try again.');
 if(audio.size>MAX_AUDIO_BYTES)throw new AssistantError('Recording is too large. Keep audio under 3 MB.',413);
 const mime=audio.type.split(';')[0];if(!AUDIO_TYPES.includes(mime))throw new AssistantError('Unsupported recording format. Try another browser.',415);
 log.stage('quota');await authorizeAI(request,account);log.stage('gemini');
 const text=await transcribeAudio(audio);log.complete(200);return Response.json({text});
}catch(error){log.failure(error);return errorResponse(error);}}
