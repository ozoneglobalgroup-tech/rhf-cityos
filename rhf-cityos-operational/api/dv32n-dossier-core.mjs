// DV32N.1 — bounded, read-only evidence-to-human-to-Temporal dossier. NOT an attestation.
import {createHash} from 'node:crypto';
import {candidateFingerprint,UUID} from './dv32i-review-core.mjs';
const CAND=/^[a-z0-9:-]{3,110}$/;
const METRIC=/^[a-z][a-z0-9_]{0,70}$/;
const SOURCES=new Set(['service_cases','capacity_resources','capacity_allocations','org_units + service_cases']);
const TYPES=new Set(['AGGREGATE','SCOPED_AGGREGATE','DIRECT_UNIT_AGGREGATE']);
const DESKS=new Set(['mayor','deputy','waste']);
const PHASES=new Set(['NOT_STARTED_REPORTED','WAITING_FOR_PLANNING_ACK','ACKNOWLEDGED_NON_EXECUTING']);
const GATES=new Set(['REVIEW_REQUIRED','STALE_EVIDENCE_REQUIRES_NEW_REVIEW','ELIGIBLE_FOR_MANUAL_DV32J_CHECK','AWAITING_INDEPENDENT_HUMAN_REVIEW','HUMAN_REVIEW_NOT_APPROVED','REVIEW_QUEUE_TRUNCATED_MANUAL_RECONCILIATION']);
const fail=x=>{throw new TypeError(x);};
const cleanString=(s,max)=>{if(typeof s!=='string'||s.length>max||!s.length)fail('INVALID_TEXT');return s;};
export function validateDossierRequest({method,resourceId,url}){
 if(method!=='GET')fail('GET_ONLY');
 let decoded;try{decoded=decodeURIComponent(resourceId||'');}catch{fail('INVALID_CANDIDATE_ID');}
 if(!CAND.test(decoded))fail('INVALID_CANDIDATE_ID');
 const p=url?.searchParams;
 if(!p||p.getAll('desk').length!==1||!DESKS.has(p.get('desk'))||p.getAll('orgId').length>1||p.getAll('includeTemporal').length>1)fail('INVALID_QUERY');
 for(const k of p.keys())if(!['desk','orgId','includeTemporal'].includes(k))fail('UNKNOWN_QUERY_PARAMETER');
 if(p.get('desk')!=='waste'&&p.has('orgId'))fail('CROSS_DESK_ORGANIZATION');
 if(p.has('orgId')&&!UUID.test(p.get('orgId')||''))fail('INVALID_ORGANIZATION');
 if(p.has('includeTemporal')&&!['0','1'].includes(p.get('includeTemporal')))fail('INVALID_TEMPORAL_FLAG');
 return {desk:p.get('desk'),candidateId:decoded,includeTemporal:p.get('includeTemporal')==='1'};
}
export function forwardedReadUrl(url){
 const safe=new URL(url.toString());safe.searchParams.delete('includeTemporal');return safe;
}
function exactScope(a,b,desk,city){
 if(!a||!b||!UUID.test(a.tenantId||'')||!UUID.test(a.municipalityId||'')||
 a.tenantId!==b.tenantId||a.municipalityId!==b.municipalityId||
 (a.organizationId||null)!==(b.organizationId||null)||a.tenantId!==city.tenant_id||a.municipalityId!==city.id)fail('SCOPE_MISMATCH');
 if(desk==='waste'&&!UUID.test(a.organizationId||''))fail('ORGANIZATION_REQUIRED');
 if(desk!=='waste'&&a.organizationId)fail('UNEXPECTED_ORGANIZATION');
}
function evidenceRows(candidate){
 if(!Array.isArray(candidate.evidence)||candidate.evidence.length===0||candidate.evidence.length>20)fail('INVALID_EVIDENCE_LIST');
 return candidate.evidence.map(item=>{
  if(!item||!SOURCES.has(item.source)||!TYPES.has(item.kind)||!METRIC.test(item.metric||'')||
  typeof item.count!=='number'||!Number.isSafeInteger(item.count)||item.count<0)fail('INVALID_EVIDENCE_SIGNAL');
  const row={source:item.source,kind:item.kind,metric:item.metric,count:item.count};
  if(item.unitId){if(!UUID.test(item.unitId))fail('INVALID_UNIT_ID');row.unitId=item.unitId;}
  return row;
 });
}
export function dossierTemporalEligible(entry,readiness){
 return readiness.reviewQueueTruncated===false&&entry.gate==='ELIGIBLE_FOR_MANUAL_DV32J_CHECK'&&
  entry.manualTemporalEligibility===true&&entry.evidenceCurrent===true&&
  entry.reviewStatus==='APPROVED_FOR_PLANNING'&&UUID.test(entry.reviewId||'')&&
  entry.executionAuthorization===false&&entry.verifiedUrbanValue===false;
}
export function buildDossier({readiness,report,queue,candidateId,desk,city,includeTemporal=false,observation=null,generatedAt}){
 if(!CAND.test(candidateId||'')||!DESKS.has(desk)||!city)fail('INVALID_REQUEST');
 if(!report||report.schema!=='RHF-DV32H-EXECUTIVE-DISCOVERY-v1'||report.readOnly!==true||report.needsOrganizationSelection||
  report.desk!==desk||report.controls?.actionExecution!==false||report.controls?.verifiedUrbanValue!==false||
  !Array.isArray(report.candidates)||report.candidates.length>10)fail('UNTRUSTED_DISCOVERY');
 if(!readiness||readiness.schema!=='RHF-DV32L-GOVERNED-READINESS-v1'||readiness.desk!==desk||
  readiness.needsOrganizationSelection||!Array.isArray(readiness.entries)||readiness.entries.length>10||
  typeof readiness.reviewQueueTruncated!=='boolean'||readiness.controls?.executionAuthorization!==false||
  readiness.controls?.temporalStartByThisRoute!==false||readiness.controls?.verifiedUrbanValue!==false)fail('UNTRUSTED_READINESS');
 if(!queue||queue.schema!=='RHF-DV32I-REVIEW-v1'||queue.desk!==desk||
  !Array.isArray(queue.reviews)||queue.reviews.length>100||typeof queue.truncated!=='boolean'||
  queue.truncated!==readiness.reviewQueueTruncated||!queue.permission||
  queue.executionAuthorization!==false||queue.verifiedUrbanValue!==false)fail('UNTRUSTED_REVIEW_LEDGER');
 exactScope(report.scope,queue.scope,desk,city);
 exactScope(report.scope,readiness.scope,desk,city);
 const candidates=report.candidates.filter(x=>x?.id===candidateId),entries=readiness.entries.filter(x=>x?.candidateId===candidateId);
 if(candidates.length!==1||entries.length!==1)fail('CANDIDATE_NOT_IN_AUTHORIZED_CHAIN');
 const c=candidates[0],entry=entries[0];
 if(!['HIGH','MEDIUM','LOW'].includes(c.priority)||c.priority!==entry.priority||
  !GATES.has(entry.gate)||entry.executionAuthorization!==false||entry.verifiedUrbanValue!==false||
  entry.humanApprovalRequired!==true||!['AGGREGATE_REVIEW','EVIDENCE_RECONCILIATION'].includes(entry.reviewCategory))fail('UNTRUSTED_CANDIDATE');
 if(c.valueAssessment?.status!=='NOT_VERIFIED'||c.valueAssessment?.verifiedValue!==null||
  c.humanApprovalRequired!==true||c.automatedExecution!==false)fail('INVALID_VALUE_ASSESSMENT');
 if(entry.reviewId!==null&&!UUID.test(entry.reviewId||''))fail('INVALID_REVIEW_ID');
 const hash=candidateFingerprint({desk,scope:{tenantId:report.scope.tenantId,municipalityId:report.scope.municipalityId,
  organizationId:desk==='waste'?report.scope.organizationId:null},candidate:c});
 if(!/^[a-f0-9]{64}$/.test(hash))fail('FINGERPRINT_FAILED');
 const latest=queue.reviews.find(x=>x?.candidate_id===candidateId);
 if((latest?.id??null)!==(entry.reviewId??null))fail('REVIEW_SNAPSHOT_CHANGED');
 if(latest){
  if(!UUID.test(latest.id||'')||latest.desk!==desk||
   (latest.organization_id||null)!==(report.scope.organizationId||null)||
   latest.status!==entry.reviewStatus||!(/^[a-f0-9]{64}$/.test(latest.evidence_sha256||''))||
   (latest.evidence_sha256===hash)!==(entry.evidenceCurrent===true))fail('REVIEW_EVIDENCE_MISMATCH');
  if(entry.reviewStatus==='APPROVED_FOR_PLANNING'&&
    (!UUID.test(latest.submitted_by||'')||!UUID.test(latest.decided_by||'')||
     latest.submitted_by===latest.decided_by))fail('INDEPENDENT_APPROVAL_NOT_PROVEN');
 }else if(entry.reviewStatus!==null||entry.evidenceCurrent!==false)fail('REVIEW_STATE_MISMATCH');

 const eligible=dossierTemporalEligible(entry,readiness)&&queue.permission.canDecide===true;
 if(includeTemporal&&!eligible)fail('TEMPORAL_OBSERVATION_NOT_AUTHORIZED');
 let temporal={phase:'NOT_QUERIED',observation:'NOT_REQUESTED',liveWorkflowObserved:false,workflowId:null};
 if(includeTemporal){
  if(!observation||observation.schema!=='RHF-DV32M-TEMPORAL-OBSERVABILITY-v1'||
   observation.reviewId!==entry.reviewId||observation.candidateId!==candidateId||
   !PHASES.has(observation.phase)||observation.controls?.executionAuthorization!==false||
   observation.controls?.workflowStartedByThisRoute!==false||observation.controls?.workflowSignaledByThisRoute!==false||
   observation.controls?.verifiedUrbanValue!==false)fail('UNTRUSTED_TEMPORAL_OBSERVATION');
  exactScope(report.scope,observation.scope,desk,city);
  if(observation.phase==='NOT_STARTED_REPORTED'&&observation.liveWorkflowObserved!==false)fail('TEMPORAL_STATE_INCONSISTENT');
  if(observation.phase!=='NOT_STARTED_REPORTED'&&observation.liveWorkflowObserved!==true)fail('TEMPORAL_STATE_INCONSISTENT');
  if(typeof observation.workflowId!=='string'||!/^rhf-dv32j-/.test(observation.workflowId)||observation.workflowId.length>150)fail('UNTRUSTED_WORKFLOW_ID');
  temporal={phase:observation.phase,observation:observation.observation,
   liveWorkflowObserved:observation.liveWorkflowObserved,workflowId:observation.workflowId};
 }
 const timestamp=generatedAt??new Date().toISOString();
 if(typeof timestamp!=='string'||Number.isNaN(Date.parse(timestamp))||timestamp.length>40)fail('INVALID_GENERATION_TIME');
 const body={schema:'RHF-DV32N-GOVERNED-EVIDENCE-DOSSIER-v1',snapshotAt:timestamp,
  status:'POINT_IN_TIME_UNATTESTED',desk,scope:{tenantId:report.scope.tenantId,municipalityId:report.scope.municipalityId,organizationId:report.scope.organizationId||null},
  candidate:{id:c.id,title:cleanString(c.title,150),priority:c.priority,reviewCategory:entry.reviewCategory,
   evidence:evidenceRows(c),evidenceFingerprintSha256:hash,source:'DV32H_AUTHORIZED_AGGREGATES_AND_DV32K_VALIDATED_RECOMMENDATION'},
  humanReview:{reviewId:entry.reviewId,status:entry.reviewStatus,gate:entry.gate,evidenceCurrent:entry.evidenceCurrent===true,
   independentPlanningApprovalShown:eligible,manualTemporalEligibility:eligible},
  temporal,
  controls:{readOnly:true,sourceDataLevel:'AGGREGATE_ONLY',humanApprovalRequired:true,
   executionAuthorization:false,verifiedUrbanValue:false,workflowStartedByThisRoute:false,
   workflowSignaledByThisRoute:false,fieldDispatch:false,payment:false,reservations:false},
  caveats:['Snapshot for administrative traceability only; not a digital signature or legally verified record.',
   'No achieved urban value, resource availability, field execution or financial benefit is established.']};
 const checksum=createHash('sha256').update(JSON.stringify(body),'utf8').digest('hex');
 return {...body,integrity:{algorithm:'SHA-256',snapshotChecksum:checksum,meaning:'UNSIGNED_CONTENT_CHECKSUM_ONLY'}};
}
