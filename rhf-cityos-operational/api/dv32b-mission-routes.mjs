/** DV3.2B — scoped mission-authorization ledger + explicit human release to legacy missions. */
import {ClientError} from './domain.mjs';
import {DV31_UUID} from './dv31-intake-core.mjs';
import {dv31Authorized} from './dv31-intake-routes.mjs';
import {DV32B_SCHEMA,DV32B_GOVERNANCE,MissionPlanError,validatePlan,validateDecision,planHash,checkScope,eligibleIntent,mayIndependentlyRelease,present} from './dv32b-mission-core.mjs';
export const DV32B_PARTS=Object.freeze(['dv32-mission-plans']);
const deny=(code,status=403)=>{throw new ClientError(code,status)};
function origin(req){let o;try{o=new URL(req.headers?.origin||'')}catch{deny('DV32B_ORIGIN_REQUIRED')};if(o.host!==req.headers?.host||!['http:','https:'].includes(o.protocol)||o.protocol!==(process.env.PUBLIC_HTTPS==='true'?'https:':'http:'))deny('DV32B_ORIGIN_MISMATCH');if(!/^application\/json(?:\s*;|$)/i.test(req.headers?.['content-type']||''))deny('DV32B_JSON_REQUIRED',415)}
function vetted(fn){try{return fn()}catch(e){if(e instanceof MissionPlanError)deny(e.message,e.status);throw e}}
async function prerequisite(db){const r=await db.query("SELECT to_regclass('public.rhf_dv32_mission_plans') IS NOT NULL AS ready");if(r.rows[0]?.ready!==true)deny('DV32B_MIGRATION_REQUIRED',409)}
async function intent(db,city,auth,id,lock=false){let r=await db.query(`SELECT * FROM rhf_dv32_dispatch_intents WHERE id=$1 AND tenant_id=$2 AND municipality_id=$3 AND owner_org_id=ANY($4::uuid[]) AND target_org_id=ANY($4::uuid[]) ${lock?'FOR SHARE':''}`,[id,city.tenant_id,city.id,auth.ids]);return vetted(()=>eligibleIntent(r.rows[0],city,auth.ids))}
async function caseEligible(db,city,src,auth){const r=await db.query(`SELECT id,status,unit_id,tenant_id,municipality_id FROM service_cases WHERE id=$1 AND tenant_id=$2 AND municipality_id=$3 AND unit_id=$4 FOR SHARE`,[src.service_case_id,city.tenant_id,city.id,src.owner_org_id]);const c=r.rows[0];if(!c||c.status!=='RECEIVED'||!auth.ids.includes(c.unit_id))deny('DV32B_CASE_NOT_RECEIVED',409)}
async function requireSafeMissionContract(db){
 // Avoid creating an operational record against an unknown or active-by-default mission schema.
 const r=await db.query(`SELECT column_default,udt_name FROM information_schema.columns WHERE table_schema='public' AND table_name='missions' AND column_name='status'`);
 const col=r.rows[0];const d=String(col?.column_default||'').toUpperCase();
 if(col?.udt_name!=='text'&&col?.udt_name!=='varchar')deny('DV32B_MISSION_STATUS_TYPE_UNSUPPORTED',409);
 if(!/^[(' :A-Z0-9_]*$/.test(d)||!['PENDING','PLANNED','NEW','CREATED','DRAFT'].some(s=>d.includes("'"+s+"'")))deny('DV32B_MISSION_DEFAULT_NOT_SAFE',409);
}
export async function dv32bMissionRoute({part,method,resourceId,url,req,cityId,user,withScope,readBody,json,audit}){
 if(part!=='dv32-mission-plans'||!['GET','POST','PATCH'].includes(method))deny('DV32B_METHOD_NOT_ALLOWED',405);
 if((method==='PATCH'&&!DV31_UUID.test(resourceId||''))||(method!=='PATCH'&&resourceId))deny('DV32B_PATH_INVALID',404);
 if(url.searchParams.getAll('surface').length!==1||[...url.searchParams.keys()].some(k=>k!=='surface'))deny('DV32B_QUERY_INVALID',400);
 const surface=url.searchParams.get('surface');if(!['deputy','waste'].includes(surface))deny('DV32B_SURFACE_INVALID',400);
 let body=null;if(method!=='GET'){origin(req);const raw=await readBody(req);body=vetted(()=>method==='POST'?validatePlan(raw):validateDecision(raw))}
 const result=await withScope(cityId,user,'read',async(db,city,role)=>{
  const auth=await dv31Authorized(db,city,user,role,surface);await prerequisite(db);
  const prefix={schema:DV32B_SCHEMA,cityId:city.id,tenantId:city.tenant_id,viewerId:user.id,surface,governance:DV32B_GOVERNANCE};
  if(method==='GET'){
   const [p,r]=auth.ids.length?await Promise.all([
    db.query(`SELECT p.* FROM rhf_dv32_mission_plans p WHERE p.tenant_id=$1 AND p.municipality_id=$2 AND p.owner_org_id=ANY($3::uuid[]) AND p.target_org_id=ANY($3::uuid[]) ORDER BY p.created_at DESC LIMIT 81`,[city.tenant_id,city.id,auth.ids]),
    db.query(`SELECT d.* FROM rhf_dv32_dispatch_intents d JOIN service_cases c ON c.id=d.service_case_id AND c.tenant_id=d.tenant_id AND c.municipality_id=d.municipality_id AND c.unit_id=d.owner_org_id WHERE d.tenant_id=$1 AND d.municipality_id=$2 AND d.status='APPROVED_FOR_PLANNING' AND d.owner_org_id=ANY($3::uuid[]) AND d.target_org_id=ANY($3::uuid[]) AND c.status='RECEIVED' AND NOT EXISTS(SELECT 1 FROM rhf_dv32_mission_plans p WHERE p.dispatch_intent_id=d.id) ORDER BY d.reviewed_at DESC LIMIT 81`,[city.tenant_id,city.id,auth.ids])]):[{rows:[]},{rows:[]}];
   return {...prefix,access:{canPlan:auth.canCreate,canRelease:auth.canCreate},rows:p.rows.slice(0,80).map(x=>present(vetted(()=>checkScope(x,city,auth.ids)))),eligibleIntents:r.rows.slice(0,80).map(x=>({id:x.id,caseId:x.service_case_id,targetOrgId:x.target_org_id}))};
  }
  if(!auth.canCreate)deny('DV32B_OPERATIONAL_APPOINTMENT_REQUIRED');
  if(method==='POST'){
   const src=await intent(db,city,auth,body.intentId,true);await caseEligible(db,city,src,auth);
   // No implicit mission creation on planning submission.
   const hash=planHash(body);
   let r;
   try{r=await db.query(`INSERT INTO rhf_dv32_mission_plans(tenant_id,municipality_id,dispatch_intent_id,service_case_id,owner_org_id,target_org_id,request_key,input_hash,title,assignee,justification,dispatch_created_by,dispatch_reviewed_by,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT(tenant_id,municipality_id,request_key) DO NOTHING RETURNING *`,[city.tenant_id,city.id,src.id,src.service_case_id,src.owner_org_id,src.target_org_id,body.requestKey,hash,body.title,body.assignee,body.justification,src.created_by,src.reviewed_by,user.id]);}
   catch(e){if(e.code==='23505')deny('DV32B_INTENT_ALREADY_PLANNED',409);throw e;}
   if(!r.rows.length){const old=(await db.query('SELECT * FROM rhf_dv32_mission_plans WHERE tenant_id=$1 AND municipality_id=$2 AND request_key=$3',[city.tenant_id,city.id,body.requestKey])).rows[0];if(!old||old.created_by!==user.id||old.input_hash!==hash||old.dispatch_intent_id!==src.id)deny('DV32B_REQUEST_KEY_CONFLICT',409);return {...prefix,duplicate:true,row:present(vetted(()=>checkScope(old,city,auth.ids)))}}
   await audit(db,city,user,'MISSION_PLAN',r.rows[0].id,'DV32B_PROPOSED',{dispatchIntentId:src.id,caseId:src.service_case_id,missionCreated:false});
   return {...prefix,duplicate:false,row:present(vetted(()=>checkScope(r.rows[0],city,auth.ids)))};
  }
  const record=(await db.query('SELECT * FROM rhf_dv32_mission_plans WHERE id=$1 AND tenant_id=$2 AND municipality_id=$3 FOR UPDATE',[resourceId,city.tenant_id,city.id])).rows[0];
  const plan=vetted(()=>checkScope(record,city,auth.ids));
  if(!mayIndependentlyRelease(plan,user.id,auth.canCreate))deny('DV32B_INDEPENDENT_REVIEW_REQUIRED');
  if(body.version!==plan.version)deny('DV32B_VERSION_CONFLICT',409);
  const src=await intent(db,city,auth,plan.dispatch_intent_id,true);
  if(src.service_case_id!==plan.service_case_id||src.owner_org_id!==plan.owner_org_id||src.target_org_id!==plan.target_org_id)deny('DV32B_DISPATCH_DRIFT',409);
  await caseEligible(db,city,src,auth);
  let missionId=null;
  if(body.action==='RELEASE_MISSION'){
   await requireSafeMissionContract(db);
   // One mission per original case under this governed pathway; no dispatch, resource allocation or worker invocation.
   const prior=await db.query('SELECT id FROM missions WHERE case_id=$1 AND tenant_id=$2 AND municipality_id=$3 FOR SHARE',[plan.service_case_id,city.tenant_id,city.id]);
   if(prior.rows.length)deny('DV32B_CASE_ALREADY_HAS_MISSION',409);
   const mission=await db.query(`INSERT INTO missions(tenant_id,municipality_id,case_id,title,assignee) VALUES($1,$2,$3,$4,$5) RETURNING id,status`,[city.tenant_id,city.id,plan.service_case_id,plan.title,plan.assignee]);
   const st=String(mission.rows[0]?.status||'').toUpperCase();if(!['PENDING','PLANNED','NEW','CREATED','DRAFT'].includes(st))deny('DV32B_MISSION_INIT_STATUS_UNSAFE',409);
   missionId=mission.rows[0].id;
   await audit(db,city,user,'MISSION',missionId,'DV32B_MANUAL_CREATE',{caseId:plan.service_case_id,dispatchIntentId:src.id,planningOnly:true,fieldDispatch:false,allocated:false});
  }
  const status=body.action==='RELEASE_MISSION'?'MISSION_CREATED':'REJECTED';
  const out=await db.query(`UPDATE rhf_dv32_mission_plans SET status=$4,version=version+1,reviewed_by=$5,review_note=$6,reviewed_at=now(),mission_id=$7
   WHERE id=$1 AND tenant_id=$2 AND municipality_id=$3 AND version=$8 AND status='SUBMITTED' AND owner_org_id=$9 AND target_org_id=$10 AND created_by<>$5 AND dispatch_created_by<>$5 AND dispatch_reviewed_by<>$5 RETURNING *`,[plan.id,city.tenant_id,city.id,status,user.id,body.note,missionId,plan.version,plan.owner_org_id,plan.target_org_id]);
  if(out.rows.length!==1)deny('DV32B_CONCURRENT_REVIEW',409);
  await audit(db,city,user,'MISSION_PLAN',plan.id,status,{missionId,caseId:plan.service_case_id,fieldDispatch:false,valueVerified:false});
  return {...prefix,row:present(vetted(()=>checkScope(out.rows[0],city,auth.ids)))};
 });
 return json(method==='POST'?(result.duplicate?200:201):200,result);
}
