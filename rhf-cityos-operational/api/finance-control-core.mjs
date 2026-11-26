// Pure and auditable financial read-model helpers. All currency values remain exact IRR strings.
export const FINANCE_CONTROL_ROLES=Object.freeze(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR','AUDITOR']);
export function numberRial(value){
 const s=String(value);if(!/^(0|[1-9][0-9]*)$/.test(s))throw new Error('Invalid unsigned rial aggregate');
 return BigInt(s);
}
export function ratioBps(part,whole){
 const n=numberRial(part),d=numberRial(whole);return d===0n?null:Number((10000n*n)/d);
}
export function budgetBalance(approved,committed){
 const a=numberRial(approved),c=numberRial(committed);
 return {availableRial:(a>=c?a-c:0n).toString(),oversubscribedRial:(c>a?c-a:0n).toString(),utilizationBps:ratioBps(c.toString(),a.toString())};
}
export function daysSince(iso,nowMs=Date.now()){
 const d=Date.parse(iso);return Number.isFinite(d)?Math.floor((nowMs-d)/86400000):null;
}
export function daysUntil(dateIso,nowMs=Date.now()){
 // Gregorian calendar date only, no local timezone interpretation or leap of ambiguity.
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(dateIso)))return null;
 const d=Date.parse(dateIso+'T00:00:00Z');if(!Number.isFinite(d))return null;
 const today=Date.UTC(new Date(nowMs).getUTCFullYear(),new Date(nowMs).getUTCMonth(),new Date(nowMs).getUTCDate());
 return Math.round((d-today)/86400000);
}
export function makeFinanceAlerts({budgets=[],contracts=[],statements=[],totals={},nowMs=Date.now()}){
 const alerts=[];
 const add=(type,priority,label,message,referenceId,financeTab)=>alerts.push({type,priority,label,message,referenceId,financeTab});
 for(const b of budgets){
  if(b.status!=='APPROVED')continue;
  const bal=budgetBalance(b.amount_rial,b.committed_rial);
  if(numberRial(bal.oversubscribedRial)>0n)add('BUDGET_OVER','CRITICAL',b.title,'تعهد ثبت‌شده از بودجه مصوب بیشتر است؛ بررسی سوابق ضروری است.',b.id,'budgets');
  else if(bal.utilizationBps!==null&&bal.utilizationBps>=9000)add('BUDGET_HIGH','WARNING',b.title,'حداقل ۹۰٪ بودجه مصوب به قراردادهای فعال یا بسته‌شده تعهد شده است.',b.id,'budgets');
 }
 for(const c of contracts){
  if(c.status!=='ACTIVE')continue;
  const remaining=daysUntil(c.end_date,nowMs);
  if(remaining!==null&&remaining<0)add('CONTRACT_EXPIRED','CRITICAL',c.reference,'تاریخ پایان قرارداد فعال سپری شده است.',c.id,'contracts');
  else if(remaining!==null&&remaining<=30)add('CONTRACT_ENDING','WARNING',c.reference,`تا پایان مدت قرارداد ${remaining} روز تقویمی باقی مانده است.`,c.id,'contracts');
  const util=ratioBps(c.linked_ceiling_rial,c.ceiling_rial);
  if(util!==null&&util>=9000)add('CONTRACT_COMMITTED','WARNING',c.reference,'حداقل ۹۰٪ سقف قرارداد به دستورکارهای متصل اختصاص یافته است.',c.id,'contracts');
 }
 for(const s of statements){
  if(s.status!=='SUBMITTED')continue;
  const age=daysSince(s.updated_at||s.created_at,nowMs);
  if(age!==null&&age>=7)add('STATEMENT_WAITING','WARNING',s.reference,`صورت‌وضعیت ${age} روز است در انتظار بررسی مانده است.`,s.id,'statements');
 }
 if(Number(totals.unlinked_order_count||0)>0)add('UNLINKED_ORDERS','INFO','دستورکارهای فاقد قرارداد',`${totals.unlinked_order_count} دستورکار صادرشده یا تحویل‌شده به قرارداد متصل نیست.`,null,'links');
 if(Number(totals.eligible_cost_count||0)>0)add('UNSTATEMENTED_COST','INFO','هزینه‌های تأییدشده بدون صورت‌وضعیت',`${totals.eligible_cost_count} هزینه تأییدشده در دستورکار پذیرفته‌شده و قرارداد فعال هنوز در صورت‌وضعیت نیست.`,null,'statements');
 const order={CRITICAL:0,WARNING:1,INFO:2};alerts.sort((a,b)=>order[a.priority]-order[b.priority]||a.label.localeCompare(b.label,'fa'));
 return alerts.slice(0,80);
}
