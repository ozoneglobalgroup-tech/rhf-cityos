// DV32UX13-15: evidence inventory, NEVER independently certified value or official mission mapping.
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const REQUIRED_DOMAINS=Object.freeze([
 ['sanitation','نظافت و پاکیزگی شهری'],['waste','مدیریت پسماند و بازیافت'],
 ['green','فضای سبز و باغات'],['beautification','زیباسازی و منظر شهری'],
 ['cemetery','آرامستان‌ها'],['markets','میادین و ساماندهی مشاغل'],
 ['environment','محیط‌زیست و پایش آلودگی'],['safety','خدمات عمومی و ایمنی'],
 ['fleet','ناوگان و ماشین‌آلات'],['contractors','مدیریت پیمانکاران'],
 ['citizens','آموزش و مشارکت شهروندی'],['planning','برنامه‌ریزی و پشتیبانی']
 ].map(([id,title])=>Object.freeze({id,title,verifiedBinding:false})));
const fail=x=>{throw Error(x)};
const int=(n,label)=>{const x=Number(n);if(!Number.isSafeInteger(x)||x<0||x>100000000)fail('INVALID_COUNT_'+label);return x};
export function requestBoundary({method,resourceId,url}){
 if(method!=='GET'||resourceId||[...url.searchParams].length)fail('READ_ONLY_UNPARAMETERIZED');
}
export function roleBoundary(city,role,user){
 if(!UUID.test(city?.id)||!UUID.test(city?.tenant_id)||!UUID.test(user?.id)||
 !['MUNICIPAL_ADMIN','DEPUTY','MAYOR'].includes(role))fail('CITY_IDENTITY_DENIED');
}
export function buildReport(city,counts,units,role){
 const keys=['units','activeUnits','services','activeServices','missionSlots','attestedMissionSlots',
 'realDraftCases','independentlyApprovedReviews','planningDrafts','workOrders','clearedWorkOrders','handoffIntents'];
 const safe={};for(const k of keys)safe[k]=int(counts?.[k]??counts?.[k.toLowerCase()],k);
 if(safe.activeUnits>safe.units||safe.activeServices>safe.services||safe.attestedMissionSlots>safe.missionSlots||
 safe.clearedWorkOrders>safe.workOrders||safe.missionSlots>17)fail('COUNTER_INCONSISTENCY');
 if(!Array.isArray(units)||units.length>101)fail('TOO_MANY_UNITS');
 const seen=new Set(),items=units.slice(0,100).map(u=>{
  if(!UUID.test(u?.id)||seen.has(u.id)||typeof u.code!=='string'||u.code.length>70||
  typeof u.name_fa!=='string'||u.name_fa.length>170||typeof u.active!=='boolean')fail('INVALID_UNIT');
  seen.add(u.id);const activeServices=int(u.active_services,'active_services');
  return {id:u.id,code:u.code,name:u.name_fa,active:u.active,activeServices};
 });
 const gates=[
  {id:'source',title:'مرجع رسمی ۱۷ مأموریت',observed:safe.attestedMissionSlots,required:17,independentlyVerified:false},
  {id:'catalog',title:'واحد و خدمت فعال واقعی',observed:safe.activeServices,required:null,independentlyVerified:false},
  {id:'cases',title:'پرونده‌های واقعی اولیه',observed:safe.realDraftCases,required:null,independentlyVerified:false},
  {id:'reviews',title:'بررسی‌های مستقل تأییدشده',observed:safe.independentlyApprovedReviews,required:null,independentlyVerified:false},
  {id:'planning',title:'برگه‌های برنامه‌ریزی',observed:safe.planningDrafts,required:null,independentlyVerified:false},
  {id:'handoff',title:'درخواست‌های تحویل به اپراتور',observed:safe.handoffIntents,required:null,independentlyVerified:false}
 ];
 return {schema:'RHF-DV32UX13-15-PORTFOLIO-EVIDENCE-v1',scope:{municipalityId:city.id,tenantId:city.tenant_id},
   role,asOf:new Date().toISOString(),counts:safe,units:items,unitsTruncated:units.length>100,
   targetDomains:REQUIRED_DOMAINS,gates,controls:{readOnly:true,authorizedCrossCity:false,officialMissionMappingCertified:false,
     domainBindingsVerified:false,verifiedUrbanValue:false,verifiedValueAmount:null,temporalStarted:false,
     fieldDispatch:false,finalProductAcceptance:'NOT_CERTIFIED'},finalGo:'NO_GO'};
}
export function readReport(r,{cityId,tenantId}){
 if(r?.schema!=='RHF-DV32UX13-15-PORTFOLIO-EVIDENCE-v1'||r.scope?.municipalityId!==cityId||
 r.scope?.tenantId!==tenantId||r.finalGo!=='NO_GO'||r.controls?.readOnly!==true||
 r.controls?.officialMissionMappingCertified!==false||r.controls?.domainBindingsVerified!==false||
 r.controls?.verifiedUrbanValue!==false||r.controls?.verifiedValueAmount!==null||
 r.controls?.temporalStarted!==false||r.controls?.fieldDispatch!==false||
 r.controls?.finalProductAcceptance!=='NOT_CERTIFIED'||!Array.isArray(r.gates)||r.gates.length!==6||
 !Array.isArray(r.targetDomains)||r.targetDomains.length!==12||!Array.isArray(r.units)||r.units.length>100)
 fail('UNTRUSTED_EVIDENCE_REPORT');
 for(const [key,val] of Object.entries(r.counts||{}))int(val,key);
 for(const g of r.gates){if(g.independentlyVerified!==false||!['source','catalog','cases','reviews','planning','handoff'].includes(g.id))fail('FALSE_VALUE_ATTESTATION');int(g.observed,g.id)}
 for(const d of r.targetDomains)if(d.verifiedBinding!==false)fail('FALSE_DOMAIN_MAPPING');
 return r;
}
export function routeFor({cityId,tenantId,desk,tab,orgId}){
 if(!UUID.test(cityId)||!UUID.test(tenantId))fail('INVALID_SCOPE');
 if(desk==='waste'){
  if(tab!=='organization-assurance'||!UUID.test(orgId||''))fail('WASTE_BINDING_REQUIRED');
  return `/api/v1/cities/${cityId}/dv32l-governed-readiness?desk=waste&orgId=${orgId}`;
 }
 if(orgId||!['mayor','deputy'].includes(desk)||
 (tab!=='value-evidence'&&!(desk==='deputy'&&tab==='domain-coverage')))fail('CROSS_DESK_SCOPE');
 return `/api/v1/cities/${cityId}/dv32ux13-portfolio-evidence`;
}
