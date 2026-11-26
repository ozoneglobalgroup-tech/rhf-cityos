import React,{useEffect,useState} from 'react';
import {ShieldCheck,ChevronDown,ChevronUp,RefreshCcw,ArrowLeft,AlertTriangle,ClipboardList} from 'lucide-react';
import './pilot-finance-audit.css';
const KINDS=[['budgets','بودجه‌ها','budgets'],['contracts','قراردادها','contracts'],['costs','هزینه‌ها','execution'],['statements','صورت‌وضعیت‌ها','statements']];
const STATUSES={APPROVED:'مصوب',DRAFT:'پیش‌نویس',ACTIVE:'فعال',CLOSED:'پایان‌یافته',SUBMITTED:'ارسال‌شده',ACCEPTED:'پذیرفته‌شده',REJECTED:'برگشتی',CERTIFIED:'گواهی‌شده'};
const amounts=x=>{try{return new Intl.NumberFormat('fa-IR').format(BigInt(x))+' ریال'}catch{return 'مبلغ نامعتبر'}};
const fa=n=>new Intl.NumberFormat('fa-IR').format(n);
function EvidenceRow({row,kind,navigate}){
 const name=row.reference||row.title||row.description||'سند بدون عنوان';
 const ready=row.approval_check==='INDEPENDENT_CONFIRMED';
 const terminal=kind==='budgets'?row.status==='APPROVED':kind==='contracts'?['ACTIVE','CLOSED'].includes(row.status):kind==='costs'?row.status==='APPROVED':row.status==='CERTIFIED';
 const target=kind==='costs'?'execution':'finance';
 const jump=kind==='costs'?{kind:'recordId',value:row.case_id,label:'پرونده هزینه'}:{kind:'financeFocus',tab:kind,id:row.id,label:'سند مالی انتخابی'};
 return <div className="pfa-line" data-test="evidence-row">
  <div className="pfa-main"><b>{name}</b><small>{row.budget_code?'بودجه: '+row.budget_code+' · ':''}{row.contract_reference?'قرارداد: '+row.contract_reference+' · ':''}{STATUSES[row.status]||row.status} · {amounts(row.amount_rial)}</small></div>
  <div className="pfa-people"><span>ثبت‌کننده: <b>{row.created_by||'—'}</b></span><span>بازبین: <b>{row.reviewed_by||'ثبت نشده'}</b></span></div>
  <div className="pfa-result"><strong className={ready?'pfa-ok':terminal?'pfa-risk':'pfa-wait'}>{ready?'تأیید مستقل مستند':terminal?'نیازمند بررسی مغایرت':'در انتظار تکمیل'}</strong><button type="button" onClick={()=>navigate(target,jump)}>مشاهده رکورد <ArrowLeft size={14}/></button></div>
 </div>;
}
export default function PilotFinanceAudit({city,api,navigate}){
 const [expanded,setExpanded]=useState(false),[data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[nonce,setNonce]=useState(0),[active,setActive]=useState('budgets');
 useEffect(()=>{setData(null);setExpanded(false);setError('');setActive('budgets')},[city]);
 useEffect(()=>{if(!city||!expanded)return;let live=true;setLoading(true);setError('');setData(null);
  api(`/cities/${city}/pilot-finance-audit`).then(r=>{if(live)setData({...r,_city:city})}).catch(e=>{if(live)setError(e.message)}).finally(()=>{if(live)setLoading(false)});
  return()=>{live=false};
 },[api,city,expanded,nonce]);
 const scoped=data?._city===city?data:null;
 const record=scoped?.lists?.[active];
 return <section className="pfa" dir="rtl" aria-label="حسابرسی تأییدهای مستقل پایلوت">
  <header className="pfa-head"><div><span><ShieldCheck size={17}/> RHF · INDEPENDENT APPROVAL EVIDENCE</span><h3>کنترل شواهد واقعی تأیید مستقل</h3><p>ثبت‌کننده، بازبین و نتیجه کنترل استقلال در بودجه، قرارداد، هزینه و صورت‌وضعیت شهرداری انتخاب‌شده.</p></div><button type="button" onClick={()=>setExpanded(v=>!v)}>{expanded?<ChevronUp size={17}/>:<ChevronDown size={17}/>} {expanded?'بستن ممیزی':'بازکردن ممیزی'}</button></header>
  {expanded&&<>
   <div className="pfa-warning"><AlertTriangle size={16}/> این گزارش فقط خواندنی است. ثبت مرجع به معنی صحت قانونی آن نیست؛ گواهی، پرداخت نیست. نمایش اطلاعات همین شهرداری، به‌تنهایی آزمون دوکاربره جداسازی داده‌های مالی نیست.</div>
   <div className="pfa-menu">{KINDS.map(([key,label])=><button key={key} type="button" className={active===key?'current':''} aria-pressed={active===key} onClick={()=>setActive(key)}>{label}</button>)}<button type="button" disabled={loading} onClick={()=>setNonce(v=>v+1)}><RefreshCcw size={14}/> بازخوانی</button></div>
   {loading&&<p className="pfa-empty">در حال دریافت شواهد از پایگاه داده شهرداری…</p>}
   {error&&<p className="pfa-error" role="alert">خطای گزارش: {error}</p>}
   {record&&!loading&&<><div className="pfa-hint"><ClipboardList size={14}/> حداکثر {fa(record.limit)} سند اخیر؛ «تأیید مستقل مستند» صرفاً کنترل رکوردهای ثبت‌شده و هویت‌های متفاوت است.</div>
    {record.truncated&&<p className="pfa-warning">فهرست محدود به ۱۰۰ سند اخیر است؛ نتیجه، ممیزی همه سوابق نیست.</p>}
    {record.rows.length?<div className="pfa-list">{record.rows.map(row=><EvidenceRow row={row} kind={active} navigate={navigate} key={row.id}/>)}</div>:<p className="pfa-empty">هنوز سندی از این نوع در شهرداری انتخاب‌شده ثبت نشده است.</p>}</>}
  </>}
 </section>;
}
