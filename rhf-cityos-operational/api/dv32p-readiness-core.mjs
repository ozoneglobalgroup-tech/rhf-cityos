// DV32P.1: source-grounded pilot readiness, not production or UAT certification.
export const DESKS=Object.freeze(['mayor','deputy','waste']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACCESS=new Set(['ALLOWED','DENIED','SELECT_ORGANIZATION']);
const REVIEW=new Set(['ALLOWED','DENIED','NOT_CHECKED']);
const GATE=new Set(['REVIEW_REQUIRED','STALE_EVIDENCE_REQUIRES_NEW_REVIEW','ELIGIBLE_FOR_MANUAL_DV32J_CHECK','AWAITING_INDEPENDENT_HUMAN_REVIEW','HUMAN_REVIEW_NOT_APPROVED','REVIEW_QUEUE_TRUNCATED_MANUAL_RECONCILIATION']);
const risk=(id,priority,scope,description,nextStep)=>({id,priority,scope,status:'NOT_VERIFIED',description,nextStep});
export const CONSTANT_GAPS=Object.freeze([
 risk('GAP_AUTHENTICATED_ROLE_BY_ROLE_UAT','P0','pilot','No authenticated Mayor, Deputy and bound Waste Director browser journeys have been accepted','Run isolated role accounts in final acceptance phase'),
 risk('GAP_END_TO_END_HUMAN_TEMPORAL','P0','pilot','No authenticated submit–independent review–planning handoff–Temporal acknowledgment lifecycle has passed','Test approved and rejected lifecycle, stale evidence and idempotency'),
 risk('GAP_ORGANIZATION_MISSION_COVERAGE','P0','full_city_os','No evidence that all required municipal subsidiaries and mission menus are operational','Audit full organization catalogue, 17 missions and five strategic axes against working routes'),
 risk('GAP_SHIRAZ_PILOT_DATA','P0','pilot','Shiraz 11 districts, special gardens area, sample resources, cases and org bindings are not role-verified','Reconcile scoped synthetic fixture counts, attribution and data-quality evidence'),
 risk('GAP_RESOURCE_DISPATCH_EXECUTION','P1','full_city_os','No pilot-accepted governed dispatch, work-order, field evidence or resource execution lifecycle','Implement and test separately with explicit operational authorization'),
 risk('GAP_VALUE_BASELINE_FOLLOWUP','P1','pilot','No independent acceptance of baseline/follow-up public-value outcomes and provenance','Verify value evidence gate, reviewer independence and measured results'),
 risk('GAP_RESILIENCE_LOAD_SECURITY','P1','pilot','Restore drill, concurrency, load, penetration and tenant cross-access acceptance not completed','Execute repeatable non-destructive preproduction battery'),
 risk('GAP_PRODUCTION_OPERATIONS','P1','full_city_os','Monitoring, backup/restore policy, secrets rotation, DR, SLA and live signoff not established by this audit','Complete operations runbooks and governance approvals'),
]);
export function validateAuditRequest({method,resourceId,url}){
 if(method!=='GET'||resourceId)throw new TypeError('GET_ONLY');
 if(!(url instanceof URL))throw new TypeError('INVALID_URL');
 const keys=[...url.searchParams.keys()];
 if(keys.some(k=>k!=='orgId')||url.searchParams.getAll('orgId').length>1)throw new TypeError('UNSUPPORTED_OR_DUPLICATE_QUERY');
 const orgId=url.searchParams.get('orgId');
 if(orgId!==null&&!UUID.test(orgId))throw new TypeError('INVALID_ORGANIZATION');
 return {orgId:orgId||null};
}
export function auditDeskUrl(url,desk,orgId){
 if(!DESKS.includes(desk))throw new TypeError('INVALID_DESK');
 const u=new URL(url.toString());u.search='';u.searchParams.set('desk',desk);
 if(desk==='waste'&&orgId)u.searchParams.set('orgId',orgId);
 return u;
}
export function ensureMatrix(matrix,city){
 if(matrix?.schema!=='RHF-DV32O-CURRENT-IDENTITY-ACCESS-MATRIX-v1'||
   matrix.scope?.municipalityId!==city.id||matrix.scope?.tenantId!==city.tenant_id||
   matrix.controls?.readOnly!==true||matrix.controls?.roleImpersonation!==false||
   matrix.controls?.workflowStart!==false||matrix.controls?.fieldDispatch!==false||
   matrix.controls?.verifiedUrbanValue!==false||matrix.limits?.finalProductAcceptance!=='NOT_CERTIFIED'||
   matrix.limits?.authenticatedFullWorkflowUat!=='NOT_RUN'||!Array.isArray(matrix.rows)||matrix.rows.length!==3)
   throw new TypeError('UNTRUSTED_ACCESS_MATRIX');
 const rows=matrix.rows;
 for(let i=0;i<3;i++){
   const r=rows[i];if(r?.desk!==DESKS[i]||!ACCESS.has(r.discovery)||!REVIEW.has(r.reviewQueue))throw new TypeError('INVALID_MATRIX_ROW');
   if(r.discovery==='ALLOWED'){
    if(!UUID.test(city.id)||r.candidateCount<0||!Number.isSafeInteger(r.candidateCount)||r.candidateCount>10)
      throw new TypeError('UNBOUNDED_DISCOVERY');
    if(r.desk==='waste'&&!UUID.test(r.organizationId||''))throw new TypeError('WASTE_BINDING_REQUIRED');
    if(r.desk!=='waste'&&r.organizationId)throw new TypeError('CROSS_DESK_ORGANIZATION');
   } else if(r.reviewQueue!=='NOT_CHECKED')throw new TypeError('UNAUTHORIZED_REVIEW');
   if(r.reviewQueue==='ALLOWED'&&r.discovery!=='ALLOWED')throw new TypeError('REVIEW_WITHOUT_DISCOVERY');
 }
 return rows;
}
export function classifyChain({desk,matrixRow,readiness,city}){
 if(matrixRow.discovery!=='ALLOWED'||matrixRow.reviewQueue!=='ALLOWED')
   return {desk,status:matrixRow.discovery==='SELECT_ORGANIZATION'?'NEEDS_ORGANIZATION':'NOT_PROBED',candidateCount:null,approvedForManualPlanning:0};
 if(readiness===null)return {desk,status:'DEPENDENCY_NOT_VERIFIED',candidateCount:null,approvedForManualPlanning:0};
 if(readiness?.schema!=='RHF-DV32L-GOVERNED-READINESS-v1'||readiness.desk!==desk||
   readiness.scope?.municipalityId!==city.id||readiness.scope?.tenantId!==city.tenant_id||
   (readiness.scope?.organizationId||null)!==(matrixRow.organizationId||null)||
   readiness.controls?.temporalStartByThisRoute!==false||readiness.controls?.fieldDispatch!==false||
   readiness.controls?.executionAuthorization!==false||readiness.controls?.verifiedUrbanValue!==false||
   typeof readiness.reviewQueueTruncated!=='boolean'||!Array.isArray(readiness.entries)||readiness.entries.length>10)
   throw new TypeError('UNTRUSTED_GOVERNANCE_CHAIN');
 if(readiness.entries.length!==matrixRow.candidateCount)throw new TypeError('INCONSISTENT_CANDIDATE_COUNTS');
 let manual=0;
 const ids=new Set();
 for(const e of readiness.entries){
   if(!e||typeof e.candidateId!=='string'||e.candidateId.length>110||ids.has(e.candidateId)||
      !GATE.has(e.gate)||e.executionAuthorization!==false||e.verifiedUrbanValue!==false||
      typeof e.manualTemporalEligibility!=='boolean')throw new TypeError('UNTRUSTED_CHAIN_ENTRY');
   ids.add(e.candidateId);
   if(e.manualTemporalEligibility){
    if(e.gate!=='ELIGIBLE_FOR_MANUAL_DV32J_CHECK'||e.evidenceCurrent!==true||
       e.reviewStatus!=='APPROVED_FOR_PLANNING'||readiness.reviewQueueTruncated)
      throw new TypeError('FALSE_PLANNING_ELIGIBILITY');
    manual++;
   }
 }
 return {desk,status:readiness.reviewQueueTruncated?'TRUNCATED_REQUIRES_RECONCILIATION':'OBSERVED_FOR_CURRENT_IDENTITY',
  candidateCount:readiness.entries.length,approvedForManualPlanning:manual};
}
export function buildReadiness({city,role,matrix,chains,observedAt}){
 if(!city?.id||!city?.tenant_id||matrix?.role!==role||!Array.isArray(chains)||chains.length!==3||
   typeof role!=='string'||role.length>80||!Number.isFinite(Date.parse(observedAt)))throw new TypeError('INVALID_AUDIT_INPUT');
 const rows=ensureMatrix(matrix,city);
 if(chains.some((x,i)=>x.desk!==DESKS[i]||!['NOT_PROBED','NEEDS_ORGANIZATION','DEPENDENCY_NOT_VERIFIED','TRUNCATED_REQUIRES_RECONCILIATION','OBSERVED_FOR_CURRENT_IDENTITY'].includes(x.status)))
   throw new TypeError('INVALID_CHAIN_AUDIT');
 const observed=rows.map((r,i)=>({desk:r.desk,discovery:r.discovery,reviewQueue:r.reviewQueue,
   canSubmitReview:r.reviewQueue==='ALLOWED'&&r.canSubmitReview===true,
   canDecideForOtherUser:r.reviewQueue==='ALLOWED'&&r.canDecideForOtherUser===true,
   organizationScoped:r.desk==='waste'&&r.discovery==='ALLOWED',
   candidateCount:r.candidateCount??null,chainStatus:chains[i].status,
   manuallyEligibleSuggestions:chains[i].approvedForManualPlanning}));
 const gaps=CONSTANT_GAPS.map(x=>({...x}));
 const scoped=observed.filter(x=>x.discovery==='ALLOWED');
 if(scoped.length<3)gaps.push(risk('GAP_CURRENT_IDENTITY_NOT_ALL_ROLES','P0','pilot',
  'The current signed-in identity cannot demonstrate all three role desks; this is not a role impersonation test',
  'Perform three independent account-based checks after completing development'));
 if(chains.some(x=>x.status==='DEPENDENCY_NOT_VERIFIED'||x.status==='TRUNCATED_REQUIRES_RECONCILIATION'))
   gaps.push(risk('GAP_GOVERNANCE_CHAIN_INCONCLUSIVE','P0','pilot',
    'At least one authorized evidence-to-review chain is unavailable or inconclusive','Reconcile dependency health and review ledger before acceptance'));
 return {schema:'RHF-DV32P-PILOT-READINESS-AUDIT-v1',observedAt,scope:{tenantId:city.tenant_id,municipalityId:city.id},
  inspectedIdentityRole:role,inspection:'READ_ONLY_CURRENT_IDENTITY_AND_AUTHORIZED_AGGREGATES',
  observed,plannedMilestones:['DV32Q_REMEDIATE_CONFIRMED_GAPS','DV32R_AUTOMATED_E2E_SECURITY','DV32S_AUTHENTICATED_BROWSER_UAT','DV32T_RETEST_RELEASE_GATE'],
  gaps,metrics:{observedDeskCount:scoped.length,allThreeRealRoleAccountsTested:false,acceptedPilotWorkflows:0},
  acceptance:{decision:'NO_GO_PENDING_EVIDENCE_AND_ROLE_UAT',authenticatedRoleByRoleUat:'NOT_RUN',
   authenticatedEndToEndUat:'NOT_RUN',performanceAndRecovery:'NOT_VERIFIED',fullOrganizationCoverage:'NOT_VERIFIED',
   operationalFieldDispatch:'NOT_CERTIFIED',finalProductAcceptance:'NOT_CERTIFIED'},
  controls:{readOnly:true,sourceOfTruth:'AUTHORIZED_DV32O_AND_DV32L',roleImpersonation:false,
   fieldDispatch:false,resourceReservation:false,payment:false,temporalStart:false,temporalSignal:false,
   verifiedUrbanValue:false,automaticIamGrant:false}};
}
