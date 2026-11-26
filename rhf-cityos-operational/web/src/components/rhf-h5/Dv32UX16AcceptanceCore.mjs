// DV32UX16: fail-closed, point-in-time READINESS evidence, not certification.
import {UUID,routeFor,readReport} from './Dv32UX13PortfolioCore.mjs';

const unknown=(code)=>{throw Error(code)};
const stateSet=new Set(['PASS','OBSERVED','BLOCKED','NOT_RUN']);
const entry=(id,title,status,detail,proof)=>({id,title,status,detail,proof:proof||'NO_EVIDENCE'});
export function acceptanceUrl({cityId,tenantId,desk,orgId}){
  if(!UUID.test(cityId)||!UUID.test(tenantId))unknown('INVALID_CITY_SCOPE');
  if(desk==='waste')return routeFor({cityId,tenantId,desk,tab:'organization-assurance',orgId});
  if(!['mayor','deputy'].includes(desk)||orgId)unknown('INVALID_DESK_SCOPE');
  return routeFor({cityId,tenantId,desk,tab:'value-evidence'});
}
function output(desk,entries,sourceTimestamp,context){
  if(!entries.length||new Set(entries.map(x=>x.id)).size!==entries.length||entries.some(x=>!stateSet.has(x.status)))unknown('BAD_READINESS_EVIDENCE');
  const tally=Object.fromEntries([...stateSet].map(v=>[v,entries.filter(x=>x.status===v).length]));
  return Object.freeze({schema:'RHF-DV32UX16-READINESS-v1',desk,sourceTimestamp,asOf:new Date().toISOString(),entries,tally,
   officialMappingCertified:false,verifiedUrbanValue:false,authenticatedUat:'NOT_RUN',temporalExecutionVerified:false,finalGo:'NO_GO',context});
}
export function evaluateCityReadiness(raw,{cityId,tenantId,desk,orgId}){
  if(orgId||!['mayor','deputy'].includes(desk))unknown('CITY_READINESS_SCOPE_DENIED');
  const r=readReport(raw,{cityId,tenantId});
  const c=r.counts;
  const items=[
   entry('identity','داده‌های مبتنی بر شهرداری و حساب جاری','PASS','گزارش دریافتی با محدوده شهرداری و مستأجر فعلی تطبیق داده شد','SCOPED_PORTFOLIO_RESPONSE'),
   entry('organization','ساختار واحدها و خدمات فعال',c.activeUnits>0&&c.activeServices>0?'OBSERVED':'BLOCKED',`${c.activeUnits} واحد فعال و ${c.activeServices} خدمت فعال؛ بررسی کیفیت و پوشش کامل هنوز مستقل انجام نشده است`,'LIVE_ORG_SERVICE_COUNTERS'),
   entry('mission','مرجع و نگاشت رسمی ۱۷ مأموریت','BLOCKED',`${c.attestedMissionSlots} جایگاه دارای بررسی انسانی؛ این تعداد گواهی انطباق رسمی مأموریت‌ها نیست`,'HUMAN_ATTESTATION_ONLY'),
   entry('case','پرونده واقعی و زنجیره بررسی مستقل',c.realDraftCases>0&&c.independentlyApprovedReviews>0?'OBSERVED':'NOT_RUN',`${c.realDraftCases} پرونده DRAFT و ${c.independentlyApprovedReviews} بررسی تأییدشده؛ تطبیق انتهابه‌انتهای همان پرونده هنوز اثبات نشده است`,'POINT_IN_TIME_LEDGER_COUNTS'),
   entry('planning','برگه برنامه‌ریزی و دستورکار',c.planningDrafts>0&&c.workOrders>0?'OBSERVED':'NOT_RUN',`${c.planningDrafts} برگه برنامه‌ریزی و ${c.workOrders} دستورکار؛ اتصال موردبه‌مورد تأیید نشده است`,'POINT_IN_TIME_LEDGER_COUNTS'),
   entry('handoff','تحویل به اپراتور و اجرای Temporal',c.handoffIntents>0?'OBSERVED':'NOT_RUN',`${c.handoffIntents} درخواست تحویل ثبت‌شده؛ هیچ اجرای واقعی Temporal از این عدد استنتاج نمی‌شود`,'INTENTS_ONLY_NO_EXECUTION_PROOF'),
   entry('urban-value','راستی‌آزمایی مستقل نتیجه شهری','BLOCKED','خط مبنا، مشاهده پس از اقدام و رأی مستقل ارزش شهری در این منبع اثبات نشده است','NO_VERIFIED_OUTCOME'),
   entry('role-uat','پذیرش سه حساب واقعی و آزمون مرورگری','NOT_RUN','ورود و گردش کامل سه نقش، آزمون کاربرپسندی و دسترس‌پذیری هنوز اجرا نشده است','AUTHENTICATED_UAT_DEFERRED')
  ];
  return output(desk,items,r.asOf,{units:c.units,services:c.services,missionSlots:c.missionSlots,attestedMissionSlots:c.attestedMissionSlots});
}
export function evaluateWasteReadiness(safe,{cityId,tenantId,orgId}){
  if(!UUID.test(cityId)||!UUID.test(tenantId)||!UUID.test(orgId))unknown('WASTE_BINDING_REQUIRED');
  if(!safe||!Array.isArray(safe.entries)||safe.entries.length>100000||safe.entries.some(x=>typeof x?.canObserve!=='boolean'))unknown('UNTRUSTED_WASTE_EVIDENCE');
  const observed=safe.entries.filter(x=>x.canObserve).length;
  const items=[
   entry('organization-scope','انتساب سازمان پسماند','PASS','پاسخ DV32L با انتساب سازمان احراز شد؛ این صرفاً کنترل دامنه مشاهده است','SAFE_PIPELINE_BOUND_ORG'),
   entry('opportunities','فرصت‌های قابل مشاهده سازمان',observed>0?'OBSERVED':'NOT_RUN',`${observed} فرصت در محدوده مجاز قابل مشاهده است؛ اثر شهری به اثبات نرسیده است`,'BOUND_OPPORTUNITY_OBSERVATION'),
   entry('execution','اجرای مأموریت و Temporal','NOT_RUN','مدرک اجرای واقعی و انتهابه‌انتهای گردش‌کار در این گزارش ارائه نشده است','NO_EXECUTION_TRACE'),
   entry('outcome','ارزش شهری مستقل و قابل انتساب','BLOCKED','وجود فرصت مشاهده‌پذیر، گواهی ارزش یا بهره‌برداری نیست','NO_VERIFIED_OUTCOME'),
   entry('role-uat','آزمون حساب مستقل مدیرعامل پسماند','NOT_RUN','پذیرش مرورگری با کاربر منتسب و مجوز اجرایی مستقل هنوز اجرا نشده است','AUTHENTICATED_UAT_DEFERRED')
  ];
  return output('waste',items,null,{organizationId:orgId,visibleOpportunities:observed});
}
export function releaseInvariant(report){
 if(!report||report.finalGo!=='NO_GO'||report.authenticatedUat!=='NOT_RUN'||report.temporalExecutionVerified!==false||report.verifiedUrbanValue!==false||report.officialMappingCertified!==false||report.tally?.BLOCKED<1)unknown('INVALID_RELEASE_INVARIANT');
 return true;
}
