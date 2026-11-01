import { isSavedJob, issues, RATES, total, type Job } from './pricing.ts';
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validateJob(input:unknown):Job {
 if(!isSavedJob(input)||!UUID.test(input.id))throw new Error('Invalid quotation.');
 if(input.customer.length>200||input.phone.length>50||input.notes.length>4000||input.number.length>80||input.windows.length>50)throw new Error('Quotation exceeds the allowed field or window limits.');
 const ids=new Set<string>();
 for(const w of input.windows){
  if(!UUID.test(w.id)||ids.has(w.id)||w.room.length>200)throw new Error('Invalid or duplicate window.');ids.add(w.id);
  for(const measure of [w.width,w.height])if(measure!==''&&(!/^\d+(\.\d{1,4})?$/.test(measure)||Number(measure)<=0||Number(measure)>100000))throw new Error('Measurements must be positive centimeters with up to four decimal places.');
 }
 // Discard client rates and metadata. Approved prices come from this rate list.
 const job:Job={id:input.id,number:'',customer:input.customer.trim(),phone:input.phone.trim(),notes:input.notes.trim(),windows:input.windows.map(w=>({...w})),status:input.status,updatedAt:new Date().toISOString(),rates:{...RATES},version:input.version};
 if(job.status==='Approved'){const missing=issues(job);if(missing.length)throw new Error(missing.join(' '));}
 if(!Number.isFinite(total(job)))throw new Error('Invalid quotation total.');
 return job;
}
export type Profile={businessName:string;contact:string;address:string;terms:string};
export const DEFAULT_PROFILE:Profile={businessName:'Drape Studio',contact:'',address:'',terms:''};
export function validateProfile(input:unknown):Profile {
 const p=input as Profile;
 if(!p||typeof p!=='object'||typeof p.businessName!=='string'||!p.businessName.trim()||p.businessName.length>150||typeof p.contact!=='string'||p.contact.length>200||typeof p.address!=='string'||p.address.length>400||typeof p.terms!=='string'||p.terms.length>2000)throw new Error('Enter a business name and keep the profile fields within their limits.');
 return {businessName:p.businessName.trim(),contact:p.contact.trim(),address:p.address.trim(),terms:p.terms.trim()};
}
