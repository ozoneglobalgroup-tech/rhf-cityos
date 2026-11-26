/**
 * P1.3 bounded contract for a future RUVOS scoped transactional executor.
 * NOT attached to routes or network; txRunner + tx are trusted server adapters.
 * This function has NO database connectivity, creates NO real missions itself.
 * Atomicity, RLS, SQL permission checks and true concurrency must be proven
 * against a cloned PostgreSQL database before enabling a worker.
 */
import {fingerprint} from './mission-intent.mjs';
const ACTIVE_CASE_STATES=new Set(['ASSIGNED','IN_PROGRESS']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class MissionGateError extends Error {
 constructor(code){super(code);this.name='MissionGateError';this.code=code;}
}
const stop=code=>{throw new MissionGateError(code);};
const same=(a,b)=>String(a)===String(b);
function assertScope(x, principal) {
 if(!x||!same(x.tenantId,principal.tenantId)||!same(x.municipalityId,principal.municipalityId))stop('SCOPE_DENIED');
}
function assertServerPrincipal(principal){
 // Markers here are contract guards, NOT actual authentication. The caller MUST
 // construct the principal from a validated session/service identity.
 if(!principal||principal.serverAuthenticated!==true||principal.principalType!=='SERVICE'||principal.allowMissionExecution!==true||
    !UUID.test(String(principal.tenantId))||!UUID.test(String(principal.municipalityId))||
    !UUID.test(String(principal.actorId))||!principal.jobId||typeof principal.jobId!=='string')stop('SERVICE_PRINCIPAL_REQUIRED');
}
/** Runs under one RUVOS withScope+BEGIN transaction with exact city context.
 * txRunner is responsible for commit/rollback and row locks. Contract calls:
 * lockIntent, lockOutbox, findMissionByIntent, lockCase, readFreshCapacity,
 * createMission, completeIntent, completeOutbox, writeAudit.
 */
export async function executeAuthorizedMission({principal,intentId,txRunner,now=new Date().toISOString()}){
 assertServerPrincipal(principal);
 if(!UUID.test(String(intentId)))stop('INVALID_INTENT_ID');
 if(!Number.isFinite(Date.parse(now)))stop('INVALID_CLOCK');
 if(typeof txRunner!=='function')stop('TRUSTED_TRANSACTION_RUNNER_REQUIRED');
 return txRunner(principal,async tx=>{
   const intent=await tx.lockIntent(intentId);
   if(!intent)stop('INTENT_NOT_FOUND');
   assertScope(intent,principal);
   const outbox=await tx.lockOutbox(intent.id);
   if(!outbox)stop('OUTBOX_NOT_FOUND');
   assertScope(outbox,principal);
   if(!same(outbox.intentId,intent.id))stop('OUTBOX_BINDING_MISMATCH');
   // Replays are read-only receipts; never use a duplicate worker to dispatch.
   if(intent.status==='EXECUTED'){
     if(outbox.status!=='COMPLETED'||!UUID.test(String(intent.missionId)))stop('INCONSISTENT_RECEIPT');
     const previous=await tx.findMissionByIntent(intent.id);
     if(!previous||!same(previous.id,intent.missionId)||!same(previous.caseId,intent.caseId))stop('INCONSISTENT_RECEIPT');
     assertScope(previous,principal);
     return {status:'REPLAY',missionId:previous.id,created:false};
   }
   if(intent.status!=='QUEUED'||outbox.status!=='CLAIMED')stop('NOT_READY_FOR_DISPATCH');
   if(!same(outbox.leaseOwner,principal.jobId)||!(Date.parse(outbox.leaseExpiresAt)>Date.parse(now)))stop('INVALID_LEASE');
   // The staged persistent outbox has a monotonically increasing fencing token.
   // A previous worker with the same jobId but an older token must fail closed.
   if(outbox.leaseGeneration!==undefined && outbox.leaseGeneration!==null &&
      (!Number.isSafeInteger(principal.leaseGeneration)||principal.leaseGeneration<1||
       principal.leaseGeneration!==outbox.leaseGeneration))stop('FENCING_TOKEN_INVALID');
   if(!intent.immutable||!same(fingerprint(intent.immutable),intent.fingerprint)||!same(intent.immutable.fingerprint??intent.fingerprint,intent.fingerprint))stop('INTENT_FINGERPRINT_INVALID');
   if(intent.immutable.status!=='PROPOSED'||intent.immutable.action!=='ruvos.mission.create'||!same(intent.immutable.caseId,intent.caseId))stop('INTENT_PAYLOAD_INVALID');
   if(!same(intent.immutable.tenantId,intent.tenantId)||!same(intent.immutable.municipalityId,intent.municipalityId)||!same(intent.immutable.proposedBy,intent.proposedBy))stop('INTENT_PAYLOAD_INVALID');
   if(!intent.approval||intent.approval.origin!=='TRUSTED_DB_ROW'||!same(intent.approval.actorId,intent.approvedBy)||same(intent.approvedBy,intent.proposedBy)||
      intent.approval.role!=='MUNICIPAL_ADMIN'||!same(intent.approval.fingerprint,intent.fingerprint)||
      intent.approval.revoked===true||!(Date.parse(intent.approval.expiresAt)>Date.parse(now)))stop('APPROVAL_INVALID');
   const currentCase=await tx.lockCase(intent.caseId);
   if(!currentCase)stop('CASE_NOT_FOUND');
   assertScope(currentCase,principal);
   if(!ACTIVE_CASE_STATES.has(currentCase.status))stop('CASE_NOT_EXECUTABLE');
   if(!intent.immutable.caseVersion||!same(currentCase.updatedAt,intent.immutable.caseVersion))stop('CASE_VERSION_CONFLICT');
   const capacity=await tx.readFreshCapacity(intent.immutable.capacityBinding.capacityId);
   if(!capacity)stop('CAPACITY_NOT_FOUND');
   assertScope(capacity,principal);
   if(capacity.origin!=='TRUSTED_DB_QUERY'||capacity.authorized!==true||capacity.verified!==true||capacity.qualified!==true||
      !(capacity.availableUnits>=intent.immutable.capacityBinding.requiredUnits)||
      !(Date.parse(capacity.validUntil)>Date.parse(now))||
      !same(capacity.evidenceRef,intent.immutable.capacityBinding.evidenceRef))stop('CAPACITY_STALE_OR_UNVERIFIED');
   const existing=await tx.findMissionByIntent(intent.id);
   if(existing)stop('RECEIPT_STATE_CONFLICT');
   const mission=await tx.createMission({
      tenantId:intent.tenantId,municipalityId:intent.municipalityId,
      caseId:intent.caseId,avosIntentId:intent.id,
      title:intent.immutable.payload.title,assignee:intent.immutable.payload.assignee,
      status:'PLANNED'
   });
   if(!mission||!UUID.test(String(mission.id)))stop('MISSION_INSERT_INVALID');
   assertScope(mission,principal);
   if(!same(mission.avosIntentId,intent.id)||!same(mission.caseId,intent.caseId))stop('MISSION_RECEIPT_INVALID');
   await tx.completeIntent(intent.id,mission.id);
   await tx.completeOutbox(outbox.id,mission.id);
   await tx.writeAudit({kind:'AVOS_AGENT_MISSION',entityId:mission.id,event:'MISSION_CREATED',actorId:principal.actorId,intentId:intent.id,requestKey:intent.immutable.requestKey});
   return {status:'COMPLETED',missionId:mission.id,created:true};
 });
}
