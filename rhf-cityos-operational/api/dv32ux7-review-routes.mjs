// Authenticated withScope transaction. Independent review only; no case status mutation.
import {ClientError} from './domain.mjs';
import {UUID,boundary,scopeCheck,bodyCheck,caseFingerprint,independent,readCheck} from './dv32ux7-review-core.mjs';
const refuse=(status,message)=>{throw new ClientError(message,status)};
const run=(client,city,sql,extra=[])=>client.query(sql,[city.tenant_id,city.id,...extra]);
const selectCase=`SELECT c.id,c.service_id,c.unit_id,c.created_by,c.status,c.module_code,c.summary,c.description,c.evidence,c.acceptance_note,
 s.active AS service_active,u.active AS unit_active
 FROM public.service_cases c
 JOIN public.service_definitions s ON s.tenant_id=c.tenant_id AND s.municipality_id=c.municipality_id AND s.id=c.service_id AND s.owner_unit_id=c.unit_id
 JOIN public.org_units u ON u.tenant_id=c.tenant_id AND u.municipality_id=c.municipality_id AND u.id=c.unit_id
 WHERE c.tenant_id=$1 AND c.municipality_id=$2 AND c.id=$3 LIMIT 1`;
export async function dv32ux7ReviewRoute({method,resourceId,url,headers,client,city,user,role,readBody,audit}){
 try{boundary({method,resourceId,url,headers})}catch(e){refuse(e.message==='METHOD_NOT_ALLOWED'?405:400,e.message)}
 try{scopeCheck(city,role,user,method)}catch(e){refuse(403,e.message)}
 if(method==='POST'){
  let body;try{body=bodyCheck(await readBody())}catch(e){refuse(400,e.message)}
  if(body.action==='SUBMIT'){
   const c=(await run(client,city,selectCase,[body.caseId])).rows[0];
   let fp;try{fp=caseFingerprint(c)}catch(e){refuse(409,e.message)}
   const previous=(await run(client,city,`SELECT status FROM public.rhf_dv32ux7_case_reviews
    WHERE tenant_id=$1 AND municipality_id=$2 AND case_id=$3 ORDER BY submitted_at DESC,id DESC LIMIT 1`,[body.caseId])).rows[0];
   if(previous&&previous.status!=='RETURNED_FOR_EVIDENCE')refuse(409,'REVIEW_ROUND_NOT_RETURNED');
   let rows;try{rows=(await run(client,city,`INSERT INTO public.rhf_dv32ux7_case_reviews
    (id,tenant_id,municipality_id,case_id,case_fingerprint,status,submitted_by,submission_note)
    VALUES ($3,$1,$2,$4,$5,'SUBMITTED',$6,$7)
    RETURNING id,case_id,status,submitted_at`,[body.requestId,body.caseId,fp,user.id,body.note])).rows;
   }catch(e){if(['23505','23503','23514','42501','22P02','22001'].includes(e.code))refuse(409,'REVIEW_CONSTRAINT_OR_PERMISSION_BLOCKED');throw e}
   if(rows.length!==1)refuse(409,'REVIEW_SUBMISSION_FAILED');
   await audit(client,city,user,'DV32UX7_REAL_CASE_REVIEW',rows[0].id,'SUBMITTED',
    {caseId:body.caseId,fingerprint:fp,planningOnly:true,executionAuthority:false});
   return {schema:'RHF-DV32UX7-CASE-REVIEW-ACTION-v1',cityId:city.id,tenantId:city.tenant_id,reviewId:rows[0].id,caseId:body.caseId,status:'SUBMITTED',requiresIndependentReviewer:true,executionAuthority:false,workflowStarted:false,finalGo:'NO_GO'};
  }
  const row=(await run(client,city,`SELECT id,case_id,case_fingerprint,submitted_by,status
    FROM public.rhf_dv32ux7_case_reviews WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 FOR UPDATE`,[body.reviewId])).rows[0];
  if(!row)refuse(404,'REVIEW_NOT_FOUND_IN_SCOPE');
  const c=(await run(client,city,selectCase,[row.case_id])).rows[0];
  let fp;try{fp=caseFingerprint(c);independent(row,user.id,c.created_by)}catch(e){refuse(409,e.message)}
  if(fp!==row.case_fingerprint)refuse(409,'CASE_SOURCE_CHANGED_REVIEW_STALE');
  const changed=(await run(client,city,`UPDATE public.rhf_dv32ux7_case_reviews
   SET status=$4,reviewed_by=$5,reviewed_at=now(),review_note=$6
   WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 AND status='SUBMITTED'
   RETURNING id,case_id,status,reviewed_at`,[row.id,body.decision,user.id,body.note])).rows;
  if(changed.length!==1)refuse(409,'CONCURRENT_DECISION_CONFLICT');
  await audit(client,city,user,'DV32UX7_REAL_CASE_REVIEW',row.id,body.decision,
   {caseId:row.case_id,fingerprint:fp,independent:true,planningOnly:true,executionAuthority:false});
  return {schema:'RHF-DV32UX7-CASE-REVIEW-ACTION-v1',cityId:city.id,tenantId:city.tenant_id,reviewId:row.id,caseId:row.case_id,status:body.decision,
   independentReviewerRecorded:true,executionAuthority:false,workflowStarted:false,fieldDispatch:false,verifiedUrbanValue:false,finalGo:'NO_GO'};
 }
 const [cases,reviews]=await Promise.all([
  run(client,city,`SELECT c.id,c.summary,c.status,c.created_at,c.created_by
   FROM public.service_cases c
   WHERE c.tenant_id=$1 AND c.municipality_id=$2 AND c.status='DRAFT'
   AND c.acceptance_note LIKE 'INTAKE_SOURCE:%'
   ORDER BY c.created_at DESC,c.id DESC LIMIT 61`),
  run(client,city,`SELECT r.id,r.case_id,r.status,r.submitted_at,r.submitted_by,c.created_by AS case_created_by,
    (r.submitted_by=$3::uuid) AS submitter_is_current_user,(c.created_by=$3::uuid) AS creator_is_current_user
   FROM public.rhf_dv32ux7_case_reviews r
   JOIN public.service_cases c ON c.id=r.case_id AND c.tenant_id=r.tenant_id AND c.municipality_id=r.municipality_id
   WHERE r.tenant_id=$1 AND r.municipality_id=$2 ORDER BY r.submitted_at DESC,r.id DESC LIMIT 101`,[user.id])
 ]);
 const canWrite=role==='MUNICIPAL_ADMIN';
 const result={schema:'RHF-DV32UX7-CASE-REVIEW-v1',cityId:city.id,tenantId:city.tenant_id,
  cases:cases.rows.slice(0,60).map(c=>({id:c.id,summary:c.summary,status:c.status,createdAt:c.created_at})),
  reviews:reviews.rows.slice(0,100).map(r=>({id:r.id,caseId:r.case_id,status:r.status,submittedAt:r.submitted_at,
    submitterIsCurrentUser:r.submitter_is_current_user,caseCreatorIsCurrentUser:r.creator_is_current_user,
    canDecide:canWrite&&r.status==='SUBMITTED'&&!r.submitter_is_current_user&&!r.creator_is_current_user})),
  truncated:cases.rows.length>60||reviews.rows.length>100,canWrite,
  executionAuthority:false,workflowStarted:false,automaticDispatch:false,verifiedUrbanValue:false,finalGo:'NO_GO'};
 try{return readCheck(result,city,role,user.id)}catch(e){refuse(409,e.message)}
}
