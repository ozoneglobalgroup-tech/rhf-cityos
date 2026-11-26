// RHF DV32Q.4: read-only mapping feasibility; no execution authority.
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validateRequest({method,resourceId,url}){
 if(method!=='GET')throw Error('GET_ONLY');
 if(resourceId)throw Error('RESOURCE_PATH_NOT_SUPPORTED');
 if([...url.searchParams].length)throw Error('UNEXPECTED_QUERY_PARAMETERS');
}
export function classifyCase({linked,serviceId,sameServiceSlots,matchingSlots}){
 if(typeof linked!=='boolean'||!(serviceId===null||UUID.test(serviceId))||
   !Number.isSafeInteger(sameServiceSlots)||sameServiceSlots<0||sameServiceSlots>17||
   !Number.isSafeInteger(matchingSlots)||matchingSlots<0||matchingSlots>sameServiceSlots)throw Error('INVALID_CASE_CLASSIFICATION');
 if(linked)return 'EXISTING_DRAFT_LINK_REVIEW';
 if(serviceId===null)return 'CASE_WITHOUT_SERVICE';
 if(sameServiceSlots===0)return 'SERVICE_NOT_MAPPED_TO_MISSION';
 if(matchingSlots===0)return 'OWNER_UNIT_MISMATCH';
 if(matchingSlots>1)return 'AMBIGUOUS_MISSION_MAPPING';
 return 'ELIGIBLE_FOR_EXPLICIT_MANUAL_LINK';
}
const CODES=['EXISTING_DRAFT_LINK_REVIEW','CASE_WITHOUT_SERVICE','SERVICE_NOT_MAPPED_TO_MISSION','OWNER_UNIT_MISMATCH','AMBIGUOUS_MISSION_MAPPING','ELIGIBLE_FOR_EXPLICIT_MANUAL_LINK'];
export function summarize({city,role,isAdmin,counts,candidates,services,slots,areas}){
 if(!UUID.test(city?.id)||!UUID.test(city?.tenant_id))throw Error('INVALID_CITY_SCOPE');
 if(!['DEPUTY','MUNICIPAL_ADMIN'].includes(role)&&isAdmin!==true)throw Error('ACCESS_RESTRICTED');
 if(!counts||typeof counts!=='object'||Object.keys(counts).sort().join('|')!==[...CODES,'total'].sort().join('|'))throw Error('INCOMPLETE_COUNTS');
 if(Object.values(counts).some(n=>!Number.isSafeInteger(n)||n<0))throw Error('INVALID_COUNTS');
 if(CODES.reduce((s,k)=>s+counts[k],0)!==counts.total)throw Error('COUNTS_NOT_EXHAUSTIVE');
 if(!Array.isArray(candidates)||candidates.length>100||!Array.isArray(services)||services.length>60||!Array.isArray(slots)||slots.length>17)throw Error('INVALID_REPORT_ROWS');
 if(!areas||!Number.isSafeInteger(areas.district)||!Number.isSafeInteger(areas.gardens)||areas.district>11||areas.district<0||areas.gardens<0||areas.gardens>1)throw Error('INVALID_TERRITORIES');
 const seen=new Set();
 for(const c of candidates){
  if(!c||!UUID.test(c.case_id)||!UUID.test(c.service_id)||!Number.isInteger(c.mission_slot)||c.mission_slot<1||c.mission_slot>17||seen.has(c.case_id))throw Error('UNTRUSTED_CANDIDATE');
  seen.add(c.case_id);
 }
 if(candidates.length>counts.ELIGIBLE_FOR_EXPLICIT_MANUAL_LINK)throw Error('CANDIDATE_OVERCOUNT');
 for(const s of slots){if(!Number.isInteger(s.slot)||s.slot<1||s.slot>17||!['UNMAPPED','DRAFT_MAPPED'].includes(s.mapping_status))throw Error('INVALID_SLOT');}
 if(new Set(slots.map(s=>s.slot)).size!==slots.length)throw Error('DUPLICATE_SLOTS');
 for(const s of services){if(!UUID.test(s.id)||typeof s.name_fa!=='string'||s.name_fa.length>160||!Number.isSafeInteger(s.case_count)||s.case_count<0)throw Error('UNTRUSTED_SERVICE');}
 return {schema:'RHF-DV32Q4-MAPPING-WORKLIST-v1',tenantId:city.tenant_id,cityId:city.id,
  status:'DRAFT_ANALYSIS_ONLY',acceptance:'NO_GO',dataSource:'SCOPED_POSTGRESQL_LIVE_READ_ONLY',
  counts,candidates,services,slots,areas,limitedCandidates:candidates.length<counts.ELIGIBLE_FOR_EXPLICIT_MANUAL_LINK,
  canLinkViaExistingDv32Q3:role==='MUNICIPAL_ADMIN'||isAdmin===true,
  autoMapping:false,caseMutation:false,resourceAllocation:false,fieldDispatch:false,
  temporalStart:false,verifiedUrbanValue:false,officialMissionTaxonomyVerified:false};
}
export const classificationCodes=Object.freeze(CODES);
