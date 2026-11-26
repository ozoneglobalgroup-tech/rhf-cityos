// DV32UX13-15 read-only municipal inventory; all queries preserve current RLS city scope.
import {ClientError} from './domain.mjs';
import {requestBoundary,roleBoundary,buildReport} from './dv32ux13-portfolio-core.mjs';
const refuse=(status,s)=>{throw new ClientError(s,status)};
const run=(client,city,sql,args=[])=>client.query(sql,[city.tenant_id,city.id,...args]);
export async function dv32ux13PortfolioRoute({method,resourceId,url,client,city,user,role}){
 try{requestBoundary({method,resourceId,url})}catch(e){refuse(405,e.message)}
 try{roleBoundary(city,role,user)}catch(e){refuse(403,e.message)}
 const result=await run(client,city,`SELECT
 (SELECT count(*) FROM public.org_units u WHERE u.tenant_id=$1 AND u.municipality_id=$2) AS units,
 (SELECT count(*) FROM public.org_units u WHERE u.tenant_id=$1 AND u.municipality_id=$2 AND u.active=true) AS "activeUnits",
 (SELECT count(*) FROM public.service_definitions s WHERE s.tenant_id=$1 AND s.municipality_id=$2) AS services,
 (SELECT count(*) FROM public.service_definitions s WHERE s.tenant_id=$1 AND s.municipality_id=$2 AND s.active=true) AS "activeServices",
 (SELECT count(*) FROM public.rhf_dv32q_mission_slots m WHERE m.tenant_id=$1 AND m.municipality_id=$2) AS "missionSlots",
 (SELECT count(DISTINCT p.slot) FROM public.rhf_dv32ux9_mission_proposals p JOIN public.rhf_dv32ux9_mission_attestations a
  ON a.proposal_id=p.id AND a.tenant_id=p.tenant_id AND a.municipality_id=p.municipality_id
  WHERE p.tenant_id=$1 AND p.municipality_id=$2) AS "attestedMissionSlots",
 (SELECT count(*) FROM public.service_cases c WHERE c.tenant_id=$1 AND c.municipality_id=$2 AND c.status='DRAFT') AS "realDraftCases",
 (SELECT count(*) FROM public.rhf_dv32ux7_case_reviews r WHERE r.tenant_id=$1 AND r.municipality_id=$2 AND r.status='APPROVED_FOR_PLANNING') AS "independentlyApprovedReviews",
 (SELECT count(*) FROM public.rhf_dv32ux8_case_planning p WHERE p.tenant_id=$1 AND p.municipality_id=$2) AS "planningDrafts",
 (SELECT count(*) FROM public.rhf_dv32ux11_work_orders w WHERE w.tenant_id=$1 AND w.municipality_id=$2) AS "workOrders",
 (SELECT count(*) FROM public.rhf_dv32ux11_work_decisions d WHERE d.tenant_id=$1 AND d.municipality_id=$2 AND d.decision='CLEARED_FOR_HANDOFF_REQUEST') AS "clearedWorkOrders",
 (SELECT count(*) FROM public.rhf_dv32ux12_handoff_intents h WHERE h.tenant_id=$1 AND h.municipality_id=$2) AS "handoffIntents"`);
 const units=await run(client,city,`SELECT u.id,u.code,u.name_fa,u.active,
 count(s.id) FILTER (WHERE s.active=true) AS active_services
 FROM public.org_units u
 LEFT JOIN public.service_definitions s ON s.owner_unit_id=u.id AND s.tenant_id=u.tenant_id AND s.municipality_id=u.municipality_id
 WHERE u.tenant_id=$1 AND u.municipality_id=$2
 GROUP BY u.id,u.code,u.name_fa,u.active ORDER BY u.code,u.id LIMIT 101`);
 try{return buildReport(city,result.rows[0],units.rows,role)}catch(e){refuse(409,e.message)}
}
