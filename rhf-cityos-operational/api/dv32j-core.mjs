// RHF DV32J: planning-only bridge authorization; never grants execution.
import {reviewerAllowed,UUID,validateScope} from './dv32i-review-core.mjs';
export const QUEUE='rhf-dv32j-planning-handoff-v1';
export const ACTIONS=new Set(['START','ACKNOWLEDGE_PLANNING']);
export const CONFIRM='TEMPORAL_PLANNING_ONLY_NO_OPERATION';
export function validReview(row,scope){
 if(!row||!UUID.test(row.id||'')||row.desk!==scope.desk||row.status!=='APPROVED_FOR_PLANNING'||
    (row.organization_id||null)!==(scope.organizationId||null)||
    !UUID.test(row.submitted_by||'')||!UUID.test(row.decided_by||'')||
    row.submitted_by===row.decided_by||!(/^[0-9a-f]{64}$/.test(row.evidence_sha256||'')))
  throw new Error('INELIGIBLE_OR_OUT_OF_SCOPE_REVIEW');
 return true;
}
export function validateAction(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['action','reason','confirm'].includes(k)))
  throw new Error('UNSUPPORTED_ACTION_FIELD');
 if(!ACTIONS.has(body.action)||body.confirm!==CONFIRM||typeof body.reason!=='string'||body.reason.trim().length<16||body.reason.length>1000)
  throw new Error('EXPLICIT_NON_EXECUTING_HUMAN_INTENT_REQUIRED');
 return {action:body.action,reason:body.reason.trim()};
}
export function planningOnlyRecord({city,scope,row,user}){
 validReview(row,scope);
 return {version:'DV32J.1',tenantId:city.tenant_id,municipalityId:city.id,
  organizationId:scope.organizationId||null,desk:row.desk,reviewId:row.id,
  evidenceSha256:row.evidence_sha256,decidedBy:row.decided_by,
  requestedBy:user.id,executionAuthorized:false,verifiedUrbanValue:false};
}
export function workflowId(reviewId){if(!UUID.test(reviewId||''))throw new Error('INVALID_REVIEW_ID');return `rhf-dv32j-${reviewId}`;}
export function mustBeReviewer(role,user){if(!reviewerAllowed(role,user?.is_system_admin))throw new Error('INDEPENDENT_MUNICIPAL_REVIEWER_REQUIRED');}
export function validateReport(desk,report,city){
 const scope=validateScope({desk,report});
 if(scope.tenantId!==city.tenant_id||scope.municipalityId!==city.id)throw new Error('TENANT_CITY_SCOPE_MISMATCH');
 return {...scope,desk};
}
