import {ClientError} from './domain.mjs';
import {UUID,validateRequest,summarize} from './dv32q4-core.mjs';
const fail=(code,msg)=>{throw new ClientError(msg,code);};
const query=(client,city,sql)=>client.query(sql,[city.tenant_id,city.id]);
export async function dv32q4MappingWorklistRoute({method,resourceId,client,city,user,role,url}){
 try{validateRequest({method,resourceId,url});}catch(e){fail(method==='GET'?400:405,e.message);}
 if(!UUID.test(city.id)||!UUID.test(city.tenant_id)||(!['DEPUTY','MUNICIPAL_ADMIN'].includes(role)&&!user.is_system_admin))fail(403,'CITY_SCOPE_DENIED');
 if(!['شیراز','شهرداری شیراز','shiraz','shiraz municipality'].includes(String(city.name||'').trim().toLowerCase()))fail(403,'SHIRAZ_PILOT_ONLY');
 // Everything executes in the server's existing withScope read-only transaction.
 // The case classifier is exhaustive and avoids implying that an unmapped case is ready.
 const [aggregate,candidates,services,slots,areas]=await Promise.all([
 query(client,city,`WITH c AS (
 SELECT sc.id,sc.service_id,sc.unit_id,
 EXISTS(SELECT 1 FROM rhf_dv32q3_case_mission_links l WHERE l.tenant_id=sc.tenant_id AND l.municipality_id=sc.municipality_id AND l.case_id=sc.id) linked,
 (SELECT count(*)::int FROM rhf_dv32q_mission_slots m WHERE m.tenant_id=sc.tenant_id AND m.municipality_id=sc.municipality_id AND m.mapping_status='DRAFT_MAPPED' AND m.service_id=sc.service_id) same_service,
 (SELECT count(*)::int FROM rhf_dv32q_mission_slots m WHERE m.tenant_id=sc.tenant_id AND m.municipality_id=sc.municipality_id AND m.mapping_status='DRAFT_MAPPED' AND m.service_id=sc.service_id AND (sc.unit_id IS NULL OR sc.unit_id=m.owner_unit_id)) matching
 FROM service_cases sc WHERE sc.tenant_id=$1 AND sc.municipality_id=$2),
 k AS(SELECT CASE
 WHEN linked THEN 'EXISTING_DRAFT_LINK_REVIEW'
 WHEN service_id IS NULL THEN 'CASE_WITHOUT_SERVICE'
 WHEN same_service=0 THEN 'SERVICE_NOT_MAPPED_TO_MISSION'
 WHEN matching=0 THEN 'OWNER_UNIT_MISMATCH'
 WHEN matching>1 THEN 'AMBIGUOUS_MISSION_MAPPING'
 ELSE 'ELIGIBLE_FOR_EXPLICIT_MANUAL_LINK' END code FROM c)
 SELECT count(*)::int total,
 count(*) FILTER(WHERE code='EXISTING_DRAFT_LINK_REVIEW')::int AS existing,
 count(*) FILTER(WHERE code='CASE_WITHOUT_SERVICE')::int AS no_service,
 count(*) FILTER(WHERE code='SERVICE_NOT_MAPPED_TO_MISSION')::int AS unmapped,
 count(*) FILTER(WHERE code='OWNER_UNIT_MISMATCH')::int AS mismatch,
 count(*) FILTER(WHERE code='AMBIGUOUS_MISSION_MAPPING')::int AS ambiguous,
 count(*) FILTER(WHERE code='ELIGIBLE_FOR_EXPLICIT_MANUAL_LINK')::int AS eligible FROM k`),
 query(client,city,`SELECT sc.id AS case_id,sc.service_id,m.slot AS mission_slot,sc.module_code,sc.status
 FROM service_cases sc
 JOIN rhf_dv32q_mission_slots m ON m.tenant_id=sc.tenant_id AND m.municipality_id=sc.municipality_id AND m.service_id=sc.service_id AND m.mapping_status='DRAFT_MAPPED' AND (sc.unit_id IS NULL OR sc.unit_id=m.owner_unit_id)
 WHERE sc.tenant_id=$1 AND sc.municipality_id=$2
 AND NOT EXISTS(SELECT 1 FROM rhf_dv32q3_case_mission_links l WHERE l.tenant_id=sc.tenant_id AND l.municipality_id=sc.municipality_id AND l.case_id=sc.id)
 AND (SELECT count(*) FROM rhf_dv32q_mission_slots mx WHERE mx.tenant_id=sc.tenant_id AND mx.municipality_id=sc.municipality_id AND mx.service_id=sc.service_id AND mx.mapping_status='DRAFT_MAPPED' AND (sc.unit_id IS NULL OR sc.unit_id=mx.owner_unit_id))=1
 ORDER BY sc.created_at DESC,sc.id LIMIT 100`),
 query(client,city,`SELECT s.id,s.name_fa,s.code,s.owner_unit_id,count(sc.id)::int AS case_count,
 EXISTS(SELECT 1 FROM rhf_dv32q_mission_slots m WHERE m.tenant_id=s.tenant_id AND m.municipality_id=s.municipality_id AND m.service_id=s.id AND m.mapping_status='DRAFT_MAPPED') AS mapped
 FROM service_definitions s LEFT JOIN service_cases sc ON sc.tenant_id=s.tenant_id AND sc.municipality_id=s.municipality_id AND sc.service_id=s.id
 WHERE s.tenant_id=$1 AND s.municipality_id=$2 AND s.active
 GROUP BY s.tenant_id,s.municipality_id,s.id,s.name_fa,s.code,s.owner_unit_id
 ORDER BY count(sc.id) DESC,s.code LIMIT 60`),
 query(client,city,`SELECT slot,mapping_status,title_fa,axis_code,service_id,owner_unit_id FROM rhf_dv32q_mission_slots
 WHERE tenant_id=$1 AND municipality_id=$2 ORDER BY slot LIMIT 18`),
 query(client,city,`SELECT count(*) FILTER(WHERE kind='DISTRICT')::int AS district,
 count(*) FILTER(WHERE code='GARDENS')::int AS gardens FROM rhf_dv32q_pilot_territories WHERE tenant_id=$1 AND municipality_id=$2`)
 ]);
 const a=aggregate.rows[0];
 try{return summarize({city,role,isAdmin:user.is_system_admin,counts:{total:a.total,
  EXISTING_DRAFT_LINK_REVIEW:a.existing,CASE_WITHOUT_SERVICE:a.no_service,
  SERVICE_NOT_MAPPED_TO_MISSION:a.unmapped,OWNER_UNIT_MISMATCH:a.mismatch,
  AMBIGUOUS_MISSION_MAPPING:a.ambiguous,ELIGIBLE_FOR_EXPLICIT_MANUAL_LINK:a.eligible},
 candidates:candidates.rows,services:services.rows,slots:slots.rows,areas:areas.rows[0]});}
 catch(e){fail(409,e.message);}
}
