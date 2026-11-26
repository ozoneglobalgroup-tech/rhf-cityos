// RHF City OS V8P5.1 — explicit, bounded, real LangGraph execution for authorized missions only.
import {ClientError} from './domain.mjs';
import {readAgentEvidence} from './urban-agent-routes.mjs';
import {sha256} from './urban-agent-core.mjs';
import {executeAuthorizedGraph} from './agent-graph-runtime.mjs';
import {GRAPH_PARTS,GRAPH_ACTORS,GRAPH_READERS,isUuid,validateGraphRunRequest,assertAuthorizedGraphMission,assertFreshGraphEvidence,graphRuntimeStatus,graphRunPublicRow} from './agent-graph-core.mjs';
export {GRAPH_PARTS};
const fail=(message,status=403)=>{throw new ClientError(message,status)};
const withAccess=(city,user,withScope,mode,fn)=>withScope(city,user,mode,async(client,scope,role)=>{
 if(!GRAPH_READERS.includes(role))fail('دسترسی به اجرای LangGraph مجاز نیست',403);
 return fn(client,scope,role);
});
const scopedSql=`SELECT r.* FROM rhf_agent_graph_runs r WHERE r.tenant_id=$1 AND r.municipality_id=$2`;
export async function agentGraphRoute({part,method,resourceId,req,cityId,user,withScope,readBody,json,audit}){
 if(part==='agent-graph-runtime'&&method==='GET'&&!resourceId){return json(200,await withAccess(cityId,user,withScope,'read',async(client,c,role)=>{
  const data=await client.query('SELECT status,count(*)::int n FROM rhf_agent_graph_runs WHERE tenant_id=$1 AND municipality_id=$2 GROUP BY status',[c.tenant_id,c.id]);
  return graphRuntimeStatus(c.id,role,Object.fromEntries(data.rows.map(x=>[x.status,x.n])));
 }));}
 if(part!=='agent-graph-runs')fail('مسیر اجرای گراف معتبر نیست',404);
 if(method==='GET'&&!resourceId)return json(200,await withAccess(cityId,user,withScope,'read',async(client,c)=>({
  scope:c.id,rows:(await client.query(`${scopedSql} ORDER BY started_at DESC,id DESC LIMIT 100`,[c.tenant_id,c.id])).rows.map(graphRunPublicRow),limit:100,partial:true
 })));
 if(method==='GET'&&resourceId){if(!isUuid(resourceId))fail('شناسه اجرای گراف معتبر نیست',400);
  return json(200,await withAccess(cityId,user,withScope,'read',async(client,c)=>{
   const r=(await client.query(`${scopedSql} AND r.id=$3`,[c.tenant_id,c.id,resourceId])).rows[0];
   if(!r)fail('اجرا در شهرداری جاری یافت نشد',404);
   const ev=(await client.query('SELECT event_type,actor_id,created_at FROM rhf_agent_graph_events WHERE tenant_id=$1 AND municipality_id=$2 AND run_id=$3 ORDER BY created_at,id LIMIT 20',[c.tenant_id,c.id,resourceId])).rows;
   return {scope:c.id,run:graphRunPublicRow(r),events:ev};
  }));
 }
 if(method==='POST'&&!resourceId){
  let body;try{body=validateGraphRunRequest(await readBody(req));}catch{fail('درخواست اجرای گراف معتبر نیست یا موافقت فقط‌خواندنی ثبت نشده است',400);}
  // Claim and finish occur in separate short transactions. We never hold a DB lock during LangGraph execution.
  const claim=await withAccess(cityId,user,withScope,'write',async(client,c,role)=>{
   if(!GRAPH_ACTORS.includes(role))fail('این نقش اختیار اجرای تحلیل مجاز را ندارد');
   const scope=[c.tenant_id,c.id];
   // Prevent concurrent duplicate submissions of the same mission.
   await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`${c.tenant_id}:${c.id}:${body.missionId}`]);
   const previous=(await client.query(`${scopedSql} AND r.request_key=$3 FOR UPDATE`,[...scope,body.requestKey])).rows[0];
   if(previous){if(previous.mission_id!==body.missionId||previous.actor_id!==user.id)fail('کلید تکراری برای درخواست متفاوت به‌کار رفته است',409);
    return {duplicate:true,run:graphRunPublicRow(previous),scope:c.id};}
   const m=(await client.query('SELECT * FROM rhf_agent_missions WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 FOR UPDATE',[...scope,body.missionId])).rows[0];
   if(!m)fail('مأموریت در محدوده فعلی یافت نشد',404);
   try{assertAuthorizedGraphMission(m);}catch{fail('مأموریت هنوز مجوز مستقل معتبر ندارد',409);}
   const prior=(await client.query('SELECT status,started_at FROM rhf_agent_graph_runs WHERE tenant_id=$1 AND municipality_id=$2 AND mission_id=$3 ORDER BY started_at DESC LIMIT 4',[...scope,m.id])).rows;
   if(prior.length>=3)fail('سقف سه تحلیل برای این مأموریت تکمیل شده است',429);
   if(prior.some(r=>r.status==='RUNNING'&&Date.now()-new Date(r.started_at).getTime()<120000))fail('یک تحلیل دیگر برای این مأموریت در جریان است',409);
   const {source,tools}=await readAgentEvidence(client,m.case_id);
   try{assertFreshGraphEvidence(m,source,tools,sha256);}catch(e){fail(e.message==='MISSION_EVIDENCE_CHANGED'?'شواهد پرونده پس از مجوز تغییر کرده است؛ مأموریت جدید لازم است':'اعتبار رد ابزارها تأیید نشد',409);}
   const inserted=(await client.query(`INSERT INTO rhf_agent_graph_runs(tenant_id,municipality_id,mission_id,request_key,actor_id,mission_version,evidence_sha256,objective)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[...scope,m.id,body.requestKey,user.id,m.version,m.evidence_sha256,m.objective])).rows[0];
   await client.query("INSERT INTO rhf_agent_graph_events(tenant_id,municipality_id,run_id,actor_id,event_type) VALUES($1,$2,$3,$4,'REQUESTED')",[...scope,inserted.id,user.id]);
   await audit(client,c,user,'AGENT_GRAPH_RUN',inserted.id,'REQUESTED',{missionId:m.id,engine:'LangGraph',externalModel:false,dispatch:false});
   return {duplicate:false,run:graphRunPublicRow(inserted),source,objective:m.objective,scope:c.id};
  });
  if(claim.duplicate)return json(200,{scope:claim.scope,run:claim.run,idempotent:true});
  let outcome=null,errorCode=null;
  try{outcome=await executeAuthorizedGraph(claim.source,claim.objective);}catch(e){console.error('AGENT_GRAPH_EXECUTION_FAILED',e?.message||'unknown');errorCode='GRAPH_EXECUTION_FAILED';}
  // Never expose or persist raw SQL row contents. Store only bounded, derived insights and the node trace.
  const finished=await withAccess(cityId,user,withScope,'write',async(client,c,role)=>{
   if(!GRAPH_ACTORS.includes(role))fail('دسترسی به تکمیل اجرای گراف مجاز نیست');
   const scope=[c.tenant_id,c.id],status=outcome?'COMPLETED':'FAILED';
   const result=outcome?JSON.stringify(outcome.result):null;
   const trace=outcome?JSON.stringify(outcome.trace):'[]';
   if(result&&Buffer.byteLength(result)>16000)fail('خروجی گراف از سقف تعیین‌شده بیشتر است',409);
   const r=(await client.query(`UPDATE rhf_agent_graph_runs SET status=$4,result=$5::jsonb,trace=$6::jsonb,error_code=$7,finished_at=now()
    WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 AND actor_id=$8 AND status='RUNNING' RETURNING *`,[...scope,claim.run.id,status,result,trace,errorCode,user.id])).rows[0];
   if(!r)fail('اجرای گراف تغییر وضعیت یافته یا خارج از محدوده مجاز است',409);
   await client.query('INSERT INTO rhf_agent_graph_events(tenant_id,municipality_id,run_id,actor_id,event_type) VALUES($1,$2,$3,$4,$5)',[...scope,r.id,user.id,status]);
   await audit(client,c,user,'AGENT_GRAPH_RUN',r.id,status,{missionId:r.mission_id,externalModel:false,dispatch:false,evidenceSha256:r.evidence_sha256});
   return {scope:c.id,run:graphRunPublicRow(r),idempotent:false};
  });
  return json(outcome?201:503,finished);
 }
 fail('این روش برای API اجرای گراف مجاز نیست',405);
}
