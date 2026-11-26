// RHF ACOS V8P5.2 — tenant-bound Temporal admission and human-release contract.
// Temporal is an orchestrator, never an independent municipal authority.
import {GRAPH_ACTORS,isUuid,assertAuthorizedGraphMission} from './agent-graph-core.mjs';
export const TEMPORAL_VERSION='RHF-TEMPORAL-V8P5.2';
export const TEMPORAL_PARTS=Object.freeze(['agent-temporal-runtime','agent-temporal-workflows']);
export const TEMPORAL_QUEUE='rhf-cityos-governed-v8p52';
export const TEMPORAL_ROLES=Object.freeze([...GRAPH_ACTORS,'AUDITOR']);
export const TEMPORAL_OPERATORS=GRAPH_ACTORS;
export const TEMPORAL_TIMEOUT_MS=6000;
export function temporalWorkflowId(tenantId,municipalityId,missionId){
 if(![tenantId,municipalityId,missionId].every(isUuid))throw Error('INVALID_TEMPORAL_SCOPE');
 return `rhf-v52-${tenantId}-${municipalityId}-${missionId}`;
}
export function validateTemporalStart(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='acknowledgeReadOnly,missionId'||value.acknowledgeReadOnly!==true||!isUuid(value.missionId))throw Error('INVALID_START');
 return {missionId:value.missionId};
}
export function validateTemporalRelease(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='acknowledgeReadOnly,action'||value.action!=='RELEASE'||value.acknowledgeReadOnly!==true)throw Error('INVALID_RELEASE');
 return {action:'RELEASE'};
}
export function canStartTemporalMission(m,role){
 return TEMPORAL_OPERATORS.includes(role)&&!!m&&['PROPOSED','AUTHORIZED'].includes(m.status)&&m.version=== (m.status==='PROPOSED'?1:2)&&isUuid(m.id);
}
export function assertTemporalRelease(m,role){
 if(!TEMPORAL_OPERATORS.includes(role))throw Error('OPERATOR_FORBIDDEN');
 assertAuthorizedGraphMission(m);
 return true;
}
export function publicTemporalState({cityId,missionId,workflowId,phase,temporalStatus,runId=null}){
 const safe=['AWAITING_HUMAN_AUTHORIZATION','AUTHORIZED_FOR_READ_ONLY','ANALYZING','COMPLETED','FAILED','EXPIRED','UNAVAILABLE'];
 return {scope:cityId,missionId,workflowId,phase:safe.includes(phase)?phase:'UNAVAILABLE',temporalStatus:temporalStatus||'UNKNOWN',runId,
 engine:'TEMPORAL_TS_1_25_0',modelInvoked:false,municipalDispatch:false,verifiedPublicValue:false,autoWrites:0};
}
