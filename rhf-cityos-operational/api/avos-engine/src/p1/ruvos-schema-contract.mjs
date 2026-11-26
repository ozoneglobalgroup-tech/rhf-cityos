/** Real RUVOS schema contract. This module is read-only and has no DB connection.
 * In particular, a capacity_resources.authorized flag is NOT independent proof
 * of provenance/freshness/qualification and must never be promoted to verified.
 */
export const REQUIRED_TABLES = Object.freeze([
  'service_cases','missions','municipalities','users','capacity_resources',
  'urban_capacity_matches','urban_value_cases','agent_followup_actions'
]);
export const REQUIRED_COLUMNS = Object.freeze({
  missions:['id','tenant_id','municipality_id','case_id','title','assignee','status'],
  service_cases:['id','tenant_id','municipality_id','status','updated_at'],
  capacity_resources:['id','tenant_id','municipality_id','authorized','total_quantity','reserve_quantity','allocatable_bps','quality_bps','updated_at'],
  urban_capacity_matches:['id','tenant_id','municipality_id','value_case_id','resource_id','status','reviewed_by','reviewed_at'],
  agent_followup_actions:['id','tenant_id','municipality_id','request_key','status','created_by','approved_by']
});
export const PROVENANCE_NEEDS = Object.freeze([
  'a source assertion with trust classification',
  'a time-bounded observation or signed verification',
  'operational availability, net of allocations/reserves',
  'resource suitability for the specific mission',
  'independent authorization/review tied to the requested case'
]);
export function assessCapacityEvidence(input){
 const blockers=[];
 if(!input || typeof input!=='object') return {dispatchable:false, blockers:['CAPACITY_EVIDENCE_MISSING']};
 if(input.authorized!==true)blockers.push('NOT_AUTHORIZED');
 if(input.provenanceVerified!==true)blockers.push('PROVENANCE_UNVERIFIED');
 if(input.suitabilityVerified!==true)blockers.push('SUITABILITY_UNVERIFIED');
 if(input.availabilityVerified!==true)blockers.push('AVAILABILITY_UNVERIFIED');
 if(!input.validUntil || !Number.isFinite(Date.parse(input.validUntil)) || Date.parse(input.validUntil)<=Date.now()) blockers.push('CAPACITY_STALE');
 if(!input.reviewedBy || !input.createdBy || String(input.reviewedBy)===String(input.createdBy))blockers.push('INDEPENDENT_REVIEW_MISSING');
 return {dispatchable:blockers.length===0,blockers};
}
export function databaseSchemaGaps(existingTables,existingColumns){
 const missingTables=REQUIRED_TABLES.filter(t=>!existingTables.includes(t));
 const missingColumns=[];
 for(const [t,cols] of Object.entries(REQUIRED_COLUMNS)){
   const have=new Set(existingColumns[t]||[]);
   for(const c of cols)if(!have.has(c))missingColumns.push(`${t}.${c}`);
 }
 return {missingTables,missingColumns,ready:missingTables.length===0&&missingColumns.length===0};
}
