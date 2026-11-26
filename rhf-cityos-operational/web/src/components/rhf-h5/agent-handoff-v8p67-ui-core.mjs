// Browser-side contract checks. All authorization remains on the server.
export const HANDOFF_UI_VERSION='RHF-GOVERNED-AGENT-HANDOFF-UI-V8P6.7';
export const HANDOFF_API_VERSION='RHF-GOVERNED-EVIDENCE-HANDOFF-V8P6.7';
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(x);
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export const STATES=Object.freeze({PROPOSED:'در انتظار بررسی مستقل',AUTHORIZED:'تأیید انسانی ثبت شده',REJECTED:'رد شده',WITHDRAWN:'پس گرفته شده'});
export function validateHandoffCapabilities(v,city){
 if(!v||v.version!==HANDOFF_API_VERSION||v.scope!==city||!uuid(v.scope)||!['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR','AUDITOR'].includes(v.role)||v.mode!=='HUMAN_GOVERNED_READ_ONLY_ANALYSIS'||v.municipalDispatch!==false||v.financeWrites!==0||v.publicValueVerified!==false||v.independentReview!==true||v.temporalReleaseAfterAuthorization!==true)return null;
 return v;
}
export function validateMissionList(v,city){
 if(!v||v.scope!==city||!Array.isArray(v.rows)||v.rows.length>100||v.partial!==false&&v.partial!==true)return null;
 if(!v.rows.every(m=>m&&uuid(m.id)&&uuid(m.caseId)&&uuid(m.createdBy)&&sha(m.evidenceSha256)&&['PROPOSED','AUTHORIZED','REJECTED','WITHDRAWN'].includes(m.status)&&Number.isSafeInteger(m.version)&&m.version>=1&&m.dispatched===false&&m.modelInvoked===false&&m.verifiedPublicValue===false))return null;
 if(new Set(v.rows.map(x=>x.id)).size!==v.rows.length)return null;
 return v;
}
export function validateCreatedHandoff(v,city,requestKey){
 if(!v||v.version!==HANDOFF_API_VERSION||v.scope!==city||v.mission?.requestKey!==requestKey||!uuid(v.mission?.id)||v.mission?.status!=='PROPOSED'||v.mission?.version!==1||v.findingBound!==true||v.evidenceBound!==true||v.independentHumanReviewRequired!==true||v.temporalStartRequested!==false||v.temporalReleaseRequested!==false||v.municipalDispatch!==false||v.financeWrites!==0||v.verifiedPublicValue!==false)return null;
 return v;
}
export function validateMissionDecision(v,city,missionId,expected){
 if(!v||v.scope!==city||v.mission?.id!==missionId||v.mission?.status!==expected||v.mission?.dispatched!==false||v.affectedOperationalRecords!==0)return null;
 return v;
}
export function validateTemporalState(v,city,missionId){
 if(!v||v.scope!==city||v.missionId!==missionId||typeof v.workflowId!=='string'||!v.workflowId.startsWith('rhf-v52-')||v.engine!=='TEMPORAL_TS_1_25_0'||v.municipalDispatch!==false||v.modelInvoked!==false||v.verifiedPublicValue!==false||v.autoWrites!==0||!['AWAITING_HUMAN_AUTHORIZATION','AUTHORIZED_FOR_READ_ONLY','ANALYZING','COMPLETED','FAILED','EXPIRED','UNAVAILABLE'].includes(v.phase))return null;
 return v;
}
export function handoffSummary({cityName,finding,mission,temporal}){
 return [`RHF City OS V8P6.7 — Governed Review`, `Municipality: ${cityName||'current'}`,`Case: ${finding?.caseId||mission?.caseId||'unknown'}`,`Finding: ${finding?.id||'not selected'}`,`Source SHA256: ${finding?.evidenceFingerprint||mission?.evidenceSha256||'unknown'}`,`Mission: ${mission?.id||'not created'}`,`Mission state: ${mission?.status||'not created'}`,`Temporal: ${temporal?.phase||'not verified'}`,'Independent human review is required. Temporal workflow is READ-ONLY analysis; no dispatch, payment, or verified public value.'].join('\n');
}
