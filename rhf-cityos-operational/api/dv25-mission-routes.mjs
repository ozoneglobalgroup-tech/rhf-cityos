/** DV2.5 scoped mission ownership matrix — GET only, no provision or activation. */
import {ClientError} from './domain.mjs';
import {WASTE_CODE} from './waste-pilot-core.mjs';
import {wastePermissions} from './waste-authorization.mjs';
import {createMissionMatrix} from './dv25-mission-core.mjs';
export const DV25_MISSION_PARTS=Object.freeze(['dv25-mission-matrix']);
const deny=(message,status=403)=>{throw new ClientError(message,status)};
function childrenOf(roots,orgs){
 const seen=new Set(roots),remaining=[...roots];
 for(let index=0;index<remaining.length&&index<501;index++){
  const parent=remaining[index];for(const x of orgs){if(x.parent_id===parent&&!seen.has(x.id)){seen.add(x.id);remaining.push(x.id)}}
 }
 return seen;
}
export async function dv25MissionRoute({part,method,resourceId,url,cityId,user,withScope,json}){
 if(part!=='dv25-mission-matrix'||resourceId)deny('NOT_FOUND',404);
 if(method!=='GET')deny('METHOD_NOT_ALLOWED',405);
 if(url.searchParams.getAll('surface').length!==1||[...url.searchParams.keys()].some(k=>k!=='surface'))deny('DV25_QUERY_INVALID',400);
 const surface=url.searchParams.get('surface');if(!['deputy','waste'].includes(surface))deny('DV25_SURFACE_INVALID',400);
 const result=await withScope(cityId,user,'read',async(client,city,role)=>{
  const oversight=user.is_system_admin===true||['MUNICIPAL_ADMIN','AUDITOR'].includes(role);
  if(!oversight&&!['DEPUTY','DIRECTOR'].includes(role))deny('DV25_ROLE_DENIED');
  const orgs=(await client.query(`SELECT id,tenant_id,municipality_id,parent_id,code,name_fa AS "nameFa",kind,active
   FROM org_units WHERE tenant_id=$1 AND municipality_id=$2 ORDER BY created_at,id LIMIT 501`,[city.tenant_id,city.id])).rows;
  if(orgs.length>500)deny('DV25_ORG_LIMIT',409);
  const deputy=orgs.find(x=>x.code==='DEP_URBAN_ENV'&&x.kind==='DEPUTY'&&x.active===true);
  const waste=orgs.find(x=>x.code===WASTE_CODE&&x.kind==='ORGANIZATION'&&x.active===true&&x.parent_id===deputy?.id);
  if(!oversight){
   if(surface==='deputy'){
    if(role!=='DEPUTY'||!deputy)deny('DV25_DEPUTY_REQUIRED');
    const appointment=await client.query(`SELECT 1 FROM rhf_organization_appointments
      WHERE tenant_id=$1 AND municipality_id=$2 AND org_unit_id=$3 AND user_id=$4 AND position_code='DEPUTY_HEAD'
        AND status='APPROVED' AND valid_from<=now() AND (valid_to IS NULL OR valid_to>now()) LIMIT 1`,[city.tenant_id,city.id,deputy.id,user.id]);
    if(appointment.rows.length!==1)deny('DV25_DEPUTY_APPOINTMENT_REQUIRED');
   }else{
    if(!waste)deny('DV25_WASTE_NOT_READY',409);
    await wastePermissions(client,city,user,role,waste);
   }
  }
  if(surface==='waste'&&!waste)deny('DV25_WASTE_NOT_READY',409);
  const ids=surface==='waste'?childrenOf([waste.id],orgs):deputy?childrenOf([deputy.id],orgs):new Set();
  const selected=orgs.filter(x=>ids.has(x.id));
  const scopedOrgIds=selected.map(x=>x.id);
  const evidence=scopedOrgIds.length?await client.query(`SELECT sector,kind,count(*)::int n
    FROM rhf_urban_need_capacity WHERE tenant_id=$1 AND municipality_id=$2 AND owner_org_id=ANY($3::uuid[])
      AND status='REVIEWED' GROUP BY sector,kind ORDER BY sector,kind`,[city.tenant_id,city.id,scopedOrgIds]):{rows:[]};
  const n=await client.query('SELECT count(*)::int n FROM municipalities WHERE tenant_id=$1',[city.tenant_id]);
  const out=createMissionMatrix({city,viewerId:user.id,surface,wasteCode:WASTE_CODE,orgs:selected,counts:evidence.rows,tenantCityCount:n.rows[0]?.n});
  // Authorization and empty-city states remain visible, but no fabricated readiness.
  return out;
 });
 return json(200,result);
}
