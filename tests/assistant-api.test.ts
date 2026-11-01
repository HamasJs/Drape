import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POST as extract } from '../app/api/extract/route.ts';
import { geminiText, guardRequest } from '../lib/assistant-server.ts';
import { POST as transcribe } from '../app/api/transcribe/route.ts';
const headers={'origin':'http://localhost:3000','x-quote-assistant':'1','content-type':'application/json'};
const req=(body:unknown,extra={})=>new Request('http://localhost:3000/api/extract',{method:'POST',headers:{...headers,...extra},body:JSON.stringify(body)});
const data={customer:'Ahmed',phone:'',notes:'',windows:[{room:'Lounge',widthCm:243,heightCm:400,style:'Wavy'}],warnings:[]};
test('assistant endpoints validate requests and handle providers without live calls',async()=>{
 const oldKey=process.env.GEMINI_API_KEY;const oldFetch=globalThis.fetch;
 try{
 delete process.env.GEMINI_API_KEY;
 assert.equal((await extract(req({text:'A curtain'}))).status,503);
 assert.equal((await extract(req({text:''}))).status,400);
 assert.equal((await extract(req({text:'x'.repeat(8001)}))).status,400);
 assert.equal((await extract(req({text:'hello'},{origin:'https://other.example'}))).status,403);
 assert.equal((await extract(new Request('http://localhost:3000/api/extract',{method:'POST',body:'{}'}))).status,403);
 process.env.GEMINI_API_KEY='test-key-not-real';
 globalThis.fetch=async(_url,options)=>{const body=JSON.parse(options?.body as string);assert.ok(String(_url).startsWith('https://generativelanguage.googleapis.com/v1beta/models/'));assert.equal((options?.headers as Record<string,string>)['x-goog-api-key'],'test-key-not-real');assert.equal(body.generationConfig.responseMimeType,'application/json');assert.equal(body.generationConfig.responseJsonSchema.additionalProperties,false);return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(data)}]}}]});};
 const result=await extract(req({text:'Ahmed has one Lounge window 2.43 m wide, 4 m high. Wavy.'}));assert.equal(result.status,200);assert.deepEqual((await result.json()).extraction,data);
 globalThis.fetch=async()=>Response.json({promptFeedback:{blockReason:'SAFETY'}});assert.equal((await extract(req({text:'test'}))).status,422);
 globalThis.fetch=async()=>Response.json({}, {status:429});assert.equal((await extract(req({text:'test'}))).status,429);
 const audioRequest=(type:string,size=32)=>{const form=new FormData();form.set('audio',new File([new Uint8Array(size)],'clip',{type}));return new Request('http://localhost:3000/api/transcribe',{method:'POST',headers:{origin:'http://localhost:3000','x-quote-assistant':'1'},body:form});};
 assert.equal((await transcribe(audioRequest('text/plain'))).status,415);
 assert.equal((await transcribe(audioRequest('audio/webm',0))).status,400);
 globalThis.fetch=async(_url,options)=>{const body=JSON.parse(options?.body as string);const audio=body.contents[0].parts[1].inlineData;assert.equal(audio.mimeType,'audio/webm');assert.equal(Buffer.from(audio.data,'base64').length,32);return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({text:'Ahmed needs a Wavy curtain.'})}]}}]});};
 const transcript=await transcribe(audioRequest('audio/webm;codecs=opus'));assert.equal(transcript.status,200);assert.equal((await transcript.json()).text,'Ahmed needs a Wavy curtain.');
 globalThis.fetch=async()=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({text:'  '})}]}}]});assert.equal((await transcribe(audioRequest('audio/webm'))).status,422);
 }finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;}
});

test('Gemini response parsing rejects incomplete results and excludes thinking',()=>{
 assert.throws(()=>geminiText({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'partial'}]}}]}));
 assert.throws(()=>geminiText({promptFeedback:{blockReason:'SAFETY'}}));
 assert.throws(()=>geminiText({}));
 assert.equal(geminiText({candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'private reasoning'},{text:'result'}]}}]}),'result');
});

test('origin guard accepts local aliases but rejects external origins and different ports',()=>{
 const local=(origin:string)=>new Request('http://localhost:3000/api/extract',{method:'POST',headers:{origin,'x-quote-assistant':'1'}});
 for(const origin of ['http://localhost:3000','http://127.0.0.1:3000','http://[::1]:3000'])assert.doesNotThrow(()=>guardRequest(local(origin)));
 for(const origin of ['http://127.0.0.1:3001','https://localhost:3000','https://other.example','http://localhost.evil.example:3000','null'])assert.throws(()=>guardRequest(local(origin)));
 assert.throws(()=>guardRequest(new Request('http://localhost:3000/api/extract',{method:'POST',headers:{origin:'http://127.0.0.1:3000'}})));
});
