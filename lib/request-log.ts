// Log timing and stage only: never credentials, descriptions, audio or customer data.
export function requestLog(route:'extract'|'transcribe'){
 const requestId=crypto.randomUUID(),started=Date.now();let stage='start',stageStarted=started;
 return {
  stage(next:string){const now=Date.now();console.info('assistant.stage',{requestId,route,stage,durationMs:now-stageStarted});stage=next;stageStarted=now;},
  complete(status:number){console.info('assistant.complete',{requestId,route,stage,status,durationMs:Date.now()-started});},
  failure(error:unknown){console.error('assistant.failure',{requestId,route,stage,durationMs:Date.now()-started,kind:error instanceof Error?error.name:'Unknown',status:typeof error==='object'&&error&&'status' in error?error.status:undefined});},
 };
}
