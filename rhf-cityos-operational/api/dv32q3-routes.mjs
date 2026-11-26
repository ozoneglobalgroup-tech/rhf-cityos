import {ClientError} from './domain.mjs';
import {UUID,validateRequest,validateLink,summarize} from './dv32q3-core.mjs';
const fail=(code,message)=>{throw new ClientError(message,code);};
const q=(client,city,sql,args=[])=>client.query(sql,[city.tenant_id,city.id,...args]);
export async function dv32q3MissionTraceRoute({method,resourceId,client,city,user,role,url,headers,readBody,audit}){
 try{validateRequest({method,resourceId,url,headers});}catch(e){fail(e.message==='METHOD_NOT_ALLOWED'?405:400,e.message);}
 if(!UUID.test(city.id)||!UUID.test(city.tenant_id)||
   (!['DEPUTY','MUNICIPAL_ADMIN'].includes(role)&&!user.is_system_admin))fail(403,'CITY_SCOPE_RESTRICTED');
 if(!['شیراز','شهرداری شیراز','shiraz','shiraz municipality'].includes(String(city.name||'').trim().toLowerCase()))
  fail(403,'SHIRAZ_PILOT_ONLY');
 if(method==='POST'){
  if(role!=='MUNICIPAL_ADMIN'&&!user.is_system_admin)fail(403,'ADMIN_ONLY_DRAFT_LINK');
  let b;try{b=validateLink(await readBody());}catch(e){fail(400,e.message);}
  const slot=await q(client,city,`SELECT slot,service_id,owner_unit_id,mapping_status FROM rhf_dv32q_mission_slots
   WHERE tenant_id=$1 AND municipality_id=$2 AND slot=$3 AND mapping_status='DRAFT_MAPPED'`,[b.slot]);
  if(slot.rowCount!==1)fail(409,'MAPPED_DRAFT_MISSION_REQUIRED');
  const sc=await q(client,city,`SELECT id,service_id,unit_id FROM service_cases WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3`,[b.caseId]);
  if(sc.rowCount!==1)fail(404,'CASE_NOT_FOUND_IN_CITY');
  // Strict mapping to a real, attributed service, never to an arbitrary mission title.
  if(!sc.rows[0].service_id||sc.rows[0].service_id!==slot.rows[0].service_id||
    (sc.rows[0].unit_id&&sc.rows[0].unit_id!==slot.rows[0].owner_unit_id))
   fail(409,'CASE_SERVICE_OR_OWNER_NOT_MATCHED');
  const saved=await q(client,city,`INSERT INTO rhf_dv32q3_case_mission_links
    (tenant_id,municipality_id,case_id,mission_slot,reason,linked_by)
    VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(tenant_id,municipality_id,case_id) DO NOTHING
    RETURNING case_id,mission_slot,created_at`,[b.caseId,b.slot,b.reason,user.id]);
  if(saved.rowCount!==1)fail(409,'CASE_MISSION_LINK_ALREADY_EXISTS');
  await audit(client,city,user,'DV32Q3_DRAFT_CASE_MISSION_TRACE',b.caseId,'PROVISIONAL_LINK',
   {caseId:b.caseId,slot:b.slot,reason:b.reason});
  return {schema:'RHF-DV32Q3-DRAFT-LINK-v1',saved:saved.rows[0],caseUpdated:false,
    resourceAllocated:false,fieldDispatch:false,temporalStarted:false,verifiedUrbanValue:false};
 }
 const [totals,slots,cases,links,territory]=await Promise.all([
  q(client,city,`SELECT (SELECT count(*)::int FROM service_cases WHERE tenant_id=$1 AND municipality_id=$2) AS total,
   (SELECT count(*)::int FROM rhf_dv32q3_case_mission_links WHERE tenant_id=$1 AND municipality_id=$2) AS linked,
   (SELECT count(*)::int FROM rhf_dv32q3_case_mission_links l JOIN service_cases sc ON sc.tenant_id=l.tenant_id AND sc.municipality_id=l.municipality_id AND sc.id=l.case_id
    JOIN rhf_dv32q_mission_slots m ON m.tenant_id=l.tenant_id AND m.municipality_id=l.municipality_id AND m.slot=l.mission_slot
    WHERE l.tenant_id=$1 AND l.municipality_id=$2 AND m.mapping_status='DRAFT_MAPPED' AND sc.service_id IS NOT NULL AND sc.service_id=m.service_id
    AND (sc.unit_id IS NULL OR sc.unit_id=m.owner_unit_id)) AS valid_linked`),
  q(client,city,`SELECT slot,title_fa,axis_code,service_id,owner_unit_id,mapping_status FROM rhf_dv32q_mission_slots
   WHERE tenant_id=$1 AND municipality_id=$2 AND mapping_status='DRAFT_MAPPED' ORDER BY slot LIMIT 18`),
  q(client,city,`SELECT id,service_id,unit_id,status,module_code FROM service_cases sc
   WHERE tenant_id=$1 AND municipality_id=$2 AND service_id IS NOT NULL
   AND NOT EXISTS(SELECT 1 FROM rhf_dv32q3_case_mission_links x WHERE x.tenant_id=sc.tenant_id AND x.municipality_id=sc.municipality_id AND x.case_id=sc.id)
   ORDER BY created_at DESC,id LIMIT 50`),
  q(client,city,`SELECT l.case_id,l.mission_slot,l.created_at,
   (m.mapping_status='DRAFT_MAPPED' AND sc.service_id IS NOT NULL AND sc.service_id=m.service_id
    AND (sc.unit_id IS NULL OR sc.unit_id=m.owner_unit_id)) IS TRUE AS current_match
   FROM rhf_dv32q3_case_mission_links l
   LEFT JOIN service_cases sc ON sc.tenant_id=l.tenant_id AND sc.municipality_id=l.municipality_id AND sc.id=l.case_id
   LEFT JOIN rhf_dv32q_mission_slots m ON m.tenant_id=l.tenant_id AND m.municipality_id=l.municipality_id AND m.slot=l.mission_slot
   WHERE l.tenant_id=$1 AND l.municipality_id=$2 ORDER BY l.created_at DESC,l.case_id LIMIT 100`),
  q(client,city,`SELECT count(*)::int AS n FROM rhf_dv32q_case_territory_links WHERE tenant_id=$1 AND municipality_id=$2`)
 ]);
 try{return summarize({city,role,isAdmin:user.is_system_admin,total:Number(totals.rows[0].total),
   linked:Number(totals.rows[0].linked),validLinked:Number(totals.rows[0].valid_linked),mapped:slots.rows.length,slots:slots.rows,cases:cases.rows,
   links:links.rows,territoryLinked:Number(territory.rows[0].n)});}catch(e){fail(409,e.message);}
}
