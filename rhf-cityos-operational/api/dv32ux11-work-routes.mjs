import {ClientError} from './domain.mjs';
import {caseFingerprint} from './dv32ux7-review-core.mjs';
import {boundary,scope,validate,currentEvidence,independentDecision,reportCheck} from './dv32ux11-work-core.mjs';
const refuse=(code,msg)=>{throw new ClientError(msg,code)};
const run=(client,city,q,params=[])=>client.query(q,[city.tenant_id,city.id,...params]);
const source=`SELECT p.id,p.case_id,p.review_id,p.case_fingerprint,p.status,p.prepared_by,p.execution_authority,p.temporal_started,
 c.id AS cid,c.created_by,c.status AS case_status,c.module_code,c.summary,c.description,c.evidence,c.acceptance_note,c.unit_id,c.service_id,
 s.active AS service_active,u.active AS unit_active,
 r.id AS rid,r.status AS review_status,r.case_fingerprint AS review_fingerprint,r.submitted_by,r.reviewed_by,r.reviewed_at
 FROM public.rhf_dv32ux8_case_planning p
 JOIN public.service_cases c ON c.id=p.case_id AND c.tenant_id=p.tenant_id AND c.municipality_id=p.municipality_id
 JOIN public.org_units u ON u.id=c.unit_id AND u.tenant_id=c.tenant_id AND u.municipality_id=c.municipality_id
 JOIN public.service_definitions s ON s.id=c.service_id AND s.owner_unit_id=u.id AND s.tenant_id=c.tenant_id AND s.municipality_id=c.municipality_id
 JOIN public.rhf_dv32ux7_case_reviews r ON r.id=p.review_id AND r.case_id=c.id AND r.tenant_id=c.tenant_id AND r.municipality_id=c.municipality_id
 WHERE p.tenant_id=$1 AND p.municipality_id=$2 AND p.id=$3`;
