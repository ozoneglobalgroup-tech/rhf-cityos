// RHF V8P3.9. No synthetic dossiers are accepted as operational service cases.
// Connects the existing, scoped RUVOS agent-plan + agent-followups contracts.
export const AGENT_BRIDGE_VERSION='RHF-GOVERNED-AGENT-BRIDGE-V8P3.9';
export const MODEL_REQUIRES_OPT_IN=true;
export const NO_AUTONOMOUS_DISPATCH=true;
export const NO_VERIFIED_PUBLIC_VALUE=true;
export const NO_NEW_DB_SCHEMA=true;
export const AGENT_INTENTS=Object.freeze([
 ['NEXT_SAFE_ACTION','گام مجاز بعدی'],
 ['CAPACITY_OPPORTUNITY','بررسی ظرفیت و نیاز'],
 ['FINANCIAL_CONTROL','کنترل زنجیره مالی']
]);
export const TOOL_NAMES=Object.freeze(['read_service_case','read_execution_evidence','read_finance_evidence','read_value_capacity_evidence']);
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RUN_ROLES=new Set(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR']);
const VIEW_ROLES=new Set([...RUN_ROLES,'AUDITOR']);
export function validId(x){return typeof x==='string'&&ID.test(x)};
export function verifyServerStatus(x){
 if(!x||typeof x!=='object'||x.mode!=='BOUNDED_READ_ONLY'||x.autoWrite!==false||x.externalConsentRequired!==true||x.maxTools!==4||typeof x.modelEnabled!=='boolean'||!VIEW_ROLES.has(x.role)||typeof x.municipality!=='string'||!x.municipality.trim())return null;
 return Object.freeze({role:x.role,modelEnabled:x.modelEnabled,municipality:x.municipality,mode:x.mode});
}
export function scopedServiceCases(x){
 if(!Array.isArray(x)||x.length>300)return null;
 const ids=new Set();const out=[];
 for(const c of x){if(!c||!validId(c.id)||typeof c.summary!=='string'||!c.summary.trim()||typeof c.status!=='string'||c.status.length>40||ids.has(c.id))return null;
  ids.add(c.id);out.push({id:c.id,summary:c.summary.slice(0,250),status:c.status,priority:typeof c.priority==='string'?c.priority.slice(0,30):'—'});
 }
 return out;
}
export function planRequest({caseId,intent,useModel=false,consent=false,role,status}){
 if(!RUN_ROLES.has(role)||!validId(caseId)||!AGENT_INTENTS.some(x=>x[0]===intent)||typeof useModel!=='boolean'||typeof consent!=='boolean'||useModel&&(!consent||status?.modelEnabled!==true))return null;
 return {caseId,intent,useModel,externalConsent:useModel&&consent};
}
export function verifyPlan(x,{caseId,intent,useModel=false}){
 if(!x||x.caseId!==caseId||x.intent!==intent||x.autoWrites!==0||typeof x.modelUsed!=='boolean'||x.modelUsed&&!useModel||!Array.isArray(x.toolTrace)||x.toolTrace.length!==4||new Set(x.toolTrace).size!==4||x.toolTrace.some(t=>!TOOL_NAMES.includes(t))||!Array.isArray(x.steps)||x.steps.length>4||!Array.isArray(x.facts)||x.facts.length>30||x.hasVerifiedPublicValue!==false&&x.hasVerifiedPublicValue!==true)return null;
 if(x.steps.some(s=>!s||s.requiresHuman!==true||typeof s.label!=='string'||typeof s.reason!=='string'||typeof s.where!=='string'))return null;
 if(x.facts.some(f=>!f||typeof f.label!=='string'||!['string','number'].includes(typeof f.value)))return null;
 if(x.modelComment!==null&&x.modelComment!==undefined&&typeof x.modelComment!=='string')return null;
 return {caseId,intent,steps:x.steps,facts:x.facts,toolTrace:x.toolTrace,modelUsed:x.modelUsed,modelStatus:x.modelStatus,modelComment:x.modelComment||'',hasVerifiedPublicValue:x.hasVerifiedPublicValue,notices:Array.isArray(x.notices)?x.notices.filter(t=>typeof t==='string').slice(0,4):[]};
}
export function makeInternalFollowup(plan){
 if(!plan||!validId(plan.caseId)||!plan.steps?.length)return null;
 const s=plan.steps[0];if(typeof s.label!=='string'||typeof s.reason!=='string')return null;
 const text=`پیگیری داخلی پس از تحلیل محدود پرونده ${plan.caseId}: ${s.label}. نیازمند بررسی شواهد و تأیید مستقل؛ بدون اجرای میدانی یا اثبات ارزش عمومی.`;
 return text.slice(0,600);
}
const STATES=new Set(['PROPOSED','AUTHORIZED','EXECUTED','REJECTED','CANCELLED']);
export function verifyFollowups(x){
 if(!x||!Array.isArray(x.rows)||x.rows.length>50||typeof x.scope!=='string'||!validId(x.scope))return null;
 const out=[];const ids=new Set();for(const r of x.rows){if(!r||!validId(r.id)||!validId(r.caseId)||!validId(r.createdBy)||!STATES.has(r.status)||typeof r.note!=='string'||ids.has(r.id))return null;ids.add(r.id);out.push({id:r.id,caseId:r.caseId,caseSummary:typeof r.caseSummary==='string'?r.caseSummary.slice(0,250):null,status:r.status,note:r.note.slice(0,600),createdBy:r.createdBy,approvedBy:r.approvedBy||null});}
 return out;
}
export function mayDecide(action,role,row,actorId){
 if(!row||!STATES.has(row.status))return false;
 if(['AUTHORIZE','REJECT'].includes(action))return role==='MUNICIPAL_ADMIN'&&row.status==='PROPOSED'&&(!validId(actorId)||row.createdBy!==actorId);
 if(action==='CANCEL')return role==='MUNICIPAL_ADMIN'&&['PROPOSED','AUTHORIZED','EXECUTED'].includes(row.status);
 if(action==='EXECUTE')return RUN_ROLES.has(role)&&row.status==='AUTHORIZED'&&validId(row.approvedBy)&&row.approvedBy!==row.createdBy;
 return false;
}
export function verifyAudit(x){
 if(!x||!Array.isArray(x.rows)||x.rows.length>30)return null;
 return x.rows.filter(r=>r&&typeof r.event==='string'&&r.details&&typeof r.details==='object').map(r=>({id:r.id,event:r.event,createdAt:r.created_at,intent:r.details.intent||'—',tools:Array.isArray(r.details.toolNames)?r.details.toolNames.length:0}));
}
