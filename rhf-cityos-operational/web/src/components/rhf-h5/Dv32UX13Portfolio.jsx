// Evidence-grade role desk: the cards and charts represent counts, not certified urban value.
import React,{useCallback,useEffect,useState} from 'react';
import {routeFor,readReport,REQUIRED_DOMAINS} from './Dv32UX13PortfolioCore.mjs';
import {safePipeline} from './Dv32UX5SpecialistCore.mjs';
const fa=n=>new Intl.NumberFormat('fa-IR').format(Number(n)||0);
const labels={
 'domain-coverage':['پوشش سازمان‌ها و خدمات','ماتریس دامنه‌های تخصصی، بر اساس فهرست واقعی سازمان‌ها و خدمات'],
 'value-evidence':['زنجیره شواهد ارزش شهری','شواهد قابل مشاهده؛ بدون ادعای ارزش اقتصادی یا تأیید رسمی'],
 'organization-assurance':['اطمینان از محدوده پسماند','شواهد و گردش‌کار سازمان منتسب به حساب جاری']
};
async function receive(url,signal){const r=await fetch(url,{credentials:'same-origin',cache:'no-store',signal});const j=await r.json().catch(()=>null);
 if(!r.ok)throw Error(typeof j?.error==='string'?j.error:`HTTP ${r.status}`);return j;}
