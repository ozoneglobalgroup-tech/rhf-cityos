// V8P6.7: single transaction RUVOS finding -> governed mission, fenced by
// exact current source fingerprint; independent approval remains in mission API.
import {ClientError} from './domain.mjs';
import {readAgentEvidence} from './urban-agent-routes.mjs';
import {sameMissionRequest} from './agent-mission-core.mjs';
import {HANDOFF_PARTS,HANDOFF_VIEW_ROLES,HANDOFF_ROLES,validateHandoffCreate,validateHandoffEvidence,handoffPublic,handoffCapabilities} from './agent-handoff-core.mjs';
export {HANDOFF_PARTS};
const fail=(reason,status)=>{throw new ClientError(reason,status);};
export async function agentHandoffRoute({part,method,resourceId,req,cityId,user,withScope,readBody,json,audit}){
 if(part!=='agent-governed-handoffs'||resourceId)fail('مسیر تحویل مأموریت معتبر نیست',404);
 if(!['GET','POST'].includes(method))fail('روش درخواست مجاز نیست',405);
 if(!user?.id)fail('ابتدا وارد سامانه شوید',401);
 if(method==='GET')return json(200,await withScope(cityId,user,'read',async(c,city,role)=>{
  if(!HANDOFF_VIEW_ROLES.includes(role))fail('مجوز مشاهده گردش‌کار وجود ندارد',403);
  const rows=(await c.query('SELECT status,count(*)::int n FROM rhf_agent_missions WHERE tenant_id=$1 AND municipality_id=$2 GROUP BY status',[city.tenant_id,city.id])).rows;
  return handoffCapabilities(city.id,role,Object.fromEntries(rows.map(r=>[r.status,r.n])));
 }));
 let body;try{body=validateHandoffCreate(await readBody(req));}catch{fail('درخواست تحویل مستند معتبر نیست',400);}
 const result=await withScope(cityId,user,'write',async(c,city,role)=>{
  if(!HANDOFF_ROLES.includes(role))fail('این نقش اجازه پیشنهاد مأموریت ندارد',403);
  const scope=[city.tenant_id,city.id];
  // Same idempotency lock namespace as the existing mission ledger; no duplicate writes.
  await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`${city.tenant_id}:${city.id}:${body.requestKey}`]);
  const evidence=await readAgentEvidence(c,body.caseId);let checked;
  try{checked=validateHandoffEvidence(body,evidence);}catch(e){
   if(e.message==='HANDOFF_EVIDENCE_STALE')fail('شواهد از زمان تحلیل تغییر کرده است؛ تحلیل را مجدداً اجرا کنید',409);
   if(e.message==='HANDOFF_FINDING_NO_LONGER_SUPPORTED')fail('این یافته دیگر با شواهد جاری پشتیبانی نمی‌شود',409);
   fail('شواهد کامل و قابل انتساب برای این پیشنهاد موجود نیست',409);
  }
  const draft={caseId:body.caseId,objective:checked.objective,note:checked.note};
  const existing=(await c.query('SELECT * FROM rhf_agent_missions WHERE tenant_id=$1 AND municipality_id=$2 AND request_key=$3 FOR UPDATE',[...scope,body.requestKey])).rows[0];
  if(existing){
   if(!sameMissionRequest(existing,draft,user.id)||existing.evidence_sha256!==checked.fingerprint)fail('کلید قبلاً برای پیشنهاد دیگری استفاده شده است',409);
   return handoffPublic(existing,city.id,true);
  }
  const row=(await c.query(`INSERT INTO rhf_agent_missions
   (tenant_id,municipality_id,case_id,request_key,objective,note,evidence_sha256,tool_names,created_by)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)
   ON CONFLICT(tenant_id,municipality_id,request_key) DO NOTHING RETURNING *`,
   [...scope,body.caseId,body.requestKey,checked.objective,checked.note,checked.fingerprint,JSON.stringify(evidence.tools),user.id])).rows[0];
  if(!row)fail('کلید درخواست در ثبت همزمان استفاده شده است؛ پرونده را بازخوانی کنید',409);
  await c.query('INSERT INTO rhf_agent_mission_events(tenant_id,municipality_id,mission_id,actor_id,event_type,note) VALUES($1,$2,$3,$4,$5,$6)',
   [...scope,row.id,user.id,'PROPOSED',`V8P6.7 ${checked.code}: source fingerprint verified, awaiting independent review`]);
  await audit(c,city,user,'RHF_AGENT_GOVERNED_HANDOFF',row.id,'PROPOSED',{findingId:checked.findingId,caseId:body.caseId,evidenceSha256:checked.fingerprint,objective:checked.objective,independentReview:true,dispatch:false,financialWrite:false});
  return handoffPublic(row,city.id,false);
 });
 return json(result.idempotent?200:201,result);
}
