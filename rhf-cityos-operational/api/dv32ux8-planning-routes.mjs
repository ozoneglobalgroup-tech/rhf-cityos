// RLS-scoped, human-origin planning DRAFT only. No mission insert, allocation, dispatch or Temporal.
import {ClientError} from './domain.mjs';
import {caseFingerprint} from './dv32ux7-review-core.mjs';
import {boundary,scope,bodyCheck,currentApproval,resourceSnapshot,readCheck,actionCheck} from './dv32ux8-planning-core.mjs';
const refuse=(status,message)=>{throw new ClientError(message,status)};
const run=(client,city,sql,extra=[])=>client.query(sql,[city.tenant_id,city.id,...extra]);
const sourceSelect=`SELECT c.id,c.service_id,c.unit_id,c.created_by,c.status,c.module_code,c.summary,c.description,c.evidence,c.acceptance_note,
 s.active AS service_active,u.active AS unit_active
 FROM public.service_cases c
 JOIN public.service_definitions s ON s.id=c.service_id AND s.tenant_id=c.tenant_id AND s.municipality_id=c.municipality_id AND s.owner_unit_id=c.unit_id
 JOIN public.org_units u ON u.id=c.unit_id AND u.tenant_id=c.tenant_id AND u.municipality_id=c.municipality_id
 WHERE c.tenant_id=$1 AND c.municipality_id=$2 AND c.id=$3 LIMIT 1`;
