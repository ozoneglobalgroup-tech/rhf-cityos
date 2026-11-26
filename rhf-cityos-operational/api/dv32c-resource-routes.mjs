/** DV3.2C — governed resource REQUIREMENTS and HSE assessment, no actual allocation or field action. */
import {ClientError} from './domain.mjs';
import {dv31Authorized} from './dv31-intake-routes.mjs';
import {DV32C_SCHEMA,DV32C_GOVERNANCE,UUID,ResourceError,validateProposal,validateReview,fingerprint,scope,eligibleMissionPlan,independent,present} from './dv32c-resource-core.mjs';
export const DV32C_PARTS=Object.freeze(['dv32-resource-plans']);
const deny=(code,status=403)=>{throw new ClientError(code,status)};
function safe(fn){try{return fn()}catch(e){if(e instanceof ResourceError)deny(e.message,e.status);throw e}}
function origin(req){let u;try{u=new URL(req.headers?.origin||'')}catch{deny('DV32C_ORIGIN_REQUIRED')};if(u.host!==req.headers?.host||u.protocol!==(process.env.PUBLIC_HTTPS==='true'?'https:':'http:'))deny('DV32C_ORIGIN_MISMATCH');if(!/^application\/json(?:\s*;|$)/i.test(req.headers?.['content-type']||''))deny('DV32C_JSON_REQUIRED',415)}
async function ready(db){const r=await db.query("SELECT to_regclass('public.rhf_dv32c_resource_plans') IS NOT NULL AS ready");if(r.rows[0]?.ready!==true)deny('DV32C_MIGRATION_REQUIRED',409)}
async function sourcePlan(db,city,ids,id,lock=false){const q=await db.query(`SELECT * FROM rhf_dv32_mission_plans WHERE id=$1 AND tenant_id=$2 AND municipality_id=$3 AND owner_org_id=ANY($4::uuid[]) AND target_org_id=ANY($4::uuid[]) ${lock?'FOR SHARE':''}`,[id,city.tenant_id,city.id,ids]);return safe(()=>eligibleMissionPlan(q.rows[0],city,ids))}
async function missionValid(db,city,p){const r=await db.query('SELECT id,status FROM missions WHERE id=$1 AND tenant_id=$2 AND municipality_id=$3 AND case_id=$4 FOR SHARE',[p.mission_id,city.tenant_id,city.id,p.service_case_id]);if(!r.rows.length||!['PENDING','PLANNED','NEW','CREATED','DRAFT'].includes(String(r.rows[0].status).toUpperCase()))deny('DV32C_MISSION_NOT_IN_PLANNING',409)}
export async function dv32cResourceRoute({part,method,resourceId,url,req,cityId,user,withScope,readBody,json,audit}){
 if(part!=='dv32-resource-plans'||!['GET','POST','PATCH'].includes(method))deny('DV32C_METHOD_NOT_ALLOWED',405);
 if((method==='PATCH'&&!UUID.test(resourceId||''))||(method!=='PATCH'&&resourceId))deny('DV32C_PATH_INVALID',404);
 if(url.searchParams.getAll('surface').length!==1||[...url.searchParams.keys()].some(x=>x!=='surface'))deny('DV32C_QUERY_INVALID',400);
 const surface=url.searchParams.get('surface');if(!['deputy','waste'].includes(surface))deny('DV32C_SURFACE_INVALID',400);
 let body=null;if(method!=='GET'){origin(req);const raw=await readBody(req);body=safe(()=>method==='POST'?validateProposal(raw):validateReview(raw))}
 const out=await withScope(cityId,user,'read',async(db,city,role)=>{
  const auth=await dv31Authorized(db,city,user,role,surface);await ready(db);
  const common={schema:DV32C_SCHEMA,cityId:city.id,tenantId:city.tenant_id,viewerId:user.id,surface,governance:DV32C_GOVERNANCE};
  if(method==='GET'){
   const [p,m]=auth.ids.length?await Promise.all([
    db.query('SELECT * FROM rhf_dv32c_resource_plans WHERE tenant_id=$1 AND municipality_id=$2 AND owner_org_id=ANY($3::uuid[]) AND target_org_id=ANY($3::uuid[]) ORDER BY created_at DESC LIMIT 81',[city.tenant_id,city.id,auth.ids]),
    db.query(`SELECT p.* FROM rhf_dv32_mission_plans p JOIN missions m ON m.id=p.mission_id AND m.tenant_id=p.tenant_id AND m.municipality_id=p.municipality_id AND m.case_id=p.service_case_id WHERE p.tenant_id=$1 AND p.municipality_id=$2 AND p.status='MISSION_CREATED' AND p.owner_org_id=ANY($3::uuid[]) AND p.target_org_id=ANY($3::uuid[]) AND m.status IN ('PENDING','PLANNED','NEW','CREATED','DRAFT') AND NOT EXISTS(SELECT 1 FROM rhf_dv32c_resource_plans r WHERE r.mission_plan_id=p.id) ORDER BY p.reviewed_at DESC LIMIT 81`,[city.tenant_id,city.id,auth.ids])
   ]):[{rows:[]},{rows:[]}];
   return {...common,access:{canPropose:auth.canCreate,canReview:auth.canCreate},rows:p.rows.slice(0,80).map(x=>present(safe(()=>scope(x,city,auth.ids)))),eligibleMissions:m.rows.slice(0,80).map(x=>({missionPlanId:x.id,missionId:x.mission_id,title:x.title,targetOrgId:x.target_org_id}))};
  }
  if(!auth.canCreate)deny('DV32C_OPERATIONAL_APPOINTMENT_REQUIRED');
  if(method==='POST'){
   const missionPlan=await sourcePlan(db,city,auth.ids,body.missionPlanId,true);await missionValid(db,city,missionPlan);
   const hash=fingerprint(body);let r;
   try{r=await db.query(`INSERT INTO rhf_dv32c_resource_plans(tenant_id,municipality_id,mission_plan_id,mission_id,owner_org_id,target_org_id,request_key,input_hash,personnel_required,vehicles_required,equipment,hse_assessment,schedule,justification,mission_created_by,mission_reviewed_by,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) ON CONFLICT(tenant_id,municipality_id,request_key) DO NOTHING RETURNING *`,[city.tenant_id,city.id,missionPlan.id,missionPlan.mission_id,missionPlan.owner_org_id,missionPlan.target_org_id,body.requestKey,hash,body.personnelRequired,body.vehiclesRequired,body.equipment,body.hseAssessment,body.schedule,body.justification,missionPlan.created_by,missionPlan.reviewed_by,user.id])}
   catch(e){if(e.code==='23505')deny('DV32C_MISSION_ALREADY_HAS_RESOURCE_PLAN',409);throw e}
   if(!r.rows.length){const old=(await db.query('SELECT * FROM rhf_dv32c_resource_plans WHERE tenant_id=$1 AND municipality_id=$2 AND request_key=$3 AND owner_org_id=ANY($4::uuid[]) AND target_org_id=ANY($4::uuid[])',[city.tenant_id,city.id,body.requestKey,auth.ids])).rows[0];if(!old||old.created_by!==user.id||old.input_hash!==hash||old.mission_plan_id!==missionPlan.id)deny('DV32C_REQUEST_KEY_CONFLICT',409);return {...common,duplicate:true,row:present(safe(()=>scope(old,city,auth.ids)))}}
   await audit(db,city,user,'MISSION_RESOURCE_PLAN',r.rows[0].id,'DV32C_SUBMITTED',{missionId:missionPlan.mission_id,allocationPerformed:false,fieldDispatch:false});
   return {...common,duplicate:false,row:present(safe(()=>scope(r.rows[0],city,auth.ids)))};
  }
  const prior=(await db.query('SELECT * FROM rhf_dv32c_resource_plans WHERE id=$1 AND tenant_id=$2 AND municipality_id=$3 AND owner_org_id=ANY($4::uuid[]) AND target_org_id=ANY($4::uuid[]) FOR UPDATE',[resourceId,city.tenant_id,city.id,auth.ids])).rows[0];
  const rec=safe(()=>scope(prior,city,auth.ids));if(!independent(rec,user.id,auth.canCreate))deny('DV32C_INDEPENDENT_REVIEW_REQUIRED');if(rec.version!==body.version)deny('DV32C_VERSION_CONFLICT',409);
  const missionPlan=await sourcePlan(db,city,auth.ids,rec.mission_plan_id,true);if(missionPlan.mission_id!==rec.mission_id||missionPlan.owner_org_id!==rec.owner_org_id||missionPlan.target_org_id!==rec.target_org_id)deny('DV32C_SOURCE_DRIFT',409);await missionValid(db,city,missionPlan);
  const status=body.action==='APPROVE_PLAN'?'APPROVED_FOR_ALLOCATION_PLANNING':'REJECTED';
  const d=await db.query(`UPDATE rhf_dv32c_resource_plans SET status=$4,version=version+1,reviewed_by=$5,review_note=$6,reviewed_at=now() WHERE id=$1 AND tenant_id=$2 AND municipality_id=$3 AND version=$7 AND status='SUBMITTED' AND created_by<>$5 AND mission_created_by<>$5 AND mission_reviewed_by<>$5 AND owner_org_id=$8 AND target_org_id=$9 RETURNING *`,[rec.id,city.tenant_id,city.id,status,user.id,body.note,rec.version,rec.owner_org_id,rec.target_org_id]);
  if(d.rows.length!==1)deny('DV32C_CONCURRENT_REVIEW',409);
  await audit(db,city,user,'MISSION_RESOURCE_PLAN',rec.id,status,{missionId:rec.mission_id,allocationPerformed:false,fieldDispatch:false,missionStateChanged:false});
  return {...common,row:present(safe(()=>scope(d.rows[0],city,auth.ids)))};
 });
 return json(method==='POST'?(out.duplicate?200:201):200,out);
}
