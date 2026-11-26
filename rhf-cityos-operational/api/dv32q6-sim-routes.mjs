import {ClientError} from './domain.mjs';
import {dv32q5SyntheticPilotRoute} from './dv32q5-demo-routes.mjs';
import {UUID,SHIRAZ,requestContract,validateAction,nextTransition,summarizeRehearsal} from './dv32q6-sim-core.mjs';
const deny=(status,msg)=>{throw new ClientError(msg,status);};
export async function dv32q6SyntheticLifecycleRoute({method,resourceId,url,headers,client,city,user,role,readBody,audit}){
 try{requestContract({method,resourceId,url,headers});}catch(e){deny(e.message==='METHOD_NOT_ALLOWED'?405:400,e.message);}
 if(!UUID.test(city?.id)||!UUID.test(city?.tenant_id)||(!['DEPUTY','MUNICIPAL_ADMIN'].includes(role)&&user?.is_system_admin!==true))deny(403,'CITY_SCOPE_DENIED');
 if(!SHIRAZ.has(String(city.name||'').trim().toLowerCase()))deny(403,'SHIRAZ_PILOT_ONLY');
 if(method==='POST'){
  if(role!=='MUNICIPAL_ADMIN'&&user?.is_system_admin!==true)deny(403,'CITY_ADMIN_SIMULATION_ONLY');
  let a;try{a=validateAction(await readBody());}catch(e){deny(400,e.message);}
  // The id exists in the isolated Q5 scenario table, never in service_cases.
  const src=await client.query(`SELECT scenario_code FROM public.rhf_dv32q5_synthetic_cases WHERE tenant_id=$1 AND municipality_id=$2 AND scenario_code=$3 AND synthetic AND NOT operational_authorization AND NOT verified_urban_value AND NOT has_citizen_data`,[city.tenant_id,city.id,a.scenarioCode]);
  if(src.rowCount!==1)deny(404,'SYNTHETIC_SCENARIO_NOT_FOUND');
  const next=nextTransition(a.expectedVersion);
  if(!next)deny(409,'SIMULATED_LIFECYCLE_ALREADY_COMPLETE');
  // Database BEFORE trigger validates sequential events and locks per scenario for concurrent writers.
  let saved;try{saved=await client.query(`INSERT INTO public.rhf_dv32q6_sim_events
    (tenant_id,municipality_id,scenario_code,step,from_state,to_state,actor_id,reason)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING RETURNING step,to_state,created_at`,
    [city.tenant_id,city.id,a.scenarioCode,next.step,next.fromState,next.toState,user.id,a.reason]);}
  catch(e){if(String(e.message||'').includes('SIMULATION_STEP_OUT_OF_ORDER')||e.code==='23505')deny(409,'SIMULATION_VERSION_CONFLICT');throw e;}
  if(saved.rowCount!==1)deny(409,'SIMULATION_VERSION_CONFLICT');
  await audit(client,city,user,'DV32Q6_SYNTHETIC_REHEARSAL',city.id,'SIMULATED_STEP',
    {scenarioCode:a.scenarioCode,step:next.step,fromState:next.fromState,toState:next.toState,syntheticOnly:true});
  return {schema:'RHF-DV32Q6-SIMULATED-ACTION-v1',scenarioCode:a.scenarioCode,version:next.step,toState:next.toState,
    acceptance:'NO_GO',isSynthetic:true,realCaseMutated:false,fieldDispatch:false,payments:false,temporalStarted:false,verifiedUrbanValue:false};
 }
 const pilot=await dv32q5SyntheticPilotRoute({method:'GET',resourceId:null,client,city,user,role,url});
 const events=await client.query(`SELECT scenario_code,step,from_state,to_state,created_at::text AS created_at
   FROM public.rhf_dv32q6_sim_events WHERE tenant_id=$1 AND municipality_id=$2 ORDER BY scenario_code,step LIMIT 137`,[city.tenant_id,city.id]);
 try{return summarizeRehearsal({pilot,events:events.rows});}catch(e){deny(409,'SYNTHETIC_LEDGER_INTEGRITY_FAILED_'+e.message);}
}
