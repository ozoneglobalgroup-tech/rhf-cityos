// DV32I.1: human evidence review only; no operational authorization or verified value.
import {createHash} from 'node:crypto';
import {adminAllowed} from './dv32g-core.mjs';
export const DESKS=new Set(['mayor','deputy','waste']);
export const DECISIONS=new Set(['APPROVED_FOR_PLANNING','REJECTED','NEEDS_MORE_EVIDENCE']);
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validateBody(input,kind){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('INVALID_BODY');
  const keys=kind==='SUBMIT'?['candidateId','rationale','confirm']:['decision','reason','confirm'];
  if(Object.keys(input).some(k=>!keys.includes(k)))throw new TypeError('UNSUPPORTED_ACTION_FIELD');
  if(kind==='SUBMIT'){
    if(typeof input.candidateId!=='string'||!/^[a-z0-9:-]{3,110}$/.test(input.candidateId))throw new TypeError('INVALID_CANDIDATE');
    if(typeof input.rationale!=='string'||input.rationale.trim().length<16||input.rationale.length>1000)throw new TypeError('RATIONALE_REQUIRED');
    if(input.confirm!=='REQUEST_HUMAN_EVIDENCE_REVIEW')throw new TypeError('EXPLICIT_REVIEW_REQUEST_REQUIRED');
    return {candidateId:input.candidateId,rationale:input.rationale.trim()};
  }
  if(!DECISIONS.has(input.decision))throw new TypeError('INVALID_DECISION');
  if(typeof input.reason!=='string'||input.reason.trim().length<16||input.reason.length>1000)throw new TypeError('DECISION_REASON_REQUIRED');
  if(input.confirm!=='HUMAN_REVIEW_NOT_OPERATIONAL_APPROVAL')throw new TypeError('EXPLICIT_NON_OPERATIONAL_CONFIRMATION_REQUIRED');
  return {decision:input.decision,reason:input.reason.trim()};
}
export function validateScope({desk,report}){
  if(!DESKS.has(desk)||!report||report.readOnly!==true||report.needsOrganizationSelection)throw new TypeError('UNAUTHORIZED_OR_EMPTY_SCOPE');
  const s=report.scope||{};
  if(!UUID.test(s.tenantId||'')||!UUID.test(s.municipalityId||''))throw new TypeError('INVALID_SCOPE');
  if(desk==='waste'&&!UUID.test(s.organizationId||''))throw new TypeError('WASTE_BOUND_ORG_REQUIRED');
  if(desk!=='waste'&&s.organizationId)throw new TypeError('CITY_ONLY_SCOPE_EXPECTED');
  if(!Array.isArray(report.candidates))throw new TypeError('NO_EVIDENCE_CANDIDATES');
  return {tenantId:s.tenantId,municipalityId:s.municipalityId,organizationId:desk==='waste'?s.organizationId:null};
}
export function candidateFingerprint({desk,scope,candidate}){
  if(!DESKS.has(desk)||!candidate||!Array.isArray(candidate.evidence)||candidate.valueAssessment?.status!=='NOT_VERIFIED')throw new TypeError('INVALID_EVIDENCE');
  const raw=JSON.stringify({schema:'RHF-DV32I-REVIEW-EVIDENCE-v1',desk,scope,
    candidate:{id:candidate.id,title:candidate.title,priority:candidate.priority,description:candidate.description,evidence:candidate.evidence}});
  return createHash('sha256').update(raw,'utf8').digest('hex');
}
export function reviewerAllowed(role,isSystemAdmin){return adminAllowed(role,isSystemAdmin);}
export function reviewStatus(status){return ['SUBMITTED','APPROVED_FOR_PLANNING','REJECTED','NEEDS_MORE_EVIDENCE'].includes(status);}
export function sanitizeCandidate(candidate){return {id:candidate.id,title:candidate.title,priority:candidate.priority,
  description:candidate.description,evidence:candidate.evidence,verifiedUrbanValue:false,executionAuthorization:false};}
