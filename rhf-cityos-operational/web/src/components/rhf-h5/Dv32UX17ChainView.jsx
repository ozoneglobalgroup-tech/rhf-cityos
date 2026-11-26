import React,{useEffect,useMemo,useState} from 'react';
import {endpoint,safeChain,steps,UUID} from './Dv32UX17ChainViewCore.mjs';
import './Dv32UX17ChainView.css';
const title='ممیزی زنجیره پرونده‌های واقعی';
const badges=[['sampled','پرونده‌های بررسی‌شده'],['reviewed','بررسی مستقل'],['planning','برنامه‌ریزی'],['cleared','دستورکار تأییدشده'],['handoffIntents','درخواست تحویل'],['stale','شواهد منسوخ']];
export default function Dv32UX17ChainView({desk,cityId,tenantId,orgId}){
 const [state,setState]=useState({busy:true,error:'',data:null});const [active,setActive]=useState('all');
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{
  let cancelled=false;const controller=new AbortController();
  if(!['deputy','mayor'].includes(desk)||!UUID.test(cityId)||!UUID.test(tenantId)||orgId){setState({busy:false,error:'دسترسی این گزارش صرفاً برای میزکار شهردار یا معاونت مجاز است.',data:null});return;}
  setState({busy:true,error:'',data:null});
  (async()=>{
   try{
    const response=await fetch(endpoint(cityId,desk,orgId),{credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{accept:'application/json'}});
    if(!response.ok)throw Error('عدم دسترسی یا عدم امکان دریافت داده‌های مجاز ('+response.status+')');
    const payload=await response.json();const parsed=safeChain(payload,{cityId,tenantId,desk});
    if(!cancelled)setState({busy:false,error:'',data:parsed});
   }catch(e){if(!cancelled&&e.name!=='AbortError')setState({busy:false,error:e.message||'گزارش قابل اعتبارسنجی نیست.',data:null});}
  })();return()=>{cancelled=true;controller.abort();};
 },[desk,cityId,tenantId,orgId,refresh]);
 const rows=useMemo(()=>!state.data?[]:state.data.entries.filter(x=>active==='all'||(active==='stale'?x.staleEvidence:active==='handoff'?x.operatorIntentCurrent:!x.staleEvidence)),[state.data,active]);
 return <section dir="rtl" className="rhfux17" aria-label={title}>
  <header className="rhfux17__hero"><div className="rhfux17__eyebrow">RHF CITY OS · EVIDENCE ASSURANCE / UX17</div>
   <div className="rhfux17__hero-main"><div><h2>{title}</h2><p>تطبیق شواهد از ثبت پرونده تا درخواست تحویل به اپراتور؛ بدون صدور مجوز اجرای میدانی</p></div>
   <button className="rhfux17__refresh" type="button" disabled={state.busy} onClick={()=>setRefresh(n=>n+1)}>↻ بازخوانی امن داده‌ها</button></div>
   <div className="rhfux17__safety"><span>فقط‌خواندنی</span><span>محدوده شهرداری احرازشده</span><span>اجرای Temporal: اثبات‌نشده</span><span>انتشار: NO_GO</span></div>
  </header>
  <div className="rhfux17__steps" aria-label="مراحل زنجیره پرونده">{steps.map((s,i)=><div key={s} className="rhfux17__step"><b>{String(i+1).padStart(2,'0')}</b><span>{s}</span></div>)}</div>
  {state.busy&&<div className="rhfux17__message" role="status">در حال دریافت شواهد از سامانه عملیاتی…</div>}
  {state.error&&<div className="rhfux17__message rhfux17__message--error" role="alert">{state.error} — هیچ نتیجه‌ای تأییدشده تلقی نمی‌شود.</div>}
  {state.data&&<>
   <div className="rhfux17__stats">{badges.map(([key,label])=><div key={key} className="rhfux17__stat"><span>{label}</span><strong>{state.data.stats[key].toLocaleString('fa-IR')}</strong><small>{key==='handoffIntents'?'فقط درخواست، نه اجرای Temporal':key==='stale'?'نیازمند بررسی مجدد':'شواهد نقطه‌ای پایگاه داده'}</small></div>)}</div>
   <div className="rhfux17__toolbar"><h3>ردیابی پرونده‌ها <span>({state.data.entries.length.toLocaleString('fa-IR')})</span></h3><div className="rhfux17__filters" aria-label="فیلتر پرونده‌ها">{[['all','همه'],['current','شواهد جاری'],['stale','نیازمند بازبینی'],['handoff','درخواست تحویل']].map(([id,label])=><button key={id} type="button" aria-pressed={active===id} onClick={()=>setActive(id)}>{label}</button>)}</div></div>
   {state.data.truncated&&<p role="status" className="rhfux17__notice">فقط ۴۰ پرونده اخیر برای این گزارش بررسی شده‌اند؛ این شمارش، مجموع کل شهر نیست.</p>}
   {!rows.length&&<div className="rhfux17__empty">در این محدوده و فیلتر، پرونده قابل نمایش وجود ندارد. نبود رکورد به معنی پایان مأموریت نیست.</div>}
   <div className="rhfux17__list">{rows.map(x=><article key={x.caseId} className="rhfux17__item"><div className="rhfux17__itemtop"><h4>{x.summary||'پرونده بدون عنوان'}</h4><span className={'rhfux17__tag rhfux17__tag--'+(x.staleEvidence?'stale':'current')}>{x.staleEvidence?'نیازمند بازبینی':'شواهد جاری'}</span></div><div className="rhfux17__meta">شناسه پرونده: <code dir="ltr">{x.caseId}</code></div>
    <div className="rhfux17__stage"><span className="rhfux17__stage-dot"/> {x.view.label}</div>
    <div className="rhfux17__details"><span>بررسی مستقل: {x.independentReview?'تأیید جاری':'بدون تأیید جاری'}</span><span>برنامه‌ریزی: {x.planningCurrent?'جاری':'نامعتبر/ثبت‌نشده'}</span><span>درخواست اپراتور: {x.operatorIntentCurrent?'موجود':'وجود ندارد'}</span></div>
    <div className="rhfux17__foot">این پرونده مجوز اعزام، رزرو منابع یا ارزش شهری تأییدشده ندارد.</div></article>)}</div>
   <footer className="rhfux17__footer">زمان گزارش: {state.data.asOf?new Date(state.data.asOf).toLocaleString('fa-IR'):'نامشخص'} • وضعیت پذیرش سه حساب: NOT_RUN • تصمیم انتشار: NO_GO</footer>
  </>}
 </section>;
}
