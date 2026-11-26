// DV32Q.2: strict, scoped, non-operational case-to-draft-territory labels.
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const TERRITORY=/^(D(0[1-9]|1[01])|GARDENS)$/;
export function validateRequest({method,resourceId,url,headers={}}){
 if(resourceId)throw Error('RESOURCE_PATH_NOT_SUPPORTED');
 if(!['GET','POST'].includes(method))throw Error('METHOD_NOT_ALLOWED');
 if([...url.searchParams].length)throw Error('UNEXPECTED_QUERY_PARAMETERS');
 if(method==='POST'){
  let origin;try{origin=new URL(headers.origin);}catch{throw Error('SAME_ORIGIN_REQUIRED');}
  if(!headers.host||origin.host!==headers.host||!['http:','https:'].includes(origin.protocol)
   ||headers['x-rhf-dv32q2-intent']!=='EXPLICIT_PILOT_CASE_TERRITORY_LINK'
   ||!String(headers['content-type']||'').toLowerCase().startsWith('application/json'))
   throw Error('EXPLICIT_SAME_ORIGIN_JSON_REQUIRED');
 }
}
export function validateLink(x){
 if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).sort().join('|')!==
  'action|caseId|confirm|reason|territoryCode')throw Error('UNEXPECTED_LINK_FIELDS');
 if(x.action!=='CREATE_DRAFT_TERRITORY_LINK'||x.confirm!=='NO_CASE_MUTATION_DRAFT_TAG_ONLY')
  throw Error('EXPLICIT_HUMAN_DRAFT_CONFIRMATION_REQUIRED');
 if(typeof x.caseId!=='string'||!UUID.test(x.caseId)||!TERRITORY.test(x.territoryCode))
  throw Error('INVALID_SCOPED_LINK');
 if(typeof x.reason!=='string'||x.reason.trim().length<20||x.reason.trim().length>1000
  ||/[\u0000-\u001f]/.test(x.reason))throw Error('AUDIT_REASON_REQUIRED');
 return {caseId:x.caseId,territoryCode:x.territoryCode,reason:x.reason.trim()};
}
export function summary({city,territories,counts,unmapped,totalCases,availableCases,mappings,units,services,role,isAdmin}){
 if(!UUID.test(city.id)||!UUID.test(city.tenant_id))throw Error('INVALID_CITY_SCOPE');
 if(!['MUNICIPAL_ADMIN','DEPUTY'].includes(role)&&!isAdmin)throw Error('CITY_VIEW_RESTRICTED');
 if(territories.some(t=>!TERRITORY.test(t.code)||t.verification_status!=='DRAFT_UNVERIFIED'))throw Error('TERRITORY_NOT_CERTIFIED');
 if(totalCases<0||unmapped<0||!Number.isSafeInteger(totalCases)||!Number.isSafeInteger(unmapped)||unmapped>totalCases)
  throw Error('INVALID_COUNTS');
 const linked=totalCases-unmapped;
 if(counts.some(r=>!TERRITORY.test(r.territory_code)||r.count<0||!Number.isSafeInteger(r.count)))throw Error('INVALID_BUCKETS');
 if(counts.reduce((n,r)=>n+r.count,0)!==linked)throw Error('COUNT_MISMATCH');
 return {schema:'RHF-DV32Q2-CASE-TERRITORY-v1',cityId:city.id,tenantId:city.tenant_id,
  verification:'DRAFT_UNVERIFIED',source:'LIVE_SCOPED_SERVICE_CASES',territories,
  metrics:{totalExistingCases:totalCases,linkedDraftTerritory:linked,unlinked:unmapped,
   linkedPercent:totalCases?Math.round(linked*10000/totalCases)/100:0,
   territoryDraftCount:territories.length,units,services},
  distribution:counts,linkedCases:mappings,selectableCases:availableCases,
  selectableTruncated:unmapped>availableCases.length,
  canLinkDraft:role==='MUNICIPAL_ADMIN'||isAdmin===true,canExecuteFieldOperations:false,
  officialDistrictsVerified:false,verifiedUrbanValue:false,releaseAcceptance:'NO_GO'};
}
