// DV32O current-identity access matrix: a scoped observation, NOT IAM entitlement issuance.
export const DESKS=Object.freeze(['mayor','deputy','waste']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATES=new Set(['ALLOWED','DENIED','SELECT_ORGANIZATION']);
export function validateMatrixRequest({method,resourceId,url}){
 if(method!=='GET'||resourceId)throw new TypeError('GET_ONLY');
 const keys=[...url.searchParams.keys()];
 if(keys.some(k=>k!=='orgId')||url.searchParams.getAll('orgId').length>1)
  throw new TypeError('UNSUPPORTED_OR_DUPLICATE_QUERY_PARAMETER');
 const orgId=url.searchParams.get('orgId');
 if(orgId!==null&&!UUID.test(orgId))throw new TypeError('INVALID_ORGANIZATION_ID');
 return {orgId:orgId||null};
}
export function deskQuery(base,desk,orgId){
 if(!DESKS.includes(desk))throw new TypeError('INVALID_DESK');
 const u=new URL(base.toString());u.search='';u.searchParams.set('desk',desk);
 if(desk==='waste'&&orgId)u.searchParams.set('orgId',orgId);
 return u;
}
export function scopedDiscovery({desk,report,city}){
 if(report?.needsOrganizationSelection===true){
  if(desk!=='waste'||report.noCityWideFallback!==true||report.candidates?.length!==0||
    report.scope?.municipalityId!==city.id||report.scope?.organizationId)
    throw new TypeError('UNSAFE_EMPTY_SCOPE_FALLBACK');
  return {access:'SELECT_ORGANIZATION',organizationId:null,candidateCount:0};
 }
 if(report?.schema!=='RHF-DV32H-EXECUTIVE-DISCOVERY-v1'||report.readOnly!==true||
    report.desk!==desk||!Array.isArray(report.candidates)||report.truncated!==false||
    !report.scope||report.scope.tenantId!==city.tenant_id||report.scope.municipalityId!==city.id||
    report.controls?.actionExecution!==false||report.controls?.verifiedUrbanValue!==false)
  throw new TypeError('UNTRUSTED_DISCOVERY_OR_SCOPE');
 if(desk==='waste'){
  if(!UUID.test(report.scope.organizationId||''))throw new TypeError('MISSING_BOUND_ORGANIZATION');
 }else if(report.scope.organizationId)throw new TypeError('CROSS_DESK_SCOPE');
 if(report.candidates.length>10)throw new TypeError('UNBOUNDED_CANDIDATES');
 return {access:'ALLOWED',organizationId:desk==='waste'?report.scope.organizationId:null,
  candidateCount:report.candidates.length};
}
export function scopedReview({desk,report,city,discovery}){
 if(discovery.access!=='ALLOWED')throw new TypeError('REVIEW_WITHOUT_DISCOVERY');
 if(report?.schema!=='RHF-DV32I-REVIEW-v1'||report.desk!==desk||report.executionAuthorization!==false||
    report.verifiedUrbanValue!==false||!report.scope||report.scope.tenantId!==city.tenant_id||
    report.scope.municipalityId!==city.id||(report.scope.organizationId||null)!==discovery.organizationId||
    !Array.isArray(report.reviews)||report.reviews.length>100||typeof report.truncated!=='boolean'||
    report.permission?.canSubmit!==true||typeof report.permission.canDecide!=='boolean')
  throw new TypeError('UNTRUSTED_REVIEW_PERMISSION_OR_SCOPE');
 return {access:'ALLOWED',canSubmitReview:true,canDecideForOtherUser:report.permission.canDecide,
  reviewQueueTruncated:report.truncated,visibleReviewCount:report.reviews.length};
}
export function deniedRow(desk){return {desk,discovery:'DENIED',reviewQueue:'NOT_CHECKED',organizationId:null,
 candidateCount:null,canSubmitReview:false,canDecideForOtherUser:false,reviewQueueTruncated:null,visibleReviewCount:null};}
export function selectionRow(desk){return {desk,discovery:'SELECT_ORGANIZATION',reviewQueue:'NOT_CHECKED',organizationId:null,
 candidateCount:0,canSubmitReview:false,canDecideForOtherUser:false,reviewQueueTruncated:null,visibleReviewCount:null};}
export function allowedRow(desk,discovery,review){
 if(!STATES.has(discovery.access)||discovery.access!=='ALLOWED'||review.access!=='ALLOWED')
  throw new TypeError('UNAUTHORIZED_MATRIX_ROW');
 return {desk,discovery:'ALLOWED',reviewQueue:'ALLOWED',organizationId:discovery.organizationId,
 candidateCount:discovery.candidateCount,canSubmitReview:review.canSubmitReview,
 canDecideForOtherUser:review.canDecideForOtherUser,reviewQueueTruncated:review.reviewQueueTruncated,
 visibleReviewCount:review.visibleReviewCount};
}
export function finalMatrix({city,role,rows}){
 if(!city?.id||!city?.tenant_id||typeof role!=='string'||role.length>80||!Array.isArray(rows)||
   rows.length!==3||rows.some((r,i)=>r.desk!==DESKS[i]||!STATES.has(r.discovery)||
   (r.discovery!=='ALLOWED'&&r.reviewQueue!=='NOT_CHECKED')))
   throw new TypeError('INVALID_ACCESS_MATRIX');
 return {schema:'RHF-DV32O-CURRENT-IDENTITY-ACCESS-MATRIX-v1',
  scope:{tenantId:city.tenant_id,municipalityId:city.id},role,
  rows,interpretation:'LIVE_READ_PROBES_FOR_CURRENT_SIGNED_IN_IDENTITY_ONLY',
  controls:{readOnly:true,municipalityRlsScoped:true,discoveryAndReviewChecked:true,
   organizationBindingNotOverridable:true,roleImpersonation:false,automaticIamGrants:false,
   workflowStart:false,temporalSignal:false,fieldDispatch:false,payment:false,verifiedUrbanValue:false},
  limits:{historicalReviewsMayBeTruncated:true,notAllApiPermissionsEnumerated:true,
   browserRoleByRoleUat:'NOT_RUN',authenticatedFullWorkflowUat:'NOT_RUN',
   finalProductAcceptance:'NOT_CERTIFIED',manualTemporalRequiresIndependentApproval:true}};
}
