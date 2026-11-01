export class AssistantError extends Error { status:number; constructor(message:string,status=400){super(message);this.status=status;} }
export function guardRequest(request:Request){
  const origin=request.headers.get('origin');
  if(origin){
    let source:URL;
    try{source=new URL(origin);}catch{throw new AssistantError('Invalid request origin.',403);}
    const target=new URL(request.url);
    // Next.js can normalize a local request URL to localhost even when the
    // browser opened 127.0.0.1. Accept only loopback aliases on the same port.
    const loopback=new Set(['localhost','127.0.0.1','[::1]']);
    const sameLocalOrigin=loopback.has(source.hostname)&&loopback.has(target.hostname)&&source.protocol===target.protocol&&source.port===target.port;
    if(source.origin!==target.origin&&!sameLocalOrigin)throw new AssistantError('This request must come from the quotation app.',403);
  }
  if(request.headers.get('x-quote-assistant')!=='1') throw new AssistantError('Invalid assistant request.',403);
}
export function apiKey(){const key=process.env.GEMINI_API_KEY;if(!key)throw new AssistantError('AI is not configured yet. Add GEMINI_API_KEY to .env.local and restart the app. Manual quoting is still available.',503);return key;}
export function errorResponse(error:unknown){
  if(error instanceof AssistantError)return Response.json({error:error.message},{status:error.status});
  if(error instanceof Error && (error.name==='TimeoutError'||error.name==='AbortError'))return Response.json({error:'The request timed out. Your input is unchanged; please try again.'},{status:504});
  return Response.json({error:'The assistant could not process this request. Your input is unchanged; please try again.'},{status:502});
}
export async function providerFetch(model:string, body:unknown){
  if(!/^[a-zA-Z0-9._-]+$/.test(model))throw new AssistantError('Invalid Gemini model configuration.',503);
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',headers:{'x-goog-api-key':apiKey(),'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
  if(!response.ok){
    if(response.status===429)throw new AssistantError('Gemini is busy or its usage limit was reached. Please try again later.',429);
    if(response.status===401||response.status===403)throw new AssistantError('Gemini credentials need attention. Check GEMINI_API_KEY and model access.',503);
    if(response.status===404)throw new AssistantError('The configured Gemini model is unavailable. Check the model name and account access.',503);
    throw new AssistantError('Gemini could not complete this request. Please try again.',502);
  }
  return response.json();
}
export function geminiText(result:unknown):string {
  const value=result as {promptFeedback?:{blockReason?:string};candidates?:{finishReason?:string;content?:{parts?:{text?:string;thought?:boolean}[]}}[]};
  if(value?.promptFeedback?.blockReason)throw new AssistantError('Gemini could not process this input. Please rephrase or enter the job manually.',422);
  const candidate=value?.candidates?.[0];
  if(candidate?.finishReason!=='STOP')throw new AssistantError('Gemini returned an incomplete or blocked response. Please try a shorter input.',422);
  return (candidate.content?.parts||[]).filter(part=>!part.thought&&typeof part.text==='string').map(part=>part.text).join('');
}
