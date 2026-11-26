// Runs only within operational server withScope() transaction; never bypass RLS.
import {ClientError} from './domain.mjs';
import {UUID,adminAllowed,cityReadAllowed,isShiraz,validateCoverageRequest,validateMapping,summarizeCoverage} from './dv32q-coverage-core.mjs';
const fail=(status,msg)=>{throw new ClientError(msg,status);};
const q=(client,city,sql,more=[])=>client.query(sql,[city.tenant_id,city.id,...more]);
export async function dv32qCoverageRoute({method,resourceId,client,city,user,role,url,headers,readBody,audit}){
 try{validateCoverageRequest({method,resourceId,url,headers});}catch(e){fail(e.message==='METHOD_NOT_ALLOWED'?405:400,e.message);}
 if(!cityReadAllowed(role,user.is_system_admin))fail(403,'CITY_WIDE_DRAFT_CATALOG_RESTRICTED');
 if(method==='POST'){
  if(!adminAllowed(role,user.is_system_admin))fail(403,'MUNICIPAL_ADMIN_MAPPING_REQUIRED');
  if(!isShiraz(city.name))fail(403,'SHIRAZ_PILOT_ONLY');
  // Deliberately refuse mapping when the canonical mission title is not supplied by an authorized human.
  let body;try{body=validateMapping(await readBody());}catch(e){fail(400,e.message);}
  const foundUnit=(await q(client,city,`SELECT id FROM org_units WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 AND active LIMIT 1`,[body.ownerUnitId])).rows;
  if(foundUnit.length!==1)fail(409,'OWNER_UNIT_NOT_ACTIVE_IN_SAME_CITY');
  const foundService=(await q(client,city,`SELECT id,owner_unit_id FROM service_definitions WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 AND active LIMIT 1`,[body.serviceId])).rows;
  if(foundService.length!==1)fail(409,'SERVICE_NOT_ACTIVE_IN_SAME_CITY');
  // Where a service already has an owner, it must match the supplied owning unit (no cross-org assignment).
  if(foundService[0].owner_unit_id && foundService[0].owner_unit_id!==body.ownerUnitId)
   fail(409,'SERVICE_OWNER_UNIT_MISMATCH');
  const result=(await q(client,city,`UPDATE rhf_dv32q_mission_slots SET title_fa=$4,axis_code=$5,owner_unit_id=$6,
     service_id=$7,mapping_status='DRAFT_MAPPED',justification=$8,mapped_by=$9,mapped_at=now()
     WHERE tenant_id=$1 AND municipality_id=$2 AND slot=$3
     RETURNING id,slot,mapping_status,mapped_at`,[body.slot,body.title,body.axisCode,body.ownerUnitId,body.serviceId,body.reason,user.id])).rows;
  if(result.length!==1)fail(409,'MISSION_DRAFT_SLOT_UNAVAILABLE');
  await audit(client,city,user,'DV32Q_MISSION_DRAFT',result[0].id,'DRAFT_MAPPED',
    {slot:body.slot,axisCode:body.axisCode,ownerUnitId:body.ownerUnitId,serviceId:body.serviceId,reason:body.reason});
  return {schema:'RHF-DV32Q-MISSION-DRAFT-v1',saved:result[0],planningOnly:true,
   officialTaxonomyCertified:false,operationalAssignment:false,fieldDispatch:false,verifiedUrbanValue:false};
 }
 const [territories,axes,slots,units,services]=await Promise.all([
  q(client,city,`SELECT code,name_fa,kind,verification_status FROM rhf_dv32q_pilot_territories WHERE tenant_id=$1 AND municipality_id=$2 ORDER BY code`),
  q(client,city,`SELECT code,name_fa,verification_status FROM rhf_dv32q_pilot_axes WHERE tenant_id=$1 AND municipality_id=$2 ORDER BY code`),
  q(client,city,`SELECT slot,title_fa,axis_code,owner_unit_id,service_id,mapping_status,mapped_at FROM rhf_dv32q_mission_slots WHERE tenant_id=$1 AND municipality_id=$2 ORDER BY slot`),
  q(client,city,`SELECT id,name_fa,kind FROM org_units WHERE tenant_id=$1 AND municipality_id=$2 AND active ORDER BY name_fa LIMIT 201`),
  q(client,city,`SELECT id,code,name_fa,module_code,owner_unit_id FROM service_definitions WHERE tenant_id=$1 AND municipality_id=$2 AND active ORDER BY code LIMIT 201`)
 ]);
 if(units.rows.length>200||services.rows.length>200)fail(409,'CATALOG_SELECTION_TRUNCATED_REQUIRES_PAGINATION');
 const output=summarizeCoverage({territories:territories.rows,axes:axes.rows,slots:slots.rows,units:units.rows,services:services.rows,city});
 output.permissions={canMapDraft:adminAllowed(role,user.is_system_admin),canRead:true};
 return output;
}
