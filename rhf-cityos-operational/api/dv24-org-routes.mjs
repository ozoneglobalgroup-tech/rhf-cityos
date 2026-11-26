/** DV2.4 scoped inventory and explicitly confirmed organizational extension. */
import {ClientError} from './domain.mjs';
import {WASTE_CODE} from './waste-pilot-core.mjs';
import {wastePermissions} from './waste-authorization.mjs';
import {templateNodes} from './dv21-org-core.mjs';
import {DV24_SCHEMA,DV24_CONFIRM,extendedNodes,evaluateCoverage,validateConfirmation,extendStructure} from './dv24-org-core.mjs';
export const DV24_ORG_PARTS=Object.freeze(['dv24-org-coverage']);
const fail=(x,s=403)=>{throw new ClientError(x,s)};
function sameOrigin(req){let origin;
 try{origin=new URL(req.headers?.origin||'')}catch{fail('DV24_ORIGIN_REQUIRED')}
 if(origin.host!==req.headers?.host||origin.protocol!==(process.env.PUBLIC_HTTPS==='true'?'https:':'http:'))fail('DV24_ORIGIN_MISMATCH');
}
export async function dv24OrgRoute({part,method,resourceId,url,req,cityId,user,withScope,readBody,json,audit}){
 if(part!=='dv24-org-coverage'||resourceId)fail('NOT_FOUND',404);
 if(!['GET','POST'].includes(method))fail('METHOD_NOT_ALLOWED',405);
 if([...url.searchParams.keys()].some(k=>k!=='surface')||url.searchParams.getAll('surface').length!==1)fail('DV24_QUERY_INVALID',400);
 const surface=url.searchParams.get('surface');if(!['deputy','waste'].includes(surface))fail('DV24_SURFACE_INVALID',400);
 if(method==='POST'){
  if(surface!=='deputy'||user.is_system_admin!==true)fail('DV24_ADMIN_DEPUTY_ONLY');
  sameOrigin(req);
 }
 const body=method==='POST'?await readBody(req):null;
 const result=await withScope(cityId,user,method==='POST'?'manage':'read',async(client,city,role)=>{
  const oversight=user.is_system_admin===true||['MUNICIPAL_ADMIN','AUDITOR'].includes(role);
  if(!oversight&&!['DEPUTY','DIRECTOR'].includes(role))fail('DV24_ROLE_DENIED');
  const orgResult=await client.query(`SELECT id,tenant_id,municipality_id,parent_id,code,kind,active FROM org_units WHERE tenant_id=$1 AND municipality_id=$2 ORDER BY created_at,id LIMIT 501`,[city.tenant_id,city.id]);
  const orgs=orgResult.rows;if(orgs.length>500)fail('DV24_ORG_LIMIT',409);
  const deputy=orgs.find(x=>x.code==='DEP_URBAN_ENV'&&x.kind==='DEPUTY'&&x.active===true);
  const waste=orgs.find(x=>x.code===WASTE_CODE&&x.kind==='ORGANIZATION'&&x.parent_id===deputy?.id&&x.active===true);
  if(!oversight){
   if(surface==='deputy'){
    const ap=await client.query(`SELECT 1 FROM rhf_organization_appointments WHERE tenant_id=$1 AND municipality_id=$2 AND org_unit_id=$3 AND user_id=$4 AND position_code='DEPUTY_HEAD' AND status='APPROVED' AND valid_from<=now() AND (valid_to IS NULL OR valid_to>now()) LIMIT 1`,[city.tenant_id,city.id,deputy?.id||'00000000-0000-4000-8000-000000000000',user.id]);
    if(role!=='DEPUTY'||ap.rows.length===0)fail('DV24_DEPUTY_APPOINTMENT_REQUIRED');
   }else{
    if(!waste)fail('DV24_WASTE_NOT_READY',409);
    await wastePermissions(client,city,user,role,waste);
   }
  }
  if(method==='POST'){
   const requestKey=validateConfirmation(body,city);
   return extendStructure({client,city,user,base:templateNodes(WASTE_CODE),wasteCode:WASTE_CODE,requestKey,audit});
  }
  const counts=await client.query('SELECT count(*)::int n FROM municipalities WHERE tenant_id=$1',[city.tenant_id]);
  const coverage=evaluateCoverage({city,base:templateNodes(WASTE_CODE),existing:orgs,tenantCityCount:counts.rows[0]?.n,isAdmin:user.is_system_admin===true,wasteCode:WASTE_CODE});
  // Waste viewers only see proposed waste sub-units, never cross-department names.
  const visible=surface==='waste'?coverage.template.filter(n=>n.code.startsWith('WASTE_')):coverage.template;
  const missingSet=new Set(coverage.missing.map(x=>x.code));
  const presentSet=new Set(coverage.present.map(x=>x.code));
  return {schema:DV24_SCHEMA,cityId:city.id,tenantId:city.tenant_id,viewerId:user.id,surface,cityName:city.name,
   classification:'RHF_PROPOSED_STRUCTURE_NOT_OFFICIAL',tenantCityCount:coverage.tenantCityCount,
   existingOrgCount:surface==='deputy'?coverage.existingOrgCount:null,
   totalProposed:visible.length,missingCount:visible.filter(n=>missingSet.has(n.code)).length,
   presentCount:visible.filter(n=>presentSet.has(n.code)).length,
   proposed:visible.map(n=>({...n,present:presentSet.has(n.code),missing:missingSet.has(n.code)})),
   blockers:surface==='deputy'?coverage.blockers.filter(x=>x!=='SYSTEM_ADMIN_REQUIRED'):[],
   canExtend:surface==='deputy'&&coverage.canExtend,fullyCovered:coverage.fullyCovered,
   confirmationText:DV24_CONFIRM,
   governance:{readOnlyPreview:true,commitRequiresAdminAndExplicitConfirmation:true,autoAppointment:false,autoModuleActivation:false,
    pilotUnlocked:false,municipalExecution:false,verifiedPublicValue:false,tenantIsolationUat:'NOT_ATTESTED',productionReady:false}};
 });
 return json(method==='POST'?201:200,result);
}
