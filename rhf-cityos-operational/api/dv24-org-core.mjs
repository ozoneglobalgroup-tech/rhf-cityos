/** RHF Future Cities DV2.4 — extended proposed organizational graph.
 * This is neither a municipal official chart nor a production activation.
 * It never creates organizational appointments, missions, agent actions or value attestations.
 */
export const DV24_SCHEMA='RHF-DV24-MULTI-ORG-COVERAGE-v1';
export const DV24_CONFIRM='تکمیل چارت پیشنهادی';
export const DV24_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// [code, Persian display, kind, parent_code]. The parent order is topological.
const EXTENSION=Object.freeze([
 ['PUBLIC_STREET_SWEEPING','رفت‌وروب و نظافت معابر','DEPARTMENT','ORG_PUBLIC_SERVICES'],
 ['PUBLIC_URBAN_WASHING','شست‌وشوی معابر و تجهیزات','DEPARTMENT','ORG_PUBLIC_SERVICES'],
 ['PUBLIC_TOILETS','مدیریت سرویس‌های بهداشتی عمومی','DEPARTMENT','ORG_PUBLIC_SERVICES'],
 ['PUBLIC_EMERGENCY','هماهنگی پشتیبانی بحران و برف‌روبی','DEPARTMENT','ORG_PUBLIC_SERVICES'],
 ['ENV_AIR_QUALITY','پایش کیفیت هوا','DEPARTMENT','ORG_ENVIRONMENT'],
 ['ENV_SOIL_WATER','پایش آب، خاک و آلاینده‌های شهری','DEPARTMENT','ORG_ENVIRONMENT'],
 ['ENV_PEST_CONTROL','کنترل عوامل زیان‌آور محیط شهری','DEPARTMENT','ORG_ENVIRONMENT'],
 ['GREEN_IRRIGATION','آبیاری و بهره‌وری آب فضای سبز','DEPARTMENT','ORG_GREEN_SPACES'],
 ['GREEN_TREES_GARDENS','حفاظت درختان و باغات شهری','DEPARTMENT','ORG_GREEN_SPACES'],
 ['GREEN_PARK_ASSETS','تجهیزات و نگهداری پارک‌ها','DEPARTMENT','ORG_GREEN_SPACES'],
 ['BEAUTY_FURNITURE','مبلمان، تابلوها و منظر شهری','DEPARTMENT','ORG_BEAUTIFICATION'],
 ['BEAUTY_LIGHTING','نورپردازی و عناصر زیباسازی','DEPARTMENT','ORG_BEAUTIFICATION'],
 ['CEMETERY_OPERATIONS','خدمات و نگهداری آرامستان‌ها','DEPARTMENT','ORG_CEMETERIES'],
 ['MARKETS_FOOD_SUPPLY','میادین و زنجیره عرضه محصولات کشاورزی','DEPARTMENT','ORG_MARKETS'],
 ['MARKETS_JOBS','ساماندهی مشاغل و بازارهای شهری','DEPARTMENT','ORG_MARKETS'],
 ['FLEET_MAINTENANCE','تعمیرات و آماده‌به‌کاری ناوگان','DEPARTMENT','ORG_CITY_FLEET'],
 ['FLEET_RESOURCES','سوخت، قطعات و پایش مصرف ناوگان','DEPARTMENT','ORG_CITY_FLEET'],
 ['CONTRACT_QUALITY','نظارت بر کیفیت خدمات پیمانکاران','DEPARTMENT','ORG_CONTRACTS'],
 ['HSE_INCIDENT_MANAGEMENT','مدیریت رخدادها و اقدامات اصلاحی HSE','DEPARTMENT','ORG_HSE'],
 ['CITIZEN_SERVICE_137','درخواست‌ها، شکایات و سامانه ۱۳۷','DEPARTMENT','ORG_EDUCATION'],
 ['VALUE_BASELINE_VERIFICATION','خط مبنا، سنجش و راستی‌آزمایی ارزش','DEPARTMENT','ORG_VALUE_GOV'],
 ['WASTE_ROUTE_PLANNING','طراحی مسیر و برنامه جمع‌آوری','DEPARTMENT','WASTE_COLLECTION'],
 ['WASTE_SEPARATION','تفکیک از مبدأ و مشارکت شهروندی','DEPARTMENT','WASTE_RECYCLE'],
 ['WASTE_MATERIAL_RECOVERY','بازیافت مواد و بازیابی منابع','DEPARTMENT','WASTE_RECYCLE'],
 ['WASTE_TRANSFER_STATIONS','ایستگاه‌های انتقال پسماند','DEPARTMENT','WASTE_FACILITIES'],
 ['WASTE_DISPOSAL_ENV','دفع نهایی و پایش زیست‌محیطی','DEPARTMENT','WASTE_FACILITIES'],
 ['WASTE_EQUIPMENT_MAINT','نگهداری تجهیزات پسماند','DEPARTMENT','WASTE_FLEET'],
 ['WASTE_OPERATIONAL_INCIDENTS','حوادث و ریسک عملیات پسماند','DEPARTMENT','WASTE_HSE']
]);
export function extendedNodes(){
 const seen=new Set();
 return EXTENSION.map(([code,nameFa,kind,parentCode])=>{
  if(seen.has(code)||!/^[A-Z0-9_]{3,64}$/.test(code)||!/^[A-Z0-9_]{3,64}$/.test(parentCode))throw Error('DV24_TEMPLATE_INVALID');
  seen.add(code);return Object.freeze({code,nameFa,kind,parentCode,classification:'RHF_PROPOSED_NOT_OFFICIAL'});
 });
}
const BLOCK=(x)=>{const e=new Error(x);e.status=409;throw e;};
export function evaluateCoverage({city,base,existing,tenantCityCount,isAdmin,wasteCode}){
 if(!city||!DV24_UUID.test(city.id||'')||!DV24_UUID.test(city.tenant_id||'')||!Array.isArray(base)||!Array.isArray(existing)||typeof wasteCode!=='string')throw Error('DV24_INPUT_INVALID');
 if(existing.some(x=>x.tenant_id!==city.tenant_id||x.municipality_id!==city.id))throw Error('DV24_CROSS_SCOPE_ROWS');
 if(existing.length>500)BLOCK('DV24_TOO_MANY_ORGANIZATIONS');
 const byCode=new Map(),issues=[];
 for(const x of existing){if(byCode.has(x.code))issues.push('DUPLICATE_CODE:'+x.code);byCode.set(x.code,x)}
 for(const n of base){const current=byCode.get(n.code),parent=n.parentCode?byCode.get(n.parentCode):null;
  if(!current||current.active!==true||current.kind!==n.kind||((n.parentCode?parent?.id:null)!==(current?.parent_id??null)))issues.push('BASE_MISSING_OR_MISMATCH:'+n.code);
 }
 const ext=extendedNodes();
 const missing=[],present=[];
 for(const n of ext){const x=byCode.get(n.code);if(!x){missing.push(n);continue;}
  const p=byCode.get(n.parentCode);if(x.active!==true||x.kind!==n.kind||x.parent_id!==p?.id)issues.push('EXTENSION_GRAPH_MISMATCH:'+n.code);
  else present.push(n);
 }
 if(tenantCityCount!==1)issues.push('TENANT_NOT_EXCLUSIVE');
 if(!isAdmin)issues.push('SYSTEM_ADMIN_REQUIRED');
 const blockers=Array.from(new Set(issues));
 return {template:ext,missing,present,blockers,canExtend:blockers.length===0&&missing.length>0,fullyCovered:blockers.length===0&&missing.length===0,
  wasteCode,existingOrgCount:existing.length,tenantCityCount};
}
export function validateConfirmation(body,city){
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['confirmedCityId','confirmedCityName','confirmation','requestKey'].includes(k)))BLOCK('DV24_BODY_INVALID');
 if(body.confirmedCityId!==city.id||body.confirmedCityName!==city.name||body.confirmation!==DV24_CONFIRM)BLOCK('DV24_CONFIRM_MISMATCH');
 if(!DV24_UUID.test(body.requestKey||''))BLOCK('DV24_REQUEST_KEY_REQUIRED');
 return body.requestKey;
}
/** Under withScope, lock + insert + audit commit/rollback atomically. */
export async function extendStructure({client,city,user,base,wasteCode,requestKey,audit}){
 await client.query('SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))',[city.tenant_id,city.id]);
 const counts=await client.query('SELECT count(*)::int n FROM municipalities WHERE tenant_id=$1',[city.tenant_id]);
 const org=await client.query(`SELECT id,tenant_id,municipality_id,parent_id,code,kind,active FROM org_units WHERE tenant_id=$1 AND municipality_id=$2 ORDER BY created_at,id LIMIT 501`,[city.tenant_id,city.id]);
 if(org.rows.length>500)BLOCK('DV24_ORG_LIMIT');
 const evaluation=evaluateCoverage({city,base,existing:org.rows,tenantCityCount:counts.rows[0]?.n,isAdmin:user.is_system_admin===true,wasteCode});
 if(!evaluation.canExtend)BLOCK('DV24_NOT_ELIGIBLE:'+evaluation.blockers.join('|')+(evaluation.fullyCovered?'|ALREADY_COMPLETE':''));
 const idByCode=new Map(org.rows.map(x=>[x.code,x.id]));const created=[];
 for(const node of evaluation.missing){const parentId=idByCode.get(node.parentCode);if(!DV24_UUID.test(parentId||''))BLOCK('DV24_PARENT_MISSING:'+node.parentCode);
  const r=await client.query(`INSERT INTO org_units(tenant_id,municipality_id,parent_id,code,name_fa,kind,active) VALUES($1,$2,$3,$4,$5,$6,true) RETURNING id`,[city.tenant_id,city.id,parentId,node.code,node.nameFa,node.kind]);
  if(!DV24_UUID.test(r.rows[0]?.id||''))BLOCK('DV24_INSERT_RECEIPT_INVALID');
  idByCode.set(node.code,r.rows[0].id);created.push(node.code);
 }
 await audit(client,city,user,'ORG_EXTENSION',city.id,'DV24_PROPOSED_GRAPH_EXTENDED',{requestKey,createdCodes:created,referenceClassification:'RHF_PROPOSED_NOT_OFFICIAL',noAppointments:true,noModuleActivation:true,noAgentExecution:true,noValueCertification:true});
 return {schema:DV24_SCHEMA,cityId:city.id,tenantId:city.tenant_id,status:'STRUCTURE_EXTENDED_PENDING_REVIEW',createdCount:created.length,createdCodes:created,
  appointmentsCreated:0,modulesActivated:0,agentActionsExecuted:0,certifiedValueCreated:0};
}