function Stat({label,value,note}){return <article className="ux13-stat"><div className="ux13-stat-label">{label}</div><strong>{fa(value)}</strong>{note&&<small>{note}</small>}</article>}
function TrustTag(){return <span className="ux13-tag" role="status">شواهد مشاهده‌ای • تأیید نهایی نشده</span>}
export default function Dv32UX13Portfolio({desk,tab,cityId,tenantId,orgId}){
 const [report,setReport]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=useCallback(async(signal)=>{
  setLoading(true);setReport(null);setError('');
  try{const url=routeFor({cityId,tenantId,desk,tab,orgId});const raw=await receive(url,signal);
   const safe=desk==='waste'?safePipeline(raw,{cityId,tenantId,desk,tab:'temporal-observation',orgId}):readReport(raw,{cityId,tenantId});
   if(!signal.aborted)setReport(safe);
  }catch(e){if(!signal.aborted)setError(String(e.message||e))}finally{if(!signal.aborted)setLoading(false)}
 },[cityId,tenantId,desk,tab,orgId]);
 useEffect(()=>{const c=new AbortController();load(c.signal);return()=>c.abort()},[load]);
 const [name,subtitle]=labels[tab]||['پایش شواهد',''];
 const waste=desk==='waste',c=report?.counts;
 return <section className="rhf-ux-module ux13-surface" dir="rtl" aria-labelledby="ux13-title">
  <div className="ux13-hero"><div><span className="ux13-eyebrow">RUVOS / EVIDENCE INTELLIGENCE</span>
   <h2 id="ux13-title">{name}</h2><p>{subtitle}</p></div><TrustTag/></div>
  {loading&&<p className="ux13-loading" role="status">در حال دریافت داده‌های احرازشده و کنترل محدوده…</p>}
  {error&&<div role="alert" className="ux13-error">دسترسی یا اعتبار داده تأیید نشد: <code>{error}</code> <p>اطلاعات این محدوده نمایش داده نمی‌شود؛ دسترسی را از مدیر سامانه پیگیری کنید.</p></div>}
  {report&&!loading&&!error&&waste&&<>
   <div className="ux13-stats"><Stat label="فرصت‌های مجاز سازمان" value={report.entries.length}/><Stat label="فرصت‌های قابل مشاهده" value={report.entries.filter(x=>x.canObserve).length}/></div>
   <div className="ux13-panel"><h3>فرصت‌ها در محدوده سازمان منتسب</h3>
    {report.entries.length?report.entries.map(x=><div className="ux13-line" key={x.candidateId}><div><b>{x.title||x.candidateId}</b><small>{x.reviewStatus||'فاقد تصمیم معتبر'}</small></div><span className="ux13-tag">{x.canObserve?'فقط مشاهده Temporal':'غیرمجاز برای مشاهده Temporal'}</span></div>):<p className="ux13-empty">در محدوده مجاز فعلی فرصتی وجود ندارد.</p>}
    <p className="ux13-note">این صفحه فقط گزارش DV32L را نمایش می‌دهد؛ ایجاد مأموریت یا آغاز Temporal انجام نمی‌شود.</p></div></>}
  {report&&!loading&&!error&&!waste&&<>
   <div className="ux13-stats"><Stat label="واحدهای سازمانی فعال" value={c.activeUnits}/><Stat label="خدمات فعال" value={c.activeServices}/>
    <Stat label="نگاشت‌های بررسی‌شده انسانی" value={c.attestedMissionSlots} note="از ۱۷ جایگاه؛ نه تأیید رسمی"/>
    <Stat label="دستورکارهای پیشنهادی" value={c.workOrders}/></div>
   {tab==='domain-coverage'?<>
    <div className="ux13-panel"><div className="ux13-section"><h3>دامنه‌های مورد انتظار معاونت</h3><span className="ux13-tag">۱۲ دسته راهنما • ارتباط رسمی تأیید نشده</span></div>
     <div className="ux13-domains">{REQUIRED_DOMAINS.map((d,i)=><article className="ux13-domain" key={d.id}>
      <span className="ux13-domain-icon" aria-hidden="true">{String(i+1).padStart(2,'0')}</span><div><b>{d.title}</b><small>انتساب سازمان یا خدمت هنوز تأیید نشده</small></div>
      </article>)}</div><p className="ux13-note">این فهرست یک چارچوب تکمیلی است و نشان‌دهنده وجود یا فعال‌بودن واقعی هر سازمان در شهرداری انتخاب‌شده نیست.</p></div>
    <div className="ux13-panel"><div className="ux13-section"><h3>واحدهای ثبت‌شده واقعی</h3><span>{fa(report.units.length)} ردیف قابل مشاهده</span></div>
     {report.units.length?<div className="ux13-table-wrap"><table className="ux13-table"><thead><tr><th scope="col">نام واحد</th><th scope="col">کد</th><th scope="col">وضعیت</th><th scope="col">خدمات فعال</th></tr></thead><tbody>
      {report.units.map(u=><tr key={u.id}><td>{u.name}</td><td dir="ltr">{u.code}</td><td><span className={'ux13-pill '+(u.active?'ux13-on':'ux13-off')}>{u.active?'فعال':'غیرفعال'}</span></td><td>{fa(u.activeServices)}</td></tr>)}</tbody></table></div>:<p className="ux13-empty">هنوز واحد سازمانی واقعی در این محدوده ثبت نشده است.</p>}
     {report.unitsTruncated&&<p className="ux13-note">فهرست به ۱۰۰ واحد محدود شده است؛ جمع کل در کارت‌های بالا مستقل محاسبه می‌شود.</p>}</div>
    </>:<>
    <div className="ux13-panel"><div className="ux13-section"><h3>زنجیره شواهد از داده واقعی</h3><span className="ux13-tag">هیچ مرحله‌ای تأیید نهایی ارزش محسوب نمی‌شود</span></div>
     <div className="ux13-gates">{report.gates.map((g,i)=><div className="ux13-gate" key={g.id}><span className="ux13-order">{String(i+1).padStart(2,'0')}</span>
      <div className="ux13-gate-body"><b>{g.title}</b><div className="ux13-bar" role="img" aria-label={`${g.title}: ${fa(g.observed)} مشاهده؛ راستی‌آزمایی نشده`}><span style={{width:`${Math.max(0,Math.min(100,g.required?100*g.observed/g.required:g.observed?80:0))}%`}}/></div></div>
      <span className="ux13-gate-number">{fa(g.observed)}<small>مشاهده</small></span></div>)}</div>
     <p className="ux13-note">مقیاس نوارها فقط دیداری است؛ به‌جز ۱۷ جایگاه مأموریت، مخرج سنجش عملکرد تعریف نشده و درصد پیشرفت یا تحقق ارزش نیست.</p></div>
    <div className="ux13-panel"><h3>مرز اعتبار</h3><p>وجود پرونده، تصمیم یا تحویل به اپراتور به معنی تحقق ارزش شهری نیست. برای ادعای ارزش، خط مبنا، مشاهده پس از اقدام، منشأ داده قابل‌ردیابی و تأیید مستقل لازم است.</p></div>
    </>}
   <p className="ux13-footnote">زمان تهیه گزارش: <time dateTime={report.asOf}>{new Date(report.asOf).toLocaleString('fa-IR')}</time> • فقط خواندنی • وضعیت انتشار NO_GO</p>
  </>}
 </section>;
}
