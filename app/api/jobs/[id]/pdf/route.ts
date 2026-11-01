import { requireAccount } from '../../../../../lib/access.ts';
import { AssistantError, errorResponse } from '../../../../../lib/assistant-server.ts';
import { UUID, DEFAULT_PROFILE, type Profile } from '../../../../../lib/job-validation.ts';
import { quotationPdf } from '../../../../../lib/quotation-pdf.ts';
import type { Job } from '../../../../../lib/pricing.ts';
export const runtime='nodejs';
export async function GET(request:Request,context:{params:Promise<{id:string}>}){try{
 const {db}=await requireAccount(request);const {id}=await context.params;if(!UUID.test(id))throw new AssistantError('Invalid quotation ID.');
 const {data,error}=await db.from('quotes').select('payload').eq('id',id).maybeSingle();
 if(error)throw new AssistantError('Quotation could not be loaded.',503);if(!data)throw new AssistantError('Quotation not found.',404);
 const job=data.payload as Job&{branding?:Profile};if(job.status!=='Approved')throw new AssistantError('Approve the quotation before downloading a PDF.',409);
 return new Response(quotationPdf(job,job.branding||DEFAULT_PROFILE),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${job.number}.pdf"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}catch(e){return errorResponse(e);}}
