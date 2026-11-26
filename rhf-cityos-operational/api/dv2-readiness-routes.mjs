/** DV2 organizational readiness: authenticated city-scoped diagnostic, never a provisioning endpoint. */
import {ClientError} from './domain.mjs';
import {WASTE_CODE,isWasteDemoCity,isWasteOrganization} from './waste-pilot-core.mjs';
import {wastePermissions} from './waste-authorization.mjs';
import {buildReadiness} from './dv2-readiness-core.mjs';
export const DV2_READINESS_PARTS=Object.freeze(['dv2-readiness']);
const deny=(message,status=403)=>{throw new ClientError(message,status)};

export async function dv2ReadinessRoute({part,method,resourceId,url,cityId,user,withScope,json}){
 if(part!=='dv2-readiness'||resourceId)deny('NOT_FOUND',404);
 if(method!=='GET')deny('METHOD_NOT_ALLOWED',405);
 const surface=url.searchParams.get('surface');
 if(!['deputy','waste'].includes(surface))deny('INVALID_SURFACE',400);
 const result=await withScope(cityId,user,'read',async(client,city,role)=>{
  const oversight=user.is_system_admin===true||['MUNICIPAL_ADMIN','AUDITOR'].includes(role);
  if(!['MUNICIPAL_ADMIN','AUDITOR','DEPUTY','DIRECTOR'].includes(role))deny('DV2_ROLE_DENIED');
  const o=await client.query(`SELECT id,tenant_id,municipality_id,parent_id,code,name_fa,kind,active
    FROM org_units WHERE tenant_id=$1 AND municipality_id=$2
    ORDER BY created_at,id LIMIT 301`,[city.tenant_id,city.id]);
  if(o.rows.length>300)deny('DV2_ORG_INVENTORY_EXCEEDS_SAFE_LIMIT',409);
  const orgs=o.rows;
  const d=orgs.filter(x=>x.kind==='DEPUTY'&&x.active===true);
  const w=orgs.filter(x=>x.code===WASTE_CODE&&x.kind==='ORGANIZATION'&&x.active===true);
  const waste=w.length===1&&d.some(x=>x.id===w[0].parent_id)&&isWasteOrganization({...w[0],parent_kind:'DEPUTY',parent_active:true,parent_name_fa:d.find(x=>x.id===w[0].parent_id)?.name_fa||''})?w[0]:null;
  const ap=await client.query(`SELECT org_unit_id,position_code
    FROM rhf_organization_appointments
    WHERE tenant_id=$1 AND municipality_id=$2 AND user_id=$3 AND status='APPROVED'
      AND valid_from <= now() AND (valid_to IS NULL OR valid_to > now())
      AND position_code IN ('DEPUTY_HEAD','ORG_CEO')`,[city.tenant_id,city.id,user.id]);
  const ownDeputy=ap.rows.find(x=>x.position_code==='DEPUTY_HEAD'&&d.some(y=>y.id===x.org_unit_id))?.org_unit_id||null;
  if(surface==='deputy'&&!oversight&&!(role==='DEPUTY'&&ownDeputy))deny('DV2_APPROVED_DEPUTY_REQUIRED');
  if(surface==='waste'&&!oversight){
   if(!waste)deny('DV2_WASTE_ORGANIZATION_NOT_READY',409);
   await wastePermissions(client,city,user,role,waste);
  }
  const ceo=waste?await client.query(`SELECT 1 FROM rhf_organization_appointments a
      WHERE a.tenant_id=$1 AND a.municipality_id=$2 AND a.org_unit_id=$3
      AND a.position_code='ORG_CEO' AND a.status='APPROVED'
      AND a.valid_from <= now() AND (a.valid_to IS NULL OR a.valid_to > now()) LIMIT 1`,[city.tenant_id,city.id,waste.id]):{rows:[]};
  const mods=await client.query(`SELECT count(*)::int AS n FROM module_activations
      WHERE tenant_id=$1 AND municipality_id=$2 AND active=true`,[city.tenant_id,city.id]);
  const tenants=await client.query(`SELECT count(*)::int AS n FROM municipalities WHERE tenant_id=$1`,[city.tenant_id]);
  // The organization count for the waste surface is deliberately limited to own org + parent.
  const visible=surface==='waste'?orgs.filter(x=>waste&&(x.id===waste.id||x.id===waste.parent_id)):
    oversight?orgs:orgs.filter(x=>{
      if(x.id===ownDeputy)return true;
      let parent=x.parent_id,depth=0;
      while(parent&&depth++<12){if(parent===ownDeputy)return true;parent=orgs.find(y=>y.id===parent)?.parent_id;}
      return false;
    });
  return buildReadiness({city,viewerId:user.id,surface,orgs:visible,
   tenantCityCount:tenants.rows[0]?.n||0,approvedDeputyId:ownDeputy,wasteCode:WASTE_CODE,
   approvedWasteCEO:ceo.rows.length>0,activeModules:mods.rows[0]?.n||0,
   wastePilot:isWasteDemoCity(city.name),oversight});
 });
 return json(200,result);
}
