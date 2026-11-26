// v1.3.2 governed, read-only municipal case analysis: rule-directed tool orchestration.
// Agent recommendations are NOT executed actions, approved public value, or proof of autonomy.
import {createHash} from 'node:crypto';
export const AGENT_INTENTS=Object.freeze(['NEXT_SAFE_ACTION','CAPACITY_OPPORTUNITY','FINANCIAL_CONTROL']);
export const AGENT_ROLES=Object.freeze(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR']);
export const AGENT_READ_ROLES=Object.freeze([...AGENT_ROLES,'AUDITOR']);
export const TOOL_ALLOWLIST=Object.freeze(['read_service_case','read_execution_evidence','read_finance_evidence','read_value_capacity_evidence']);
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validatePlan(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('INVALID_INPUT');
 if(!ID.test(input.caseId||''))throw Error('INVALID_CASE_ID');
 if(!AGENT_INTENTS.includes(input.intent))throw Error('INVALID_INTENT');
 if(input.useModel!==undefined&&typeof input.useModel!=='boolean')throw Error('INVALID_MODEL_FLAG');
 if(input.externalConsent!==undefined&&typeof input.externalConsent!=='boolean')throw Error('INVALID_CONSENT');
 if(input.useModel===true&&input.externalConsent!==true)throw Error('CONSENT_REQUIRED');
 return {caseId:input.caseId,intent:input.intent,useModel:input.useModel===true,externalConsent:input.externalConsent===true};
}
export function canRunAgent(role){return AGENT_ROLES.includes(role);}
export function canReadAgent(role){return AGENT_READ_ROLES.includes(role);}
export function safeCount(v){const n=Number(v||0);return Number.isSafeInteger(n)&&n>=0?n:0;}
export function sha256(text){return createHash('sha256').update(text).digest('hex');}
export function planFromEvidence(source,intent){
 const c=source.case;const e=source.execution;const f=source.finance;const v=source.value;
 const facts=[];const steps=[];
 const push=(type,label,reason,where)=>steps.push({type,label,reason,where,requiresHuman:true});
 facts.push({label:'وضعیت پرونده',value:c.status});
 facts.push({label:'مأموریت تکمیل‌شده',value:safeCount(e.done_missions)});
 facts.push({label:'دستورکار پذیرفته‌شده',value:safeCount(e.accepted_orders)});
 facts.push({label:'نتیجه آخرین بازرسی',value:e.latest_inspection_result||'ثبت نشده'});
 facts.push({label:'قرارداد فعال متصل به دستورکار',value:safeCount(f.linked_active_contracts)});
 facts.push({label:'هزینه تأییدشده',value:safeCount(e.approved_costs)});
 facts.push({label:'صورت‌وضعیت گواهی‌شده',value:safeCount(f.certified_statements)});
 facts.push({label:'پیامد ارزش عمومی تأییدشده',value:safeCount(v.verified_outcomes)});
 if(c.status==='REJECTED'||(c.status==='CLOSED'&&(safeCount(e.done_missions)===0||safeCount(e.delivered_or_accepted)===0||e.latest_inspection_result!=='PASS')))push('REVIEW','بازبینی پرونده مختومه یا ردشده','وضعیت پرونده اجازه تغییر مستقیم یا جبران گذشته با دستورکار تازه را نمی‌دهد؛ بازبینی مستند و مسیر مجاز سازمانی لازم است','cases');
 else if(safeCount(e.done_missions)===0)push('MISSION','تکمیل مأموریت مرتبط','شاهد مأموریت تکمیل‌شده در این پرونده یافت نشد','missions');
 else if(safeCount(e.work_orders)===0)push('WORK_ORDER','ثبت و صدور دستورکار','مأموریت موجود است ولی دستورکاری برای پرونده ثبت نشده','execution');
 else if(safeCount(e.issued_or_delivered_or_accepted)===0)push('WORK_ORDER','صدور دستورکار پیش‌نویس','دستورکار موجود هنوز صادر نشده است','execution');
 else if(safeCount(e.delivered_or_accepted)===0)push('DELIVERY','ثبت تحویل مستند','دستورکار صادر شده ولی تحویل مستند ندارد','execution');
 else if(e.latest_inspection_result!=='PASS')push('INSPECTION','بررسی آخرین بازرسی و اصلاح نواقص','آخرین بازرسی موفق نیست؛ نتیجه بازرسی قدیمی مبنای اختتام نیست','inspections');
 else if(c.status!=='CLOSED')push('CASE','اختتام پرونده از مسیر مجاز','بازرسی موفق وجود دارد؛ شرایط کامل اختتام باید در API بررسی شود','cases');
 else if(safeCount(e.accepted_orders)===0)push('ACCEPTANCE','پذیرش مستقل دستورکار تحویل‌شده','پرونده مختومه است ولی دستورکار پذیرفته‌شده ندارد','execution');
 else if(safeCount(f.linked_active_contracts)===0)push('CONTRACT','اتصال دستورکار به قرارداد فعال','قرارداد فعال مرتبط با دستورکار پذیرفته‌شده پیدا نشد','finance');
 else if(safeCount(e.approved_costs)===0)push('COST','ثبت و تأیید مستقل هزینه مستند','هزینه تأییدشده برای پرونده وجود ندارد','execution');
 else if(safeCount(f.certified_statements)===0)push('STATEMENT','گواهی مستقل صورت‌وضعیت مستند','صورت‌وضعیت گواهی‌شده برای پرونده وجود ندارد؛ گواهی به معنی پرداخت نیست','finance');
 else push('VERIFY','سنجش و راستی‌آزمایی پیامد عمومی','زنجیره اسناد می‌تواند کامل باشد؛ هنوز باید پیامد نسبت به خط مبنا سنجیده شود','outcomes');
 if(intent==='CAPACITY_OPPORTUNITY'){
  push('CAPACITY','بررسی قابلیت استفاده از ظرفیت موجود',`منابع مجاز: ${safeCount(v.authorized_resources)}؛ پیشنهاد تطبیق بررسی‌شده: ${safeCount(v.feasible_matches)}؛ تطبیق به معنی تخصیص نیست`,'capacity');
 }
 if(intent==='FINANCIAL_CONTROL'){
  push('FINANCE','کنترل حدود تعهد و مستندات مالی',`بودجه مصوب مرتبط با قرارداد پیوسته: ${safeCount(f.linked_approved_budgets)}؛ صورت‌وضعیت گواهی‌شده پرداخت‌شده محسوب نمی‌شود`,'finance');
 }
 if(safeCount(v.verified_outcomes)===0)push('VALUE','تعریف خط مبنا و ثبت شواهد پیامد','تا تأیید مستقل پیامد، ارزش اقتصادی یا عمومی محقق‌شده ادعا نمی‌شود','urban-value');
 return {facts,steps:steps.slice(0,4),next:steps[0],notices:['توصیه‌ها برای بررسی انسان هستند و هیچ عملیات ثبت، تخصیص یا پرداخت انجام نشده است.','ابزارها صرفاً در شهرداری و نقش مجاز داده را خوانده‌اند؛ ممیزی مختصر جداگانه ثبت می‌شود.','گواهی صورت‌وضعیت، اثبات پرداخت یا منفعت تحقق‌یافته نیست.'],hasVerifiedPublicValue:safeCount(v.verified_outcomes)>0};
}
