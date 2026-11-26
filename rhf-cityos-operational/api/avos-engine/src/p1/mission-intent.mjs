/**
 * P1.2 mission intent. PURE DOMAIN CODE, NO RUVOS MUTATIONS.
 * A session/Gateway and trusted capacity reader, NEVER a model response,
 * must assemble principal, caseSnapshot and capacitySnapshot inputs.
 * These objects are not authorization evidence when furnished by an end user.
 */
import {randomUUID} from 'node:crypto';
import {sha256} from '../policy.mjs';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REVIEW_ROLES=new Set(['MUNICIPAL_ADMIN']);
const PROPOSAL_ROLES=new Set(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR']);
const EXECUTABLE='ruvos.mission.create';
const BLOCKED_CASE_STATES=new Set(['CLOSED','REJECTED','CANCELLED']);
const KEYS=Object.freeze(['requestKey','tenantId','municipalityId','caseId','proposedBy','agentId','action','payload','capacityBinding','caseVersion','createdAt']);
function ensureUUID(v, code){ if(typeof v!=='string'||!UUID.test(v))throw Error(code); return v; }
function isoTime(v,code){if(typeof v!=='string'||!Number.isFinite(Date.parse(v)))throw Error(code);return v;}
function string(v,min,max,code){if(typeof v!=='string'||v.trim().length<min||v.trim().length>max)throw Error(code);return v.trim();}
function core(x){return Object.fromEntries(KEYS.map(k=>[k,x[k]]));}
export function fingerprint(intent){return sha256(core(intent));}
export function createMissionIntent({principal,caseSnapshot,capacitySnapshot,requiredUnits=1,requestKey,agentId='agent:urban-value',title,assignee='',now=new Date().toISOString()}){
  if(principal?.verifiedByGateway!==true || principal?.isModelOutput===true)throw Error('GATEWAY_PRINCIPAL_REQUIRED');
  if(!PROPOSAL_ROLES.has(principal.role))throw Error('PROPOSAL_ROLE_DENIED');
  const tenantId=ensureUUID(principal.tenantId,'INVALID_TENANT_ID');
  const municipalityId=ensureUUID(principal.municipalityId,'INVALID_MUNICIPALITY_ID');
  const actorId=ensureUUID(principal.actorId,'INVALID_ACTOR_ID');
  ensureUUID(requestKey,'INVALID_REQUEST_KEY');
  isoTime(now,'INVALID_NOW');
  const caseId=ensureUUID(caseSnapshot?.id,'INVALID_CASE_ID');
  if(caseSnapshot.tenantId!==tenantId || caseSnapshot.municipalityId!==municipalityId)throw Error('CROSS_SCOPE_CASE');
  if(BLOCKED_CASE_STATES.has(caseSnapshot.status))throw Error('CASE_NOT_ACTIVE');
  if(!Number.isFinite(requiredUnits)||requiredUnits<=0)throw Error('INVALID_REQUIRED_UNITS');
  const c=capacitySnapshot;
  if(!c || !UUID.test(c.id||'') || c.tenantId!==tenantId || c.municipalityId!==municipalityId)throw Error('CROSS_SCOPE_CAPACITY');
  if(typeof c.availableUnits!=='number'||!Number.isFinite(c.availableUnits)||typeof c.evidenceRef!=='string'||c.evidenceRef.trim().length<6)throw Error('INVALID_CAPACITY_EVIDENCE');
  if(c.verifiedByTrustedReader!==true || c.authorized!==true || c.availabilityVerified!==true || c.safetyQualified!==true || c.availableUnits<requiredUnits || !(Date.parse(c.validUntil)>Date.parse(now)) || !c.evidenceRef)throw Error('UNVERIFIED_OR_UNAVAILABLE_CAPACITY');
  const obj={requestKey,tenantId,municipalityId,caseId,proposedBy:actorId,agentId:string(agentId,4,120,'INVALID_AGENT_ID'),action:EXECUTABLE,payload:{caseId,title:string(title,12,250,'INVALID_MISSION_TITLE'),assignee:string(assignee,0,150,'INVALID_ASSIGNEE')},capacityBinding:{capacityId:c.id,evidenceRef:String(c.evidenceRef),requiredUnits,availableUnits:c.availableUnits,validUntil:c.validUntil},caseVersion:caseSnapshot.updatedAt||null,createdAt:now};
  return Object.freeze({...obj, fingerprint:fingerprint(obj),status:'PROPOSED',dispatchOccurred:false});
}

/** Only a decision to QUEUE. Never grants an HTTP dispatch or executes a mission. */
export function assessMissionQueue({principal,intent,approvals=[],now=new Date().toISOString()}) {
  if(principal?.verifiedByGateway!==true||principal?.tenantId!==intent?.tenantId||principal?.municipalityId!==intent?.municipalityId)return {permit:false,reason:'SCOPE_OR_IDENTITY_DENIED'};
  if(intent?.status!=='PROPOSED'||intent?.action!==EXECUTABLE)return {permit:false,reason:'INVALID_INTENT_STATE'};
  if(fingerprint(intent)!==intent.fingerprint)return {permit:false,reason:'INTENT_TAMPERED'};
  if(!(Date.parse(intent.capacityBinding.validUntil)>Date.parse(now)))return {permit:false,reason:'CAPACITY_EVIDENCE_EXPIRED'};
  const acceptable=approvals.filter(a=>a?.origin==='TRUSTED_APPROVAL_STORE'&&a?.decision==='APPROVE'&&a?.verifiedHumanSession===true&&a?.role&&REVIEW_ROLES.has(a.role)&&a.actorId!==intent.proposedBy&&a.actorId!==intent.agentId&&a.tenantId===intent.tenantId&&a.municipalityId===intent.municipalityId&&a.intentFingerprint===intent.fingerprint&&Date.parse(a.expiresAt)>Date.parse(now)&&a.revoked!==true);
  if(new Set(acceptable.map(a=>a.actorId)).size<1)return {permit:false,reason:'INDEPENDENT_HUMAN_APPROVAL_REQUIRED'};
  return {permit:true,reason:'QUEUE_ONLY_APPROVED',dispatchAllowed:false};
}
