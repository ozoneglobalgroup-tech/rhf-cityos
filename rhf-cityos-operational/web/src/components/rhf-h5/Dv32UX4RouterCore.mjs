// DV32UX4 — local navigation only; authorization is always decided by existing backend routes.
import {UUID,DESKS,mayOpen,summarizeReadOnly} from './Dv32UX3GatewayCore.mjs';
export {UUID,DESKS,mayOpen};
export const MENUS=Object.freeze({
 mayor:Object.freeze([
  {id:'overview',title:'خانه شهردار',icon:'🏛️'},
  {id:'opportunities',title:'فرصت‌های ارزش شهری',icon:'🔎'},
  {id:'reviews',title:'نظارت بر بررسی انسانی',icon:'📋'},
  {id:'dossiers',title:'پرونده شواهد حکمرانی',icon:'📁'},
  {id:'governance',title:'آمادگی و حکمرانی',icon:'📊'},
  {id:'readiness',title:'حسابرسی آمادگی شهر',icon:'🧭'},
  {id:'value-evidence',title:'دروازه شواهد ارزش شهری',icon:'💠'},
  {id:'release-readiness',title:'آمادگی پذیرش نهایی',icon:'✅'},
  {id:'case-chain',title:'ممیزی زنجیره پرونده',icon:'🔗'},
  {id:'temporal-proof',title:'اثبات تحویل Temporal',icon:'⏳'},
  {id:'security-evidence',title:'امنیت و کیفیت',icon:'🛡️'},
  {id:'acceptance-suite',title:'پذیرش جامع و شواهد',icon:'✅'}]),
 deputy:Object.freeze([
  {id:'overview',title:'فرماندهی معاونت',icon:'🏙️'},
  {id:'opportunities',title:'فرصت‌های خدمات شهری',icon:'🔎'},
  {id:'reviews',title:'صف تصمیم‌های معاونت',icon:'📋'},
  {id:'dossiers',title:'ردیابی پرونده‌های شواهد',icon:'📁'},
  {id:'catalog',title:'وضعیت واحدها و خدمات شیراز',icon:'🏢'},
  {id:'operational-catalog',title:'ثبت و مدیریت خدمات واقعی',icon:'🏗️'},
  {id:'cases',title:'پرونده‌های واقعی خدمات شهری',icon:'📝'},
  {id:'case-review',title:'بررسی مستقل پرونده‌های واقعی',icon:'⚖️'},
  {id:'case-planning',title:'برنامه‌ریزی پرونده‌های تأییدشده',icon:'🗂️'},
  {id:'mission-references',title:'مراجع و نگاشت مأموریت‌ها',icon:'📚'},
  {id:'case-revisions',title:'اصلاح پرونده و بررسی مجدد',icon:'🔄'},
  {id:'work-orders',title:'دستورکارهای پیشنهادی',icon:'📑'},
  {id:'temporal-handoff',title:'تحویل کنترل‌شده به اپراتور',icon:'⏳'},
  {id:'domain-coverage',title:'پوشش سازمان‌ها و خدمات',icon:'🧩'},
  {id:'value-evidence',title:'دروازه شواهد ارزش شهری',icon:'💠'},
  {id:'release-readiness',title:'آمادگی پذیرش نهایی',icon:'✅'},
  {id:'case-chain',title:'ممیزی زنجیره پرونده',icon:'🔗'},
  {id:'temporal-proof',title:'اثبات تحویل Temporal',icon:'⏳'},
  {id:'security-evidence',title:'امنیت و کیفیت',icon:'🛡️'},
  {id:'acceptance-suite',title:'پذیرش جامع و شواهد',icon:'✅'}]),
 waste:Object.freeze([
  {id:'overview',title:'مدیریت سازمان پسماند',icon:'♻️'},
  {id:'opportunities',title:'فرصت‌های پسماند',icon:'🔎'},
  {id:'reviews',title:'بررسی‌های سازمان پسماند',icon:'📋'},
  {id:'dossiers',title:'پرونده شواهد سازمان',icon:'📁'},
  {id:'organization',title:'انتساب و محدوده سازمان',icon:'🛡️'},
  {id:'temporal-observation',title:'رصد گردش‌کار تأییدشده',icon:'⏱️'},
  {id:'organization-assurance',title:'اطمینان از محدوده پسماند',icon:'🛡️'},
  {id:'release-readiness',title:'آمادگی سازمان پسماند',icon:'✅'},
  {id:'security-evidence',title:'امنیت و کیفیت سازمان',icon:'🛡️'},
  {id:'acceptance-suite',title:'پذیرش سازمان پسماند',icon:'✅'}])});
