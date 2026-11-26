import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,CheckCircle2,ClipboardCheck,Database,Download,LockKeyhole,RefreshCw,ShieldAlert,ShieldCheck} from 'lucide-react';
import {ACCEPTANCE_VERSION,ACCEPTANCE_MANUAL_CASES,EXPECTED_TRAINING_RECORDS,EXPECTED_TRAINING_SCENARIOS,acceptanceProjection,acceptanceReport,verifyReadOnlyProbes} from './operational-acceptance-v8p40-core.mjs';
import './operational-acceptance-v8p40.css';
const E=x=>encodeURIComponent(String(x||''));
const fmt=x=>new Intl.NumberFormat('fa-IR').format(x);
export default function DeputyOperationalAcceptanceV8P40({city,board,api,onScenario=()=>{},onGovernance=()=>{}}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[probes,setProbes]=useState(null),[err,setErr]=useState(''),[done,setDone]=useState([]);
 const token=useRef(0);const projection=useMemo(()=>acceptanceProjection(board,city),[board,city]);
 useEffect(()=>{token.current++;setProbes(null);setDone([]);setErr('');setOpen(false);return()=>{token.current++}},[city]);
 async function checkApi(){
  const n=++token.current;setBusy(true);setErr('');setProbes(null);
  try{
   const url=`/cities/${E(city)}`;
   const [status,followups,history]=await Promise.all([api(`${url}/agent-status`),api(`${url}/agent-followups`),api(`${url}/agent-history`)]);
   const p=verifyReadOnlyProbes({status,followups,history},city);
   if(n!==token.current)return;
   if(!p.ok)throw Error('قرارداد API یا محدوده شهرداری تأیید نشد؛ نتیجه مثبت صادر نمی‌شود.');
   setProbes(p);
  }catch(e){if(n===token.current){setProbes(null);setErr(e?.message||'آزمون API فقط‌خواندنی ناموفق بود')}}
  finally{if(n===token.current)setBusy(false)}
 }
 function exportReport(){
  const report=acceptanceReport(projection,probes,done,new Date().toISOString());
  const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),href=URL.createObjectURL(blob),anchor=document.createElement('a');
  anchor.href=href;anchor.download=`RHF-V8P40-ACCEPTANCE-${String(city||'city').slice(0,36)}.json`;anchor.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
 }
 const report=acceptanceReport(projection,probes,done);
 return <section className="oa40" dir="rtl" data-rhf-operational-acceptance={ACCEPTANCE_VERSION} aria-label="دروازه پذیرش عملیاتی سیستم‌عامل معاونت">
  <div className="oa40-head"><div><small>OPERATIONAL EVIDENCE GATE / V8P4.0</small><h3>دروازه پذیرش و آمادگی عملیاتی</h3><p>بین «کد نصب‌شده»، «داده آموزشی واردشده»، «API پاسخ‌گو» و «آزمون عملی مستقل» تفاوت قائل می‌شویم.</p></div>
  <button type="button" onClick={()=>{if(open)token.current++;setOpen(x=>!x)}} aria-expanded={open}>{open?'بستن ارزیابی':'شروع بررسی پذیرش'} <ArrowLeft size={16}/></button></div>
  <div className="oa40-strip"><span><Database size={16}/> داده‌های محدود به شهرداری و سمت</span><span><LockKeyhole size={16}/> بدون تغییر در PostgreSQL</span><span><ShieldAlert size={16}/> تأیید نهایی: در انتظار ارزیابی مستقل</span></div>
  {!open?null:<div className="oa40-body">
   <div className="oa40-tiles">
    <div><small>پرونده‌های ذخیره‌شده دریافتی</small><strong>{projection.records===null?'—':fmt(projection.records)}</strong><span>آمار کل شهر نیست</span></div>
    <div><small>پرونده‌های سناریوی S01-S09</small><strong>{fmt(projection.scenarioRecords)} / {fmt(EXPECTED_TRAINING_RECORDS)}</strong><span>از کد ارجاع مصنوعی</span></div>
    <div><small>سناریوهای دارای رکورد</small><strong>{fmt(projection.scenarios)} / {fmt(EXPECTED_TRAINING_SCENARIOS)}</strong><span>وجود در داده دریافتی</span></div>
    <div><small>حوزه‌های دارای پرونده</small><strong>{fmt(projection.domains)} / ۱۱</strong><span>حوزه منطقی؛ نه سازمان حقوقی</span></div>
   </div>
   {projection.mode!=='SCOPED_SYNTHETIC'&&<p className="oa40-alert" role="alert">داده معتبر و هم‌دامنه دریافت نشده است؛ شاخص‌های پذیرش قابل تأیید نیستند.</p>}
   {projection.partial&&<p className="oa40-alert" role="alert">پاسخ API سقف ۲۰۰ رکورد دارد؛ وجود یا عدم وجود همه داده‌ها در کل شهرداری قابل استنتاج نیست.</p>}
   <div className="oa40-columns">
    <div className="oa40-card"><h4><ShieldCheck size={18}/> آزمون‌های خودکار صرفاً خواندنی</h4>
      <p>سه API ثبت وضعیت ایجنت، صف پیگیری و تاریخچه خوانده می‌شوند. هیچ تحلیل مولد، POST، PATCH یا اعزامی انجام نمی‌شود.</p>
      <button disabled={busy||!city} type="button" onClick={checkApi}><RefreshCw size={15}/> {busy?'در حال بررسی...':'اجرای آزمون قرارداد API'}</button>
      {err&&<p className="oa40-alert" role="alert">{err}</p>}
      {probes?.ok&&<p className="oa40-ok" role="status"><CheckCircle2 size={16}/> قرارداد پاسخ‌ها معتبر است؛ نقش API: {probes.role}، پیگیری‌های برگشتی: {fmt(probes.followups)}، رویدادهای برگشتی: {fmt(probes.history)}. این نتیجه، آزمون نفوذ یا اثبات RLS نیست.</p>}
      <div className="oa40-gates">{projection.claims.map(c=><div key={c.id}><span>{c.name}</span><code className={c.status==='OBSERVED'||c.status==='CONTRACT'?'oa40-softpass':'oa40-softwait'}>{c.status}</code></div>)}</div>
      {!projection.scenarioComplete&&<button type="button" className="oa40-sub" onClick={onScenario}>ورود به آزمایشگاه و ثبت اختیاری سناریوها <ArrowLeft size={15}/></button>}
      <button type="button" className="oa40-sub" onClick={onGovernance}>بررسی اختیارات و انتصاب‌ها <ArrowLeft size={15}/></button>
    </div>
    <div className="oa40-card"><h4><ClipboardCheck size={18}/> آزمون‌های دستی مرورگر و دو نقش</h4><p>موارد زیر صرفاً اظهارات آزمونگر هستند و بدون شواهد مستقل، وضعیت پذیرش نهایی را تغییر نمی‌دهند.</p>
      <div className="oa40-checklist">{ACCEPTANCE_MANUAL_CASES.map(x=><label key={x.id}><input type="checkbox" checked={done.includes(x.id)} onChange={e=>setDone(v=>e.target.checked?[...v,x.id]:v.filter(z=>z!==x.id))}/><span><b>{x.label}</b><small>شاهد لازم: {x.evidence}</small></span></label>)}</div>
    </div>
   </div>
   <div className="oa40-foot"><div><strong>وضعیت نهایی: PENDING INDEPENDENT REVIEW</strong><span>{fmt(report.manualReported)} از {fmt(ACCEPTANCE_MANUAL_CASES.length)} آزمون دستی علامت‌گذاری شده‌اند. هیچ عددی به‌عنوان منفعت عمومی تحقق‌یافته اعلام نشده است.</span></div>
    <button type="button" onClick={exportReport}><Download size={17}/> خروجی JSON شواهد پذیرش</button></div>
  </div>}
 </section>;
}
