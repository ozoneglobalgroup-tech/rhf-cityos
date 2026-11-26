/** P1.4C: fail-closed route contract. Not mounted in the RUVOS server.
 * Security boundary: principal MUST be constructed server-side from an authenticated
 * RUVOS user/session. No JSON body or AI response may supply this object.
 * This wrapper only queues an intent; an independently authenticated worker
 * is responsible for dispatching it through the database contract.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class AgenticBoundaryError extends Error {
  constructor(code){super(code);this.code=code;this.name='AgenticBoundaryError';}
}
function deny(code){ throw new AgenticBoundaryError(code); }
const PLAN_ROLES = new Set(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR']);
const REVIEW_ROLES = new Set(['MUNICIPAL_ADMIN']);
const ALLOWED = new Set(['PROPOSE','AUTHORIZE','REJECT','CANCEL','QUEUE']);
export function validateAgenticRequest({principal, action, cityId, body, serverFeatureEnabled=false}) {
  // A different, independently verified service identity is needed for WORKER_DISPATCH.
  if(serverFeatureEnabled!==true)deny('AGENTIC_FEATURE_DISABLED');
  if(!principal || principal.origin!=='RUVOS_VERIFIED_SESSION' || principal.isModelOutput===true ||
     !UUID.test(principal.actorId||'') || !UUID.test(principal.tenantId||'') ||
     !UUID.test(principal.municipalityId||'') || principal.municipalityId!==cityId)
    deny('RUVOS_SESSION_OR_SCOPE_DENIED');
  if(!ALLOWED.has(action))deny('ACTION_NOT_ALLOWED');
  if(!body || typeof body!=='object' || Array.isArray(body) || !UUID.test(body.intentId||''))deny('INVALID_INTENT');
  if(action==='PROPOSE' && !PLAN_ROLES.has(principal.role))deny('PROPOSER_ROLE_DENIED');
  if(['AUTHORIZE','REJECT','CANCEL','QUEUE'].includes(action) && !REVIEW_ROLES.has(principal.role))deny('REVIEWER_ROLE_DENIED');
  // Proposer identity must come from the locked DB intent row, not HTTP body.
  // A model, gateway caller, or external client NEVER provides approvedBy, fingerprint,
  // capacity provenance, or lease. These must be read under DB locks and independently rechecked.
  const forbidden=['tenantId','municipalityId','proposerId','approvedBy','servicePrincipal','leaseOwner',
    'workerId','fingerprint','status','capacityVerified','approvedPayloadSha256'];
  if(forbidden.some(k => Object.hasOwn(body,k)))deny('UNTRUSTED_CONTROL_FIELD');
  return Object.freeze({action,intentId:body.intentId,actorId:principal.actorId,
    cityId:principal.municipalityId,tenantId:principal.tenantId,role:principal.role});
}

/** Pure read-only contract diagnostics. A PASS here is NOT live API integration. */
export function stagingCapabilities({schemaCloned=false,rlsEnforced=false,missionDedup=false,apiMounted=false,workerAuthenticated=false}){
  return Object.freeze({
    schemaReady: schemaCloned && rlsEnforced && missionDedup,
    agenticDispatchEnabled: schemaCloned && rlsEnforced && missionDedup && apiMounted && workerAuthenticated,
    claimedRuvosIntegration: apiMounted && workerAuthenticated,
  });
}
