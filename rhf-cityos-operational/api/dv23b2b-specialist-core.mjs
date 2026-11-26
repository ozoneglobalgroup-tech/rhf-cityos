/** DV2.3B2B: specialized analytic analysis, human-triggered only; no municipal actions. */
export const SPECIALIST_SCHEMA='RHF-DV23B2B-SPECIALIST-RUNTIME-v1';
export const SPECIALIST_QUEUE='rhf-cityos-governed-v8p52';
export const SPECIALIST_KEYS=Object.freeze(['NEED_ANALYST','CAPACITY_ANALYST','LEGAL_HSE','VALUE_GOVERNANCE']);
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export const isId=x=>typeof x==='string'&&uuid.test(x);
export const isDigest=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
export function parseStart(x){
 if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).sort().join(',')!=='acknowledgeReadOnly,decisionId,handoffFingerprint'||x.acknowledgeReadOnly!==true||!isId(x.decisionId)||!isDigest(x.handoffFingerprint))throw Error('INVALID_HUMAN_ANALYSIS_REQUEST');
 return {decisionId:x.decisionId,handoffFingerprint:x.handoffFingerprint};
}
export function workflowId(tenant,city,decision){
 if(![tenant,city,decision].every(isId))throw Error('INVALID_WORKFLOW_SCOPE');
 return `rhf-dv23b2b-${tenant}-${city}-${decision}`;
}
export function validateWorkerInput(x){
 if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).sort().join(',')!=='actorId,cityId,decisionId,handoffFingerprint,tenantId'||![x.actorId,x.cityId,x.decisionId,x.tenantId].every(isId)||!isDigest(x.handoffFingerprint))throw Error('INVALID_WORKER_SCOPE');
 return x;
}
export const readOnlyAttestation=Object.freeze({
  executionType:'HUMAN_TRIGGERED_ANALYSIS_ONLY',graph:'LANGGRAPH_JS_1_7_2',temporal:'TEMPORAL_TS_1_25_0',
  modelInvoked:false,municipalActionExecuted:false,autoMunicipalWrites:0,valueVerification:'NOT_ATTESTED',
  productionReady:false,needsIndependentVerification:true
});
export function summarizePacket(packet){
 if(!packet||!isId(packet.decisionId)||!isDigest(packet.handoffFingerprint)||!Array.isArray(packet.tasks)||packet.tasks.length!==4||packet.tasks.some((x,i)=>x.key!==SPECIALIST_KEYS[i])||packet.canExecute!==false||packet.verifiedPublicValue!==false)throw Error('INVALID_AGENT_HANDOFF_PACKET');
 const n=packet.evidence?.need,c=packet.evidence?.capacity;
 if(!isId(n?.id)||!isId(c?.id)||!isId(packet.ownerOrgId)||!isDigest(packet.sourceDigest))throw Error('INVALID_AGENT_EVIDENCE');
 if(typeof n.evidenceRef!=='string'||n.evidenceRef.length<12||typeof c.evidenceRef!=='string'||c.evidenceRef.length<12)throw Error('MISSING_SOURCE_EVIDENCE');
 const q=x=>x===null?null:Number(x);
 const nq=q(n.quantity),cq=q(c.quantity);
 if((nq!==null&&!Number.isFinite(nq))||(cq!==null&&!Number.isFinite(cq)))throw Error('INVALID_REPORTED_QUANTITY');
 return Object.freeze({decisionId:packet.decisionId,ownerOrgId:packet.ownerOrgId,sector:packet.sector,sourceDigest:packet.sourceDigest,handoffFingerprint:packet.handoffFingerprint,
  need:{id:n.id,hasEvidence:typeof n.evidenceRef==='string'&&n.evidenceRef.length>=12,quantity:nq,unit:n.unit||null},
  capacity:{id:c.id,hasEvidence:typeof c.evidenceRef==='string'&&c.evidenceRef.length>=12,quantity:cq,unit:c.unit||null},
  missingChecks:[...new Set((packet.mandatoryChecks||[]).filter(x=>typeof x==='string'&&x.length<=60))].slice(0,12)});
}
export function assertResult(result,packet){
 if(!result||result.schema!==SPECIALIST_SCHEMA||result.decisionId!==packet.decisionId||result.handoffFingerprint!==packet.handoffFingerprint||
 !Array.isArray(result.analyses)||result.analyses.length!==4||result.analyses.some((a,i)=>a.key!==SPECIALIST_KEYS[i]||a.status!=='REQUIRES_HUMAN_VALIDATION'||!Array.isArray(a.checks)||a.checks.length>12)||
 result.modelInvoked!==false||result.autoMunicipalWrites!==0||result.municipalActionExecuted!==false||result.verifiedPublicValue!==false||result.canAuthorizeExecution!==false)throw Error('INVALID_SPECIALIST_RESULT');
 if(Buffer.byteLength(JSON.stringify(result))>14000)throw Error('SPECIALIST_RESULT_TOO_LARGE');
 return result;
}
