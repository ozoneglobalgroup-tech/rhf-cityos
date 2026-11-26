// DV32Q.1: no official 17-mission titles invented; mapping stays DRAFT until independent acceptance.
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const AXES=new Set(['ENVIRONMENT','PUBLIC_SAFETY','GREEN_APPEARANCE','URBAN_ECONOMY','CITIZEN_ENGAGEMENT']);
export const adminAllowed=(role,isAdmin)=>role==='MUNICIPAL_ADMIN'||isAdmin===true;
export const cityReadAllowed=(role,isAdmin)=>adminAllowed(role,isAdmin)||role==='DEPUTY';
export const isShiraz=(name)=>['شیراز','شهرداری شیراز','shiraz','shiraz municipality'].includes(String(name||'').trim().toLowerCase());
export function validateCoverageRequest({method,resourceId,url,headers={}}){
 if(resourceId)throw Error('RESOURCE_PATH_NOT_SUPPORTED');
 if(!['GET','POST'].includes(method))throw Error('METHOD_NOT_ALLOWED');
 if([...url.searchParams].length)throw Error('UNEXPECTED_QUERY_PARAMETERS');
 if(method==='POST'){
  let o;try{o=new URL(headers.origin);}catch{throw Error('SAME_ORIGIN_REQUIRED');}
  if(!headers.host||o.host!==headers.host||!['http:','https:'].includes(o.protocol)||
    headers['x-rhf-dv32q-intent']!=='EXPLICIT_DRAFT_CATALOG_MAPPING'||
    !String(headers['content-type']||'').toLowerCase().startsWith('application/json'))
   throw Error('EXPLICIT_SAME_ORIGIN_JSON_REQUIRED');
 }
}
export function validateMapping(body){
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('INVALID_MAPPING_BODY');
 const allowed=new Set(['action','confirm','slot','titleFa','axisCode','ownerUnitId','serviceId','reason']);
 if(Object.keys(body).some(k=>!allowed.has(k))||Object.keys(body).length!==allowed.size)throw Error('UNEXPECTED_MAPPING_FIELDS');
 if(body.action!=='SAVE_MISSION_DRAFT'||body.confirm!=='MAP_DRAFT_ONLY_NO_OPERATIONAL_AUTHORITY')throw Error('HUMAN_DRAFT_CONFIRMATION_REQUIRED');
 if(!Number.isInteger(body.slot)||body.slot<1||body.slot>17)throw Error('MISSION_SLOT_OUT_OF_RANGE');
 const title=String(body.titleFa||'').trim(),reason=String(body.reason||'').trim();
 if(typeof body.titleFa!=='string'||title.length<8||title.length>160||/[\u0000-\u001f]/.test(title))throw Error('INVALID_CANONICAL_MISSION_TITLE');
 if(typeof body.reason!=='string'||reason.length<16||reason.length>1000||/[\u0000-\u001f]/.test(reason))throw Error('AUDIT_REASON_REQUIRED');
 if(!AXES.has(body.axisCode)||!UUID.test(body.ownerUnitId)||!UUID.test(body.serviceId))throw Error('INVALID_SCOPED_MISSION_MAPPING');
 return {slot:body.slot,title,reason,axisCode:body.axisCode,ownerUnitId:body.ownerUnitId,serviceId:body.serviceId};
}
export function summarizeCoverage({territories,axes,slots,services,units,city}){
 const codes=new Set(territories.map(x=>x.code));const exactly12=territories.length===12&&codes.size===12&&Array.from({length:11},(_,i)=>`D${String(i+1).padStart(2,'0')}`).every(x=>codes.has(x))&&codes.has('GARDENS');
 const mapped=slots.filter(x=>x.mapping_status==='DRAFT_MAPPED').length;
 const completelySeeded=exactly12&&axes.length===5&&slots.length===17;
 return {schema:'RHF-DV32Q-SHIRAZ-PILOT-COVERAGE-v1',cityId:city.id,tenantId:city.tenant_id,
  isShirazPilot:isShiraz(city.name),draftTerritoryInventory:territories,draftAxes:axes,missionSlots:slots,
  ownerUnits:units,serviceDefinitions:services,
  metrics:{territoryDraftRows:territories.length,axesReferenceRows:axes.length,missionSlotRows:slots.length,draftMappedSlots:mapped,unmappedSlots:Math.max(0,17-mapped),draftCatalogConsistent:completelySeeded},
  releaseAcceptance:'NO_GO',canonicalMissionNamesCertified:false,geospatialTerritoriesVerified:false,
  fieldCasesBootstrapped:false,managerBindingsAutoGranted:false,resourceAllocationsCreated:false,
  verifiedUrbanValue:false,automaticWorkflowStart:false};
}
