/** V4: client-side presentation gates. Server remains authority for tenant, role, RLS and audit. */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ELIGIBLE=new Set(['RECEIVED','TRIAGED','ASSIGNED','IN_PROGRESS','AWAITING_ACCEPTANCE']);
const ROLES=new Set(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR']);
const intentSet=new Set(['CAPACITY_OPPORTUNITY']);
export function runnableCases(rows,city){
 if(!Array.isArray(rows)||typeof city!=='string'||!UUID.test(city))return [];
 return rows.filter(x=>x&&typeof x==='object'&&!Array.isArray(x)&&UUID.test(x.id||'')&&ELIGIBLE.has(x.status)&&
 (!x.municipality_id||x.municipality_id===city)&&(!x.municipalityId||x.municipalityId===city))
 .map(x=>({id:x.id,summary:typeof x.summary==='string'?x.summary.slice(0,180):'پرونده',status:x.status,
  priority:typeof x.priority==='string'?x.priority:'',dueAt:x.due_at||null,unitId:x.unit_id||null}))
 .slice(0,100);
}
export function canSubmitGovernedAction(access){return !!access?.canWrite && ROLES.has(access?.role)}
export function validBoundedPlan(response,caseId){
 if(!response||response.caseId!==caseId||response.autoWrites!==0||
 !Array.isArray(response.steps)||!Array.isArray(response.facts)||!Array.isArray(response.toolTrace))throw Error('UNTRUSTED_AGENT_RESPONSE');
 return {caseId,steps:response.steps.slice(0,6),facts:response.facts.slice(0,14),toolTrace:response.toolTrace.slice(0,8),
  next:response.next||null,hasVerifiedPublicValue:response.hasVerifiedPublicValue===true,modelUsed:response.modelUsed===true,autoWrites:0};
}
export function makeGovernedNote(record,plan){
 if(!record||!UUID.test(record.id||'')||!plan||plan.caseId!==record.id)throw Error('PLAN_CASE_MISMATCH');
 const next=plan.next||{};
 const label=typeof next.label==='string'?next.label.slice(0,90):'بررسی شواهد و اقدام مجاز بعدی';
 const reason=typeof next.reason==='string'?next.reason.slice(0,180):'تکمیل شواهد و ارجاع به مسئول';
 const base=`${label}: ${reason}. ارجاع برای بررسی مستقل؛ بدون تخصیص، پرداخت یا منفعت تأییدشده.`;
 const note=`A01 V4 | پرونده ${record.id} | ${base}`.slice(0,600);
 if(note.length<12)throw Error('INVALID_FOLLOWUP_NOTE');
 return note;
}
export function agentRunIntent(value){return intentSet.has(value)?value:'CAPACITY_OPPORTUNITY'}
