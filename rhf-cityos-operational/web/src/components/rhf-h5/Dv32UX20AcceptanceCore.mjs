// DV32UX20: Read-only acceptance views. UI observations are NOT certified UAT.
import {UUID,DESKS,checkedAccess} from './Dv32UX4RouterCore.mjs';
export const ALL_DESKS=DESKS;
export const REQUIRED_HUMAN_GATES=Object.freeze([
 {id:'three_role_browser_uat',title:'ورود و گردش مستقل سه نقش',status:'NOT_RUN',detail:'سه نشست احرازشده با حساب‌های مجزا باید آزمون شوند.'},
 {id:'multi_actor_case_chain',title:'گردش پرونده با چند امضای مستقل',status:'NOT_RUN',detail:'ثبت، بررسی، برنامه‌ریزی و تحویل با اشخاص مختلف هنوز آزمون پذیرش نشده است.'},
 {id:'temporal_human_workflow',title:'اجرای تأییدشده Workflow در Temporal',status:'NOT_RUN',detail:'آمادگی Worker با اجرای Workflow واقعی یکسان نیست.'},
 {id:'agentic_end_to_end',title:'تحلیل ایجنت با شواهد و مجوز انسانی',status:'NOT_RUN',detail:'ایجنت‌ها باید در آزمایش مستقل و بدون اجرای خودکار تأیید شوند.'},
 {id:'cross_tenant_adversarial',title:'آزمون مهاجم با حساب شهرداری دوم',status:'NOT_RUN',detail:'آزمون ناشناس، جایگزین آزمون دسترسی احرازشده بین‌شهرداری نیست.'},
 {id:'restore_drill',title:'تمرین بازیابی جدا از تولید',status:'NOT_RUN',detail:'بررسی فهرست پشتیبان، اثبات بازیابی موفق نیست.'},
 {id:'performance_load',title:'آزمون بار و کارایی',status:'NOT_RUN',detail:'اندازه‌گیری پاسخ healthz، آزمون بار نیست.'},
 {id:'wcag_browser_qa',title:'بازبینی WCAG و کیفیت رابط در مرورگر',status:'NOT_RUN',detail:'ساخت CSS واکنش‌گرا، اثبات دسترس‌پذیری کامل نیست.'},
 {id:'mission_reference_official',title:'نگاشت رسمی ۱۷ مأموریت',status:'BLOCKED',detail:'مرجع رسمی و تصمیم مستقل باید مستند باشد.'},
 {id:'verified_urban_value',title:'اثبات مستقل خلق ارزش شهری',status:'BLOCKED',detail:'Baseline و Outcome و تأیید مستقل کامل نشده‌اند.'},
]);
export function localScope({desk,cityId,tenantId,orgId,matrix}){
 if(!DESKS.includes(desk)||!UUID.test(cityId)||!UUID.test(tenantId)||matrix?.scope?.tenantId!==tenantId||
 !checkedAccess(matrix,cityId,desk,desk==='waste'?orgId||'':''))throw Error('SCOPE_OR_ROLE_NOT_VERIFIED');
 if(desk==='waste'&&(!UUID.test(orgId||'')||matrix.rows.waste.organizationId!==orgId))throw Error('WASTE_BINDING_REQUIRED');
 if(desk!=='waste'&&orgId)throw Error('CITY_SCOPE_CANNOT_BORROW_ORG');
 return {desk,cityId,tenantId,organizationId:desk==='waste'?orgId:null};
}
export function validateHealth(payload){
 if(payload?.status!=='ok'||typeof payload.service!=='string'||!payload.service.startsWith('RHF City OS'))throw Error('HEALTH_RESPONSE_NOT_TRUSTED');
 return {status:'OBSERVED',detail:'Endpoint پاسخ معتبر داد؛ این نتیجه آزمون عملکرد یا تأیید کاربردی نیست.'};
}
export function acceptanceSnapshot(scope,{healthOk=false,matrixOk=false,chainObserved=false}={}){
 if(!scope||!DESKS.includes(scope.desk)||!UUID.test(scope.cityId)||!UUID.test(scope.tenantId))throw Error('INVALID_SCOPE');
 const live=[
  {id:'current_identity_scope',title:'ماتریس نقش و محدوده فعلی',status:matrixOk?'PASS':'NOT_RUN',detail:'فقط وضعیت همین حساب و محدوده انتخاب‌شده؛ نه آزمون سه حساب.'},
  {id:'app_health_live',title:'سلامت HTTP عملیاتی',status:healthOk?'OBSERVED':'NOT_RUN',detail:'مشاهده پاسخ healthz؛ نه آزمون بار.'},
 ];
 if(scope.desk!=='waste')live.push({id:'case_chain_readonly',title:'خواندن زنجیره پرونده در شهر مجاز',status:chainObserved?'OBSERVED':'NOT_RUN',detail:'مشاهده API؛ نه اثبات گردش کامل چند کاربر.'});
 return {schema:'RHF-DV32UX20-BROWSER-OBSERVATION-v1',desk:scope.desk,decision:'NO_GO',
  notes:'Browser-local read-only observation, not independent acceptance or an authorization to deploy.',
  gates:[...live,...REQUIRED_HUMAN_GATES],verifiedUrbanValue:false,fieldDispatch:false,temporalExecution:false};
}
export function countStatuses(gates){
 const acc={PASS:0,OBSERVED:0,BLOCKED:0,NOT_RUN:0,FAIL:0};
 for(const g of gates){if(!(g.status in acc))throw Error('UNKNOWN_GATE_STATUS');acc[g.status]++;}
 return acc;
}
