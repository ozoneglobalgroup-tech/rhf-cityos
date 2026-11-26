import {ClientError} from './domain.mjs';
import {readAgentEvidence} from './urban-agent-routes.mjs';
import {sha256,TOOL_ALLOWLIST} from './urban-agent-core.mjs';
import {MISSION_PARTS,MISSION_READ_ROLES,MISSION_CREATE_ROLES,MISSION_REVIEW_ROLES,validUUID,validateMissionCreate,validateMissionDecision,nextMissionState,sameMissionRequest,missionPublicRow,runtimeStatus} from './agent-mission-core.mjs';
export {MISSION_PARTS};
const fail=(message,status=403)=>{throw new ClientError(message,status)};
const listSql=`SELECT m.*,c.summary AS case_summary FROM rhf_agent_missions m
 JOIN service_cases c ON c.id=m.case_id AND c.tenant_id=m.tenant_id AND c.municipality_id=m.municipality_id
 WHERE m.tenant_id=$1 AND m.municipality_id=$2 ORDER BY m.created_at DESC,m.id DESC LIMIT 101`;
const getSql=`SELECT m.*,c.summary AS case_summary FROM rhf_agent_missions m
 JOIN service_cases c ON c.id=m.case_id AND c.tenant_id=m.tenant_id AND c.municipality_id=m.municipality_id
 WHERE m.tenant_id=$1 AND m.municipality_id=$2 AND m.id=$3`;
