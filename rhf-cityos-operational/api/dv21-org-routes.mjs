/** DV2.1 organization bootstrap — secure preview + explicit one-transaction creation. */
import {ClientError} from './domain.mjs';
import {WASTE_CODE} from './waste-pilot-core.mjs';
import {DV21_SCHEMA,DV21_CONFIRM,templateNodes,evaluate,verifyRequest,provision} from './dv21-org-core.mjs';
export const DV21_ORG_PARTS=Object.freeze(['org-bootstrap']);
const fail=(x,s=403)=>{throw new ClientError(x,s)};
function requireOrigin(req){
 const origin=req.headers?.origin;
 if(!origin)fail('DV21_ORIGIN_REQUIRED');
 let candidate;try{candidate=new URL(origin)}catch{fail('DV21_ORIGIN_INVALID')}
 if(candidate.host!==req.headers.host||candidate.protocol!==(process.env.PUBLIC_HTTPS==='true'?'https:':'http:'))fail('DV21_ORIGIN_MISMATCH');
}
export async function dv21OrgRoute({part,method,resourceId,req,cityId,user,withScope,readBody,json,audit}){
 if(part!=='org-bootstrap'||resourceId)fail('NOT_FOUND',404);
 if(!['GET','POST'].includes(method))fail('METHOD_NOT_ALLOWED',405);
 if(method==='POST'){
  if(user.is_system_admin!==true)fail('DV21_ADMIN_ONLY');
  requireOrigin(req);
 }
 const body=method==='POST'?await readBody(req):null;
 const result=await withScope(cityId,user,method==='POST'?'manage':'read',async(client,city,role)=>{
  if(!user.is_system_admin&&!['MUNICIPAL_ADMIN','AUDITOR','DEPUTY','DIRECTOR'].includes(role))fail('DV21_PREVIEW_ROLE_DENIED');
  if(method==='POST'){
   const requestKey=verifyRequest(body,city);
   return provision({client,city,user,requestKey,wasteCode:WASTE_CODE,audit});
  }
  const [count,orgs]=await Promise.all([
   client.query('SELECT count(*)::int AS n FROM municipalities WHERE tenant_id=$1',[city.tenant_id]),
   client.query('SELECT count(*)::int AS n FROM org_units WHERE tenant_id=$1 AND municipality_id=$2',[city.tenant_id,city.id])]);
  const eligibility=evaluate({tenantCityCount:count.rows[0]?.n,orgCount:orgs.rows[0]?.n,isAdmin:user.is_system_admin===true});
  return {schema:DV21_SCHEMA,cityId:city.id,tenantId:city.tenant_id,cityName:city.name,
   tenantCityCount:count.rows[0]?.n,existingOrgCount:orgs.rows[0]?.n,
   templateClassification:'RHF_PROPOSED_CITY_STRUCTURE_NOT_OFFICIAL',
   template:templateNodes(WASTE_CODE),
   confirmationText:DV21_CONFIRM,...eligibility,
   guardrails:{readOnlyPreview:true,commitRequiresExplicitConfirmation:true,
    noAutomaticAppointments:true,noAutomaticModuleActivation:true,noPilotUnlock:true,
    noAgentExecution:true,noValueCertification:true,productionReady:false}};
 });
 return json(method==='POST'?201:200,result);
}
