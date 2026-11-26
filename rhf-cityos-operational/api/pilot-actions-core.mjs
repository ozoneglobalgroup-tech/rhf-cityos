// V1.2.7: Read-only, explainable pilot action prioritization.
// This is a pilot's documentary gap list, NOT a statutory checklist, approval, or payment.
export const PILOT_STEPS=Object.freeze([
 {key:'service_linked',title:'اتصال پرونده به خدمت',target:'cases',detail:'خدمت معتبر برای همین پرونده تعیین شود.'},
 {key:'mission_done',title:'تکمیل مأموریت مرتبط',target:'missions',detail:'مأموریت مربوط به همین پرونده اجرا و تکمیل شود.'},
 {key:'order_accepted',title:'پذیرش دستورکار اجرایی',target:'execution',detail:'برای همین پرونده دستورکار صادر، تحویل و به‌طور مجاز پذیرفته شود.'},
 {key:'inspection_pass',title:'ثبت بازرسی قبول',target:'inspections',detail:'آخرین بازرسی پرونده با نتیجه قابل قبول ثبت شود.'},
 {key:'cost_approved',title:'تأیید مستقل هزینه عملیات',target:'execution',detail:'هزینه مستند همان پرونده و دستورکار پذیرفته‌شده توسط بازبین مستقل تأیید شود.'},
 {key:'approved_contract',title:'اتصال قرارداد با بودجه مصوب',target:'finance',detail:'دستورکار به قرارداد معتبر و بودجه تصویب‌شده متصل شود.'},
 {key:'certified_chain',title:'گواهی صورت‌وضعیت منطبق',target:'finance',detail:'صورت‌وضعیت حاوی هزینه تأییدشده همان دستورکار، توسط بازبین مستقل گواهی شود؛ گواهی پرداخت نیست.'},
 {key:'closed_cases',title:'اختتام پرونده پس از پذیرش',target:'cases',detail:'پرونده از مسیر مجاز و با شواهد پذیرش مختومه شود.'}
]);
export const PILOT_KEYS=Object.freeze(PILOT_STEPS.map(x=>x.key));
export function stepPassed(c,key){return key==='closed_cases'?c.status==='CLOSED':key==='inspection_pass'?c.latest_inspection==='PASS':c[key]===true;}
export function isOverdue(c,asOf){
 if(!c?.due_at||['CLOSED','REJECTED'].includes(c.status))return false;
 const due=Date.parse(c.due_at),now=Date.parse(asOf);
 return Number.isFinite(due)&&Number.isFinite(now)&&due<now;
}
// The original eight gates measure documentary completeness. They are NOT an
// executable transition order. This planner follows the ACTUAL 1.2.7 API guards:
// deliver an order, finish missions, move to AWAITING_ACCEPTANCE, inspect PASS,
// CLOSE the case, and only THEN independently accept the delivered work order.
// A closed case may still legally have financial review steps outstanding.
export function nextPilotAction(c,asOf){
 const missing=PILOT_STEPS.filter(s=>!stepPassed(c,s.key)).map(s=>s.key);
 const overdue=isOverdue(c,asOf);
 const action=(code,title,detail,target,needsReview=false)=>({code,title,detail,target,missing,overdue,needsReview});
 if(!missing.length)return action('TRACE_COMPLETE','تمام شروط پایلوت برقرار است','تکمیل زنجیره مستند به معنی پرداخت یا منفعت مالی تحقق‌یافته نیست.','cases');
 if(c.status==='REJECTED')return action('TERMINAL_AUDIT','بازبینی پرونده ردشده','برای پرونده ردشده عملیات جدید ایجاد نکنید؛ فقط از فرایند مجاز بازبینی استفاده شود.','cases',true);
 const closed=c.status==='CLOSED';
 const audit=(why)=>action('TERMINAL_AUDIT','بازبینی پرونده مختومه با زنجیره ناقص',why,'cases',true);
 if(!c.service_linked)return closed?audit('پرونده مختومه است اما خدمت ثبت نشده؛ اصلاح فقط از مسیر مجاز حسابرسی انجام شود.')
  :action('service_linked','تعیین شناسنامه خدمت','پیش از ادامه، خدمت معتبر همین پرونده را بررسی و متصل کنید.','cases');
 if(!c.mission_done)return closed?audit('مأموریت تکمیل‌شده‌ای برای پرونده مختومه ثبت نشده است.')
  :action('mission_done','تکمیل مأموریت','مأموریت موجود را طبق گردش‌کار از PLANNED به ACTIVE و سپس DONE و با مستند واقعی تکمیل کنید.','missions');
 if(!c.order_issued)return closed?audit('برای پرونده مختومه صدور دستورکار جدید مجاز نیست؛ زنجیره باید حسابرسی شود.')
  :action('order_issued','ایجاد و صدور دستورکار','دستورکار همین پرونده و پیمانکار را ثبت کنید؛ سپس با شماره مرجع به ISSUED ببرید.','execution');
 // No artificial assumption that DELIVERED remains the current status after ACCEPTED.
 if(!c.order_delivered&&!c.order_accepted)return closed?audit('پرونده پیش از تحویل دستورکار بسته شده؛ به مسیر بازبینی ارجاع شود.')
  :action('order_delivery','تحویل دستورکار اجرایی','شواهد تحویل را ثبت و وضعیت دستورکار صادرشده را DELIVERED کنید.','execution');
 if(!closed){
  if(!['AWAITING_ACCEPTANCE'].includes(c.status))return action('case_to_acceptance','ارسال پرونده برای پذیرش','پرونده را با شواهد معتبر از مسیر وضعیت‌های مجاز تا AWAITING_ACCEPTANCE منتقل کنید؛ مأموریت باز نباید باقی بماند.','cases');
  if(c.latest_inspection!=='PASS')return action('inspection_pass','ثبت آخرین بازرسی قبول',c.latest_inspection==='FAIL'?'آخرین بازرسی مردود است؛ پس از رفع نقص، بازرسی جدید PASS ثبت کنید.':'بازرسی مستند PASS برای همین پرونده و در مرحله انتظار پذیرش ثبت کنید.','inspections');
  return action('case_close','اختتام مجاز پرونده','پس از بازرسی PASS، با یادداشت پذیرش و شواهد، پرونده را CLOSED کنید؛ پذیرش مستقل دستورکار پس از آن انجام می‌شود.','cases');
 }
 if(c.latest_inspection!=='PASS')return audit('پرونده مختومه است اما آخرین بازرسی قبول نیست؛ وضعیت را بدون بازبینی مجاز دستکاری نکنید.');
 if(!c.order_accepted)return action('order_accepted','پذیرش مستقل دستورکار','اکنون که پرونده CLOSED و آخرین بازرسی PASS است، بازبین دیگری دستورکار DELIVERED را با شواهد ACCEPTED کند.','execution');
 if(!c.approved_contract)return action('approved_contract','کنترل قرارداد دارای بودجه مصوب','بودجه تصویب‌شده، قرارداد فعال با تأیید مستقل و اتصال دستورکار به همان پیمانکار را بررسی کنید.','finance');
 if(!c.cost_approved)return action('cost_approved','تأیید مستقل هزینه مرتبط','هزینه واقعی/آزمایشی مستند همان دستورکار پذیرفته‌شده را ثبت، ارسال و با بازبین مستقل APPROVED کنید.','execution');
 if(!c.certified_chain)return action('certified_chain','صدور گواهی مستقل صورت‌وضعیت','هزینه APPROVED همین دستورکار را در صورت‌وضعیت مرتبط وارد، ارسال و با بازبین مستقل CERTIFIED کنید؛ گواهی پرداخت نیست.','finance');
 return audit('مدارک ظاهراً موجودند اما زنجیره کامل نیست؛ پیوندهای همان پرونده را حسابرسی کنید.');
}
export function pilotSummary(totals,records,asOf){
 const total=totals.cases;
 if(!Number.isSafeInteger(total)||total<0)throw Error('Invalid pilot total');
 const missing={};
 for(const s of PILOT_STEPS){
  const key=s.key; const got=Number(totals[key]);
  if(!Number.isSafeInteger(got)||got<0||got>total)throw Error('Invalid pilot stage count '+key);
  missing[key]=total-got;
 }
 const queue=records.filter(x=>!x.full_trace).map(c=>({...c,pilot:nextPilotAction(c,asOf)}));
 queue.sort((a,b)=>Number(b.pilot.overdue)-Number(a.pilot.overdue)||Number(a.pilot.needsReview)-Number(b.pilot.needsReview)||String(a.created_at||'').localeCompare(String(b.created_at||''))||String(a.id).localeCompare(String(b.id)));
 return {stageMissing:missing,queue,queueLimitedTo:100,queueTruncated:total>records.length,
  overdueInDisplayed:queue.filter(c=>c.pilot.overdue).length,
  terminalReviewInDisplayed:queue.filter(c=>c.pilot.needsReview).length,
  allCasesCount:total,asOf};
}
