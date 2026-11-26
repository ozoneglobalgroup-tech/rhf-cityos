import React,{useEffect,useState} from 'react';
import {ClipboardCheck,RefreshCcw,Search,ArrowLeft,ShieldCheck,AlertTriangle,Layers3,CheckCircle2,FileText,Route,Landmark,DatabaseZap,Download,ListTodo,Clock3,ArrowUpRight} from 'lucide-react';
import './acceptance-trace.css';
import {pilotCsv} from './pilot-actions-export.mjs';
import PilotFinanceAudit from './pilot-finance-audit.jsx';
const fa=n=>new Intl.NumberFormat('fa-IR').format(Number(n)||0);
const stages=[
 ['service_linked','خدمت مرتبط','services'],
 ['mission_done','مأموریت تکمیل‌شده','missions'],
 ['order_accepted','دستورکار پذیرفته‌شده','execution'],
 ['inspection_pass','آخرین بازرسی قبول','inspections'],
 ['cost_approved','هزینه تأییدشده مرتبط','execution'],
 ['approved_contract','قرارداد با بودجه مصوب','finance'],
 ['certified_chain','صورت‌وضعیت گواهی‌شده منطبق','finance'],
 ['closed_cases','پرونده مختومه','cases']
];
const statusName={RECEIVED:'دریافت‌شده',TRIAGED:'بررسی اولیه',ASSIGNED:'ارجاع‌شده',IN_PROGRESS:'در اجرا',AWAITING_ACCEPTANCE:'منتظر پذیرش',CLOSED:'مختومه',REJECTED:'ردشده'};
export default function AcceptanceTrace({city,cityName,api,access,navigate}){
 const [report,setReport]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[selected,setSelected]=useState(null),[filter,setFilter]=useState('all'),[q,setQ]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{if(!city)return;let alive=true;setReport(null);setError('');setSelected(null);setLoading(true);
  api(`/cities/${city}/acceptance-trace`).then(d=>{if(alive)setReport({...d,_city:city})}).catch(e=>{if(alive)setError(e.message)}).finally(()=>{if(alive)setLoading(false)});
  return()=>{alive=false};
 },[city,api,retry]);
 const reportCity=report?._city===city?report:null;
 const t=reportCity?.totals||{};
 const caseById=new Map((reportCity?.cases||[]).map(c=>[c.id,c]));
 const prioritized=(reportCity?.pilot?.queueIds||[]).map(id=>caseById.get(id)).filter(Boolean);
 const exportPilot=()=>{
  if(!reportCity||loading)return;
  const csv=pilotCsv({cases:reportCity.cases,cityName:cityName||'شهرداری انتخابی',asOf:reportCity.asOf,truncated:reportCity.truncated});
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=`RHF-CityOS-pilot-${city.slice(0,8)}-${reportCity.asOf.slice(0,10)}.csv`;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 };

 const cases=(reportCity?.cases||[]).filter(c=>(filter==='all'||(filter==='complete'?c.full_trace:!c.full_trace))&&(!q||`${c.summary} ${c.service_name} ${c.id}`.toLocaleLowerCase('fa').includes(q.toLocaleLowerCase('fa'))));
 const allowed=['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR','AUDITOR'].includes(access?.role);
 const go=(type,c)=>{
  if(type==='cases')return navigate('cases',{kind:'recordId',value:c.id,label:'پرونده انتخابی'});
  if(type==='execution')return navigate('execution',{kind:'recordId',value:c.id,label:'عملیات پرونده انتخابی'});
  if(type==='missions'||type==='inspections')return navigate(type,{kind:'caseId',value:c.id,label:'رکوردهای پرونده انتخابی'});
  return navigate(type);
 };
 if(access&&!allowed)return <div className="at-note" role="status">دسترسی به گزارش پذیرش مالی و عملیاتی برای نقش فعلی مجاز نیست.</div>;
 return <section className="at" dir="rtl" aria-label="ردیابی پذیرش عملیات">
  <header className="at-head"><div><span><ClipboardCheck size={17}/> OPERATIONAL PILOT ACCEPTANCE · v1.2.8</span><h2>پذیرش یکپارچه خدمات شهری</h2><p>{cityName||'شهرداری انتخابی'} — کنترل قابل ردیابی پرونده، مأموریت، دستورکار، هزینه و گواهی مالی</p></div><button type="button" disabled={loading} onClick={()=>setRetry(i=>i+1)}><RefreshCcw size={17}/> {loading?'در حال بررسی…':'بازخوانی'}</button></header>
  <div className="at-note"><ShieldCheck size={18}/><p>این صفحه فقط خواندنی است و هیچ رکوردی را تأیید یا مختومه نمی‌کند. یک زنجیره تنها زمانی «کامل» است که پیوند اسناد همان پرونده، دستورکار، قرارداد، هزینه و صورت‌وضعیت منطبق باشد. گواهی صورت‌وضعیت پرداخت نیست؛ ثبت پیامد نیز به معنای سود مالی محقق‌شده نیست.</p></div>
  {error&&<div className="at-error" role="alert">خطای دریافت داده: {error}</div>}
  {loading&&<div className="at-empty">در حال محاسبه وضعیت پرونده‌ها از پایگاه داده شهرداری…</div>}
  {reportCity&&!loading&&<>
   <div className="at-summary">
    <div><span>کل پرونده‌های ثبت‌شده</span><strong>{fa(t.cases)}</strong><small>تجمیع همه پرونده‌ها</small></div>
    <div><span>پرونده دارای دستورکار پذیرفته‌شده</span><strong>{fa(t.order_accepted)}</strong><small>وضعیت واقعی دستورکار</small></div>
    <div><span>گواهی مالی با زنجیره منطبق</span><strong>{fa(t.certified_chain)}</strong><small>گواهی، نه پرداخت</small></div>
    <div className="at-finished"><span>زنجیره کامل پذیرش</span><strong>{fa(t.full_trace)}</strong><small>۸ شرط عملیاتی و مالی</small></div>
   </div>
   <div className="at-panel at-pilot-panel" aria-label="صف اقدامات لازم پایلوت">
    <div className="at-panelhead"><div><h3><ListTodo size={18}/> اقدامات اولویت‌دار برای تکمیل زنجیره</h3><p>از میان حداکثر ۱۰۰ پرونده اخیر؛ موارد معوق در اولویت هستند. پیشنهاد اقدام مطابق پیش‌شرط‌های API است، نه ترتیب نمایش هشت معیار. این فهرست دستور اجرای خودکار نیست.</p></div><button type="button" onClick={exportPilot}><Download size={16}/> خروجی CSV مستندات نمایشی</button></div>
    <div className="at-pilot-stats"><span><Clock3 size={16}/> معوق در ۱۰۰ پرونده نمایشی: <b>{fa(reportCity.pilot?.overdueInDisplayed||0)}</b></span><span><AlertTriangle size={16}/> نیازمند بررسی پرونده نهایی: <b>{fa(reportCity.pilot?.terminalReviewInDisplayed||0)}</b></span><span><ShieldCheck size={16}/> زنجیره کامل در کل شهرداری: <b>{fa(t.full_trace)}</b></span></div>
    {reportCity.truncated&&<div className="at-warning">خروجی CSV و صف اقدام صرفاً ۱۰۰ پرونده اخیر را پوشش می‌دهند؛ شاخص‌های کلان تمام پرونده‌ها را شامل می‌شوند.</div>}
    {prioritized.length?<div className="at-action-list">{prioritized.slice(0,12).map(c=><div key={c.id} className="at-action-row"><div><b>{c.summary}</b><small>{c.service_name||'خدمت نامشخص'} · {fa(c.complete_count)} از ۸ شرط</small></div><div><strong>{c.pilot?.overdue?'معوق · ':''}{c.pilot?.title||'نیازمند بررسی'}</strong><small>{c.pilot?.detail}</small></div><div className="at-action-buttons"><button type="button" onClick={()=>{setSelected(c);document.getElementById('at-case-list')?.scrollIntoView({block:'start',behavior:'smooth'});}}>جزئیات</button><button type="button" onClick={()=>go(c.pilot?.target||'cases',c)}>میزکار <ArrowUpRight size={14}/></button></div></div>)}</div>:<div className="at-empty">در فهرست نمایشی، مورد ناقصی برای اقدام وجود ندارد. این نتیجه به معنی تأیید کل پرونده‌های شهرداری یا پرداخت نیست.</div>}
    {prioritized.length>12&&<div className="at-pilot-more">۱۲ اولویت اول نمایش داده شده‌اند. برای سایر موارد به فهرست رهگیری پایین مراجعه کنید.</div>}
   </div>
   <PilotFinanceAudit city={city} api={api} navigate={navigate}/>
   <div className="at-panel"><div className="at-panelhead"><div><h3>پوشش مراحل هشت‌گانه</h3><p>شمارنده‌ها از تمام پرونده‌های شهرداری محاسبه می‌شوند؛ مراحل الزاماً یک توالی زمانی اجباری برای هر نوع خدمت نیستند.</p></div><button onClick={()=>navigate('finance-control')}><Landmark size={16}/> کنترل مالی <ArrowLeft size={14}/></button></div>
    <div className="at-stage-grid">{stages.map(([key,name,target],i)=><button key={key} onClick={()=>navigate(target)}><span className="at-stage-index">{fa(i+1)}</span><b>{name}</b><strong>{fa(t[key])}</strong><small>از {fa(t.cases)} پرونده</small><span className="at-meter"><i style={{width:!t.cases?'0%':`${Math.min(100,100*t[key]/t.cases)}%`}}/></span></button>)}</div>
    <p className="at-secondary">ظرفیت رزروشده: {fa(t.capacity_reserved)} پرونده · پیامد تأییدشده: {fa(t.outcome_verified)} پرونده. این دو شاخص مکمل هستند و در هشت شرط اصلی لحاظ نشده‌اند.</p>
   </div>
   <div className="at-panel" id="at-case-list"><div className="at-panelhead"><div><h3>رهگیری پرونده به رکورد عملیاتی</h3><p>فهرست ۱۰۰ پرونده اخیر؛ شمارنده‌های بالا محدود به این فهرست نیستند.</p></div><div className="at-filters"><label><Search size={15}/><input placeholder="عنوان یا شناسه پرونده" value={q} onChange={e=>setQ(e.target.value)}/></label><select value={filter} onChange={e=>setFilter(e.target.value)} aria-label="فیلتر تکمیل زنجیره"><option value="all">تمام موارد نمایشی</option><option value="complete">زنجیره کامل</option><option value="incomplete">نیازمند تکمیل</option></select></div></div>
    {reportCity.truncated&&<div className="at-warning"><AlertTriangle size={16}/> فهرست به ۱۰۰ پرونده اخیر محدود شده است. برای جست‌وجوی همه پرونده‌ها از ماژول پرونده‌ها استفاده کنید.</div>}
    {cases.length?<div className="at-tablewrap"><table><thead><tr><th>پرونده</th><th>وضعیت پرونده</th><th>پیشرفت سندی</th><th>گام بعدی پایلوت</th><th>پذیرش</th><th>عملیات</th></tr></thead><tbody>{cases.map(c=><tr key={c.id}><td><button className="at-record" onClick={()=>setSelected(c)}>{c.summary}</button><small>{c.service_name||'خدمت مشخص نشده'}</small></td><td>{statusName[c.status]||c.status}</td><td><div className="at-smallmeter"><i style={{width:(c.complete_count/8*100)+'%'}}/></div><small>{fa(c.complete_count)} از ۸ شرط</small></td><td><span className="at-next-label">{c.pilot?.title||"—"}</span></td><td><span className={c.full_trace?'at-pass':'at-pending'}>{c.full_trace?'زنجیره کامل':'نیازمند بررسی'}</span></td><td><button className="at-open" onClick={()=>setSelected(c)}>ردیابی <ArrowLeft size={15}/></button></td></tr>)}</tbody></table></div>:<div className="at-empty">{t.cases===0?'هنوز پرونده‌ای در این شهرداری ثبت نشده است.':'پرونده‌ای مطابق فیلتر در ۱۰۰ ردیف نمایشی یافت نشد.'}</div>}
   </div>
   {selected&&<div className="at-panel at-detail"><div className="at-panelhead"><div><h3>ردیابی پرونده: {selected.summary}</h3><p>هر مرحله فقط از وضعیت و مستندات واقعی مرتبط با همین پرونده استخراج شده است.</p></div><button type="button" onClick={()=>setSelected(null)}>بستن ×</button></div><div className="at-checks">{stages.map(([key,name,target])=>{const ok=key==='closed_cases'?selected.status==='CLOSED':!!selected[key];return <button key={key} onClick={()=>go(target,selected)}><span className={ok?'at-checked':'at-missing'}>{ok?<CheckCircle2 size={18}/>:<AlertTriangle size={18}/>}</span><span><b>{name}</b><small>{ok?'شرط ثبت شده است':'ثبت نشده یا شروط زنجیره برقرار نیست'}</small></span><ArrowLeft size={16}/></button>})}</div><div className="at-next-detail"><b>اولویت پیشنهادی: {selected.pilot?.title||"بررسی پرونده"}</b><p>{selected.pilot?.detail||"مستندات را بررسی کنید."}</p></div><div className="at-detail-actions"><button onClick={()=>go('cases',selected)}><FileText size={16}/> پرونده</button><button onClick={()=>go('execution',selected)}><Route size={16}/> دستورکار و هزینه</button><button onClick={()=>go('finance',selected)}><Landmark size={16}/> دفتر مالی</button><button onClick={()=>navigate('capacity')}><DatabaseZap size={16}/> ظرفیت</button></div></div>}
   <footer className="at-footer"><Layers3 size={16}/> داده‌های شهرداری فعال · API نقش‌محور · صف و CSV محدود به ۱۰۰ پرونده اخیر · بدون اجرای عملیات، تأیید یا پرداخت خودکار</footer>
  </>}
 </section>;
}
