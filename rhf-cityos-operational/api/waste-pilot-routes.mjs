/** RHF WASTE-PILOT V1: single authorized, city-scoped read-only projection.
 * The synthetic demo is never presented as verified municipal public value.
 * No AVOS schema, direct org create, privileged role or autonomous writes.
 */
import {ClientError} from './domain.mjs';
import {WASTE_CODE,WASTE_READ_ROLES,isWasteDemoCity,isWasteOrganization,limited,valueEvidenceState} from './waste-pilot-core.mjs';
export const WASTE_PILOT_PARTS=Object.freeze(['waste-pilot']);
const ALL=Object.freeze([...WASTE_READ_ROLES]);
const denied=(message,status)=>{throw new ClientError(message,status)};
export async function wastePilotRoute({part,method,resourceId,cityId,user,withScope,json}){
 if(part!=='waste-pilot'||resourceId)denied('WASTE_PILOT_PATH_INVALID',404);
 if(method!=='GET')denied('WASTE_PILOT_READ_ONLY',405);
 const result=await withScope(cityId,user,'read',async(client,city,role)=>{
  if(!ALL.includes(role))denied('WASTE_PILOT_ROLE_DENIED',403);
  if(!isWasteDemoCity(city.name))denied('WASTE_PILOT_SYNTHETIC_CITY_ONLY',403);
  const q=(sql,args)=>client.query(sql,args);
  const scope=[city.tenant_id,city.id];
  const orgResult=await q(`SELECT o.id,o.code,o.name_fa,o.kind,o.active,o.parent_id,
      p.kind AS parent_kind,p.active AS parent_active,p.name_fa AS parent_name_fa,p.id AS deputy_id,
      pr.domain_code,pr.manager_user_id,pr.charter_reference,pr.approved_at,pr.approved_by
     FROM org_units o JOIN org_units p ON p.id=o.parent_id
      AND p.tenant_id=o.tenant_id AND p.municipality_id=o.municipality_id
     LEFT JOIN service_org_unit_profiles pr ON pr.unit_id=o.id
      AND pr.tenant_id=o.tenant_id AND pr.municipality_id=o.municipality_id
     WHERE o.tenant_id=$1 AND o.municipality_id=$2 AND o.code=$3 AND o.kind='ORGANIZATION'
     LIMIT 2`,[...scope,WASTE_CODE]);
  if(orgResult.rows.length!==1||!isWasteOrganization(orgResult.rows[0]))denied('WASTE_PILOT_ORG_NOT_READY',409);
  const organization=orgResult.rows[0];
  const unitsRaw=await q(`WITH RECURSIVE tree AS (
     SELECT id,parent_id,code,name_fa,kind,active,0 AS depth,ARRAY[id] AS path
     FROM org_units WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3
     UNION ALL
     SELECT ch.id,ch.parent_id,ch.code,ch.name_fa,ch.kind,ch.active,t.depth+1,t.path||ch.id
     FROM org_units ch JOIN tree t ON ch.parent_id=t.id
     WHERE ch.tenant_id=$1 AND ch.municipality_id=$2
       AND NOT ch.id=ANY(t.path) AND t.depth<10
   ) SELECT id,parent_id,code,name_fa,kind,active,depth FROM tree ORDER BY depth,name_fa,id LIMIT 201`,
    [...scope,organization.id]);
  const units=limited(unitsRaw.rows);
  if(units.truncated)denied('WASTE_PILOT_ORG_TREE_TOO_LARGE',409);
  const unitIds=units.rows.map(x=>x.id);
  // All reads carry tenant AND city keys; no module-code-only attribution is allowed.
  const selected=[...scope,unitIds];
  const [rawCases,rawServices,rawResources]=await Promise.all([
   q(`SELECT c.id,c.unit_id,c.module_code,c.service_id,c.summary,c.description,c.priority,c.status,c.evidence,c.acceptance_note,c.due_at,c.created_at,c.updated_at,
        s.name_fa AS service_name,u.name_fa AS unit_name
      FROM service_cases c LEFT JOIN service_definitions s ON s.id=c.service_id
       AND s.tenant_id=c.tenant_id AND s.municipality_id=c.municipality_id
      LEFT JOIN org_units u ON u.id=c.unit_id AND u.tenant_id=c.tenant_id AND u.municipality_id=c.municipality_id
      WHERE c.tenant_id=$1 AND c.municipality_id=$2 AND c.unit_id=ANY($3::uuid[])
      ORDER BY c.created_at DESC,c.id DESC LIMIT 201`,selected),
   q(`SELECT id,owner_unit_id,code,name_fa,module_code,sla_hours,outcome_metric,description,active
      FROM service_definitions WHERE tenant_id=$1 AND municipality_id=$2 AND owner_unit_id=ANY($3::uuid[])
      ORDER BY name_fa,id LIMIT 201`,selected),
   q(`SELECT id,owner_unit_id,code,name_fa,resource_kind,unit,total_quantity,allocatable_bps,quality_bps,reserve_quantity,authorized,constraints_note
      FROM capacity_resources WHERE tenant_id=$1 AND municipality_id=$2 AND owner_unit_id=ANY($3::uuid[])
      ORDER BY name_fa,id LIMIT 201`,selected)
  ]);
  const cases=limited(rawCases.rows),services=limited(rawServices.rows),resources=limited(rawResources.rows);
  const caseIds=cases.rows.map(x=>x.id);
  const linked=[...scope,caseIds];
  const [rawMissions,rawFollowups,rawValueCases,rawOutcomes,rawInspections,rawAllocations]=await Promise.all([
   q(`SELECT id,case_id,title,assignee,status,evidence,created_at,updated_at FROM missions
      WHERE tenant_id=$1 AND municipality_id=$2 AND case_id=ANY($3::uuid[])
      ORDER BY created_at DESC,id DESC LIMIT 201`,linked),
   q(`SELECT id,case_id,kind,status,note,created_by,approved_by,executed_by,review_note,execution_note,created_at,updated_at,approved_at,executed_at
      FROM agent_followup_actions WHERE tenant_id=$1 AND municipality_id=$2 AND case_id=ANY($3::uuid[])
      ORDER BY created_at DESC,id DESC LIMIT 201`,linked),
   q(`SELECT id,case_id,title,public_need,beneficiaries,geography,barrier,authority_reference,baseline_method,comparator,value_dimension,status,review_evidence,created_by,reviewed_by,reviewed_at,created_at
      FROM urban_value_cases WHERE tenant_id=$1 AND municipality_id=$2 AND case_id=ANY($3::uuid[])
      ORDER BY created_at DESC,id DESC LIMIT 201`,linked),
   q(`SELECT id,case_id,dimension,metric,unit,baseline,target,actual,evidence,source_note,status,created_by,verified_by,verified_at,created_at
      FROM public_value_outcomes WHERE tenant_id=$1 AND municipality_id=$2 AND case_id=ANY($3::uuid[])
      ORDER BY created_at DESC,id DESC LIMIT 201`,linked),
   q(`SELECT id,case_id,result,evidence,notes,created_at FROM service_inspections
      WHERE tenant_id=$1 AND municipality_id=$2 AND case_id=ANY($3::uuid[])
      ORDER BY created_at DESC,id DESC LIMIT 201`,linked),
   q(`SELECT id,case_id,resource_id,quantity,status,justification,created_at,released_at FROM capacity_allocations
      WHERE tenant_id=$1 AND municipality_id=$2 AND case_id=ANY($3::uuid[])
      ORDER BY created_at DESC,id DESC LIMIT 201`,linked)
  ]);
  const missions=limited(rawMissions.rows),followups=limited(rawFollowups.rows),valueCases=limited(rawValueCases.rows),outcomes=limited(rawOutcomes.rows),inspections=limited(rawInspections.rows),allocations=limited(rawAllocations.rows);
  const valueIds=valueCases.rows.map(x=>x.id);
  const rawMatches=await q(`SELECT m.id,m.value_case_id,m.resource_id,m.requested_quantity,m.purpose,m.status,m.review_evidence,
      r.name_fa AS resource_name,r.owner_unit_id AS resource_owner_unit_id
     FROM urban_capacity_matches m JOIN capacity_resources r ON r.id=m.resource_id
       AND r.tenant_id=m.tenant_id AND r.municipality_id=m.municipality_id
     WHERE m.tenant_id=$1 AND m.municipality_id=$2 AND m.value_case_id=ANY($3::uuid[])
     ORDER BY m.created_at DESC,m.id DESC LIMIT 201`,[...scope,valueIds]);
  const matches=limited(rawMatches.rows);
  const datasets={units,cases,services,resources,missions,followups,valueCases,outcomes,inspections,allocations,matches};
  const partial=Object.entries(datasets).filter(([,v])=>v.truncated).map(([key])=>key);
  return {mode:'SYNTHETIC_WASTE_READ_ONLY',city:{id:city.id,name:city.name},organization,
    role, datasets, partial, stats:{cases:cases.rows.length,openCases:cases.rows.filter(x=>!['CLOSED','REJECTED'].includes(x.status)).length,
    missions:missions.rows.length,followups:followups.rows.length,opportunities:valueCases.rows.length,
    resources:resources.rows.length,services:services.rows.length,
    independentlyReviewedOpportunities:valueCases.rows.filter(v=>v.status==='REVIEWED'&&v.reviewed_by&&v.reviewed_by!==v.created_by).length,
    recordedOutcomeVerifications:outcomes.rows.filter(v=>valueEvidenceState(v)==='VERIFICATION_RECORDED_SYNTHETIC_ONLY').length},
    policy:{synthetic:true,realWorldPublicValueVerified:false,agentExecutionEnabled:false,
     noAutomaticOperationalWrites:true,valueInitiativesNotAttributed:true,orgAffiliationSource:'ORG_UNITS_PARENT_ID',
     orgFormalApprovalProven:!!organization.approved_at,
     note:'تمام ارقام این پایلوت آزمایشی‌اند؛ ثبت تأیید در دمو اثبات اثر واقعی شهری نیست.'}};
 });
 return json(200,result);
}
