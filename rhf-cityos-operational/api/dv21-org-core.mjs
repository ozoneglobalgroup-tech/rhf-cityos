/** DV2.1 RHF proposed organization template; NEVER an official city chart. */
import {ClientError} from './domain.mjs';
export const DV21_SCHEMA='RHF-DV21-ORG-PROVISION-v1';
export const DV21_CONFIRM='ایجاد ساختار آزمایشی';
const DENY=(msg,status=409)=>{throw new ClientError(msg,status)};
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const staticNodes=[
 ['DEP_URBAN_ENV','معاونت خدمات شهری و محیط‌زیست','DEPUTY',null],
 ['ORG_PUBLIC_SERVICES','اداره خدمات عمومی و نظافت شهری','DIRECTORATE','DEP_URBAN_ENV'],
 ['ORG_ENVIRONMENT','اداره محیط‌زیست شهری','DIRECTORATE','DEP_URBAN_ENV'],
 ['ORG_GREEN_SPACES','اداره فضای سبز، پارک‌ها و باغات','DIRECTORATE','DEP_URBAN_ENV'],
 ['ORG_BEAUTIFICATION','اداره زیباسازی و منظر شهری','DIRECTORATE','DEP_URBAN_ENV'],
 ['ORG_CEMETERIES','سازمان یا واحد خدمات آرامستان‌ها','ORGANIZATION','DEP_URBAN_ENV'],
 ['ORG_MARKETS','سازمان یا واحد میادین و ساماندهی مشاغل','ORGANIZATION','DEP_URBAN_ENV'],
 ['ORG_CITY_FLEET','اداره ناوگان و ماشین‌آلات خدمات شهری','DIRECTORATE','DEP_URBAN_ENV'],
 ['ORG_CONTRACTS','اداره پایش قراردادها و پیمانکاران','DIRECTORATE','DEP_URBAN_ENV'],
 ['ORG_HSE','واحد ایمنی، بهداشت و محیط‌زیست عملیات','DEPARTMENT','DEP_URBAN_ENV'],
 ['ORG_EDUCATION','اداره آموزش و مشارکت شهروندی','DIRECTORATE','DEP_URBAN_ENV'],
 ['ORG_VALUE_GOV','دفتر ظرفیت‌ها و حکمرانی ارزش شهری','DEPARTMENT','DEP_URBAN_ENV'],
];
export function templateNodes(wasteCode){
 if(typeof wasteCode!=='string'||!/^[A-Z0-9_-]{2,64}$/.test(wasteCode))DENY('DV21_WASTE_CODE_INVALID',500);
 const all=[staticNodes[0],[wasteCode,'سازمان مدیریت پسماند','ORGANIZATION','DEP_URBAN_ENV'],
  ['WASTE_COLLECTION','مدیریت جمع‌آوری و تنظیف','DIRECTORATE',wasteCode],
  ['WASTE_RECYCLE','مدیریت تفکیک، بازیافت و اقتصاد چرخشی','DIRECTORATE',wasteCode],
  ['WASTE_FACILITIES','مدیریت مراکز انتقال، پردازش و دفع','DIRECTORATE',wasteCode],
  ['WASTE_FLEET','مدیریت ناوگان و تجهیزات پسماند','DEPARTMENT',wasteCode],
  ['WASTE_HSE','واحد HSE سازمان پسماند','DEPARTMENT',wasteCode],
  ...staticNodes.slice(1)];
 const codes=new Set();
 return all.map(([code,nameFa,kind,parentCode])=>{
  if(codes.has(code))DENY('DV21_TEMPLATE_CODE_COLLISION',500);
  if(parentCode&&!codes.has(parentCode))DENY('DV21_TEMPLATE_PARENT_ORDER',500);
  codes.add(code);return Object.freeze({code,nameFa,kind,parentCode});
 });
}
export function evaluate({tenantCityCount,orgCount,isAdmin}){
 const blockers=[];
 if(!Number.isInteger(tenantCityCount)||tenantCityCount!==1)blockers.push('TENANT_NOT_EXCLUSIVE');
 if(!Number.isInteger(orgCount)||orgCount!==0)blockers.push('ORG_STRUCTURE_NOT_EMPTY');
 if(isAdmin!==true)blockers.push('SYSTEM_ADMIN_REQUIRED');
 return {canProvision:blockers.length===0,blockers};
}
export function verifyRequest(body,city){
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(x=>!['confirmedCityId','confirmedCityName','confirmation','requestKey'].includes(x)))DENY('DV21_INVALID_BODY',400);
 if(body.confirmedCityId!==city.id||body.confirmedCityName!==city.name||body.confirmation!==DV21_CONFIRM)DENY('DV21_CONFIRMATION_MISMATCH',400);
 if(!UUID.test(body.requestKey||''))DENY('DV21_REQUEST_KEY_REQUIRED',400);
 return body.requestKey;
}
/** Must run within withScope: BEGIN + app.* RLS vars + COMMIT/ROLLBACK. */
export async function provision({client,city,user,requestKey,wasteCode,audit}){
 await client.query('SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))',[city.tenant_id,city.id]);
 const counts=await client.query('SELECT count(*)::int AS n FROM municipalities WHERE tenant_id=$1',[city.tenant_id]);
 const seen=await client.query('SELECT count(*)::int AS n FROM org_units WHERE tenant_id=$1 AND municipality_id=$2',[city.tenant_id,city.id]);
 const v=evaluate({tenantCityCount:counts.rows[0]?.n,orgCount:seen.rows[0]?.n,isAdmin:user.is_system_admin===true});
 if(!v.canProvision)DENY('DV21_PRECONDITION_CHANGED:'+v.blockers.join(','));
 const nodes=templateNodes(wasteCode),ids=new Map(),created=[];
 for(const node of nodes){
  const parentId=node.parentCode?ids.get(node.parentCode):null;
  const result=await client.query(`INSERT INTO org_units(tenant_id,municipality_id,parent_id,code,name_fa,kind,active)
    VALUES($1,$2,$3,$4,$5,$6,true) RETURNING id`,
    [city.tenant_id,city.id,parentId,node.code,node.nameFa,node.kind]);
  const id=result.rows[0]?.id;if(!UUID.test(id||''))DENY('DV21_INSERT_INVALID_ID',500);
  ids.set(node.code,id);created.push({code:node.code,id});
 }
 await audit(client,city,user,'ORG_PROVISION',city.id,'DV21_TEMPLATE_CREATED',
  {requestKey,template:'RHF_PROPOSED_DV21',organizationCount:created.length,createdCodes:created.map(x=>x.code),
   noAppointments:true,noModuleActivation:true,noAgentExecution:true,noCertifiedValue:true});
 return {schema:DV21_SCHEMA,cityId:city.id,tenantId:city.tenant_id,created:created.length,
  deputyId:ids.get('DEP_URBAN_ENV'),wasteOrgId:ids.get(wasteCode),
  appointmentsCreated:0,modulesActivated:0,agentActionsExecuted:0,certifiedValueCreated:0,
  status:'STRUCTURE_CREATED_PENDING_IAM_AND_SECURITY_UAT'};
}
