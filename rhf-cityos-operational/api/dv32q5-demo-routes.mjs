import {ClientError} from './domain.mjs';
import {UUID,validateDemoRequest,summarizeDemo} from './dv32q5-demo-core.mjs';
export async function dv32q5SyntheticPilotRoute({method,resourceId,client,city,user,role,url}){
 try{validateDemoRequest({method,resourceId,url});}catch(e){throw new ClientError(e.message,method==='GET'?400:405);}
 if(!UUID.test(city?.id)||!UUID.test(city?.tenant_id)||(!['DEPUTY','MUNICIPAL_ADMIN'].includes(role)&&!user?.is_system_admin))throw new ClientError('CITY_SCOPE_DENIED',403);
 if(!['شیراز','شهرداری شیراز','shiraz','shiraz municipality'].includes(String(city.name||'').trim().toLowerCase()))throw new ClientError('SHIRAZ_PILOT_ONLY',403);
 // WITH SCOPE read-only transaction: no tenant or city chosen from client-supplied query parameters.
 const [demo,live,areas]=await Promise.all([
  client.query(`SELECT scenario_code,territory_code,mission_slot,axis_code,demo_organization,simulation_state,description_fa,synthetic,operational_authorization,verified_urban_value,has_citizen_data
   FROM public.rhf_dv32q5_synthetic_cases WHERE tenant_id=$1 AND municipality_id=$2 ORDER BY scenario_code LIMIT 60`,[city.tenant_id,city.id]),
  client.query(`SELECT
  (SELECT count(*)::int FROM public.service_cases WHERE tenant_id=$1 AND municipality_id=$2) AS "realCases",
  (SELECT count(*)::int FROM public.service_definitions WHERE tenant_id=$1 AND municipality_id=$2 AND active) AS "activeServices",
  (SELECT count(*)::int FROM public.org_units WHERE tenant_id=$1 AND municipality_id=$2 AND active) AS "activeUnits",
  (SELECT count(*)::int FROM public.rhf_dv32q_mission_slots WHERE tenant_id=$1 AND municipality_id=$2 AND mapping_status='DRAFT_MAPPED') AS "officialMappedSlots",
  (SELECT count(*)::int FROM public.rhf_dv32q5_synthetic_cases WHERE tenant_id=$1 AND municipality_id=$2) AS "demoCount"`,[city.tenant_id,city.id]),
  client.query(`SELECT count(*) FILTER(WHERE kind='DISTRICT')::int AS district,count(*) FILTER(WHERE code='GARDENS')::int AS gardens FROM public.rhf_dv32q_pilot_territories WHERE tenant_id=$1 AND municipality_id=$2`,[city.tenant_id,city.id])
 ]);
 try{return summarizeDemo({city,role,isAdmin:user?.is_system_admin,rows:demo.rows,live:live.rows[0],areaCounts:areas.rows[0]});}
 catch(e){throw new ClientError('DEMO_INTEGRITY_FAILED: '+e.message,409);}
}
