// Strictly synthetic scenario rehearsal; no operational case, IAM, or temporal side effects.
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const STATES=Object.freeze(['NEW','TRIAGED','PLANNING','ACK_PENDING','SIMULATED_CLOSE']);
export const SHIRAZ=new Set(['شیراز','شهرداری شیراز','shiraz','shiraz municipality']);
export const SCENARIO=/^SYN-0(?:0[1-9]|[12][0-9]|3[0-4])$/;
export function requestContract({method,resourceId,url,headers}){
 if(!['GET','POST'].includes(method))throw Error('METHOD_NOT_ALLOWED');
 if(resourceId)throw Error('RESOURCE_PATH_DENIED');
 if([...url.searchParams].length)throw Error('QUERY_PARAMETERS_DENIED');
 if(method==='POST'){
  let origin;try{origin=new URL(headers?.origin);}catch{throw Error('SAME_ORIGIN_REQUIRED');}
  if(!headers?.host||origin.host!==headers.host||!['http:','https:'].includes(origin.protocol)||
    headers?.['x-rhf-dv32q6-intent']!=='EXPLICIT_SYNTHETIC_STEP_ONLY'||
    !/^application\/json(?:\s*;.*)?$/i.test(String(headers?.['content-type']||'')))throw Error('EXPLICIT_SAME_ORIGIN_JSON_REQUIRED');
 }
}
export function validateAction(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).sort().join('|')!=='confirm|expectedVersion|reason|scenarioCode')throw Error('ACTION_SCHEMA_DENIED');
 const {scenarioCode,expectedVersion,reason,confirm}=raw;
 if(confirm!=='SIMULATION_ONLY_NO_FIELD_OPERATION')throw Error('EXPLICIT_SIMULATION_CONFIRM_REQUIRED');
 if(typeof scenarioCode!=='string'||!SCENARIO.test(scenarioCode))throw Error('SCENARIO_ID_DENIED');
 if(!Number.isSafeInteger(expectedVersion)||expectedVersion<0||expectedVersion>3)throw Error('EXPECTED_VERSION_DENIED');
 if(typeof reason!=='string'||reason.trim().length<8||reason.trim().length>160||/[<>\r\n]/.test(reason))throw Error('SIMULATION_REASON_REQUIRED');
 if(/(?:https?:|@|\+?[0-9]{10,})/i.test(reason))throw Error('PERSONAL_DATA_NOT_ALLOWED');
 return {scenarioCode,expectedVersion,reason:reason.trim()};
}
export function nextTransition(version){
 if(!Number.isSafeInteger(version)||version<0||version>4)throw Error('INVALID_VERSION');
 if(version===4)return null;
 return {step:version+1,fromState:STATES[version],toState:STATES[version+1]};
}
export function summarizeRehearsal({pilot,events}){
 if(!pilot||pilot.schema!=='RHF-DV32Q5-SYNTHETIC-PILOT-v1'||pilot.syntheticCases!==34||pilot.acceptance!=='NO_GO'||pilot.operationalAuthorization!==false||!UUID.test(pilot.cityId)||!UUID.test(pilot.tenantId))throw Error('INVALID_SYNTHETIC_SOURCE');
 if(!Array.isArray(pilot.rows)||pilot.rows.length!==34||!Array.isArray(events)||events.length>136)throw Error('INVALID_EVENT_DATA');
 const byCode=new Map(pilot.rows.map(x=>[x.scenario_code,[]]));
 if(byCode.size!==34)throw Error('DUPLICATE_SCENARIO');
 for(const event of events){
  if(!event||!byCode.has(event.scenario_code)||!Number.isSafeInteger(event.step)||event.step<1||event.step>4)throw Error('UNKNOWN_SCENARIO_EVENT');
  const list=byCode.get(event.scenario_code),t=nextTransition(list.length);
  if(!t||event.step!==t.step||event.from_state!==t.fromState||event.to_state!==t.toState||typeof event.created_at!=='string'||!Number.isFinite(Date.parse(event.created_at)))throw Error('EVENT_CHAIN_BROKEN');
  list.push({step:event.step,toState:event.to_state,at:event.created_at});
 }
 const result=pilot.rows.map(row=>{
  if(row.synthetic!==true||row.operational_authorization!==false||row.verified_urban_value!==false||row.has_citizen_data!==false)throw Error('SYNTHETIC_INTEGRITY_BROKEN');
  const history=byCode.get(row.scenario_code);
  return {scenarioCode:row.scenario_code,territoryCode:row.territory_code,missionSlot:row.mission_slot,
   demoOrganization:row.demo_organization,fixtureState:row.simulation_state,
   rehearsalState:STATES[history.length],version:history.length,history};
 });
 return {schema:'RHF-DV32Q6-SIMULATED-LIFECYCLE-v1',tenantId:pilot.tenantId,cityId:pilot.cityId,
  dataClass:'ISOLATED_SYNTHETIC_ONLY',acceptance:'NO_GO',trainingEvents:events.length,scenarios:result,
  realCaseCount:pilot.realCaseCount,realActiveServices:pilot.realActiveServices,realActiveUnits:pilot.realActiveUnits,officialMappedSlots:pilot.officialMappedSlots,
  fieldDispatch:false,payments:false,operationalAuthorization:false,verifiedUrbanValue:false,temporalStarted:false,
  roleAcceptance:'NOT_RUN',recoveryDrill:'NOT_RUN',productionApproval:false};
}
