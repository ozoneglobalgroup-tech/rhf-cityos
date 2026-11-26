// Worker activity is read-only with respect to municipal business records.
// It writes only the existing governed graph execution ledger under forced RLS.
import pg from 'pg';
import {readAgentEvidence} from './urban-agent-routes.mjs';
import {sha256} from './urban-agent-core.mjs';
import {executeAuthorizedGraph} from './agent-graph-runtime.mjs';
import {GRAPH_ACTORS,assertAuthorizedGraphMission,assertFreshGraphEvidence,isUuid} from './agent-graph-core.mjs';

export function assertActivityInput(b){
 if(!b||!['tenantId','cityId','missionId','actorId'].every(x=>isUuid(b[x]))||b.requestKey!==b.missionId)throw Error('ACTIVITY_SCOPE_INVALID');
 return b;
}
const db=()=>new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:7000});
async function transaction(b,fn){
 const c=db();await c.connect();
 try{
  await c.query('BEGIN');
  await c.query("SELECT set_config('app.tenant_id',$1,true),set_config('app.municipality_id',$2,true),set_config('app.actor_id',$3,true)",[b.tenantId,b.cityId,b.actorId]);
  const x=await fn(c);await c.query('COMMIT');return x;
 }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{await c.end().catch(()=>{});}
}
const scopedMission='SELECT * FROM rhf_agent_missions WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3';
const graphSql='SELECT * FROM rhf_agent_graph_runs WHERE tenant_id=$1 AND municipality_id=$2 AND mission_id=$3 AND request_key=$4 FOR UPDATE';
async function verifyOperator(c,b){
 const q=await c.query(`SELECT u.is_system_admin,mm.role FROM users u LEFT JOIN memberships mm ON mm.user_id=u.id AND mm.municipality_id=$2 WHERE u.id=$1`,[b.actorId,b.cityId]);
 if(q.rows.length!==1||(!q.rows[0].is_system_admin&&!GRAPH_ACTORS.includes(q.rows[0].role)))throw Error('TEMPORAL_ACTOR_ROLE_REVOKED');
 const municipality=(await c.query('SELECT tenant_id,active FROM municipalities WHERE id=$1',[b.cityId])).rows[0];
 if(!municipality?.active||municipality.tenant_id!==b.tenantId)throw Error('TEMPORAL_MUNICIPALITY_CHANGED');
}
export async function runGovernedGraph(input){
 const b=assertActivityInput(input),scope=[b.tenantId,b.cityId],requested=[...scope,b.missionId,b.requestKey];
 const claim=await transaction(b,async c=>{
  await verifyOperator(c,b);
  await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`rhf-temporal:${b.tenantId}:${b.cityId}:${b.missionId}`]);
  const m=(await c.query(scopedMission+' FOR UPDATE',[...scope,b.missionId])).rows[0];
  assertAuthorizedGraphMission(m);
  const {source,tools}=await readAgentEvidence(c,m.case_id);
  assertFreshGraphEvidence(m,source,tools,sha256);
  const previous=(await c.query(graphSql,requested)).rows[0];
  if(previous){
   if(previous.actor_id!==b.actorId||previous.evidence_sha256!==m.evidence_sha256)throw Error('TEMPORAL_REPLAY_CONFLICT');
   if(previous.status==='COMPLETED')return {alreadyDone:true,runId:previous.id};
   if(previous.status!=='RUNNING')throw Error('PREVIOUS_RUN_TERMINAL');
   return {alreadyDone:false,runId:previous.id,source,objective:m.objective};
  }
  const prior=(await c.query('SELECT status FROM rhf_agent_graph_runs WHERE tenant_id=$1 AND municipality_id=$2 AND mission_id=$3 ORDER BY started_at DESC LIMIT 4',[...scope,b.missionId])).rows;
  if(prior.length>=3||prior.some(r=>r.status==='RUNNING'))throw Error('GRAPH_RUN_CAPACITY_OR_CONFLICT');
  const r=(await c.query(`INSERT INTO rhf_agent_graph_runs(tenant_id,municipality_id,mission_id,request_key,actor_id,mission_version,evidence_sha256,objective)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,[...scope,b.missionId,b.requestKey,b.actorId,m.version,m.evidence_sha256,m.objective])).rows[0];
  await c.query("INSERT INTO rhf_agent_graph_events(tenant_id,municipality_id,run_id,actor_id,event_type) VALUES($1,$2,$3,$4,'REQUESTED')",[...scope,r.id,b.actorId]);
  await c.query("INSERT INTO audit_events(tenant_id,municipality_id,actor_id,kind,entity_id,event,details) VALUES($1,$2,$3,'AGENT_GRAPH_TEMPORAL',$4,'REQUESTED',$5::jsonb)",[...scope,b.actorId,String(r.id),JSON.stringify({missionId:b.missionId,temporal:true,dispatch:false})]);
  return {alreadyDone:false,runId:r.id,source,objective:m.objective};
 });
 if(claim.alreadyDone)return {runId:claim.runId,idempotent:true};
 // deterministic bounded LangGraph. The activity is retried only for transient failure.
 let outcome;
 try{outcome=await executeAuthorizedGraph(claim.source,claim.objective);}
 catch(e){
  // A definitive graph failure is recorded once; service-process crashes before this
  // point are retried by Temporal against the original RUNNING record.
  await transaction(b,async c=>{
   await verifyOperator(c,b);
   const current=(await c.query(graphSql,requested)).rows[0];
   if(current?.id!==claim.runId||current.status!=='RUNNING')return;
   await c.query(`UPDATE rhf_agent_graph_runs SET status='FAILED',error_code='GRAPH_EXECUTION_FAILED',finished_at=now()
     WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 AND actor_id=$4 AND status='RUNNING'`,[...scope,claim.runId,b.actorId]);
   await c.query("INSERT INTO rhf_agent_graph_events(tenant_id,municipality_id,run_id,actor_id,event_type) VALUES($1,$2,$3,$4,'FAILED')",[...scope,claim.runId,b.actorId]);
   await c.query("INSERT INTO audit_events(tenant_id,municipality_id,actor_id,kind,entity_id,event,details) VALUES($1,$2,$3,'AGENT_GRAPH_TEMPORAL',$4,'FAILED',$5::jsonb)",[...scope,b.actorId,String(claim.runId),JSON.stringify({missionId:b.missionId,temporal:true,errorCode:'GRAPH_EXECUTION_FAILED',dispatch:false})]);
  });
  throw Error('GRAPH_EXECUTION_FAILED');
 }
 return transaction(b,async c=>{
  await verifyOperator(c,b);
  const m=(await c.query(scopedMission,[...scope,b.missionId])).rows[0];
  assertAuthorizedGraphMission(m);
  const current=(await c.query(graphSql,requested)).rows[0];
  if(!current||current.id!==claim.runId)throw Error('GRAPH_RUN_CHANGED');
  if(current.status==='COMPLETED')return {runId:current.id,idempotent:true};
  if(current.status!=='RUNNING')throw Error('GRAPH_RUN_NOT_RUNNING');
  const result=JSON.stringify(outcome.result),trace=JSON.stringify(outcome.trace);
  if(Buffer.byteLength(result)>16000||outcome.trace.length!==4)throw Error('GRAPH_RESULT_UNBOUNDED');
  const r=(await c.query(`UPDATE rhf_agent_graph_runs SET status='COMPLETED',result=$5::jsonb,trace=$6::jsonb,finished_at=now()
     WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 AND actor_id=$4 AND status='RUNNING' RETURNING id`,[...scope,claim.runId,b.actorId,result,trace])).rows[0];
  if(!r)throw Error('GRAPH_FINISH_RACE');
  await c.query("INSERT INTO rhf_agent_graph_events(tenant_id,municipality_id,run_id,actor_id,event_type) VALUES($1,$2,$3,$4,'COMPLETED')",[...scope,r.id,b.actorId]);
  await c.query("INSERT INTO audit_events(tenant_id,municipality_id,actor_id,kind,entity_id,event,details) VALUES($1,$2,$3,'AGENT_GRAPH_TEMPORAL',$4,'COMPLETED',$5::jsonb)",[...scope,b.actorId,String(r.id),JSON.stringify({missionId:b.missionId,temporal:true,evidenceSha256:m.evidence_sha256,dispatch:false})]);
  return {runId:r.id,idempotent:false};
 });
}