export const TITLES=Object.freeze({mayor:'سیستم‌عامل شهردار',deputy:'سیستم‌عامل معاونت خدمات شهری و محیط‌زیست',waste:'سیستم‌عامل مدیرعامل سازمان مدیریت پسماند'});
export const HINTS=Object.freeze({mayor:'راهبری شهر و نظارت بر ارزش‌آفرینی؛ بدون اجرای مستقیم عملیات سازمان‌ها',deputy:'هماهنگی مأموریت‌ها و سازمان‌های زیرمجموعه؛ اقدامات تابع اختیارات قانونی',waste:'عملیات تخصصی سازمان مدیریت پسماند در محدوده انتساب معتبر'});
const fail=s=>{throw new Error(s);};
export function menuFor(desk){if(!DESKS.includes(desk))fail('UNKNOWN_DESK');return MENUS[desk];}
export function routeHash(cityId,desk,tab){
 if(!UUID.test(cityId)||!DESKS.includes(desk)||!menuFor(desk).some(m=>m.id===tab))fail('INVALID_OS_ROUTE');
 return `#rhf-os/v1/${cityId.toLowerCase()}/${desk}/${tab}`;
}
export function parseRouteHash(hash){
 if(typeof hash!=='string'||hash.length>150)return null;
 const m=/^#rhf-os\/v1\/([a-f0-9-]{36})\/(mayor|deputy|waste)\/([a-z-]+)$/.exec(hash);
 if(!m||!UUID.test(m[1])||!MENUS[m[2]].some(x=>x.id===m[3]))return null;
 return {cityId:m[1],desk:m[2],tab:m[3]};
}
export function checkedAccess(matrix,cityId,desk,orgSelection=''){
 if(!UUID.test(cityId)||matrix?.scope?.municipalityId!==cityId||!mayOpen(matrix,desk))return false;
 const id=matrix.rows[desk]?.organizationId||'';
 if(desk!=='waste')return !id;
 return UUID.test(id)&&(!orgSelection||id===orgSelection);
}
const short=(s,max=200)=>typeof s==='string'?s.trim().slice(0,max):'';
export function safeWorkbenchData({discovery,queue,desk,cityId,tenantId,organizationId}){
 const summary=summarizeReadOnly({discovery,queue,desk,cityId,tenantId,orgId:organizationId||null});
 const opportunities=[];const ids=new Set();
 for(const c of discovery.candidates){
  if(typeof c?.id!=='string'||!c.id||c.id.length>190||ids.has(c.id)||!short(c.title))fail('INVALID_DISCOVERY_CANDIDATE');
  ids.add(c.id);opportunities.push({id:c.id,title:short(c.title,150),description:short(c.description,280),priority:short(c.priority,28),evidenceCount:Array.isArray(c.evidence)?c.evidence.length:0});
 }
 const reviews={};
 for(const r of queue.reviews){
  if(typeof r?.status!=='string'||r.status.length>60)fail('INVALID_REVIEW_STATUS');
  reviews[r.status]=(reviews[r.status]||0)+1;
 }
 return {summary,opportunities,reviews,canDecide:queue.permission?.canDecide===true};
}
export function dossierUrl(cityId,desk,orgId,candidateId){
 if(!UUID.test(cityId)||!DESKS.includes(desk)||typeof candidateId!=='string'||candidateId.length<1||candidateId.length>190)fail('INVALID_DOSSIER_REQUEST');
 if(desk==='waste'&&!UUID.test(orgId||''))fail('WASTE_ORGANIZATION_REQUIRED');
 if(desk!=='waste'&&orgId)fail('CITY_DESK_ORGANIZATION_FORBIDDEN');
 const q=new URLSearchParams({desk});if(orgId)q.set('orgId',orgId);
 return `/api/v1/cities/${encodeURIComponent(cityId)}/dv32n-evidence-dossier/${encodeURIComponent(candidateId)}?${q}`;
}
export function summarizeDossier(data,{cityId,tenantId,desk,organizationId,candidateId}){
 if(data?.schema!=='RHF-DV32N-GOVERNED-EVIDENCE-DOSSIER-v1'||data.status!=='POINT_IN_TIME_UNATTESTED'||data.desk!==desk||
  data.scope?.tenantId!==tenantId||data.scope?.municipalityId!==cityId||(data.scope?.organizationId||null)!==(organizationId||null)||
  data.candidate?.id!==candidateId||data.controls?.readOnly!==true||data.controls?.executionAuthorization!==false||
  data.controls?.verifiedUrbanValue!==false||data.controls?.fieldDispatch!==false||data.controls?.payment!==false||
  data.integrity?.algorithm!=='SHA-256'||!(/^[a-f0-9]{64}$/.test(data.integrity?.snapshotChecksum||'')))fail('UNTRUSTED_DOSSIER');
 return {title:short(data.candidate.title,150),reviewStatus:short(data.humanReview?.status,60),gate:short(data.humanReview?.gate,80),
  evidenceCurrent:data.humanReview?.evidenceCurrent===true,checksum:data.integrity.snapshotChecksum,
  snapshotAt:short(data.snapshotAt,40),temporalPhase:short(data.temporal?.phase,80),unsigned:true,verifiedValue:false};
}
export function catalogSnapshot(data,cityId){
 if(!UUID.test(cityId)||data?.schema!=='RHF-DV32Q7-OPERATIONAL-CATALOG-v1'||data.cityId!==cityId||data.acceptance!=='NO_GO')fail('UNTRUSTED_CATALOG');
 const c=data.counts;
 for(const k of ['activeUnits','activeServices','draftMappedSlots'])if(!Number.isSafeInteger(c?.[k])||c[k]<0||c[k]>100000)fail('UNTRUSTED_CATALOG_COUNTS');
 return {activeUnits:c.activeUnits,activeServices:c.activeServices,draftMappedSlots:c.draftMappedSlots,operatorCanChange:data.operatorCanChange===true,finalGo:false};
}
