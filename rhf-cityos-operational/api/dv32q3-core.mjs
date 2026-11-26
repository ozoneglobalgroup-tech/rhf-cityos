// DV32Q.3: audited, provisional operational-case/mission traceability (no execution rights).
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validateRequest({method,resourceId,url,headers={}}){
 if(resourceId)throw Error('RESOURCE_PATH_NOT_SUPPORTED');
 if(!['GET','POST'].includes(method))throw Error('METHOD_NOT_ALLOWED');
 if([...url.searchParams].length)throw Error('UNEXPECTED_PARAMETERS');
 if(method==='POST'){
  let origin;try{origin=new URL(headers.origin);}catch{throw Error('SAME_ORIGIN_REQUIRED');}
  if(!headers.host||origin.host!==headers.host||!['http:','https:'].includes(origin.protocol)||
    headers['x-rhf-dv32q3-intent']!=='EXPLICIT_CASE_MISSION_DRAFT_LINK'||
    !String(headers['content-type']||'').toLowerCase().startsWith('application/json'))
   throw Error('EXPLICIT_SAME_ORIGIN_JSON_REQUIRED');
 }
}
export function validateLink(x){
 if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).sort().join('|')!==
  'action|caseId|confirm|reason|slot')throw Error('UNEXPECTED_LINK_FIELDS');
 if(x.action!=='LINK_EXISTING_CASE_TO_MISSION_DRAFT'||x.confirm!=='NO_CASE_OR_MISSION_MUTATION')
  throw Error('EXPLICIT_HUMAN_CONFIRMATION_REQUIRED');
 if(typeof x.caseId!=='string'||!UUID.test(x.caseId)||!Number.isInteger(x.slot)||x.slot<1||x.slot>17)
  throw Error('INVALID_LINK_TARGET');
 if(typeof x.reason!=='string'||x.reason.trim().length<20||x.reason.trim().length>1000||/[\u0000-\u001f]/.test(x.reason))
  throw Error('JUSTIFICATION_REQUIRED');
 return {caseId:x.caseId,slot:x.slot,reason:x.reason.trim()};
}
export function summarize({city,role,isAdmin,total,linked,validLinked,mapped,slots,cases,links,territoryLinked}){
 if(!UUID.test(city?.id)||!UUID.test(city?.tenant_id))throw Error('INVALID_CITY_SCOPE');
 if(!['DEPUTY','MUNICIPAL_ADMIN'].includes(role)&&isAdmin!==true)throw Error('ROLE_RESTRICTED');
 for(const n of [total,linked,validLinked,mapped,territoryLinked])if(!Number.isSafeInteger(n)||n<0)throw Error('INVALID_AGGREGATES');
 if(linked>total||validLinked>linked||mapped>17||territoryLinked>total)throw Error('INCONSISTENT_AGGREGATES');
 if(slots.some(s=>!Number.isInteger(s.slot)||s.slot<1||s.slot>17||s.mapping_status!=='DRAFT_MAPPED'))
  throw Error('UNTRUSTED_MISSION_SLOTS');
 if(new Set(slots.map(s=>s.slot)).size!==slots.length||mapped!==slots.length)
  throw Error('MAPPED_SLOT_COUNT_MISMATCH');
 if(cases.some(c=>!UUID.test(c.id)||!UUID.test(c.service_id)))throw Error('UNTRUSTED_CASE_ROWS');
 return {schema:'RHF-DV32Q3-MISSION-CASE-TRACE-v1',cityId:city.id,tenantId:city.tenant_id,
  source:'ACTUAL_SCOPED_SERVICE_CASES_AND_DRAFT_MISSION_MAPPING',release:'NO_GO',
  count:{existingCases:total,linkedMissionDraft:linked,currentMatchingDraftLinks:validLinked,staleDraftLinks:linked-validLinked,unlinkedMissionDraft:total-linked,
   mappedDraftMissionSlots:mapped,provisionalTerritoryLinks:territoryLinked},
  slots,cases,links,canLink:role==='MUNICIPAL_ADMIN'||isAdmin===true,
  casesTruncated:total-linked>cases.length,linksTruncated:linked>links.length,
  officialMissionTaxonomyCertified:false,caseUpdated:false,missionExecuted:false,
  fieldDispatch:false,verifiedUrbanValue:false};
}
