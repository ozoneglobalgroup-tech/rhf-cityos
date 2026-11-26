// RHF City OS V8P6.7 — provenance-fenced handoff from an explainable finding
// to the existing durable, independently reviewed mission ledger. No dispatch.
import {createHash} from 'node:crypto';
import {MISSION_OBJECTIVES,validUUID,missionPublicRow} from './agent-mission-core.mjs';
import {classifyEvidence,SOURCE} from './agent-specialist-core.mjs';
export const HANDOFF_VERSION='RHF-GOVERNED-EVIDENCE-HANDOFF-V8P6.7';
export const HANDOFF_PARTS=Object.freeze(['agent-governed-handoffs']);
export const HANDOFF_OBJECTIVE='NEXT_SAFE_ACTION';
export const HANDOFF_ROLES=Object.freeze(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR']);
export const HANDOFF_VIEW_ROLES=Object.freeze([...HANDOFF_ROLES,'AUDITOR']);
export const HANDOFF_CODES=Object.freeze(['NO_WORK_ORDER_LINK','ACTIVE_CONTRACT_LINK_GAP','INSPECTION_PASS_NOT_CURRENT','VALUE_VERIFICATION_GAP']);
const isHash=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const noteOk=x=>typeof x==='string'&&x.trim().length>=12&&x.trim().length<=450&&!/[\x00-\x1f\x7f<>]/.test(x);
function exact(value,keys){return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&Object.keys(value).every(k=>keys.includes(k));}
export function validateHandoffCreate(b){
 const keys=['caseId','evidenceFingerprint','findingId','note','requestKey'];
 if(!exact(b,keys)||!validUUID(b.caseId)||!validUUID(b.requestKey)||!isHash(b.evidenceFingerprint)||!noteOk(b.note)||typeof b.findingId!=='string')throw Error('HANDOFF_INVALID_INPUT');
 const [caseId,code,...extra]=b.findingId.split(':');
 if(extra.length||caseId!==b.caseId||!HANDOFF_CODES.includes(code))throw Error('HANDOFF_FINDING_ID_INVALID');
 return Object.freeze({caseId:b.caseId,requestKey:b.requestKey,findingId:b.findingId,code,evidenceFingerprint:b.evidenceFingerprint,note:b.note.trim(),objective:HANDOFF_OBJECTIVE});
}
export function validateHandoffEvidence(b,{source,tools},sha=(v)=>createHash('sha256').update(v).digest('hex')){
 if(!b||!source||source.case?.id!==b.caseId||!source.execution||!source.finance||!source.value||!Array.isArray(tools)||tools.length!==4||new Set(tools).size!==4)throw Error('HANDOFF_EVIDENCE_INCOMPLETE');
 const allowed=['read_service_case','read_execution_evidence','read_finance_evidence','read_value_capacity_evidence'];
 if(tools.some(t=>!allowed.includes(t)))throw Error('HANDOFF_TOOL_NOT_ALLOWED');
 const fingerprint=sha(JSON.stringify(source));
 if(fingerprint!==b.evidenceFingerprint)throw Error('HANDOFF_EVIDENCE_STALE');
 const match=classifyEvidence(b.caseId,source).find(f=>f.id===b.findingId&&f.code===b.code&&f.source===SOURCE&&f.requiresHuman===true&&f.municipalActionExecuted===false);
 if(!match)throw Error('HANDOFF_FINDING_NO_LONGER_SUPPORTED');
 return Object.freeze({fingerprint,code:b.code,findingId:b.findingId,objective:HANDOFF_OBJECTIVE,note:`[RHF V8P6.7 ${b.code}] ${b.note}`});
}
export function handoffPublic(m,scope,idempotent){
 return {version:HANDOFF_VERSION,scope,mission:missionPublicRow(m),findingBound:true,evidenceBound:true,idempotent:idempotent===true,independentHumanReviewRequired:true,temporalStartRequested:false,temporalReleaseRequested:false,municipalDispatch:false,financeWrites:0,verifiedPublicValue:false};
}
export function handoffCapabilities(scope,role,counts){
 if(!validUUID(scope)||!HANDOFF_VIEW_ROLES.includes(role))throw Error('HANDOFF_SCOPE_INVALID');
 return {version:HANDOFF_VERSION,scope,role,mode:'HUMAN_GOVERNED_READ_ONLY_ANALYSIS',allowedFindings:HANDOFF_CODES,proposalRoles:HANDOFF_ROLES,missionReviewRole:'MUNICIPAL_ADMIN',independentReview:true,temporalReleaseAfterAuthorization:true,municipalDispatch:false,financeWrites:0,publicValueVerified:false,counts,notice:'ثبت پیشنهاد و اجرای تحلیل فقط‌خواندنی به منزله دستور عملیاتی شهرداری یا اثبات نتیجه نیست.'};
}
