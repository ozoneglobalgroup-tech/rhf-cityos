/** DV3.2D — explicitly requested, independently approved reservation of aggregate capacity. */
import {ClientError} from './domain.mjs';
import {dv31Authorized} from './dv31-intake-routes.mjs';
import {SCHEMA,PARTS,GOVERNANCE,UUID,CapacityError,proposal,decision,fingerprint,inScope,eligible,resource,independent,display} from './dv32d-capacity-core.mjs';
export {PARTS as DV32D_PARTS};
const deny=(code,status=403)=>{throw new ClientError(code,status)};
const safe=(cb)=>{try{return cb()}catch(e){if(e instanceof CapacityError)deny(e.message,e.status);throw e}};
function sameOrigin(req){let o;try{o=new URL(req.headers?.origin||'')}catch{deny('DV32D_ORIGIN_REQUIRED')};if(o.host!==req.headers?.host||o.protocol!==(process.env.PUBLIC_HTTPS==='true'?'https:':'http:'))deny('DV32D_ORIGIN_MISMATCH');if(!/^application\/json(?:\s*;|$)/i.test(req.headers?.['content-type']||''))deny('DV32D_JSON_REQUIRED',415)}
async function migrated(db){const r=await db.query("SELECT to_regclass('public.rhf_dv32d_capacity_intents') IS NOT NULL AS ok");if(r.rows[0]?.ok!==true)deny('DV32D_MIGRATION_REQUIRED',409)}
const PLAN_SQL=`SELECT p.*, mp.status AS mission_plan_status, mp.service_case_id,
 m.status AS mission_status, c.status AS case_status
 FROM rhf_dv32c_resource_plans p
 JOIN rhf_dv32_mission_plans mp ON mp.id=p.mission_plan_id AND mp.mission_id=p.mission_id AND mp.tenant_id=p.tenant_id AND mp.municipality_id=p.municipality_id
 JOIN missions m ON m.id=p.mission_id AND m.tenant_id=p.tenant_id AND m.municipality_id=p.municipality_id AND m.case_id=mp.service_case_id
 JOIN service_cases c ON c.id=mp.service_case_id AND c.tenant_id=p.tenant_id AND c.municipality_id=p.municipality_id
 WHERE p.id=$1 AND p.tenant_id=$2 AND p.municipality_id=$3 AND p.owner_org_id=ANY($4::uuid[]) AND p.target_org_id=ANY($4::uuid[])`;
async function plan(db,city,ids,id,lock=false){const q=await db.query(PLAN_SQL+(lock?' FOR SHARE OF p,mp,m,c':''),[id,city.tenant_id,city.id,ids]);return safe(()=>eligible(q.rows[0],city,ids))}
async function getResource(db,city,id,p,lock=false){const q=await db.query(`SELECT * FROM capacity_resources WHERE id=$1 AND tenant_id=$2 AND municipality_id=$3 AND owner_unit_id=$4 ${lock?'FOR UPDATE':''}`,[id,city.tenant_id,city.id,p.target_org_id]);return safe(()=>resource(q.rows[0],p,city))}
async function available(db,city,id){const q=await db.query(`SELECT GREATEST(0::numeric,
 LEAST(r.total_quantity*r.allocatable_bps/10000::numeric, r.total_quantity*r.quality_bps/10000::numeric)-r.reserve_quantity
 -COALESCE((SELECT SUM(a.quantity) FROM capacity_allocations a WHERE a.tenant_id=r.tenant_id AND a.municipality_id=r.municipality_id AND a.resource_id=r.id AND a.status='RESERVED'),0::numeric)) AS available
 FROM capacity_resources r WHERE r.id=$1 AND r.tenant_id=$2 AND r.municipality_id=$3`,[id,city.tenant_id,city.id]);return String(q.rows[0]?.available??'0')}
