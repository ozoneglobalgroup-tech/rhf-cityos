// An explicit scoped revision of a previously returned real case; never a work order.
import {ClientError} from './domain.mjs';
import {caseFingerprint} from './dv32ux7-review-core.mjs';
import {boundary,scope,validate,canRevise,beforeAfter,validateReport} from './dv32ux10-revision-core.mjs';
const refuse=(status,message)=>{throw new ClientError(message,status)};
const run=(client,city,q,a=[])=>client.query(q,[city.tenant_id,city.id,...a]);
const caseSQL=`SELECT c.id,c.service_id,c.unit_id,c.created_by,c.status,c.module_code,c.summary,c.description,c.evidence,c.acceptance_note,
 s.active AS service_active,u.active AS unit_active
 FROM public.service_cases c
 JOIN public.service_definitions s ON s.id=c.service_id AND s.owner_unit_id=c.unit_id AND s.tenant_id=c.tenant_id AND s.municipality_id=c.municipality_id
 JOIN public.org_units u ON u.id=c.unit_id AND u.tenant_id=c.tenant_id AND u.municipality_id=c.municipality_id
 WHERE c.tenant_id=$1 AND c.municipality_id=$2 AND c.id=$3`;
export async function dv32ux10RevisionRoute({method,resourceId,url,headers,client,city,user,role,readBody,audit}){
 try{boundary({method,resourceId,url,headers})}catch(e){refuse(e.message==='METHOD_NOT_ALLOWED'?405:400,e.message)}
 try{scope(city,role,user,method)}catch(e){refuse(403,e.message)}
 if(method==='POST'){
  let a;try{a=validate(await readBody())}catch(e){refuse(400,e.message)}
  const c=(await run(client,city,caseSQL+' FOR UPDATE OF c',[a.caseId])).rows[0];
  let before;try{before=caseFingerprint(c)}catch(e){refuse(409,e.message)}
  const last=(await run(client,city,`SELECT id,case_id,status,case_fingerprint,reviewed_by,submitted_at FROM public.rhf_dv32ux7_case_reviews
   WHERE tenant_id=$1 AND municipality_id=$2 AND case_id=$3 ORDER BY submitted_at DESC,id DESC LIMIT 1 FOR UPDATE`,[a.caseId])).rows[0];
  const hasPlan=(await run(client,city,`SELECT id FROM public.rhf_dv32ux8_case_planning WHERE tenant_id=$1 AND municipality_id=$2 AND case_id=$3 LIMIT 1`,[a.caseId])).rowCount!==0;
  try{canRevise(last,c,user.id,before,hasPlan)}catch(e){refuse(409,e.message)}
  if(last.id!==a.priorReviewId)refuse(409,'PREVIOUS_REVIEW_NOT_LATEST');
  let fp;try{fp=beforeAfter(c,a.description,a.evidenceNote)}catch(e){refuse(409,e.message)}
  const changed=await run(client,city,`UPDATE public.service_cases SET description=$4,evidence=$5,updated_at=now()
   WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 AND status='DRAFT'
     AND description=$6 AND evidence=$7 RETURNING id`,[a.caseId,a.description,a.evidenceNote,c.description,c.evidence]);
  if(changed.rowCount!==1)refuse(409,'CONCURRENT_CASE_REVISION_CONFLICT');
  let saved;try{saved=await run(client,city,`INSERT INTO public.rhf_dv32ux10_case_revisions
    (id,tenant_id,municipality_id,case_id,prior_review_id,before_fingerprint,after_fingerprint,reason,revised_by)
    VALUES($3,$1,$2,$4,$5,$6,$7,$8,$9) RETURNING id,case_id`,
    [a.requestId,a.caseId,a.priorReviewId,fp.before,fp.after,a.note,user.id]);}
  catch(e){if(['23505','23503','23514','42501','22P02','22001'].includes(e.code))refuse(409,'REVISION_CONSTRAINT_OR_PERMISSION_DENIED');throw e}
  if(saved.rowCount!==1)refuse(409,'REVISION_LEDGER_WRITE_FAILED');
  await audit(client,city,user,'DV32UX10_REAL_CASE_REVISION',a.requestId,'RETURNED_CASE_EVIDENCE_REVISED',
   {caseId:a.caseId,priorReviewId:a.priorReviewId,beforeSha256:fp.before,afterSha256:fp.after,
    requiresNewIndependentReview:true,planningAuthority:false,executionAuthority:false});
  return {schema:'RHF-DV32UX10-REVISION-ACTION-v1',cityId:city.id,tenantId:city.tenant_id,
   revisionId:a.requestId,caseId:a.caseId,requiresNewIndependentReview:true,executionAuthority:false,
   temporalStarted:false,finalGo:'NO_GO'};
 }
 // Latest reviewed row per case; no direct exposure of full evidence text or actor identities.
 const latest=(await run(client,city,`SELECT DISTINCT ON (r.case_id) r.id AS review_id,r.case_id,r.status,r.case_fingerprint,r.reviewed_by,
   c.id,c.service_id,c.unit_id,c.created_by,c.status AS case_status,c.module_code,c.summary,c.description,c.evidence,c.acceptance_note,
   s.active AS service_active,u.active AS unit_active
   FROM public.rhf_dv32ux7_case_reviews r
   JOIN public.service_cases c ON c.id=r.case_id AND c.tenant_id=r.tenant_id AND c.municipality_id=r.municipality_id
   JOIN public.service_definitions s ON s.id=c.service_id AND s.owner_unit_id=c.unit_id AND s.tenant_id=c.tenant_id AND s.municipality_id=c.municipality_id
   JOIN public.org_units u ON u.id=c.unit_id AND u.tenant_id=c.tenant_id AND u.municipality_id=c.municipality_id
   WHERE r.tenant_id=$1 AND r.municipality_id=$2 ORDER BY r.case_id,r.submitted_at DESC,r.id DESC LIMIT 201`)).rows;
 const revs=(await run(client,city,`SELECT id,case_id,created_at FROM public.rhf_dv32ux10_case_revisions
   WHERE tenant_id=$1 AND municipality_id=$2 ORDER BY created_at DESC,id DESC LIMIT 101`)).rows;
 const planIds=(await run(client,city,`SELECT case_id FROM public.rhf_dv32ux8_case_planning WHERE tenant_id=$1 AND municipality_id=$2 LIMIT 201`)).rows;
 const planned=new Set(planIds.map(x=>x.case_id));
 const eligible=latest.filter(r=>{try{return canRevise({...r,id:r.review_id,case_id:r.case_id}, {...r,status:r.case_status},user.id,caseFingerprint({...r,status:r.case_status}),planned.has(r.case_id))}catch{return false}})
   .slice(0,60).map(r=>({caseId:r.case_id,priorReviewId:r.review_id,summary:String(r.summary).slice(0,180)}));
 const report={schema:'RHF-DV32UX10-REVISION-QUEUE-v1',cityId:city.id,tenantId:city.tenant_id,eligible,
  revisions:revs.slice(0,100).map(r=>({id:r.id,caseId:r.case_id,createdAt:r.created_at})),
  truncated:latest.length>200||revs.length>100||planIds.length>200,canWrite:role==='MUNICIPAL_ADMIN',
  executionAuthority:false,temporalStarted:false,autoDispatch:false,finalGo:'NO_GO'};
 try{return validateReport(report,city,role)}catch(e){refuse(409,e.message)}
}
