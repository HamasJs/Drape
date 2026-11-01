import type { Job, Style, WindowItem } from './pricing.ts';
export type ExtractedWindow = { room: string; widthCm: number | null; heightCm: number | null; style: Style | null };
export type Extraction = { customer: string; phone: string; notes: string; windows: ExtractedWindow[]; warnings: string[] };
export const MAX_DESCRIPTION = 8000;
export const MAX_AUDIO_BYTES = 3 * 1024 * 1024;
export const AUDIO_TYPES = ['audio/webm','audio/mp4','audio/ogg','audio/wav','audio/mpeg'];
const stringField = { type: 'string' };
export const extractionSchema = {
  type:'object', additionalProperties:false,
  properties:{customer:stringField,phone:stringField,notes:stringField,windows:{type:'array',items:{type:'object',additionalProperties:false,properties:{room:stringField,widthCm:{type:['number','null']},heightCm:{type:['number','null']},style:{type:['string','null'],enum:['American','Wavy','Double',null]}},required:['room','widthCm','heightCm','style']}},warnings:{type:'array',items:stringField}},
  required:['customer','phone','notes','windows','warnings'],
};
export function validateExtraction(value: unknown): Extraction {
  if(!value || typeof value!=='object') throw new Error('Invalid extraction response.');
  const v=value as Record<string,unknown>;
  if(!['customer','phone','notes'].every(k=>typeof v[k]==='string'&&(v[k] as string).length<=8000)||!Array.isArray(v.warnings)||v.warnings.length>100||!v.warnings.every(x=>typeof x==='string'&&x.length<=2000)||!Array.isArray(v.windows)||v.windows.length>50) throw new Error('Invalid extraction response.');
  const windows=v.windows.map((raw:unknown)=>{
    if(!raw||typeof raw!=='object') throw new Error('Invalid window.');
    const w=raw as Record<string,unknown>;
    if(typeof w.room!=='string'||w.room.length>500||!['American','Wavy','Double',null].includes(w.style as string|null)) throw new Error('Invalid window.');
    for(const k of ['widthCm','heightCm']) if(w[k]!==null && (typeof w[k]!=='number'||!Number.isFinite(w[k])||(w[k] as number)<=0||(w[k] as number)>100000)) throw new Error('Invalid measurement.');
    // Copy only allowed fields: model output cannot carry prices or approvals.
    return {room:w.room,widthCm:w.widthCm,heightCm:w.heightCm,style:w.style} as ExtractedWindow;
  });
  return {customer:v.customer as string,phone:v.phone as string,notes:v.notes as string,windows,warnings:[...v.warnings] as string[]};
}
export function reviewIssues(data: Extraction): string[] {
  const result=[...data.warnings];
  if(!data.customer.trim()) result.push('Customer name is missing.');
  if(!data.windows.length) result.push('No confirmed window count was extracted. Add windows manually or clarify the description.');
  data.windows.forEach((w,i)=>{if(!w.room.trim())result.push(`Window ${i+1}: room is missing.`);if(w.widthCm===null)result.push(`Window ${i+1}: width is missing or ambiguous.`);if(w.heightCm===null)result.push(`Window ${i+1}: height is missing or ambiguous.`);if(!w.style)result.push(`Window ${i+1}: choose a curtain style before applying.`);});
  return [...new Set(result)];
}
export function applyExtraction(job: Job, data: Extraction, mode: 'append'|'replace'): Job {
  const clean=validateExtraction(data);
  if(clean.windows.some(w=>!w.style)) throw new Error('Choose a style for each extracted window first.');
  const windows:WindowItem[]=clean.windows.map(w=>({id:crypto.randomUUID(),room:w.room,width:w.widthCm===null?'':String(w.widthCm),height:w.heightCm===null?'':String(w.heightCm),style:w.style!,confirmed:false}));
  return {...job,customer:clean.customer.trim()||job.customer,phone:clean.phone.trim()||job.phone,notes:[job.notes,clean.notes].filter(Boolean).join('\n'),windows:mode==='append'?[...job.windows,...windows]:windows,status:'Draft'};
}
