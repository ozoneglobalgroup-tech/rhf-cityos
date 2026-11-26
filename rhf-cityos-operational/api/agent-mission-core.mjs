// RHF City OS V8P5.0 — narrowly-scoped, durable agent mission *proposals*.
// No dispatch, model invocation, external tool execution or public-value verification.
export const MISSION_VERSION='RHF-AGENT-MISSION-LEDGER-V8P5.0';
export const MISSION_PARTS=Object.freeze(['agent-mission-runtime','agent-missions']);
export const MISSION_OBJECTIVES=Object.freeze(['NEXT_SAFE_ACTION','CAPACITY_OPPORTUNITY','FINANCIAL_CONTROL']);
export const MISSION_READ_ROLES=Object.freeze(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR','AUDITOR']);
export const MISSION_CREATE_ROLES=Object.freeze(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR']);
export const MISSION_REVIEW_ROLES=Object.freeze(['MUNICIPAL_ADMIN']);
export const MISSION_STATUSES=Object.freeze(['PROPOSED','AUTHORIZED','REJECTED','WITHDRAWN']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const validUUID=x=>typeof x==='string'&&UUID.test(x);
function cleanText(x,min,max){if(typeof x!=='string'||x.trim().length<min||x.trim().length>max||/[\x00-\x1f<>]/.test(x))throw Error('MISSION_TEXT_INVALID');return x.trim();}
function exactKeys(b,keys){if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).some(k=>!keys.includes(k)))throw Error('MISSION_SHAPE_INVALID');}
export function validateMissionCreate(b){
 exactKeys(b,['requestKey','caseId','objective','note']);
 if(!validUUID(b.requestKey)||!validUUID(b.caseId)||!MISSION_OBJECTIVES.includes(b.objective))throw Error('MISSION_REQUEST_INVALID');
 return {requestKey:b.requestKey,caseId:b.caseId,objective:b.objective,note:cleanText(b.note,12,600)};
}
export function validateMissionDecision(b){
 exactKeys(b,['action','version','note']);
 if(!['AUTHORIZE','REJECT','WITHDRAW'].includes(b.action)||!Number.isSafeInteger(b.version)||b.version<1)throw Error('MISSION_DECISION_INVALID');
 return {action:b.action,version:b.version,note:cleanText(b.note,12,500)};
}
export function nextMissionState(mission,decision,role,actor){
 if(!MISSION_READ_ROLES.includes(role))throw Error('MISSION_ACCESS_DENIED');
 if(mission.version!==decision.version)throw Error('MISSION_VERSION_CONFLICT');
 if(mission.status!=='PROPOSED')throw Error('MISSION_ALREADY_DECIDED');
 if(decision.action==='WITHDRAW'){
  if(mission.created_by!==actor)throw Error('MISSION_WITHDRAW_OWNER_ONLY');
  return 'WITHDRAWN';
 }
 if(!MISSION_REVIEW_ROLES.includes(role))throw Error('MISSION_REVIEW_ROLE_DENIED');
 if(mission.created_by===actor)throw Error('MISSION_SELF_APPROVAL_DENIED');
 return decision.action==='AUTHORIZE'?'AUTHORIZED':'REJECTED';
}
export function sameMissionRequest(mission,draft,actor){
 return mission.created_by===actor&&mission.case_id===draft.caseId&&mission.objective===draft.objective&&mission.note===draft.note;
}
export function missionPublicRow(x){return {
 id:x.id,requestKey:x.request_key,caseId:x.case_id,caseSummary:x.case_summary||null,objective:x.objective,note:x.note,
 status:x.status,version:x.version,createdBy:x.created_by,reviewedBy:x.reviewed_by||null,reviewNote:x.review_note||null,
 evidenceSha256:x.evidence_sha256,toolNames:x.tool_names,createdAt:x.created_at,reviewedAt:x.reviewed_at||null,
 dispatched:false,modelInvoked:false,verifiedPublicValue:false,executionEngine:'NOT_CONNECTED'
};}
export function runtimeStatus(cityId,role,counts={}){return {
 version:MISSION_VERSION,scope:cityId,role,mode:'PERSISTENT_HUMAN_GOVERNED_PROPOSALS',
 postgresLedger:true,rlsRequired:true,appendOnlyEvents:true,independentReviewRequired:true,
 externalModel:'NOT_INVOKED',langGraph:'NOT_CONNECTED',temporal:'NOT_CONNECTED',autoDispatch:false,
 acceptedWork:'NONE',verifiedPublicValue:false,counts,
 notice:'اجازه مأموریت فقط در دفتر مأموریت ثبت می‌شود؛ هیچ فرآیند خودکار یا عملیات میدانی آغاز نمی‌شود.'
};}
