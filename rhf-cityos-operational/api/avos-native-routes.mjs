/**
 * RUVOS-native Agentic Mission route, additively mounted inside api/server.mjs.
 * GET is read-only. POST/PATCH are STRICTLY limited to avos_stage_copy.
 * This file is NOT a production-ready dispatch/authorization service.
 * All trust primitives (user, city, role, tx) come from existing RUVOS withScope.
 */
import {randomUUID} from 'node:crypto';
import {ClientError} from './domain.mjs';
import {createMissionIntent,fingerprint} from './avos-engine/src/p1/mission-intent.mjs';
import {createStagingCapacityReader} from './avos-engine/src/p1/stage-capacity-reader.mjs';

export const AVOS_PARTS=Object.freeze(['avos-missions']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROLES=new Set(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR','AUDITOR']);
const WRITERS=new Set(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR']);
const CLIENT_ERRORS=new Set(['INVALID_REQUEST_KEY','INVALID_CASE_ID','INVALID_REQUIRED_UNITS','INVALID_MISSION_TITLE','INVALID_ASSIGNEE']);
const err=(message,status=400)=>new ClientError(message,status);
const validId=x=>typeof x==='string'&&UUID.test(x);
const iso=x=>x instanceof Date?x.toISOString():new Date(x).toISOString();
function validateBody(b){
 if(!b||typeof b!=='object'||Array.isArray(b))throw err('INVALID_REQUEST',400);
 const keys=Object.keys(b);
 if(keys.some(k=>!['requestKey','caseId','capacityId','title','assignee','requiredUnits'].includes(k)))throw err('UNTRUSTED_FIELD_DENIED',400);
 if(!validId(b.requestKey)||!validId(b.caseId)||!validId(b.capacityId))throw err('INVALID_UUID',400);
 if(typeof b.title!=='string'||b.title.trim().length<12||b.title.trim().length>250)throw err('INVALID_TITLE',400);
 if(b.assignee!==undefined&&(typeof b.assignee!=='string'||b.assignee.length>150))throw err('INVALID_ASSIGNEE',400);
 if(typeof b.requiredUnits!=='number'||!Number.isFinite(b.requiredUnits)||b.requiredUnits<=0)throw err('INVALID_REQUIRED_UNITS',400);
 return {requestKey:b.requestKey,caseId:b.caseId,capacityId:b.capacityId,title:b.title.trim(),assignee:(b.assignee||'').trim(),requiredUnits:b.requiredUnits};
}
async function guardStage(client){
 if(process.env.RHF_AVOS_NATIVE_STAGE_WRITE!=='1')throw err('STAGING_WRITE_DISABLED',403);
 const r=await client.query('SELECT current_database() AS db, current_user AS role');
 if(r.rows?.[0]?.db!=='avos_stage_copy'||r.rows?.[0]?.role!=='cityos_runtime')throw err('STAGING_DATABASE_REQUIRED',403);
 const x=await client.query('SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user');
 if(x.rows?.[0]?.rolsuper||x.rows?.[0]?.rolbypassrls)throw err('PRIVILEGED_DB_ROLE_DENIED',403);
}
async function checkTables(client){
 const r=await client.query("SELECT to_regclass('public.avos_agent_mission_intents') IS NOT NULL AS intents, to_regclass('public.avos_agent_mission_outbox') IS NOT NULL AS outbox");
 return r.rows?.[0]?.intents===true&&r.rows?.[0]?.outbox===true;
}
const reader=createStagingCapacityReader({allowSyntheticStage:true});
function safeItem(x){return {id:x.id,requestKey:x.request_key,caseId:x.case_id,status:x.status,createdAt:x.created_at,
 proposedBy:x.proposer_id,approvedBy:x.approved_by,approvedAt:x.approved_at,missionId:x.mission_id,
 outboxStatus:x.outbox_status||null,attemptCount:x.attempt_count??null,leaseGeneration:x.lease_generation??null};}

export async function avosNativeRoute({part,method,resourceId,req,cityId,user,withScope,readBody,json,audit}){
 if(part!=='avos-missions')throw err('NOT_FOUND',404);
 if(method==='GET'){
  if(resourceId&&!validId(resourceId))throw err('INVALID_INTENT_ID',400);
  return json(200,await withScope(cityId,user,'read',async(client,city,role)=>{
   if(!ROLES.has(role))throw err('ROLE_DENIED',403);
   if(!(await checkTables(client)))return {mode:'AWAITING_SCHEMA',autoWrites:0,rows:[],scope:city.id};
   const r=await client.query(`SELECT i.id,i.request_key,i.case_id,i.status,i.created_at,i.proposer_id,
      i.approved_by,i.approved_at,i.mission_id,o.status AS outbox_status,o.attempt_count,o.lease_generation
     FROM avos_agent_mission_intents i LEFT JOIN avos_agent_mission_outbox o
      ON o.tenant_id=i.tenant_id AND o.municipality_id=i.municipality_id AND o.intent_id=i.id
     WHERE ($1::uuid IS NULL OR i.id=$1)
     ORDER BY i.created_at DESC LIMIT 100`,[resourceId&&validId(resourceId)?resourceId:null]);
   return {mode:'GOVERNED',executionEnabled:false,autoWrites:0,rows:r.rows.map(safeItem),scope:city.id,
    notice:'وضعیت مأموریت‌های عامل؛ این مسیر اجرا یا تخصیص منبع انجام نمی‌دهد.'};
  }));
 }
 if(method==='POST'&&!resourceId){
  const b=validateBody(await readBody(req));
  const result=await withScope(cityId,user,'write',async(client,city,role)=>{
   if(!WRITERS.has(role))throw err('ROLE_DENIED',403);
   await guardStage(client);
   if(!(await checkTables(client)))throw err('STAGING_SCHEMA_NOT_APPLIED',409);
   const existing=(await client.query(`SELECT id,proposer_id,case_id,payload,status FROM avos_agent_mission_intents
     WHERE tenant_id=$1 AND municipality_id=$2 AND request_key=$3 FOR UPDATE`,[city.tenant_id,city.id,b.requestKey])).rows[0];
   if(existing){
    const p=existing.payload;
    if(existing.proposer_id!==user.id||existing.case_id!==b.caseId||p?.payload?.title!==b.title||p?.payload?.assignee!==b.assignee||
      p?.capacityBinding?.capacityId!==b.capacityId||Number(p?.capacityBinding?.requiredUnits)!==b.requiredUnits)
     throw err('IDEMPOTENCY_KEY_CONFLICT',409);
    return {id:existing.id,status:existing.status,replayed:true,dispatchOccurred:false};
   }
   const c=(await client.query(`SELECT id,tenant_id,municipality_id,status,updated_at FROM service_cases
     WHERE id=$1 AND tenant_id=$2 AND municipality_id=$3 FOR UPDATE`,[b.caseId,city.tenant_id,city.id])).rows[0];
   if(!c||!['ASSIGNED','IN_PROGRESS'].includes(c.status))throw err('CASE_NOT_EXECUTABLE',409);
   const capacity=await reader({client,tenantId:city.tenant_id,municipalityId:city.id,capacityId:b.capacityId,
    principal:{actorId:user.id,tenantId:city.tenant_id,municipalityId:city.id}});
   if(capacity.availableUnits<b.requiredUnits)throw err('CAPACITY_INSUFFICIENT',409);
   const intent=createMissionIntent({principal:{tenantId:city.tenant_id,municipalityId:city.id,actorId:user.id,role,verifiedByGateway:true},
    caseSnapshot:{id:c.id,tenantId:c.tenant_id,municipalityId:c.municipality_id,status:c.status,updatedAt:iso(c.updated_at)},
    capacitySnapshot:{id:capacity.id,tenantId:capacity.tenantId,municipalityId:capacity.municipalityId,
     verifiedByTrustedReader:true,availabilityVerified:true,safetyQualified:true,authorized:true,
     availableUnits:capacity.availableUnits,evidenceRef:capacity.evidenceRef,validUntil:capacity.validUntil},
    requestKey:b.requestKey,requiredUnits:b.requiredUnits,title:b.title,assignee:b.assignee});
   const id=randomUUID();
   await client.query(`INSERT INTO avos_agent_mission_intents
    (id,tenant_id,municipality_id,case_id,request_key,proposer_id,agent_id,payload,payload_sha256,capacity_snapshot,source_case_updated_at,status)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10::jsonb,$11,'PROPOSED')`,
    [id,city.tenant_id,city.id,b.caseId,b.requestKey,user.id,intent.agentId,JSON.stringify(intent),intent.fingerprint,
     JSON.stringify(capacity),c.updated_at]);
   await audit(client,city,user,'AVOS_AGENT_MISSION',id,'INTENT_PROPOSED',{caseId:b.caseId,requestKey:b.requestKey,autoWrites:0});
   return {id,status:'PROPOSED',replayed:false,dispatchOccurred:false};
  });
  return json(result.replayed?200:201,result);
 }
 if(method==='PATCH'&&validId(resourceId)){
  const b=await readBody(req);
  if(!b||Object.keys(b).some(k=>!['action','note'].includes(k))||b.action!=='AUTHORIZE'||
     typeof b.note!=='string'||b.note.trim().length<8||b.note.trim().length>500)throw err('INVALID_APPROVAL_REQUEST',400);
  const result=await withScope(cityId,user,'write',async(client,city,role)=>{
   if(role!=='MUNICIPAL_ADMIN')throw err('APPROVAL_ROLE_DENIED',403);
   await guardStage(client);
   const r=(await client.query(`SELECT * FROM avos_agent_mission_intents WHERE id=$1 AND tenant_id=$2 AND municipality_id=$3 FOR UPDATE`,
    [resourceId,city.tenant_id,city.id])).rows[0];
   if(!r)throw err('INTENT_NOT_FOUND',404);
   if(r.status!=='PROPOSED')throw err('INVALID_INTENT_STATE',409);
   if(r.proposer_id===user.id)throw err('SELF_APPROVAL_DENIED',403);
   const intent=r.payload;
   if(fingerprint(intent)!==String(r.payload_sha256).trim()||intent.fingerprint!==String(r.payload_sha256).trim())throw err('INTENT_FINGERPRINT_INVALID',409);
   const c=(await client.query(`SELECT id,status,updated_at FROM service_cases WHERE id=$1 AND tenant_id=$2 AND municipality_id=$3 FOR UPDATE`,
     [r.case_id,city.tenant_id,city.id])).rows[0];
   if(!c||!['ASSIGNED','IN_PROGRESS'].includes(c.status)||iso(c.updated_at)!==intent.caseVersion)throw err('CASE_STALE',409);
   const cap=await reader({client,tenantId:city.tenant_id,municipalityId:city.id,capacityId:intent.capacityBinding.capacityId,
     principal:{actorId:user.id,tenantId:city.tenant_id,municipalityId:city.id}});
   if(cap.evidenceRef!==intent.capacityBinding.evidenceRef||cap.availableUnits<intent.capacityBinding.requiredUnits||
      Date.parse(cap.validUntil)<=Date.now())throw err('CAPACITY_STALE',409);
   await client.query(`UPDATE avos_agent_mission_intents SET status='AUTHORIZED',approved_by=$2,
     approved_at=now(),approval_expires_at=now()+interval '30 minutes',approval_note=$3,approved_payload_sha256=$4,updated_at=now()
     WHERE id=$1`,[r.id,user.id,b.note.trim(),String(r.payload_sha256).trim()]);
   await client.query(`UPDATE avos_agent_mission_intents SET status='QUEUED',updated_at=now() WHERE id=$1`,[r.id]);
   await client.query(`INSERT INTO avos_agent_mission_outbox(id,tenant_id,municipality_id,intent_id,status)
     VALUES($1,$2,$3,$4,'PENDING')`,[randomUUID(),city.tenant_id,city.id,r.id]);
   await audit(client,city,user,'AVOS_AGENT_MISSION',r.id,'INTENT_QUEUED',{autoWrites:0});
   return {id:r.id,status:'QUEUED',approvedBy:user.id,missionCreated:false};
  });
  return json(200,result);
 }
 throw err('METHOD_NOT_ALLOWED',405);
}
