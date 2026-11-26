/** Temporal activity: revalidate city, actor, appointment, decision, original reviewed evidence. */
import pg from 'pg';
import {dv22ScopedAccess} from './dv22-registry-routes.mjs';
import {planHandoff} from './dv23b2a-agent-handoff-core.mjs';
import {validateWorkerInput,workflowId} from './dv23b2b-specialist-core.mjs';
import {executeDV23Specialists} from './dv23b2b-specialist-graph.mjs';
const db=()=>new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:7000});
async function scopedTx(b,fn){
 const c=db();await c.connect();
 try{await c.query('BEGIN');await c.query("SELECT set_config('app.tenant_id',$1,true),set_config('app.municipality_id',$2,true),set_config('app.actor_id',$3,true)",[b.tenantId,b.cityId,b.actorId]);
  const out=await fn(c);await c.query('COMMIT');return out;}
 catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{await c.end().catch(()=>{});}
}
export async function readApprovedWorkerPacket(c,b){
 const city=(await c.query('SELECT id,tenant_id,active FROM municipalities WHERE id=$1 AND tenant_id=$2',[b.cityId,b.tenantId])).rows[0];
 if(!city?.active)throw Error('DV23B2B_CITY_INACTIVE');
 const u=(await c.query('SELECT id,is_system_admin FROM users WHERE id=$1',[b.actorId])).rows[0];
 if(!u||u.is_system_admin===true)throw Error('DV23B2B_ADMIN_OPERATION_DENIED');
 const mm=(await c.query('SELECT role FROM memberships WHERE user_id=$1 AND municipality_id=$2',[b.actorId,b.cityId])).rows[0];
 if(!mm)throw Error('DV23B2B_MEMBER_REVOKED');
 const surface=(await c.query(`SELECT d.owner_org_id, d.id, d.sector FROM rhf_urban_opportunity_decisions d WHERE d.tenant_id=$1 AND d.municipality_id=$2 AND d.id=$3`,[b.tenantId,b.cityId,b.decisionId])).rows[0];
 if(!surface)throw Error('DV23B2B_DECISION_NOT_VISIBLE');
 const modes=['deputy','waste'];let packet=null;
 for(const mode of modes){
  let access;try{access=await dv22ScopedAccess(c,city,u,mm.role,mode);}catch{continue;}
  if(!access.allowedCreate||!access.scoped.includes(surface.owner_org_id))continue;
  const d=(await c.query(`SELECT id,tenant_id,municipality_id,owner_org_id,need_id,capacity_id,sector,source_digest,status,created_by,decided_by
   FROM rhf_urban_opportunity_decisions WHERE id=$1 AND tenant_id=$2 AND municipality_id=$3 AND owner_org_id=ANY($4::uuid[])`,[b.decisionId,b.tenantId,b.cityId,access.scoped])).rows[0];
  if(!d||d.status!=='FEASIBILITY_APPROVED')continue;
  const ev=(await c.query(`SELECT id,tenant_id,municipality_id,owner_org_id,kind,sector,title,quantity,unit,evidence_ref,status,created_by,reviewed_by,review_note
   FROM rhf_urban_need_capacity WHERE id=ANY($1::uuid[]) AND tenant_id=$2 AND municipality_id=$3 AND owner_org_id=ANY($4::uuid[])`,[[d.need_id,d.capacity_id],b.tenantId,b.cityId,access.scoped])).rows;
  const r=planHandoff(d,ev.find(x=>x.id===d.need_id),ev.find(x=>x.id===d.capacity_id),city,access.scoped);
  if(r.eligible&&r.packet.handoffFingerprint===b.handoffFingerprint){packet=r.packet;break;}
 }
 if(!packet)throw Error('DV23B2B_REVOKED_OR_EVIDENCE_CHANGED');
 return packet;
}
export async function runDV23Specialists(raw){
 const b=validateWorkerInput(raw);
 const packet=await scopedTx(b,c=>readApprovedWorkerPacket(c,b));
 const result=await executeDV23Specialists(packet); // No municipal writes; actual LangGraph 4-node invoke.
 return scopedTx(b,async c=>{
  const fresh=await readApprovedWorkerPacket(c,b);
  if(fresh.handoffFingerprint!==packet.handoffFingerprint)throw Error('DV23B2B_SOURCE_STALE_AFTER_GRAPH');
  const wid=workflowId(b.tenantId,b.cityId,b.decisionId);
  await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',[wid]);
  const prior=(await c.query(`SELECT details FROM audit_events WHERE tenant_id=$1 AND municipality_id=$2 AND actor_id=$3 AND kind='DV23B2B_SPECIALIST'
    AND entity_id=$4 AND event='COMPLETED' ORDER BY created_at DESC LIMIT 1`,[b.tenantId,b.cityId,b.actorId,b.decisionId])).rows[0];
  if(prior){if(prior.details?.fingerprint!==b.handoffFingerprint||!prior.details?.result)throw Error('DV23B2B_AUDIT_REPLAY_CONFLICT');return prior.details.result;}
  await c.query(`INSERT INTO audit_events(tenant_id,municipality_id,actor_id,kind,entity_id,event,details)
    VALUES($1,$2,$3,'DV23B2B_SPECIALIST',$4,'COMPLETED',$5::jsonb)`,[b.tenantId,b.cityId,b.actorId,b.decisionId,JSON.stringify({fingerprint:b.handoffFingerprint,workflowId:wid,result})]);
  return result;
 });
}
