// UX12: immutable request for manual Temporal operator review, not a workflow start.
import {ClientError} from './domain.mjs';
import {caseFingerprint} from './dv32ux7-review-core.mjs';
import {boundary,scope,validate,currentEvidence,handoffReady,reportCheck} from './dv32ux11-work-core.mjs';
const refuse=(code,msg)=>{throw new ClientError(msg,code)};
const run=(client,city,q,params=[])=>client.query(q,[city.tenant_id,city.id,...params]);
const snapshotSQL=`SELECT w.id,w.plan_id,w.case_id,w.case_fingerprint,w.prepared_by,w.review_id,
 d.decision,d.decided_by,p.id AS pid,p.status AS plan_status,p.case_fingerprint AS plan_fingerprint,p.review_id AS plan_review_id,
 p.execution_authority,p.temporal_started,
 c.id AS cid,c.created_by,c.status AS case_status,c.unit_id,c.service_id,c.module_code,c.summary,c.description,c.evidence,c.acceptance_note,
 s.active AS service_active,u.active AS unit_active,
 r.id AS rid,r.status AS review_status,r.case_fingerprint AS review_fingerprint,r.submitted_by,r.reviewed_by
 FROM public.rhf_dv32ux11_work_orders w
 JOIN public.rhf_dv32ux11_work_decisions d ON d.work_order_id=w.id AND d.tenant_id=w.tenant_id AND d.municipality_id=w.municipality_id
 JOIN public.rhf_dv32ux8_case_planning p ON p.id=w.plan_id AND p.case_id=w.case_id AND p.tenant_id=w.tenant_id AND p.municipality_id=w.municipality_id
 JOIN public.service_cases c ON c.id=w.case_id AND c.tenant_id=w.tenant_id AND c.municipality_id=w.municipality_id
 JOIN public.org_units u ON u.id=c.unit_id AND u.tenant_id=c.tenant_id AND u.municipality_id=c.municipality_id
 JOIN public.service_definitions s ON s.id=c.service_id AND s.owner_unit_id=u.id AND s.tenant_id=c.tenant_id AND s.municipality_id=c.municipality_id
 JOIN public.rhf_dv32ux7_case_reviews r ON r.id=w.review_id AND r.id=p.review_id AND r.tenant_id=w.tenant_id AND r.municipality_id=w.municipality_id
 WHERE w.tenant_id=$1 AND w.municipality_id=$2 AND w.id=$3`;
