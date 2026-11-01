import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lineTotal, total, issues, RATES, type Job } from '../lib/pricing.ts';
test('exact widths, every rate, no half-meter rounding', () => { assert.equal(lineTotal('243',250),607.5); assert.equal(lineTotal('243',350),850.5); assert.equal(lineTotal('243',550),1336.5); });
const job: Job = { id:'1',number:'Q-1',customer:'Ahmed',phone:'',notes:'',status:'Draft',updatedAt:'',rates:{...RATES},windows:[{id:'1',room:'Lounge',width:'240',height:'400',style:'Wavy',confirmed:true}] };
test('height has no effect, including above 320cm',()=>{ assert.equal(total(job),840); assert.equal(total({...job,windows:[{...job.windows[0],height:'250'}]}),840); });
test('approval requires measurements and confirmation',()=>{ assert.deepEqual(issues(job),[]); assert.ok(issues({...job,windows:[{...job.windows[0],confirmed:false,width:'0'}]}).length===2); });
test('invalid widths cannot create invalid totals',()=>{ for(const width of ['-1','NaN','Infinity','']) assert.equal(lineTotal(width,350),0); });

test('half cents use exact decimal rounding consistently with PostgreSQL',()=>{assert.equal(lineTotal('0.35',350),1.23);assert.equal(lineTotal('243.0001',350),850.5);});
