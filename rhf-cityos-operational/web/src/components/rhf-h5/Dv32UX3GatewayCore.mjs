// DV32UX3: UI-gateway authorization observations only; all backend authorization is enforced by DV32O/H/I.
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const DESKS=Object.freeze(['mayor','deputy','waste']);
export const CONFIG=Object.freeze({
  mayor:{title:'سیستم‌عامل شهردار',subtitle:'راهبری، حکمرانی و خلق ارزش شهری',icon:'🏛️',accent:'#1262b3',areas:['تصمیم‌های راهبردی و نظارت کلان','پایش ارزش‌آفرینی شهری','عملکرد معاونت‌ها و سازمان‌ها','دفتر شواهد و بررسی انسانی']},
  deputy:{title:'سیستم‌عامل معاونت خدمات شهری و محیط‌زیست',subtitle:'فرماندهی خدمات شهری و سازمان‌های وابسته',icon:'🏙️',accent:'#087e84',areas:['مدیریت سازمان‌ها و واحدهای زیرمجموعه','مأموریت‌های شهری و کیفیت خدمات','منابع، ناوگان و پیمانکاران','هماهنگی ایجنت‌ها و شواهد تصمیم']},
  waste:{title:'سیستم‌عامل مدیرعامل سازمان مدیریت پسماند',subtitle:'عملیات تخصصی سازمان مدیریت پسماند',icon:'♻️',accent:'#0b8060',areas:['جمع‌آوری، حمل و مدیریت پسماند','پردازش و بازیافت','ناوگان و قراردادهای پسماند','ایجنت تخصصی و دفتر شواهد سازمان']}
});
const ERR=(code)=>{throw new TypeError(code);};
export function createMatrixUrl(cityId,orgId=''){
 if(!UUID.test(cityId))ERR('INVALID_CITY_ID');
 if(orgId && !UUID.test(orgId))ERR('INVALID_ORGANIZATION_ID');
 const base=`/api/v1/cities/${encodeURIComponent(cityId)}/dv32o-access-matrix`;
 return base+(orgId?`?orgId=${encodeURIComponent(orgId)}`:'');
}
export function parseMatrix(report,cityId){
 if(!UUID.test(cityId)||report?.schema!=='RHF-DV32O-CURRENT-IDENTITY-ACCESS-MATRIX-v1'||
  report.scope?.municipalityId!==cityId||!UUID.test(report.scope?.tenantId||'')||
  report.controls?.readOnly!==true||report.controls?.roleImpersonation!==false||
  report.controls?.automaticIamGrants!==false||report.controls?.workflowStart!==false||
  report.controls?.fieldDispatch!==false||report.controls?.verifiedUrbanValue!==false||
  report.limits?.finalProductAcceptance!=='NOT_CERTIFIED'||
  report.limits?.browserRoleByRoleUat!=='NOT_RUN'||
  !Array.isArray(report.rows)||report.rows.length!==3)ERR('UNTRUSTED_ROLE_MATRIX');
 const out={};
 for(let i=0;i<3;i++){
  const r=report.rows[i];
  if(!r||r.desk!==DESKS[i]||!['ALLOWED','DENIED','SELECT_ORGANIZATION'].includes(r.discovery)||
   !['ALLOWED','DENIED','NOT_CHECKED'].includes(r.reviewQueue))ERR('UNTRUSTED_MATRIX_ROW');
  if(r.discovery!=='ALLOWED'&&r.reviewQueue!=='NOT_CHECKED')ERR('MATRIX_PERMISSION_INCONSISTENT');
  if(r.discovery==='ALLOWED'){
   if(!['ALLOWED','DENIED'].includes(r.reviewQueue)||
    (r.reviewQueue==='ALLOWED'&&r.canSubmitReview!==true)||
    (r.reviewQueue==='DENIED'&&r.canSubmitReview!==false)||
    !Number.isSafeInteger(r.candidateCount)||r.candidateCount<0||r.candidateCount>10)ERR('INCOMPLETE_DESK_ACCESS');
   if(r.desk==='waste'&&!UUID.test(r.organizationId||''))ERR('WASTE_DIRECTOR_REQUIRES_BINDING');
   if(r.desk!=='waste'&&r.organizationId)ERR('CROSS_DESK_SCOPE');
  }
  out[r.desk]={desk:r.desk,canOpen:r.discovery==='ALLOWED'&&r.reviewQueue==='ALLOWED',
   discovery:r.discovery,reviewQueue:r.reviewQueue,organizationId:r.organizationId||null,
   candidateCount:r.discovery==='ALLOWED'?r.candidateCount:null};
 }
 return {role:report.role,scope:{...report.scope},rows:out};
}
export function mayOpen(state,desk){return DESKS.includes(desk)&&state?.rows?.[desk]?.canOpen===true;}
export function scopedDeskUrl(cityId,desk,orgId){
 if(!UUID.test(cityId)||!DESKS.includes(desk))ERR('INVALID_DESK_SCOPE');
 if(desk==='waste'&&!UUID.test(orgId||''))ERR('ORGANIZATION_BINDING_REQUIRED');
 if(desk!=='waste'&&orgId)ERR('CITY_DESK_CANNOT_BORROW_ORGANIZATION');
 const q=new URLSearchParams({desk});if(orgId)q.set('orgId',orgId);
 return `/api/v1/cities/${encodeURIComponent(cityId)}/dv32h-agent-briefing?${q.toString()}`;
}
export function scopedQueueUrl(cityId,desk,orgId){
 return scopedDeskUrl(cityId,desk,orgId).replace('/dv32h-agent-briefing?','/dv32i-review-queue?');
}
export function summarizeReadOnly({discovery,queue,desk,cityId,tenantId,orgId}){
 if(!DESKS.includes(desk)||!UUID.test(cityId)||!UUID.test(tenantId))ERR('INVALID_SCOPE');
 const check=(s)=>s?.tenantId===tenantId&&s?.municipalityId===cityId&&(s?.organizationId||null)===(orgId||null);
 if(discovery?.schema!=='RHF-DV32H-EXECUTIVE-DISCOVERY-v1'||discovery.desk!==desk||discovery.readOnly!==true||
  !check(discovery.scope)||!Array.isArray(discovery.candidates)||discovery.candidates.length>10||
  discovery.truncated!==false||discovery.controls?.actionExecution!==false||discovery.controls?.verifiedUrbanValue!==false)
  ERR('UNTRUSTED_DISCOVERY');
 if(queue?.schema!=='RHF-DV32I-REVIEW-v1'||queue.desk!==desk||!check(queue.scope)||
  !Array.isArray(queue.reviews)||queue.reviews.length>100||
  queue.permission?.canSubmit!==true||queue.executionAuthorization!==false||queue.verifiedUrbanValue!==false)
  ERR('UNTRUSTED_HUMAN_REVIEW');
 return {candidates:discovery.candidates.length,reviews:queue.reviews.length,
   truncated:queue.truncated===true,manualApprovalIsOperational:false,verifiedUrbanValue:false};
}