const scopedMission=(city,user,withScope,mode,fn)=>withScope(city,user,mode,async(client,c,role)=>{
 if(!MISSION_READ_ROLES.includes(role))fail('دسترسی به دفتر مأموریت ایجنت مجاز نیست');
 return fn(client,c,role);
});
export async function agentMissionRoute({part,method,resourceId,req,cityId,user,withScope,readBody,json,audit}){
 if(part==='agent-mission-runtime' && method==='GET' && !resourceId) return json(200,await scopedMission(cityId,user,withScope,'read',async(client,city,role)=>{
  const q=await client.query('SELECT status,count(*)::int n FROM rhf_agent_missions WHERE tenant_id=$1 AND municipality_id=$2 GROUP BY status',[city.tenant_id,city.id]);
  return runtimeStatus(city.id,role,Object.fromEntries(q.rows.map(x=>[x.status,x.n])));
 }));
 if(part!=='agent-missions')fail('مسیر مأموریت عامل معتبر نیست',404);
 if(method==='GET' && !resourceId)return json(200,await scopedMission(cityId,user,withScope,'read',async(client,city)=>{
  const rows=(await client.query(listSql,[city.tenant_id,city.id])).rows;
  return {scope:city.id,rows:rows.slice(0,100).map(missionPublicRow),limit:100,partial:rows.length>100};
 }));
 if(method==='GET' && resourceId){if(!validUUID(resourceId))fail('شناسه مأموریت معتبر نیست',400);
  return json(200,await scopedMission(cityId,user,withScope,'read',async(client,city)=>{
   const r=(await client.query(getSql,[city.tenant_id,city.id,resourceId])).rows[0];if(!r)fail('مأموریت در شهرداری جاری یافت نشد',404);
   const ev=(await client.query('SELECT event_type,actor_id,note,created_at FROM rhf_agent_mission_events WHERE tenant_id=$1 AND municipality_id=$2 AND mission_id=$3 ORDER BY created_at,id LIMIT 100',[city.tenant_id,city.id,r.id])).rows;
   return {scope:city.id,mission:missionPublicRow(r),events:ev,eventsPartial:ev.length===100};
  }));
 }
 if(method==='POST'&&!resourceId){let b;try{b=validateMissionCreate(await readBody(req));}catch{fail('اطلاعات مأموریت ایجنت نامعتبر است',400);}
  return json(201,await scopedMission(cityId,user,withScope,'write',async(client,city,role)=>{
   if(!MISSION_CREATE_ROLES.includes(role))fail('ثبت مأموریت برای این نقش مجاز نیست');
   const scope=[city.tenant_id,city.id];
   let prev=(await client.query('SELECT * FROM rhf_agent_missions WHERE tenant_id=$1 AND municipality_id=$2 AND request_key=$3 FOR UPDATE',[...scope,b.requestKey])).rows[0];
   if(prev){if(!sameMissionRequest(prev,b,user.id))fail('کلید تکراری برای مأموریت متفاوت ثبت شده است',409);return {scope:city.id,mission:missionPublicRow(prev),idempotent:true};}
   // Evidence is calculated server-side using the existing four SELECT-only RUVOS tools.
   // The existing service_cases row must be visible under tenant/municipality RLS.
   const {source,tools}=await readAgentEvidence(client,b.caseId);
   if(tools.length!==4||tools.some(x=>!TOOL_ALLOWLIST.includes(x)))fail('ردّ ابزارهای مأموریت معتبر نیست',409);
   const evidenceSha256=sha256(JSON.stringify(source));
   const inserted=(await client.query(`INSERT INTO rhf_agent_missions
    (tenant_id,municipality_id,case_id,request_key,objective,note,evidence_sha256,tool_names,created_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)
    ON CONFLICT(tenant_id,municipality_id,request_key) DO NOTHING RETURNING *`,
    [...scope,b.caseId,b.requestKey,b.objective,b.note,evidenceSha256,JSON.stringify(tools),user.id])).rows[0];
   if(!inserted){prev=(await client.query('SELECT * FROM rhf_agent_missions WHERE tenant_id=$1 AND municipality_id=$2 AND request_key=$3',[...scope,b.requestKey])).rows[0];
    if(!prev||!sameMissionRequest(prev,b,user.id))fail('تداخل کلید ثبت مأموریت',409);
    return {scope:city.id,mission:missionPublicRow(prev),idempotent:true};
   }
   await client.query(`INSERT INTO rhf_agent_mission_events(tenant_id,municipality_id,mission_id,actor_id,event_type,note) VALUES($1,$2,$3,$4,'PROPOSED',$5)`,[...scope,inserted.id,user.id,'ثبت پیشنهاد مأموریت پس از خواندن شواهد فقط‌خواندنی']);
   await audit(client,city,user,'RHF_AGENT_MISSION',inserted.id,'PROPOSED',{objective:b.objective,evidenceSha256,toolNames:tools,dispatch:false});
   return {scope:city.id,mission:missionPublicRow(inserted),idempotent:false};
  }));
 }
 if(method==='PATCH'&&resourceId){if(!validUUID(resourceId))fail('شناسه مأموریت نامعتبر است',400);
  let b;try{b=validateMissionDecision(await readBody(req));}catch{fail('ورودی تصمیم مأموریت معتبر نیست',400);}
  return json(200,await scopedMission(cityId,user,withScope,'write',async(client,city,role)=>{
   const scope=[city.tenant_id,city.id];
   const found=(await client.query('SELECT * FROM rhf_agent_missions WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 FOR UPDATE',[...scope,resourceId])).rows[0];
   if(!found)fail('مأموریت در شهرداری فعلی یافت نشد',404);
   let next;try{next=nextMissionState(found,b,role,user.id);}catch(e){fail(({MISSION_VERSION_CONFLICT:'نسخه مأموریت تغییر کرده است',MISSION_SELF_APPROVAL_DENIED:'پیشنهاددهنده نمی‌تواند مأموریت خود را تأیید کند',MISSION_ALREADY_DECIDED:'مأموریت قبلاً تعیین تکلیف شده است',MISSION_WITHDRAW_OWNER_ONLY:'انصراف فقط توسط پیشنهاددهنده مجاز است',MISSION_REVIEW_ROLE_DENIED:'این نقش اختیار بررسی مأموریت ندارد'}[e.message])||'اقدام مجاز نیست',e.message==='MISSION_VERSION_CONFLICT'||e.message==='MISSION_ALREADY_DECIDED'?409:403);}
   const updated=(await client.query(`UPDATE rhf_agent_missions
    SET status=$4,version=version+1,reviewed_by=$5,review_note=$6,reviewed_at=now(),updated_at=now()
    WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 AND version=$7 RETURNING *`,[...scope,resourceId,next,user.id,b.note,b.version])).rows[0];
   if(!updated)fail('تداخل نسخه در تغییر مأموریت',409);
   await client.query('INSERT INTO rhf_agent_mission_events(tenant_id,municipality_id,mission_id,actor_id,event_type,note) VALUES($1,$2,$3,$4,$5,$6)',[...scope,resourceId,user.id,next,b.note]);
   await audit(client,city,user,'RHF_AGENT_MISSION',resourceId,next,{objective:found.objective,dispatch:false,version:updated.version});
   return {scope:city.id,mission:missionPublicRow(updated),dispatched:false,affectedOperationalRecords:0};
  }));
 }
 fail('روش درخواست مأموریت مجاز نیست',405);
}
