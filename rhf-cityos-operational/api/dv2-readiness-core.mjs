/** RHF Future Cities DV2: auditable design catalog and structural-readiness status.
 * Design catalog (not an official reproduction of any municipality's published 17 mandates).
 * No actions, no tenant/organization creation, no inferred public-value realization.
 */
export const DV2_SCHEMA='RHF-DV2-ORG-READINESS-v1';
export const DV2_AXES=Object.freeze([
 {id:'environment',title:'محیط‌زیست شهری',missions:[
  ['E01','مدیریت یکپارچه پسماند و بازیافت'],['E02','پایش کیفیت هوا، خاک و آب شهری'],
  ['E03','کاهش آلایندگی و مدیریت مخاطرات محیط‌زیستی'],['E04','اقتصاد چرخشی و بازاستفاده از منابع']]},
 {id:'public-safety',title:'خدمات عمومی و ایمنی',missions:[
  ['S01','نظافت، رفت‌وروب و خدمات روزمره شهر'],['S02','مدیریت ایمنی خدمات و حوادث عملیاتی'],
  ['S03','مدیریت آرامستان‌ها و خدمات عمومی وابسته'],['S04','آمادگی و پاسخ هماهنگ به بحران‌های شهری']]},
 {id:'green-appearance',title:'فضای سبز و نمای شهری',missions:[
  ['G01','حفظ و نگهداری پارک‌ها و فضای سبز'],['G02','حفاظت از درختان و باغات شهری'],
  ['G03','زیباسازی، مبلمان و منظر شهری']]},
 {id:'urban-economy',title:'اقتصاد شهری',missions:[
  ['C01','ساماندهی میادین، بازارها و مشاغل شهری'],['C02','حکمرانی قراردادها و عملکرد پیمانکاران'],
  ['C03','فعال‌سازی ظرفیت‌های بلااستفاده و کاهش هزینه خدمات']]},
 {id:'participation',title:'آموزش و مشارکت شهروندی',missions:[
  ['P01','آموزش و فرهنگ‌سازی خدمات و محیط‌زیست'],['P02','پاسخ‌گویی، شکایات و درخواست‌های شهروندی'],
  ['P03','مشارکت شهروندان و نهادهای محلی در خلق ارزش']]}].map(a=>Object.freeze({...a,missions:Object.freeze(a.missions.map(([code,title])=>Object.freeze({code,title,operationalState:'NOT_ASSESSED'})))})));
export const DV2_MISSION_COUNT=DV2_AXES.reduce((n,a)=>n+a.missions.length,0);
export const ORG_GATE_CODES=Object.freeze({deputyKind:'DEPUTY',wasteKind:'ORGANIZATION'});
export const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Pure summary of only the already authorized, city-scoped records. */
export function buildReadiness({city,viewerId,surface,orgs,tenantCityCount,approvedDeputyId=null,wasteCode,
 approvedWasteCEO=false,activeModules=0,wastePilot=false,oversight=false}){
 if(!city||!UUID_RE.test(city.id||'')||!UUID_RE.test(city.tenant_id||'')||!UUID_RE.test(viewerId||'')||!['deputy','waste'].includes(surface))throw Error('DV2_INVALID_SCOPE');
 if(!Array.isArray(orgs)||orgs.some(o=>o.tenant_id!==city.tenant_id||o.municipality_id!==city.id))throw Error('DV2_CROSS_CITY_ORG_INPUT');
 if(typeof wasteCode!=='string'||!wasteCode||!Number.isInteger(tenantCityCount)||tenantCityCount<1)throw Error('DV2_INVALID_CONTRACT');
 const active=orgs.filter(o=>o.active===true);
 const deputy=active.filter(o=>o.kind==='DEPUTY');
 const waste=active.filter(o=>o.kind==='ORGANIZATION'&&o.code===wasteCode);
 const validWaste=waste.length===1&&deputy.some(d=>d.id===waste[0].parent_id);
 const exclusiveTenant=tenantCityCount===1;
 const hasDeputyAppointment=!!approvedDeputyId&&deputy.some(d=>d.id===approvedDeputyId);
 const issues=[];
 if(!exclusiveTenant)issues.push({key:'TENANT_SHARED',level:'CRITICAL',message:'چند شهرداری در یک Tenant قرار دارند؛ جداسازی مستقل هنوز اثبات نشده است.'});
 if(deputy.length===0)issues.push({key:'DEPUTY_MISSING',level:'BLOCKED',message:'واحد فعال معاونت خدمات شهری ثبت نشده است.'});
 if(deputy.length>1)issues.push({key:'DEPUTY_AMBIGUOUS',level:'BLOCKED',message:'بیش از یک ریشه معاونت فعال دیده شد؛ نیازمند تعیین ساختار مسئول است.'});
 if(!validWaste)issues.push({key:'WASTE_ORG_NOT_READY',level:'BLOCKED',message:'سازمان پسماند با والد معاونت معتبر و فعال یافت نشد.'});
 if(!hasDeputyAppointment)issues.push({key:'DEPUTY_APPOINTMENT_NOT_ATTESTED',level:'PENDING',message:'انتصاب معتبر معاون برای کاربر جاری احراز نشده است.'});
 if(!approvedWasteCEO)issues.push({key:'WASTE_CEO_NOT_ATTESTED',level:'PENDING',message:'وجود مدیرعامل منصوب‌شده سازمان پسماند احراز نشده است.'});
 if(activeModules===0)issues.push({key:'MODULES_INACTIVE',level:'PENDING',message:'ماژول فعالی برای شهر گزارش نشده است.'});
 if(!wastePilot)issues.push({key:'WASTE_OPERATION_NOT_ENABLED',level:'PENDING',message:'عملیات پسماند خارج از پایلوت فعال نشده است؛ محدودیت حفظ شده است.'});
 // Genuine production readiness also needs two-tenant security, field operations and independent value UAT.
 return {schema:DV2_SCHEMA,cityId:city.id,tenantId:city.tenant_id,viewerId,surface,
  catalog:{classification:'RHF_PROPOSED_REFERENCE_TEMPLATE_NOT_OFFICIAL_TAEHRAN_MANDATES',axes:DV2_AXES,missionCount:DV2_MISSION_COUNT},
  readiness:{tenantExclusive:exclusiveTenant,tenantCityCount,visibleOrgCount:active.length,
   deputyRootPresent:deputy.length===1,wasteOrganizationPresent:validWaste,
   deputyAppointmentForViewer:hasDeputyAppointment,wasteCeoExistenceAttested:approvedWasteCEO,
   activeModuleCount:activeModules,wasteOperationalPilotEnabled:wastePilot},
  issues,governance:{readOnly:true,autoProvision:false,autoAppointment:false,autoActivation:false,
   agentExecution:'NOT_ATTESTED',valueVerification:'NOT_ATTESTED',tenantIsolationUAT:'NOT_ATTESTED',
   productionReady:false,operationalDataCertified:false,oversightPreview:!!oversight}};
}
