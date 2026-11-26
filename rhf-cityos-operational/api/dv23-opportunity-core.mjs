/** DV2.3A: Explainable *rule-based* matching, not autonomous agent execution. */
export const DV23_SCHEMA='RHF-DV23A-EVIDENCE-DISCOVERY-v1';
export const MAX_ROWS=200;
export const MAX_CANDIDATES=20;
const present=(row)=>({id:row.id,ownerOrgId:row.owner_org_id,title:row.title,evidenceRef:row.evidence_ref,
 quantity:row.quantity===null?null:String(row.quantity),unit:row.unit});
function evidenceIsReviewed(row,city,allowed){
 return row&&row.status==='REVIEWED'&&['NEED','CAPACITY'].includes(row.kind)
  &&row.tenant_id===city.tenant_id&&row.municipality_id===city.id
  &&allowed.has(row.owner_org_id)
  &&typeof row.evidence_ref==='string'&&row.evidence_ref.length>=12
  &&typeof row.review_note==='string'&&row.review_note.trim().length>=25
  &&row.reviewed_by&&row.created_by&&row.reviewed_by!==row.created_by
  &&row.id&&typeof row.sector==='string';
}
function amount(row){return row.quantity===null?null:Number(row.quantity)}
function compatible(need,capacity){
 if(need.sector!==capacity.sector)return null;
 const nq=amount(need),cq=amount(capacity);
 if(nq!==null&&cq!==null){
  if(!Number.isFinite(nq)||!Number.isFinite(cq)||need.unit!==capacity.unit)return null;
  if(cq<nq)return null;
  return {quantityAssessment:'REPORTED_SUFFICIENCY_ONLY',quantityGapReported:String(cq-nq)};
 }
 return {quantityAssessment:'UNDETERMINED',quantityGapReported:null};
}
export function createProposals({rows,city,ownerIds,limit=MAX_CANDIDATES}){
 if(!Array.isArray(rows)||rows.length>MAX_ROWS||!city||!Array.isArray(ownerIds))throw Error('DV23_INVALID_INPUT');
 const scoped=new Set(ownerIds);
 const reviewed=rows.filter(x=>evidenceIsReviewed(x,city,scoped));
 const needs=reviewed.filter(r=>r.kind==='NEED');
 const capacities=reviewed.filter(r=>r.kind==='CAPACITY');
 const pairs=[];
 for(const need of needs){
  for(const capacity of capacities){
   const assessment=compatible(need,capacity);
   if(!assessment)continue;
   pairs.push({key:`${need.id}:${capacity.id}`,kind:'SECTOR_ONLY_REVIEW_CANDIDATE',sector:need.sector,
    need:present(need),capacity:present(capacity),...assessment,
    rationale:'دو سابقه بررسی‌شده در یک حوزه خدمت، در محدوده سازمانی مجاز همین شهر، شناسایی شدند. هم‌خوانی حوزه به معنی امکان اجرا نیست.',
    missingChecks:['LEGAL_CAPACITY_RIGHT','LOCATION','TIMING','HSE','CONTRACT','BUDGET','BASELINE_AND_ATTRIBUTION','INDEPENDENT_VALUE_VERIFICATION'],
    proposedNextStep:'HUMAN_FEASIBILITY_REVIEW',humanApproval:'NOT_REQUESTED',
    canAutoExecute:false,verifiedPublicValue:false,realizedValueMinor:null,executionStatus:'NOT_CONNECTED'});
   if(pairs.length>limit)return {candidates:pairs.slice(0,limit),reviewedNeeds:needs.length,reviewedCapacities:capacities.length,hasMorePairs:true};
  }
 }
 return {candidates:pairs,reviewedNeeds:needs.length,reviewedCapacities:capacities.length,hasMorePairs:false};
}
