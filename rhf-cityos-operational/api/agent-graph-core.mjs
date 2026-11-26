// RHF City OS V8P5.1 — bounded graph execution of previously AUTHORIZED missions.
// No generative model, Temporal, external dispatch or municipal mutation.
export const GRAPH_VERSION = 'RHF-AGENT-GRAPH-V8P5.1';
export const GRAPH_PARTS = Object.freeze(['agent-graph-runtime','agent-graph-runs']);
export const GRAPH_ACTORS = Object.freeze(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR']);
export const GRAPH_READERS = Object.freeze([...GRAPH_ACTORS,'AUDITOR']);
export const GRAPH_NODES = Object.freeze(['need_analysis','capacity_assessment','finance_guard','evidence_governance']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isUuid=x=>typeof x==='string'&&UUID.test(x);
export function validateGraphRunRequest(b){
 if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).sort().join(',')!=='acknowledgeReadOnly,missionId,requestKey'||
 !isUuid(b.missionId)||!isUuid(b.requestKey)||b.acknowledgeReadOnly!==true)throw Error('INVALID_GRAPH_REQUEST');
 return {missionId:b.missionId,requestKey:b.requestKey};
}
export function assertAuthorizedGraphMission(m){
 if(!m||m.status!=='AUTHORIZED'||m.version!==2||!isUuid(m.id)||!isUuid(m.case_id)||
 !/^[0-9a-f]{64}$/.test(m.evidence_sha256||'')||!isUuid(m.reviewed_by)||m.reviewed_by===m.created_by){
  throw Error('MISSION_NOT_INDEPENDENTLY_AUTHORIZED');
 }
 return m;
}
export function assertFreshGraphEvidence(m,source,toolNames,sha256){
 if(toolNames?.length!==4||JSON.stringify(toolNames)!==JSON.stringify(['read_service_case','read_execution_evidence','read_finance_evidence','read_value_capacity_evidence']))throw Error('INVALID_GRAPH_TOOL_TRACE');
 const fingerprint=sha256(JSON.stringify(source));
 if(fingerprint!==m.evidence_sha256)throw Error('MISSION_EVIDENCE_CHANGED');
 return fingerprint;
}
export function graphRunPublicRow(r){return {
 id:r.id,missionId:r.mission_id,requestKey:r.request_key,status:r.status,objective:r.objective,
 actorId:r.actor_id,evidenceSha256:r.evidence_sha256,engine:'LANGGRAPH_JS_1_7_2',
 result:r.result||null,trace:r.trace||[],errorCode:r.error_code||null,
 startedAt:r.started_at,finishedAt:r.finished_at||null,scope:r.municipality_id,
 externalModelInvoked:false,autoWrites:0,dispatched:false,verifiedPublicValueCreated:false
};}
export function graphRuntimeStatus(scope,role,counts={}){return {
 version:GRAPH_VERSION,scope,role,graphEngine:'LANGGRAPH_JS_1_7_2',mode:'AUTHORIZED_READ_ONLY_IN_PROCESS',
 nodes:GRAPH_NODES,maxNodes:4,toolAllowlistSize:4,externalModel:'NOT_INVOKED',
 temporal:'NOT_CONNECTED',noMunicipalWrites:true,autoDispatch:false,
 checkpointing:'POSTGRES_FINAL_RUN_LEDGER_ONLY',resumeAfterCrash:'NOT_IMPLEMENTED',counts,
 notices:['مأموریت باید توسط بازبین مستقل مجوز گرفته باشد.','فقط تحلیل چندگرهی LangGraph اجرا می‌شود؛ عملیات شهری یا ارزش عمومی تولید نمی‌شود.']
};}