async function getIntent(db,city,ids,id,lock=false){const q=await db.query(`SELECT * FROM rhf_dv32d_capacity_intents WHERE id=$1 AND tenant_id=$2 AND municipality_id=$3 AND owner_org_id=ANY($4::uuid[]) AND target_org_id=ANY($4::uuid[]) ${lock?'FOR UPDATE':''}`,[id,city.tenant_id,city.id,ids]);return safe(()=>inScope(q.rows[0],city,ids))}
export async function dv32dCapacityRoute({part,method,resourceId,url,req,cityId,user,withScope,readBody,json,audit}){
 if(!PARTS.includes(part)||!['GET','POST','PATCH'].includes(method))deny('DV32D_METHOD_NOT_ALLOWED',405);
 if((method==='PATCH'&&!UUID.test(resourceId||''))||(method!=='PATCH'&&resourceId))deny('DV32D_PATH_INVALID',404);
 if(url.searchParams.getAll('surface').length!==1||[...url.searchParams.keys()].some(x=>x!=='surface'))deny('DV32D_QUERY_INVALID',400);
 const surface=url.searchParams.get('surface');if(!['deputy','waste'].includes(surface))deny('DV32D_SURFACE_INVALID',400);
 // Validate the request shape and origin before opening any scoped transaction.
 let b=null;if(method!=='GET'){sameOrigin(req);const raw=await readBody(req);b=safe(()=>method==='POST'?proposal(raw):decision(raw))}
 const result=await withScope(cityId,user,'read',async(db,city,role)=>{
  const auth=await dv31Authorized(db,city,user,role,surface);await migrated(db);
  const common={schema:SCHEMA,cityId:city.id,tenantId:city.tenant_id,viewerId:user.id,surface,governance:GOVERNANCE};
  if(method==='GET'){
   const [plans,intents]=auth.ids.length?await Promise.all([
    db.query(`SELECT p.*,mp.status AS mission_plan_status,mp.service_case_id,m.status AS mission_status,c.status AS case_status FROM rhf_dv32c_resource_plans p JOIN rhf_dv32_mission_plans mp ON mp.id=p.mission_plan_id AND mp.mission_id=p.mission_id AND mp.tenant_id=p.tenant_id AND mp.municipality_id=p.municipality_id JOIN missions m ON m.id=p.mission_id AND m.tenant_id=p.tenant_id AND m.municipality_id=p.municipality_id AND m.case_id=mp.service_case_id JOIN service_cases c ON c.id=mp.service_case_id AND c.tenant_id=p.tenant_id AND c.municipality_id=p.municipality_id WHERE p.tenant_id=$1 AND p.municipality_id=$2 AND p.owner_org_id=ANY($3::uuid[]) AND p.target_org_id=ANY($3::uuid[]) AND p.status='APPROVED_FOR_ALLOCATION_PLANNING' ORDER BY p.reviewed_at DESC LIMIT 101`,[city.tenant_id,city.id,auth.ids]),
    db.query(`SELECT * FROM rhf_dv32d_capacity_intents WHERE tenant_id=$1 AND municipality_id=$2 AND owner_org_id=ANY($3::uuid[]) AND target_org_id=ANY($3::uuid[]) ORDER BY created_at DESC LIMIT 101`,[city.tenant_id,city.id,auth.ids])
   ]):[{rows:[]},{rows:[]}];
   const eligiblePlans=[];for(const p of plans.rows){try{eligiblePlans.push(safe(()=>eligible(p,city,auth.ids)))}catch(e){if(!(e instanceof ClientError))throw e}}
   const targets=[...new Set(eligiblePlans.map(p=>p.target_org_id))];
   const resources=targets.length?(await db.query(`SELECT r.id,r.code,r.name_fa,r.resource_kind,r.unit,r.owner_unit_id,r.total_quantity,r.reserve_quantity,r.allocatable_bps,r.quality_bps,r.authorized,
    GREATEST(0::numeric,LEAST(r.total_quantity*r.allocatable_bps/10000::numeric,r.total_quantity*r.quality_bps/10000::numeric)-r.reserve_quantity-COALESCE((SELECT SUM(a.quantity) FROM capacity_allocations a WHERE a.tenant_id=r.tenant_id AND a.municipality_id=r.municipality_id AND a.resource_id=r.id AND a.status='RESERVED'),0::numeric)) AS available
    FROM capacity_resources r WHERE r.tenant_id=$1 AND r.municipality_id=$2 AND r.owner_unit_id=ANY($3::uuid[]) AND r.authorized=TRUE AND r.resource_kind IN ('STAFF_HOURS','FLEET_HOURS','EQUIPMENT_HOURS') ORDER BY r.name_fa LIMIT 151`,[city.tenant_id,city.id,targets])).rows:[];
   return {...common,access:{canRequest:auth.canCreate,canDecide:auth.canCreate},plans:eligiblePlans.slice(0,100).map(p=>({id:p.id,missionId:p.mission_id,targetOrgId:p.target_org_id,personnelRequired:p.personnel_required,vehiclesRequired:p.vehicles_required,schedule:p.schedule})),resources:resources.slice(0,150).map(r=>({id:r.id,code:r.code,title:r.name_fa,kind:r.resource_kind,unit:r.unit,targetOrgId:r.owner_unit_id,nominal:String(r.total_quantity),available:String(r.available)})),requests:intents.rows.slice(0,100).map(r=>display(safe(()=>inScope(r,city,auth.ids)))),truncated:plans.rows.length>100||intents.rows.length>100||resources.length>150};
  }
  if(!auth.canCreate)deny('DV32D_OPERATIONAL_APPOINTMENT_REQUIRED');
  if(method==='POST'){
   const p=await plan(db,city,auth.ids,b.resourcePlanId,true);await getResource(db,city,b.resourceId,p);
   const h=fingerprint(b);let inserted;
   try{inserted=await db.query(`INSERT INTO rhf_dv32d_capacity_intents(tenant_id,municipality_id,resource_plan_id,mission_id,case_id,owner_org_id,target_org_id,resource_id,request_key,quantity,justification,input_hash,resource_plan_created_by,resource_plan_reviewed_by,mission_created_by,mission_reviewed_by,created_by)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::numeric,$11,$12,$13,$14,$15,$16,$17)
   ON CONFLICT(tenant_id,municipality_id,request_key) DO NOTHING RETURNING *`,[city.tenant_id,city.id,p.id,p.mission_id,p.service_case_id,p.owner_org_id,p.target_org_id,b.resourceId,b.requestKey,b.quantity,b.justification,h,p.created_by,p.reviewed_by,p.mission_created_by,p.mission_reviewed_by,user.id]);}catch(e){if(e.code==='23505')deny('DV32D_DUPLICATE_CONFLICT',409);throw e}
   if(!inserted.rows.length){const old=(await db.query(`SELECT * FROM rhf_dv32d_capacity_intents WHERE request_key=$1 AND tenant_id=$2 AND municipality_id=$3 AND owner_org_id=ANY($4::uuid[]) AND target_org_id=ANY($4::uuid[])`,[b.requestKey,city.tenant_id,city.id,auth.ids])).rows[0];if(!old||old.created_by!==user.id||old.input_hash!==h||old.resource_plan_id!==p.id||old.resource_id!==b.resourceId)deny('DV32D_REQUEST_KEY_CONFLICT',409);return {...common,duplicate:true,request:display(old)}}
   await audit(db,city,user,'CAPACITY_RESERVATION_INTENT',inserted.rows[0].id,'DV32D_SUBMITTED',{missionId:p.mission_id,resourceId:b.resourceId,quantity:b.quantity,reserved:false});
   return {...common,duplicate:false,request:display(inserted.rows[0])};
  }
  const intent=await getIntent(db,city,auth.ids,resourceId,true);
  if(intent.version!==b.version)deny('DV32D_VERSION_CONFLICT',409);
  if(b.action==='RELEASE'){
   if(intent.status!=='RESERVED'||!intent.allocation_id||intent.created_by===user.id||intent.reviewed_by===user.id)deny('DV32D_RELEASE_REQUIRES_SEPARATE_AUTHORITY',403);
   const allocation=(await db.query(`SELECT id,status,resource_id,case_id,quantity FROM capacity_allocations WHERE id=$1 AND tenant_id=$2 AND municipality_id=$3 AND resource_id=$4 AND case_id=$5 FOR UPDATE`,[intent.allocation_id,city.tenant_id,city.id,intent.resource_id,intent.case_id])).rows[0];
   if(!allocation||allocation.status!=='RESERVED'||String(allocation.quantity)!==String(intent.quantity))deny('DV32D_ALLOCATION_DRIFT',409);
   const changed=await db.query(`UPDATE capacity_allocations SET status='RELEASED',released_at=now() WHERE id=$1 AND tenant_id=$2 AND municipality_id=$3 AND resource_id=$4 AND status='RESERVED' RETURNING id`,[allocation.id,city.tenant_id,city.id,intent.resource_id]);
   if(changed.rows.length!==1)deny('DV32D_RELEASE_CONFLICT',409);
   const record=await db.query(`UPDATE rhf_dv32d_capacity_intents SET status='RELEASED',version=version+1,released_by=$4,release_note=$5,released_at=now() WHERE id=$1 AND tenant_id=$2 AND municipality_id=$3 AND status='RESERVED' AND version=$6 RETURNING *`,[intent.id,city.tenant_id,city.id,user.id,b.note,b.version]);
   if(record.rows.length!==1)deny('DV32D_RELEASE_VERSION_CONFLICT',409);
   await audit(db,city,user,'CAPACITY_RESERVATION',intent.id,'DV32D_RELEASED',{allocationId:intent.allocation_id,resourceId:intent.resource_id,fieldDispatch:false});
   return {...common,request:display(record.rows[0])};
  }
  if(!independent(intent,user.id))deny('DV32D_INDEPENDENT_REVIEW_REQUIRED');
  const p=await plan(db,city,auth.ids,intent.resource_plan_id,true);
  if(p.mission_id!==intent.mission_id||p.service_case_id!==intent.case_id||p.owner_org_id!==intent.owner_org_id||p.target_org_id!==intent.target_org_id||p.created_by!==intent.resource_plan_created_by||p.reviewed_by!==intent.resource_plan_reviewed_by)deny('DV32D_SOURCE_DRIFT',409);
  if(b.action==='REJECT'){
   const updated=await db.query(`UPDATE rhf_dv32d_capacity_intents SET status='REJECTED',version=version+1,reviewed_by=$4,review_note=$5,reviewed_at=now() WHERE id=$1 AND tenant_id=$2 AND municipality_id=$3 AND status='SUBMITTED' AND version=$6 RETURNING *`,[intent.id,city.tenant_id,city.id,user.id,b.note,b.version]);
   if(updated.rows.length!==1)deny('DV32D_REVIEW_CONFLICT',409);
   await audit(db,city,user,'CAPACITY_RESERVATION_INTENT',intent.id,'DV32D_REJECTED',{resourceId:intent.resource_id,allocationPerformed:false});
   return {...common,request:display(updated.rows[0])};
  }
  // Every reservation of a given resource must lock the same resource row before summing active reservations.
  // Other allocation writers must honor that locking contract; this release does not attest external writers.
  await getResource(db,city,intent.resource_id,p,true);
  const free=await available(db,city,intent.resource_id);
  const feasible=(await db.query(`SELECT ($1::numeric <= $2::numeric) AS enough`,[String(intent.quantity),free])).rows[0]?.enough===true;
  if(!feasible)deny('DV32D_INSUFFICIENT_POOL_CAPACITY',409);
  let reservation;
  try{reservation=await db.query(`INSERT INTO capacity_allocations(tenant_id,municipality_id,resource_id,case_id,quantity,status,request_key,justification,created_by) VALUES($1,$2,$3,$4,$5::numeric,'RESERVED',$6,$7,$8) RETURNING *`,[city.tenant_id,city.id,intent.resource_id,intent.case_id,String(intent.quantity),intent.request_key,intent.justification,user.id]);}
  catch(e){if(e.code==='23505')deny('DV32D_CAPACITY_REQUEST_KEY_CONFLICT',409);throw e}
  if(reservation.rows.length!==1)deny('DV32D_RESERVATION_NOT_CREATED',409);
  const updated=await db.query(`UPDATE rhf_dv32d_capacity_intents SET status='RESERVED',version=version+1,reviewed_by=$4,review_note=$5,reviewed_at=now(),allocation_id=$6 WHERE id=$1 AND tenant_id=$2 AND municipality_id=$3 AND status='SUBMITTED' AND version=$7 RETURNING *`,[intent.id,city.tenant_id,city.id,user.id,b.note,reservation.rows[0].id,b.version]);
  if(updated.rows.length!==1)deny('DV32D_APPROVAL_CONFLICT',409);
  await audit(db,city,user,'CAPACITY_RESERVATION',intent.id,'DV32D_RESERVED',{allocationId:reservation.rows[0].id,resourceId:intent.resource_id,quantity:String(intent.quantity),fieldDispatch:false,missionStateChanged:false});
  return {...common,availableBefore:free,request:display(updated.rows[0])};
 });
 return json(method==='POST'?(result.duplicate?200:201):200,result);
}