function check(row){
 if(!row)refuse(404,'PLAN_NOT_FOUND');
 const plan={id:row.id,case_id:row.case_id,review_id:row.review_id,case_fingerprint:row.case_fingerprint,status:row.status,execution_authority:row.execution_authority,temporal_started:row.temporal_started};
 const review={id:row.rid,status:row.review_status,case_fingerprint:row.review_fingerprint,submitted_by:row.submitted_by,reviewed_by:row.reviewed_by};
 const caseRow={id:row.cid,created_by:row.created_by,status:row.case_status,service_id:row.service_id,unit_id:row.unit_id,module_code:row.module_code,summary:row.summary,description:row.description,evidence:row.evidence,acceptance_note:row.acceptance_note,service_active:row.service_active,unit_active:row.unit_active};
 return {plan,review,caseRow,fingerprint:caseFingerprint(caseRow)};
}
export async function dv32ux11WorkRoute({method,resourceId,url,headers,client,city,user,role,readBody,audit}){
 try{boundary({method,resourceId,url,headers});scope(city,role,user,method)}catch(e){refuse(e.message==='METHOD_NOT_ALLOWED'?405:403,e.message)}
 if(method==='POST'){
  let body;try{body=validate(await readBody(),'ux11')}catch(e){refuse(400,e.message)}
  if(body.action==='PREPARE'){
   const p=(await run(client,city,source+' FOR SHARE OF c',[body.planId])).rows[0];
   const x=check(p);
   const last=(await run(client,city,`SELECT id FROM public.rhf_dv32ux7_case_reviews WHERE tenant_id=$1 AND municipality_id=$2 AND case_id=$3 ORDER BY submitted_at DESC,id DESC LIMIT 1`,[x.plan.case_id])).rows[0]?.id;
   try{currentEvidence({...x,latestReviewId:last})}catch(e){refuse(409,e.message)}
   const saved=await run(client,city,`INSERT INTO public.rhf_dv32ux11_work_orders
    (id,tenant_id,municipality_id,plan_id,case_id,review_id,case_fingerprint,owner_unit_id,title,instructions,prepared_by)
    VALUES ($3,$1,$2,$4,$5,$6,$7,$8,$9,$10,$11)
    ON CONFLICT DO NOTHING RETURNING id`,[body.requestId,x.plan.id,x.plan.case_id,x.plan.review_id,x.fingerprint,p.unit_id,body.title,body.instructions,user.id]);
   if(saved.rowCount!==1)refuse(409,'DUPLICATE_OR_INVALID_WORK_ORDER');
   await audit(client,city,user,'DV32UX11_WORK_ORDER',body.requestId,'HUMAN_WORK_ORDER_PROPOSED',
     {planId:body.planId,caseId:x.plan.case_id,caseSha256:x.fingerprint,authorization:'PROPOSAL_ONLY',dispatch:false,temporalStarted:false});
   return {schema:'RHF-DV32UX11-ACTION-v1',status:'PROPOSED_ONLY',id:body.requestId,temporalStarted:false,dispatchAuthorized:false,finalGo:'NO_GO'};
  }
  const p=(await run(client,city,`SELECT w.id,w.plan_id,w.case_id,w.case_fingerprint,w.prepared_by,c.created_by,r.reviewed_by
    FROM public.rhf_dv32ux11_work_orders w
    JOIN public.service_cases c ON c.id=w.case_id AND c.tenant_id=w.tenant_id AND c.municipality_id=w.municipality_id
    JOIN public.rhf_dv32ux7_case_reviews r ON r.id=w.review_id AND r.tenant_id=w.tenant_id AND r.municipality_id=w.municipality_id
    WHERE w.tenant_id=$1 AND w.municipality_id=$2 AND w.id=$3`,[body.proposalId])).rows[0];
  if(!p)refuse(404,'WORK_ORDER_NOT_FOUND');
  try{independentDecision(p,user.id)}catch(e){refuse(403,e.message)}
  const current=(await run(client,city,source+' FOR SHARE OF c',[p.plan_id])).rows[0];
  const x=check(current);
  const last=(await run(client,city,`SELECT id FROM public.rhf_dv32ux7_case_reviews WHERE tenant_id=$1 AND municipality_id=$2 AND case_id=$3 ORDER BY submitted_at DESC,id DESC LIMIT 1`,[p.case_id])).rows[0]?.id;
  try{currentEvidence({...x,latestReviewId:last});if(x.fingerprint!==p.case_fingerprint)throw Error('WORK_ORDER_EVIDENCE_DRIFT')}catch(e){refuse(409,e.message)}
  const saved=await run(client,city,`INSERT INTO public.rhf_dv32ux11_work_decisions
   (work_order_id,tenant_id,municipality_id,decision,note,decided_by)
   SELECT w.id,w.tenant_id,w.municipality_id,$4,$5,$6
   FROM public.rhf_dv32ux11_work_orders w WHERE w.tenant_id=$1 AND w.municipality_id=$2 AND w.id=$3 AND w.prepared_by<>$6
   ON CONFLICT DO NOTHING RETURNING work_order_id`,[p.id,body.decision,body.reason,user.id]);
  if(saved.rowCount!==1)refuse(409,'WORK_ORDER_ALREADY_DECIDED');
  await audit(client,city,user,'DV32UX11_WORK_ORDER',p.id,'INDEPENDENT_WORK_ORDER_DECISION',
   {decision:body.decision,dispatch:false,temporalStarted:false});
  return {schema:'RHF-DV32UX11-ACTION-v1',status:body.decision,id:p.id,temporalStarted:false,dispatchAuthorized:false,finalGo:'NO_GO'};
 }
 const entries=(await run(client,city,`SELECT w.id,w.plan_id,w.case_id,w.title,w.created_at,w.prepared_by=$3::uuid AS mine,
 d.decision,d.decided_by=$3::uuid AS my_decision,
 c.created_by=$3::uuid AS my_case,r.reviewed_by=$3::uuid AS my_review,
 c.status AS case_status,c.summary
 FROM public.rhf_dv32ux11_work_orders w
 JOIN public.service_cases c ON c.id=w.case_id AND c.tenant_id=w.tenant_id AND c.municipality_id=w.municipality_id
 JOIN public.rhf_dv32ux7_case_reviews r ON r.id=w.review_id AND r.tenant_id=w.tenant_id AND r.municipality_id=w.municipality_id
 LEFT JOIN public.rhf_dv32ux11_work_decisions d ON d.work_order_id=w.id AND d.tenant_id=w.tenant_id AND d.municipality_id=w.municipality_id
 WHERE w.tenant_id=$1 AND w.municipality_id=$2 ORDER BY w.created_at DESC,w.id DESC LIMIT 101`,[user.id])).rows;
 const plans=(await run(client,city,`SELECT p.id,p.case_id,c.summary FROM public.rhf_dv32ux8_case_planning p
  JOIN public.service_cases c ON c.id=p.case_id AND c.tenant_id=p.tenant_id AND c.municipality_id=p.municipality_id
  WHERE p.tenant_id=$1 AND p.municipality_id=$2
  AND NOT EXISTS(SELECT 1 FROM public.rhf_dv32ux11_work_orders w WHERE w.tenant_id=p.tenant_id AND w.municipality_id=p.municipality_id AND w.plan_id=p.id)
  ORDER BY p.created_at DESC LIMIT 61`)).rows;
 const report={schema:'RHF-DV32UX11-WORK-ORDERS-v1',cityId:city.id,tenantId:city.tenant_id,canWrite:role==='MUNICIPAL_ADMIN',
  items:entries.slice(0,100).map(x=>({id:x.id,planId:x.plan_id,caseId:x.case_id,title:x.title,decision:x.decision||'PENDING',ownProposal:x.mine,ownCase:x.my_case,ownReview:x.my_review,summary:x.summary,createdAt:x.created_at})),
  plans:plans.slice(0,60).map(x=>({id:x.id,caseId:x.case_id,summary:x.summary})),truncated:entries.length>100||plans.length>60,
  temporalStarted:false,dispatchAuthorized:false,finalGo:'NO_GO'};
 try{return reportCheck(report,city,role,'ux11')}catch(e){refuse(409,e.message)}
}
