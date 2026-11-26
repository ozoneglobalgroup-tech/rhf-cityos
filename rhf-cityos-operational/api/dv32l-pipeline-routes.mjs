// Authenticated, RLS-scoped, GET-only unified governance visibility; no side effects.
import {ClientError} from './domain.mjs';
import {dv32hAgentRoute} from './dv32h-agent-routes.mjs';
import {dv32kGraphRoute} from './dv32k-routes.mjs';
import {dv32iReviewRoute} from './dv32i-review-routes.mjs';
import {reconcilePlanningReadiness} from './dv32l-pipeline-core.mjs';
import {validateAgentRequest} from './dv32h-agent-boundary.mjs';
export async function dv32lPipelineRoute({method,resourceId,client,city,user,role,url}){
  try{validateAgentRequest({method,resourceId,url});}catch(e){throw new ClientError(e.message,e.message==='READ_ONLY_ENDPOINT'?405:400);}
  const desk=url.searchParams.get('desk');
  const report=await dv32hAgentRoute({method:'GET',resourceId:undefined,client,city,user,role,url});
  if(report.needsOrganizationSelection)return {schema:'RHF-DV32L-GOVERNED-READINESS-v1',desk,
    needsOrganizationSelection:true,entries:[],noCityWideFallback:true,
    controls:{humanDecisionRequired:true,temporalStartByThisRoute:false,executionAuthorization:false}};
  const graph=await dv32kGraphRoute({method:'GET',resourceId:undefined,client,city,user,role,url});
  // DV32I GET validates scope, user role and RLS; do NOT query its table directly from here.
  const queue=await dv32iReviewRoute({method:'GET',resourceId:undefined,client,city,user,role,url});
  try{return reconcilePlanningReadiness({report,graph,queue,desk,city});}
  catch{throw new ClientError('GOVERNANCE_EVIDENCE_OR_REVIEW_MISMATCH',409);}
}
