// Under the existing authenticated withScope(read) DB transaction.
// Reuses DV32L for fresh scoped evidence + human-review authorization, then DV32J GET only.
import {ClientError} from './domain.mjs';
import {dv32lPipelineRoute} from './dv32l-pipeline-routes.mjs';
import {dv32jHandoffRoute} from './dv32j-routes.mjs';
import {authorizeObservation,validateStatusRequest,validateTemporalStatus} from './dv32m-temporal-core.mjs';
const fail=(code,message)=>{throw new ClientError(message,code);};
export async function dv32mTemporalStatusRoute({method,resourceId,client,city,user,role,url}){
  let request;
  try{request=validateStatusRequest({method,resourceId,url});}
  catch(e){fail(e.message==='GET_ONLY'?405:400,e.message);}
  const readiness=await dv32lPipelineRoute({method:'GET',resourceId:undefined,client,city,user,role,url});
  if(readiness.needsOrganizationSelection)fail(403,'EXPLICIT_AUTHORIZED_ORGANIZATION_REQUIRED');
  if(readiness.desk!==request.desk||readiness.scope?.tenantId!==city.tenant_id||
     readiness.scope?.municipalityId!==city.id)fail(403,'SCOPE_MISMATCH');
  let candidate;
  try{candidate=authorizeObservation(readiness,resourceId);}
  catch(e){fail(e.message==='REVIEW_NOT_IN_CURRENT_AUTHORIZED_EVIDENCE'?404:409,e.message);}
  // This is the ONLY Temporal interaction; an existing read-only GET endpoint, never START or SIGNAL.
  const status=await dv32jHandoffRoute({method:'GET',resourceId,client,city,user,role,url,headers:{}});
  let safe;
  try{safe=validateTemporalStatus(status,resourceId);}
  catch{fail(503,'TEMPORAL_STATUS_NOT_TRUSTWORTHY');}
  return {schema:'RHF-DV32M-TEMPORAL-OBSERVABILITY-v1',desk:request.desk,
    scope:{tenantId:readiness.scope.tenantId,municipalityId:readiness.scope.municipalityId,
      organizationId:readiness.scope.organizationId||null},
    reviewId:resourceId,candidateId:candidate.candidateId,phase:safe.phase,
    workflowId:safe.workflowId,observation:safe.observation,liveWorkflowObserved:safe.liveWorkflowObserved,
    checkedAt:new Date().toISOString(),
    controls:{humanReviewAlreadyRequired:true,readOnly:true,workflowStartedByThisRoute:false,
      workflowSignaledByThisRoute:false,fieldDispatch:false,payment:false,reservations:false,
      executionAuthorization:false,verifiedUrbanValue:false}};
}
