import { AssistantError } from './assistant-server.ts';
export function privateJson(body:unknown,status=200){return Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});}
export async function limitedJson(request:Request,limit=100000):Promise<unknown>{
 if(Number(request.headers.get('content-length'))>limit)throw new AssistantError('Request is too large.',413);
 const reader=request.body?.getReader();if(!reader)throw new AssistantError('Request body is required.');
 let size=0;const chunks:Uint8Array[]=[];
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new AssistantError('Request is too large.',413);}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let position=0;for(const c of chunks){bytes.set(c,position);position+=c.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new AssistantError('Request must be valid JSON.');}
}
export async function limitedForm(request:Request,limit:number){
 if(Number(request.headers.get('content-length'))>limit)throw new AssistantError('Recording is too large.',413);
 const reader=request.body?.getReader();if(!reader)throw new AssistantError('Audio is required.');
 let size=0;const chunks:Uint8Array[]=[];
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new AssistantError('Recording is too large.',413);}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let position=0;for(const c of chunks){bytes.set(c,position);position+=c.length;}
 try{return await new Response(bytes,{headers:{'Content-Type':request.headers.get('content-type')||''}}).formData();}catch{throw new AssistantError('Invalid audio upload.');}
}
