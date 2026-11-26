// RHF DV32L.1: reconcile evidence, LangGraph advice, independent human review, and manual Temporal eligibility.
// This module NEVER grants execution authorization and NEVER starts any workflow.
import {candidateFingerprint,validateScope,reviewStatus,UUID} from './dv32i-review-core.mjs';
const SHA=/^[0-9a-f]{64}$/;
const safeError=(code)=>{throw new TypeError(code);};
function sameScope(a,b,desk){
  if(!a||!b||a.tenantId!==b.tenantId||a.municipalityId!==b.municipalityId||
    (a.organizationId||null)!==(b.organizationId||null))safeError('SCOPE_MISMATCH');
  if(desk!=='waste'&&(a.organizationId||b.organizationId))safeError('CROSS_DESK_ORG');
}
export function reconcilePlanningReadiness({report,graph,queue,desk,city}){
  const scope=validateScope({report,desk});
  if(scope.tenantId!==city.tenant_id||scope.municipalityId!==city.id)safeError('CITY_TENANT_SCOPE_MISMATCH');
  if(!graph||graph.schema!=='RHF-DV32K-LANGGRAPH-v1'||graph.desk!==desk||
     !Array.isArray(graph.recommendations)||graph.controls?.temporalStarted!==false||
     graph.controls?.verifiedUrbanValue!==false||graph.controls?.fieldDispatch!==false||
     graph.controls?.payments!==false||graph.controls?.reservations!==false)safeError('UNTRUSTED_GRAPH_ADVICE');
  sameScope(scope,graph.scope,desk);
  if(!queue||queue.schema!=='RHF-DV32I-REVIEW-v1'||queue.desk!==desk||
     !Array.isArray(queue.reviews)||queue.reviews.length>100||
     typeof queue.truncated!=='boolean'||!queue.permission)safeError('UNTRUSTED_REVIEW_QUEUE');
  sameScope(scope,queue.scope,desk);
  if(graph.recommendations.length!==report.candidates.length||report.candidates.length>10)safeError('CANDIDATE_COUNT_MISMATCH');
  const recommendationIds=new Set();
  for(const advice of graph.recommendations){
    if(!advice||typeof advice.id!=='string'||recommendationIds.has(advice.id)||
       advice.humanApprovalRequired!==true||advice.executionAuthorization!==false||
       advice.verifiedUrbanValue!==null||!['HIGH','MEDIUM','LOW'].includes(advice.priority)||
       !['AGGREGATE_REVIEW','EVIDENCE_RECONCILIATION'].includes(advice.reviewCategory))safeError('UNTRUSTED_RECOMMENDATION');
    recommendationIds.add(advice.id);
  }
  const found=new Set();
  const entries=report.candidates.map(candidate=>{
    if(found.has(candidate.id)||!recommendationIds.has(candidate.id))safeError('UNMATCHED_GRAPH_CANDIDATE');
    found.add(candidate.id);
    const advice=graph.recommendations.find(x=>x.id===candidate.id);
    if(advice.priority!==candidate.priority)safeError('PRIORITY_MISMATCH');
    const fingerprint=candidateFingerprint({desk,scope,candidate});
    // The queue is ordered newest-first by the existing DV32I route. Avoid inspecting historical reviews outside its cap.
    const review=queue.reviews.find(x=>x.candidate_id===candidate.id);
    let gate='REVIEW_REQUIRED';let reviewId=null;let reviewStatus=null;let evidenceCurrent=false;
    if(review){
      if(!UUID.test(review.id||'')||!reviewStatusAllowed(review.status)||!SHA.test(review.evidence_sha256||'')||
        review.desk!==desk||(review.organization_id||null)!==(scope.organizationId||null))safeError('UNTRUSTED_REVIEW_RECORD');
      reviewId=review.id;reviewStatus=review.status;
      evidenceCurrent=review.evidence_sha256===fingerprint;
      if(!evidenceCurrent)gate='STALE_EVIDENCE_REQUIRES_NEW_REVIEW';
      else if(review.status==='APPROVED_FOR_PLANNING')gate='ELIGIBLE_FOR_MANUAL_DV32J_CHECK';
      else if(review.status==='SUBMITTED')gate='AWAITING_INDEPENDENT_HUMAN_REVIEW';
      else gate='HUMAN_REVIEW_NOT_APPROVED';
    }
    // Incomplete queue means we cannot conclusively assert readiness.
    if(queue.truncated)gate='REVIEW_QUEUE_TRUNCATED_MANUAL_RECONCILIATION';
    return {candidateId:candidate.id,title:candidate.title,priority:candidate.priority,
      reviewCategory:advice.reviewCategory,reviewId,reviewStatus,evidenceCurrent,
      gate,manualTemporalEligibility:gate==='ELIGIBLE_FOR_MANUAL_DV32J_CHECK'&&queue.permission.canDecide===true,
      nextStep: gate==='REVIEW_REQUIRED'?'USE_DV32I_TO_SUBMIT':
        gate==='ELIGIBLE_FOR_MANUAL_DV32J_CHECK'?'USE_DV32J_FOR_EXPLICIT_HANDOFF':'REVIEW_IN_DV32I',
      humanApprovalRequired:true,executionAuthorization:false,verifiedUrbanValue:false};
  });
  if(found.size!==recommendationIds.size)safeError('UNMATCHED_GRAPH_RECOMMENDATIONS');
  return {schema:'RHF-DV32L-GOVERNED-READINESS-v1',desk,scope,entries,
    reviewQueueTruncated:queue.truncated,temporalStatus:'NOT_QUERIED',
    controls:{humanDecisionRequired:true,temporalStartByThisRoute:false,fieldDispatch:false,
      payments:false,reservations:false,verifiedUrbanValue:false,executionAuthorization:false},
    sourceChain:['DV32H_AUTHORIZED_EVIDENCE','DV32K_VALIDATED_LANGGRAPH','DV32I_RLS_REVIEW_LEDGER','DV32J_MANUAL_PLANNING_ONLY']};
}
function reviewStatusAllowed(status){return reviewStatus(status);}
