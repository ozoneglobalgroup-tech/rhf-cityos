// RHF ACOS v1.3.3: low-impact, human-authorized, cancellable internal follow-up task.
// Never writes original case, work-order, payroll, procurement, finance or capacity records.
export const ACTION_KIND='CASE_FOLLOWUP';
export const ACTION_PARTS=Object.freeze(['agent-followups']);
export const WRITE_ROLES=Object.freeze(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR']);
export const REVIEW_ROLES=Object.freeze(['MUNICIPAL_ADMIN']);
export const READ_ROLES=Object.freeze([...WRITE_ROLES,'AUDITOR']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const validId=v=>typeof v==='string'&&UUID.test(v);
function text(v,min,max,label){if(typeof v!=='string'||v.trim().length<min||v.trim().length>max)throw Error('INVALID_'+label);return v.trim();}
export function validateProposal(b){
 if(!b||typeof b!=='object'||Array.isArray(b)||!validId(b.caseId)||!validId(b.requestKey)||b.kind!==ACTION_KIND)throw Error('INVALID_PROPOSAL');
 return {caseId:b.caseId,requestKey:b.requestKey,kind:ACTION_KIND,note:text(b.note,12,600,'NOTE')};
}
export function validateDecision(b){
 if(!b||typeof b!=='object'||Array.isArray(b)||!['AUTHORIZE','REJECT','EXECUTE','CANCEL'].includes(b.action))throw Error('INVALID_ACTION');
 return {action:b.action,note:text(b.note,8,500,'REVIEW_NOTE')};
}
export function allowedTransition(old,action,role,actor){
 if(!READ_ROLES.includes(role))throw Error('ROLE_DENIED');
 if(action==='AUTHORIZE'||action==='REJECT'){
   if(!REVIEW_ROLES.includes(role))throw Error('REVIEW_ROLE_DENIED');
   if(old.created_by===actor)throw Error('SELF_APPROVAL_DENIED');
   if(old.status!=='PROPOSED')throw Error('INVALID_STATE');
   return action==='AUTHORIZE'?'AUTHORIZED':'REJECTED';
 }
 if(action==='EXECUTE'){
   if(!WRITE_ROLES.includes(role))throw Error('EXECUTE_ROLE_DENIED');
   if(old.status!=='AUTHORIZED'||!old.approved_by||old.approved_by===old.created_by)throw Error('INVALID_STATE');
   return 'EXECUTED';
 }
 if(action==='CANCEL'){
   if(!REVIEW_ROLES.includes(role))throw Error('CANCEL_ROLE_DENIED');
   if(!['PROPOSED','AUTHORIZED','EXECUTED'].includes(old.status))throw Error('INVALID_STATE');
   return 'CANCELLED';
 }
 throw Error('ACTION_DENIED');
}
export function safeRecord(x){return {
 id:x.id,caseId:x.case_id,caseSummary:x.case_summary||null,kind:x.kind,note:x.note,status:x.status,
 requestKey:x.request_key,createdBy:x.created_by,approvedBy:x.approved_by,executedBy:x.executed_by,cancelledBy:x.cancelled_by,
 reviewNote:x.review_note,executionNote:x.execution_note,cancelNote:x.cancel_note,
 createdAt:x.created_at,approvedAt:x.approved_at,executedAt:x.executed_at,cancelledAt:x.cancelled_at
};}