export async function dv32ux12HandoffRoute({method,resourceId,url,headers,client,city,user,role,readBody,audit}){
 try{boundary({method,resourceId,url,headers});scope(city,role,user,method)}catch(e){refuse(e.message==='METHOD_NOT_ALLOWED'?405:403,e.message)}
 if(method==='POST'){
  let body;try{body=validate(await readBody(),'ux12')}catch(e){refuse(400,e.message)}
  const row=(await run(client,city,snapshotSQL+' FOR SHARE OF c',[body.proposalId])).rows[0];
  if(!row)refuse(404,'INDEPENDENTLY_CLEARED_WORK_ORDER_NOT_FOUND');
  try{handoffReady(row,user.id);if(user.id===row.reviewed_by)throw Error('INDEPENDENT_OPERATOR_REQUIRED')}catch(e){refuse(403,e.message)}
  const fingerprint=caseFingerprint({id:row.cid,created_by:row.created_by,status:row.case_status,unit_id:row.unit_id,service_id:row.service_id,service_active:row.service_active,unit_active:row.unit_active,module_code:row.module_code,summary:row.summary,description:row.description,evidence:row.evidence,acceptance_note:row.acceptance_note});
  const latest=(await run(client,city,`SELECT id FROM public.rhf_dv32ux7_case_reviews WHERE tenant_id=$1 AND municipality_id=$2 AND case_id=$3 ORDER BY submitted_at DESC,id DESC LIMIT 1`,[row.case_id])).rows[0]?.id;
  try{currentEvidence({plan:{id:row.pid,case_id:row.case_id,review_id:row.plan_review_id,case_fingerprint:row.plan_fingerprint,status:row.plan_status,execution_authority:row.execution_authority,temporal_started:row.temporal_started},
   review:{id:row.rid,status:row.review_status,case_fingerprint:row.review_fingerprint,submitted_by:row.submitted_by,reviewed_by:row.reviewed_by},
   caseRow:{id:row.cid,created_by:row.created_by,status:row.case_status,service_active:row.service_active,unit_active:row.unit_active},fingerprint,latestReviewId:latest});
   if(fingerprint!==row.case_fingerprint)throw Error('WORK_ORDER_SOURCE_DRIFT');
  }catch(e){refuse(409,e.message)}
  const saved=await run(client,city,`INSERT INTO public.rhf_dv32ux12_handoff_intents
   (id,tenant_id,municipality_id,work_order_id,case_fingerprint,requested_by,note)
   VALUES($3,$1,$2,$4,$5,$6,$7)
   ON CONFLICT DO NOTHING RETURNING id`,[body.requestId,row.id,fingerprint,user.id,body.reason]);
  if(saved.rowCount!==1)refuse(409,'HANDOFF_INTENT_DUPLICATE');
  await audit(client,city,user,'DV32UX12_TEMPORAL_HANDOFF_INTENT',body.requestId,'EXPLICIT_OPERATOR_HANDOFF_REQUESTED',
   {workOrderId:row.id,caseId:row.case_id,evidenceSha256:fingerprint,temporalStarted:false,dispatch:false,operatorReviewRequired:true});
  return {schema:'RHF-DV32UX12-ACTION-v1',status:'AWAITING_OPERATOR_REVIEW',id:body.requestId,temporalStarted:false,dispatchAuthorized:false,finalGo:'NO_GO'};
 }
 const rows=(await run(client,city,`SELECT w.id,w.title,w.case_id,w.case_fingerprint,w.prepared_by=$3::uuid AS my_proposal,d.decided_by=$3::uuid AS my_decision,
 c.created_by=$3::uuid AS my_case,d.decision,
 h.id AS handoff_id,h.created_at AS handoff_at
 FROM public.rhf_dv32ux11_work_orders w
 JOIN public.rhf_dv32ux11_work_decisions d ON d.work_order_id=w.id AND d.tenant_id=w.tenant_id AND d.municipality_id=w.municipality_id
 JOIN public.service_cases c ON c.id=w.case_id AND c.tenant_id=w.tenant_id AND c.municipality_id=w.municipality_id
 LEFT JOIN public.rhf_dv32ux12_handoff_intents h ON h.work_order_id=w.id AND h.tenant_id=w.tenant_id AND h.municipality_id=w.municipality_id
 WHERE w.tenant_id=$1 AND w.municipality_id=$2 AND d.decision='CLEARED_FOR_HANDOFF_REQUEST'
 ORDER BY w.created_at DESC,w.id DESC LIMIT 101`,[user.id])).rows;
 const report={schema:'RHF-DV32UX12-TEMPORAL-HANDOFF-INTENTS-v1',cityId:city.id,tenantId:city.tenant_id,canWrite:role==='MUNICIPAL_ADMIN',
  items:rows.slice(0,100).map(x=>({id:x.id,title:x.title,caseId:x.case_id,decision:x.decision,canRequest:!x.my_proposal&&!x.my_decision&&!x.my_case&&!x.handoff_id,
   handoffId:x.handoff_id||null,handoffStatus:x.handoff_id?'AWAITING_OPERATOR_REVIEW':'NOT_REQUESTED'})),
  truncated:rows.length>100,temporalStarted:false,dispatchAuthorized:false,finalGo:'NO_GO'};
 try{return reportCheck(report,city,role,'ux12')}catch(e){refuse(409,e.message)}
}
