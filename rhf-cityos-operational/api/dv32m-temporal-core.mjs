// RHF DV32M: safe Temporal status classification; READ ONLY, no user supplied scope.
import {workflowId} from './dv32j-core.mjs';
import {UUID} from './dv32i-review-core.mjs';
const DESKS=new Set(['mayor','deputy','waste']);
const PHASES=new Set(['WAITING_FOR_PLANNING_ACK','ACKNOWLEDGED_NON_EXECUTING']);
export function validateStatusRequest({method,resourceId,url}) {
  if(method!=='GET')throw new Error('GET_ONLY');
  if(!UUID.test(resourceId||''))throw new Error('VALID_REVIEW_ID_REQUIRED');
  const p=url?.searchParams;
  if(!p||p.getAll('desk').length!==1||!DESKS.has(p.get('desk'))||p.getAll('orgId').length>1)
    throw new Error('EXPLICIT_UNIQUE_DESK_REQUIRED');
  for(const key of p.keys())if(!['desk','orgId'].includes(key))throw new Error('UNKNOWN_QUERY_PARAMETER');
  if(p.get('desk')!=='waste'&&p.has('orgId'))throw new Error('CROSS_DESK_ORG_REJECTED');
  if(p.has('orgId')&&!UUID.test(p.get('orgId')||''))throw new Error('INVALID_ORGANIZATION_ID');
  return {desk:p.get('desk'),reviewId:resourceId};
}
export function authorizeObservation(readiness,reviewId){
  if(!readiness||readiness.schema!=='RHF-DV32L-GOVERNED-READINESS-v1'||
    readiness.controls?.executionAuthorization!==false||
    readiness.controls?.temporalStartByThisRoute!==false||
    readiness.reviewQueueTruncated!==false||!Array.isArray(readiness.entries)||readiness.entries.length>10)
    throw new Error('UNTRUSTED_READINESS');
  const hits=readiness.entries.filter(e=>e?.reviewId===reviewId);
  if(hits.length!==1)throw new Error('REVIEW_NOT_IN_CURRENT_AUTHORIZED_EVIDENCE');
  const entry=hits[0];
  if(entry.gate!=='ELIGIBLE_FOR_MANUAL_DV32J_CHECK'||entry.manualTemporalEligibility!==true||
    entry.evidenceCurrent!==true||entry.reviewStatus!=='APPROVED_FOR_PLANNING'||
    entry.executionAuthorization!==false||entry.verifiedUrbanValue!==false)
    throw new Error('NOT_ELIGIBLE_FOR_TEMPORAL_OBSERVATION');
  return entry;
}
export function validateTemporalStatus(data,reviewId){
  if(!data||data.schema!=='RHF-DV32J-v1'||data.reviewId!==reviewId||
    data.executionAuthorization!==false||data.verifiedUrbanValue===true||data.fieldDispatch===true||data.payment===true)throw new Error('INVALID_TEMPORAL_RESPONSE');
  const expected=workflowId(reviewId);
  if(data.status==='NOT_STARTED'&&data.workflowId==null)
    return {phase:'NOT_STARTED_REPORTED',workflowId:expected,observation:'DV32J_NOT_FOUND',liveWorkflowObserved:false};
  if(data.workflowId!==expected||!data.status||typeof data.status!=='object'||Array.isArray(data.status)||
    data.status.reviewId!==reviewId||!PHASES.has(data.status.phase)||
    data.status.executionAuthorization!==false||data.status.verifiedUrbanValue!==false)
    throw new Error('UNTRUSTED_WORKFLOW_STATUS');
  return {phase:data.status.phase,workflowId:expected,observation:'LIVE_TEMPORAL_QUERY',liveWorkflowObserved:true};
}