export async function dv32ux8PlanningRoute({method,resourceId,url,headers,client,city,user,role,readBody,audit}){
 try{boundary({method,resourceId,url,headers})}catch(e){refuse(e.message==='METHOD_NOT_ALLOWED'?405:400,e.message)}
 try{scope(city,role,user,method)}catch(e){refuse(403,e.message)}
 if(method==='POST'){
  let req;try{req=bodyCheck(await readBody())}catch(e){refuse(400,e.message)}
  const r=(await run(client,city,`SELECT id,case_id,case_fingerprint,submitted_by,reviewed_by,reviewed_at,status
    FROM public.rhf_dv32ux7_case_reviews r
    WHERE r.tenant_id=$1 AND r.municipality_id=$2 AND r.id=$3 AND r.case_id=$4
     AND NOT EXISTS (SELECT 1 FROM public.rhf_dv32ux7_case_reviews later
      WHERE later.tenant_id=r.tenant_id AND later.municipality_id=r.municipality_id AND later.case_id=r.case_id
      AND (later.submitted_at,later.id)>(r.submitted_at,r.id))`,[req.reviewId,req.caseId])).rows[0];
  if(!r)refuse(404,'INDEPENDENT_REVIEW_NOT_FOUND');
  // Read-only point-in-time source checks. Later source drift invalidates the draft.
  const c=(await run(client,city,sourceSelect,[req.caseId])).rows[0];
  let fp;try{fp=caseFingerprint(c);currentApproval(r,c,fp)}catch(e){refuse(409,e.message)}
  let snap=null;
  if(req.resourceId){
   const resource=(await run(client,city,`SELECT id,owner_unit_id,authorized,unit,total_quantity,reserve_quantity,allocatable_bps
     FROM public.capacity_resources WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3`,[req.resourceId])).rows[0];
   try{snap=resourceSnapshot(resource,c)}catch(e){refuse(409,e.message)}
  }
  let saved;
  try{saved=(await run(client,city,`INSERT INTO public.rhf_dv32ux8_case_planning
     (id,tenant_id,municipality_id,case_id,review_id,case_fingerprint,resource_id,resource_snapshot,planning_note,prepared_by)
     VALUES ($3,$1,$2,$4,$5,$6,$7,$8::jsonb,$9,$10)
     RETURNING id,case_id,status,created_at`,[req.requestId,req.caseId,req.reviewId,fp,req.resourceId,snap?JSON.stringify(snap):null,req.note,user.id])).rows;
  }catch(e){if(['23505','23503','23514','42501','22P02','22001'].includes(e.code))refuse(409,'PLANNING_CONSTRAINT_OR_DUPLICATE');throw e}
  if(saved.length!==1)refuse(409,'PLANNING_CREATE_FAILED');
  await audit(client,city,user,'DV32UX8_CASE_PLANNING',saved[0].id,'HUMAN_PLANNING_DRAFT',
   {caseId:req.caseId,reviewId:req.reviewId,evidenceFingerprint:fp,resourceObserved:Boolean(snap),executionAuthority:false,resourceReserved:false});
  try{return actionCheck({schema:'RHF-DV32UX8-PLANNING-ACTION-v1',cityId:city.id,tenantId:city.tenant_id,
    planId:saved[0].id,caseId:req.caseId,status:'PLANNING_DRAFT',executionAuthority:false,resourceReserved:false,
    temporalStarted:false,finalGo:'NO_GO'},city)}catch(e){refuse(409,e.message)}
 }
 // Bounded, independent approval queue; never returns rationale or any personal identifier.
 const approvals=(await run(client,city,`SELECT r.id AS review_id,r.case_id,r.case_fingerprint,r.status,r.submitted_by,r.reviewed_by,r.reviewed_at,
 c.id,c.service_id,c.unit_id,c.created_by,c.status AS case_status,c.module_code,c.summary,c.description,c.evidence,c.acceptance_note,
 s.active AS service_active,u.active AS unit_active
 FROM public.rhf_dv32ux7_case_reviews r
 JOIN public.service_cases c ON c.id=r.case_id AND c.tenant_id=r.tenant_id AND c.municipality_id=r.municipality_id
 JOIN public.service_definitions s ON s.id=c.service_id AND s.tenant_id=c.tenant_id AND s.municipality_id=c.municipality_id AND s.owner_unit_id=c.unit_id
 JOIN public.org_units u ON u.id=c.unit_id AND u.tenant_id=c.tenant_id AND u.municipality_id=c.municipality_id
 WHERE r.tenant_id=$1 AND r.municipality_id=$2 AND r.status='APPROVED_FOR_PLANNING'
 AND NOT EXISTS (SELECT 1 FROM public.rhf_dv32ux7_case_reviews later
  WHERE later.tenant_id=r.tenant_id AND later.municipality_id=r.municipality_id AND later.case_id=r.case_id
  AND (later.submitted_at,later.id)>(r.submitted_at,r.id))
 ORDER BY r.reviewed_at DESC,r.id DESC LIMIT 61`)).rows;
 const candidates=approvals.slice(0,60).map(x=>{
  const c={...x,status:x.case_status};let good=false;
  try{good=currentApproval({...x,id:x.review_id,case_id:x.case_id},c,caseFingerprint(c))}catch{}
  return {caseId:x.case_id,reviewId:x.review_id,summary:String(x.summary).slice(0,180),currentEvidence:good,unitId:x.unit_id};
 });
 const resources=(await run(client,city,`SELECT id,owner_unit_id,name_fa,unit,total_quantity,reserve_quantity,authorized
   FROM public.capacity_resources WHERE tenant_id=$1 AND municipality_id=$2 AND authorized=true
   ORDER BY name_fa,id LIMIT 61`)).rows;
 const plans=(await run(client,city,`SELECT id,case_id,review_id,case_fingerprint,resource_id,status,created_at
   FROM public.rhf_dv32ux8_case_planning WHERE tenant_id=$1 AND municipality_id=$2
   ORDER BY created_at DESC,id DESC LIMIT 101`)).rows;
 const byCase=new Map(candidates.map(x=>[x.caseId,x]));
 const report={schema:'RHF-DV32UX8-CASE-PLANNING-v1',cityId:city.id,tenantId:city.tenant_id,
  candidates,resources:resources.slice(0,60).filter(x=>x.authorized===true).map(x=>({id:x.id,ownerUnitId:x.owner_unit_id,name:String(x.name_fa).slice(0,180),unit:String(x.unit).slice(0,50)})),
  plans:plans.slice(0,100).map(p=>({id:p.id,caseId:p.case_id,status:p.status,resourceLinked:Boolean(p.resource_id),
   currentEvidence:Boolean(byCase.get(p.case_id)?.currentEvidence&&byCase.get(p.case_id)?.reviewId===p.review_id&&p.case_fingerprint===approvals.find(a=>a.case_id===p.case_id)?.case_fingerprint)})),
  truncated:approvals.length>60||resources.length>60||plans.length>100,canWrite:role==='MUNICIPAL_ADMIN',
  executionAuthority:false,automaticFieldDispatch:false,temporalStarted:false,resourceReserved:false,verifiedUrbanValue:false,finalGo:'NO_GO'};
 try{return readCheck(report,city,role)}catch(e){refuse(409,e.message)}
}
