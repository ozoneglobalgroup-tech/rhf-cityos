// Governed real service-case DRAFT intake only, never dispatch or automatic execution.
import {ClientError} from './domain.mjs';
import {contract,scopeCheck,validateCase,validateRead} from './dv32ux6-case-core.mjs';
const refuse=(status,message)=>{throw new ClientError(message,status)};
const run=(client,city,sql,args=[])=>client.query(sql,[city.tenant_id,city.id,...args]);
export async function dv32ux6CaseIntakeRoute({method,resourceId,url,headers,client,city,user,role,readBody,audit}){
 try{contract({method,resourceId,url,headers})}catch(e){refuse(e.message==='METHOD_NOT_ALLOWED'?405:400,e.message)}
 try{scopeCheck(city,role,user,method)}catch(e){refuse(403,e.message)}
 if(method==='POST'){
  let a;try{a=validateCase(await readBody())}catch(e){refuse(400,e.message)}
  const service=await run(client,city,`SELECT s.id,s.module_code,s.owner_unit_id,s.sla_hours
   FROM public.service_definitions s JOIN public.org_units u ON u.id=s.owner_unit_id
    AND u.tenant_id=s.tenant_id AND u.municipality_id=s.municipality_id
   WHERE s.tenant_id=$1 AND s.municipality_id=$2 AND s.id=$3
    AND s.active=true AND u.active=true LIMIT 1`,[a.serviceId]);
  if(service.rowCount!==1)refuse(409,'ACTIVE_SERVICE_AND_OWNER_REQUIRED');
  const s=service.rows[0];
  let saved;
  try{
   saved=await run(client,city,`INSERT INTO public.service_cases
    (id,tenant_id,municipality_id,module_code,unit_id,summary,description,priority,evidence,acceptance_note,status,created_by,created_at,updated_at,service_id,due_at)
    VALUES ($3,$1,$2,$4,$5,$6,$7,$8,$9,$10,'DRAFT',$11,now(),now(),$12,now()+($13::integer*interval '1 hour'))
    RETURNING id,status,service_id,created_at`,
   [a.requestId,s.module_code,s.owner_unit_id,a.summary,a.description,a.priority,a.evidenceNote,
    `INTAKE_SOURCE:${a.sourceReference}; OPERATOR_ATTESTED; NOT_INDEPENDENTLY_VERIFIED`,user.id,a.serviceId,s.sla_hours]);
  }catch(e){if(['23505','23503','23514','42501','22P02','22001'].includes(e.code))refuse(409,'CASE_DATABASE_CONSTRAINT_OR_PERMISSION_BLOCKED');throw e}
  if(saved.rowCount!==1)refuse(409,'CASE_NOT_CREATED');
  await audit(client,city,user,'DV32UX6_GOVERNED_CASE_INTAKE',saved.rows[0].id,'REAL_CASE_DRAFT_CREATED_BY_ADMIN',
   {sourceReference:a.sourceReference,priority:a.priority,operatorAttested:true,notIndependentlyVerified:true,simulation:false});
  return {schema:'RHF-DV32UX6-CASE-CREATED-v1',cityId:city.id,tenantId:city.tenant_id,
   caseId:saved.rows[0].id,status:'DRAFT',serviceId:a.serviceId,createdAt:saved.rows[0].created_at,
   manualReviewRequired:true,workflowStarted:false,automaticFieldDispatch:false,verifiedUrbanValue:false,finalGo:'NO_GO'};
 }
 const [sv,cs]=await Promise.all([
  run(client,city,`SELECT s.id,s.code,s.name_fa,s.module_code,s.owner_unit_id,s.active,u.active AS owner_active
   FROM public.service_definitions s JOIN public.org_units u ON u.id=s.owner_unit_id
    AND s.tenant_id=u.tenant_id AND s.municipality_id=u.municipality_id
   WHERE s.tenant_id=$1 AND s.municipality_id=$2 AND s.active=true AND u.active=true ORDER BY s.code LIMIT 201`),
  run(client,city,`SELECT c.id,c.summary,c.status,c.priority,c.service_id,c.created_at
   FROM public.service_cases c WHERE c.tenant_id=$1 AND c.municipality_id=$2 AND c.status='DRAFT'
   ORDER BY c.created_at DESC,c.id DESC LIMIT 51`)
 ]);
 if(sv.rows.length>200)refuse(409,'SERVICE_LIST_TRUNCATED_FOR_MANUAL_REVIEW');
 const report={schema:'RHF-DV32UX6-CASE-INTAKE-v1',cityId:city.id,tenantId:city.tenant_id,
  services:sv.rows,cases:cs.rows.slice(0,50),truncated:cs.rows.length>50,
  operatorCanCreate:role==='MUNICIPAL_ADMIN'||user?.is_system_admin===true,
  realCasesCreatedByThisRead:0,workflowStarted:false,automaticFieldDispatch:false,verifiedUrbanValue:false,finalGo:'NO_GO'};
 try{return validateRead(report,city,report.operatorCanCreate)}catch(e){refuse(409,e.message)}
}
