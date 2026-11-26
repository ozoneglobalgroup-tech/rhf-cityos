/** City-scoped, appointment-gated shared read-only evidence for two workspaces. */
import {ClientError} from './domain.mjs';
import {deriveAgentCandidates} from './waste-suite-defs.mjs';
import {WASTE_CODE,isWasteDemoCity,isWasteOrganization} from './waste-pilot-core.mjs';
import {wastePermissions} from './waste-authorization.mjs';
import {discoverOpportunities,mayViewDeputy} from './urban-value-bridge-core.mjs';
export const VALUE_BRIDGE_PARTS=Object.freeze(['value-bridge']);
const forbid=(msg,status=403)=>{throw new ClientError(msg,status)};
const ROLES=new Set(['MUNICIPAL_ADMIN','AUDITOR','DEPUTY','DIRECTOR']);
async function ownDeputy(client,city,user){
 const result=await client.query(`SELECT a.org_unit_id
  FROM rhf_organization_appointments a JOIN org_units o ON o.id=a.org_unit_id
   AND o.tenant_id=a.tenant_id AND o.municipality_id=a.municipality_id
  WHERE a.tenant_id=$1 AND a.municipality_id=$2 AND a.user_id=$3
   AND a.position_code='DEPUTY_HEAD' AND a.status='APPROVED'
   AND a.valid_from<=now() AND (a.valid_to IS NULL OR a.valid_to>now())
   AND o.kind='DEPUTY' AND o.active=true LIMIT 2`,[city.tenant_id,city.id,user.id]);
 return result.rows.map(x=>x.org_unit_id);
}
async function wasteOrganization(client,city){
 const result=await client.query(`SELECT o.id,o.parent_id,o.code,o.kind,o.active,
    p.kind parent_kind,p.active parent_active,p.name_fa parent_name_fa
  FROM org_units o JOIN org_units p ON p.id=o.parent_id AND p.tenant_id=o.tenant_id
    AND p.municipality_id=o.municipality_id
  WHERE o.tenant_id=$1 AND o.municipality_id=$2 AND o.code=$3 LIMIT 2`,[city.tenant_id,city.id,WASTE_CODE]);
 const org=result.rows[0];return result.rows.length===1&&isWasteOrganization(org)?org:null;
}
async function processHypotheses(client,city,scopeOrg){
 if(!scopeOrg)return [];
 // Recursive scope is bound by tenant/city at each step. Query returns metadata only.
 const r=await client.query(`WITH RECURSIVE allowed(id,path) AS (
  SELECT id,ARRAY[id] FROM org_units WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3
  UNION ALL
  SELECT child.id,parent.path||child.id FROM org_units child JOIN allowed parent ON child.parent_id=parent.id
   WHERE child.tenant_id=$1 AND child.municipality_id=$2
     AND NOT child.id=ANY(parent.path) AND cardinality(parent.path)<12
 )
 SELECT p.id,p.kind,p.status,p.metric,p.baseline,p.target,p.unit
 FROM rhf_org_process_instances p
 WHERE p.tenant_id=$1 AND p.municipality_id=$2 AND p.org_unit_id IN(SELECT id FROM allowed)
  AND p.kind='VALUE_OPPORTUNITY' ORDER BY p.created_at DESC,p.id DESC LIMIT 81`,
 [city.tenant_id,city.id,scopeOrg]);
 return r.rows;
}
export async function valueBridgeRoute({part,method,resourceId,url,cityId,user,withScope,json}){
 if(part!=='value-bridge'||resourceId)forbid('NOT_FOUND',404);
 if(method!=='GET')forbid('METHOD_NOT_ALLOWED',405);
 const surface=url.searchParams.get('surface');
 if(!['deputy','waste'].includes(surface))forbid('INVALID_SURFACE',400);
 const output=await withScope(cityId,user,'read',async(client,city,role)=>{
  if(!ROLES.has(role))forbid('VALUE_BRIDGE_ROLE_DENIED');
  const org=await wasteOrganization(client,city);
  const oversight=user.is_system_admin===true||['MUNICIPAL_ADMIN','AUDITOR'].includes(role);
  let deputyId=null;let wasteAppointmentVerified=false;
  if(surface==='deputy'){
   const approved=await ownDeputy(client,city,user);
   if(!mayViewDeputy({role,systemAdmin:user.is_system_admin===true,approvedDeputy:approved.length>0}))forbid('DEPUTY_APPROVED_ASSIGNMENT_REQUIRED');
   // Municipality-wide oversight is aggregate-only when no deputy appointment is present.
   deputyId=approved[0]||null;
  }else{
   if(!org)forbid('WASTE_ORGANIZATION_NOT_READY',409);
   const allowed=await wastePermissions(client,city,user,role,org);wasteAppointmentVerified=allowed.appointmentVerified;
  }
  let wasteRows=[];let valueRows=[];
  const wasteInDeputyScope=surface==='waste'||(deputyId&&org&&org.parent_id===deputyId);
  if(org&&isWasteDemoCity(city.name)&&(wasteInDeputyScope||oversight)){
   const r=await client.query(`SELECT id,record_kind,review_state,record_code,payload
     FROM waste_ops_records WHERE tenant_id=$1 AND municipality_id=$2 AND org_unit_id=$3
      AND record_kind NOT IN ('LEGAL','VIOLATION') ORDER BY created_at DESC,id DESC LIMIT 251`,
      [city.tenant_id,city.id,org.id]);
   wasteRows=r.rows;
  }
  // Deputy only sees its appointed organizational subtree, not the entire municipality.
  // Waste CEO only sees hypotheses for its own organization, no deputy-wide dossiers.
  const hypothesisRoot=surface==='waste'?org?.id:deputyId;
  if(hypothesisRoot)valueRows=await processHypotheses(client,city,hypothesisRoot);
  const discovery=discoverOpportunities({cityId:city.id,tenantId:city.tenant_id,surface,wasteRows,
    valueRows,deriveWaste:deriveAgentCandidates});
  return {...discovery,viewerId:user.id,access:{oversight,approvedDeputy:!!deputyId,
    approvedWaste:wasteAppointmentVerified,organizationId:surface==='waste'?org?.id:deputyId},
    sourceStatus:{wastePilot:isWasteDemoCity(city.name)?'DEMO_ONLY':'NOT_ACTIVE_FOR_CITY',
      nonWasteOperationalFeeds:'NOT_ATTESTED'}};
 });
 return json(200,output);
}
