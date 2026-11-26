// RHF DV32Q5 synthetic-only pilot. No operational authority.
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AXES=new Set(['ENVIRONMENT','PUBLIC_SAFETY','GREEN_APPEARANCE','URBAN_ECONOMY','CITIZEN_ENGAGEMENT']);
const STATUSES=new Set(['NEW','TRIAGED','PLANNING','ACK_PENDING','SIMULATED_CLOSE']);
const ORGS=new Set(['WASTE','GREEN_SPACE','CEMETERY','MARKETS','BEAUTIFICATION','ENVIRONMENT','GENERAL_SERVICES']);
export function validateDemoRequest({method,resourceId,url}) {
 if(method!=='GET')throw Error('GET_ONLY');
 if(resourceId)throw Error('RESOURCE_PATH_FORBIDDEN');
 if([...url.searchParams].length)throw Error('QUERY_PARAMETERS_FORBIDDEN');
}
export function summarizeDemo({city,role,isAdmin,rows,live,areaCounts}) {
 if(!city||!UUID.test(city.id)||!UUID.test(city.tenant_id))throw Error('INVALID_CITY_SCOPE');
 if(!['DEPUTY','MUNICIPAL_ADMIN'].includes(role)&&isAdmin!==true)throw Error('ROLE_FORBIDDEN');
 if(!Array.isArray(rows)||rows.length>60||!live||typeof live!=='object'||!areaCounts)throw Error('INVALID_DEMO_PAYLOAD');
 const required=['realCases','activeServices','activeUnits','officialMappedSlots','demoCount'];
 if(Object.keys(live).sort().join('|')!==required.sort().join('|') || required.some(x=>!Number.isSafeInteger(live[x])||live[x]<0))throw Error('UNTRUSTED_REAL_COUNTS');
 if(!Number.isSafeInteger(areaCounts.district)||!Number.isSafeInteger(areaCounts.gardens)||areaCounts.district!==11||areaCounts.gardens!==1)throw Error('DRAFT_CATALOG_INCOMPLETE');
 if(rows.length!==live.demoCount||rows.length!==34)throw Error('DEMO_FIXTURE_INCOMPLETE');
 const codes=new Set(),territories=new Set(),missions=new Set(),states={};
 for(const r of rows){
  if(!r||typeof r.scenario_code!=='string'||!/^SYN-0(?:0[1-9]|[12][0-9]|3[0-4])$/.test(r.scenario_code)||codes.has(r.scenario_code))throw Error('INVALID_SCENARIO_ID');
  if(!/^(?:D(?:0[1-9]|1[01])|GARDENS)$/.test(r.territory_code) || !AXES.has(r.axis_code)||!STATUSES.has(r.simulation_state)||!ORGS.has(r.demo_organization))throw Error('INVALID_SYNTHETIC_CATEGORY');
  if(!Number.isSafeInteger(r.mission_slot)||r.mission_slot<1||r.mission_slot>17||r.synthetic!==true||r.operational_authorization!==false||r.verified_urban_value!==false||r.has_citizen_data!==false)throw Error('SYNTHETIC_SAFETY_VIOLATION');
  if(typeof r.description_fa!=='string'||!r.description_fa.startsWith('سناریوی ساختگی ')||r.description_fa.length>120)throw Error('UNTRUSTED_DESCRIPTION');
  codes.add(r.scenario_code);territories.add(r.territory_code);missions.add(r.mission_slot);states[r.simulation_state]=(states[r.simulation_state]||0)+1;
 }
 if(territories.size!==12||missions.size!==17||live.officialMappedSlots>17)throw Error('INCOMPLETE_SYNTHETIC_COVERAGE');
 return {schema:'RHF-DV32Q5-SYNTHETIC-PILOT-v1',cityId:city.id,tenantId:city.tenant_id,
  provenance:'ISOLATED_SYNTHETIC_POSTGRESQL_FIXTURES',dataClass:'SIMULATION_ONLY_NEVER_OPERATIONAL',
  acceptance:'NO_GO',officialMissionNamesVerified:false,realCaseCount:live.realCases,
  realActiveServices:live.activeServices,realActiveUnits:live.activeUnits,officialMappedSlots:live.officialMappedSlots,
  syntheticCases:rows.length,syntheticTerritories:territories.size,syntheticMissionSlotReferences:missions.size,
  simulatedStates:states,rows,autoMapping:false,fieldDispatch:false,payments:false,temporalStart:false,
  operationalAuthorization:false,verifiedUrbanValue:false,authenticatedRoleUat:'NOT_RUN'};
}
