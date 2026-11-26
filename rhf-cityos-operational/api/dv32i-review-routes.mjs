// Already inside server's withScope() transaction. Access and candidate validity are
// re-established using DV32H/G — never trust browser-supplied organization/candidate evidence.
import {ClientError} from './domain.mjs';
import {dv32hAgentRoute} from './dv32h-agent-routes.mjs';
import {UUID,DESKS,validateBody,validateScope,candidateFingerprint,reviewerAllowed,sanitizeCandidate} from './dv32i-review-core.mjs';
const fail=(code,msg)=>{throw new ClientError(msg,code);};
const query=(client,city,sql,rest=[])=>client.query(sql,[city.tenant_id,city.id,...rest]);
function boundary({method,resourceId,url,headers={}}){
  if(method==='POST'){
    const host=headers.host,origin=headers.origin;let parsed;
    try{parsed=new URL(origin);}catch{fail(403,'SAME_ORIGIN_POST_REQUIRED');}
    if(!host||parsed.host!==host||!['http:','https:'].includes(parsed.protocol)||
       headers['x-rhf-dv32i-review-intent']!=='HUMAN_REVIEW_NON_EXECUTING'||
       !String(headers['content-type']||'').toLowerCase().startsWith('application/json'))
      fail(403,'SAME_ORIGIN_JSON_REVIEW_INTENT_REQUIRED');
  }
  if(!['GET','POST'].includes(method))fail(405,'METHOD_NOT_ALLOWED');
  if(resourceId&&!UUID.test(resourceId))fail(400,'INVALID_REVIEW_ID');
  if(method==='GET'&&resourceId)fail(405,'DETAIL_GET_DISABLED');
  if(!DESKS.has(url.searchParams.get('desk')))fail(400,'EXPLICIT_DESK_REQUIRED');
  for(const key of url.searchParams.keys())if(!['desk','orgId'].includes(key))fail(400,'UNKNOWN_QUERY_PARAMETER');
  if(url.searchParams.getAll('desk').length!==1||url.searchParams.getAll('orgId').length>1)fail(400,'DUPLICATE_PARAMETER');
  if(url.searchParams.get('desk')!=='waste'&&url.searchParams.has('orgId'))fail(400,'CROSS_DESK_ORGANIZATION');
}
export async function dv32iReviewRoute({method,resourceId,client,city,user,role,url,readBody,audit,headers}){
  boundary({method,resourceId,url,headers});
  const desk=url.searchParams.get('desk');
  // DV32H invokes DV32F/G authorization and DV32G organization binding inside same RLS scope.
  const report=await dv32hAgentRoute({method:'GET',resourceId:undefined,client,city,user,role,url});
  if(report.needsOrganizationSelection)return {schema:'RHF-DV32I-REVIEW-v1',desk,needsOrganizationSelection:true,reviews:[],noCityWideFallback:true};
  let scope;
  try{scope=validateScope({desk,report});}catch(e){fail(403,e.message);}
  if(scope.tenantId!==city.tenant_id||scope.municipalityId!==city.id)fail(403,'RLS_SCOPE_MISMATCH');
  const org=scope.organizationId;
  const admin=reviewerAllowed(role,user.is_system_admin);
  if(method==='GET'){
    const records=(await query(client,city,`SELECT id,desk,organization_id,candidate_id,evidence_sha256,evidence_snapshot,status,
      rationale,submitted_by,submitted_at,decided_by,decided_at,decision_reason
      FROM rhf_dv32i_evidence_reviews
      WHERE tenant_id=$1 AND municipality_id=$2 AND desk=$3
        AND organization_id IS NOT DISTINCT FROM $4::uuid
        AND ($5::boolean OR submitted_by=$6)
      ORDER BY submitted_at DESC LIMIT 101`,[desk,org,admin,user.id])).rows;
    return {schema:'RHF-DV32I-REVIEW-v1',desk,scope,reviews:records.slice(0,100),truncated:records.length>100,
      permission:{canSubmit:true,canDecide:admin},executionAuthorization:false,verifiedUrbanValue:false};
  }
  if(!resourceId){
    let body;try{body=validateBody(await readBody(),'SUBMIT');}catch(e){fail(400,e.message);}
    const candidate=report.candidates.find(c=>c.id===body.candidateId);
    if(!candidate)fail(409,'CANDIDATE_NOT_PRESENT_IN_CURRENT_AUTHORIZED_EVIDENCE');
    const fingerprint=candidateFingerprint({desk,scope,candidate});
    const snapshot=sanitizeCandidate(candidate);
    const inserted=(await query(client,city,`INSERT INTO rhf_dv32i_evidence_reviews
      (tenant_id,municipality_id,organization_id,desk,candidate_id,evidence_sha256,evidence_snapshot,submitted_by,rationale)
      VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)
      RETURNING id,status,submitted_at`,[org,desk,candidate.id,fingerprint,JSON.stringify(snapshot),user.id,body.rationale])).rows[0];
    await audit(client,city,user,'DV32I_EVIDENCE_REVIEW',inserted.id,'SUBMITTED',
      {desk,organizationId:org,candidateId:candidate.id,evidenceSha256:fingerprint});
    return {review:inserted,storedEvidenceSha256:fingerprint,requiresIndependentReviewer:true,
      executionAuthorization:false,verifiedUrbanValue:false};
  }
  if(!admin)fail(403,'INDEPENDENT_MUNICIPAL_REVIEWER_REQUIRED');
  let body;try{body=validateBody(await readBody(),'DECIDE');}catch(e){fail(400,e.message);}
  const row=(await query(client,city,`SELECT id,desk,organization_id,candidate_id,evidence_sha256,submitted_by,status
    FROM rhf_dv32i_evidence_reviews
    WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 AND desk=$4
      AND organization_id IS NOT DISTINCT FROM $5::uuid FOR UPDATE`,[resourceId,desk,org])).rows[0];
  if(!row)fail(404,'REVIEW_NOT_FOUND_IN_AUTHORIZED_SCOPE');
  if(row.status!=='SUBMITTED')fail(409,'REVIEW_ALREADY_DECIDED');
  if(row.submitted_by===user.id)fail(403,'SELF_APPROVAL_FORBIDDEN');
  // A decision can only refer to evidence still identical to the current scoped aggregate.
  const current=report.candidates.find(x=>x.id===row.candidate_id);
  if(!current||candidateFingerprint({desk,scope,candidate:current})!==row.evidence_sha256)
    fail(409,'EVIDENCE_CHANGED_RESUBMISSION_REQUIRED');
  const changed=(await query(client,city,`UPDATE rhf_dv32i_evidence_reviews
    SET status=$4,decided_by=$5,decided_at=now(),decision_reason=$6
    WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 AND status='SUBMITTED'
    RETURNING id,status,decided_at`,[row.id,body.decision,user.id,body.reason])).rows;
  if(changed.length!==1)fail(409,'CONCURRENT_REVIEW_DECISION');
  await audit(client,city,user,'DV32I_EVIDENCE_REVIEW',row.id,body.decision,
    {desk,organizationId:org,candidateId:row.candidate_id,evidenceSha256:row.evidence_sha256,reason:body.reason});
  return {review:changed[0],decisionIsPlanningReviewOnly:true,executionAuthorization:false,
    fieldDispatch:false,resourceAllocation:false,payment:false,verifiedUrbanValue:false};
}
