// DV32UX20: embedded acceptance workbench, never initiates Temporal or field operations.
import React,{useCallback,useEffect,useState} from 'react';
import {createMatrixUrl,parseMatrix} from './Dv32UX3GatewayCore.mjs';
import {endpoint,safeChain} from './Dv32UX17ChainViewCore.mjs';
import {acceptanceSnapshot,countStatuses,localScope,validateHealth} from './Dv32UX20AcceptanceCore.mjs';
import './Dv32UX20Acceptance.css';
const titles={mayor:'حکمرانی شهرداری',deputy:'معاونت خدمات شهری',waste:'سازمان مدیریت پسماند'};
const statusFA={PASS:'کنترل موفق',OBSERVED:'مشاهده‌شده',NOT_RUN:'اجرا‌نشده',BLOCKED:'مسدود',FAIL:'ناموفق'};
const fmt=n=>new Intl.NumberFormat('fa-IR').format(n);
async function get(url,signal){
 const r=await fetch(url,{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'},signal});
 if(!r.ok)throw Error('HTTP_'+r.status);return await r.json();
}
export default function Dv32UX20Acceptance({desk,cityId,tenantId,orgId}){
 const [info,setInfo]=useState({loading:true,error:'',scope:null,report:null});const [reload,setReload]=useState(0);
 const fetchEvidence=useCallback(async(signal)=>{
  setInfo({loading:true,error:'',scope:null,report:null});
  try{
   const m=parseMatrix(await get(createMatrixUrl(cityId,desk==='waste'?orgId||'':''),signal),cityId);
   const scope=localScope({desk,cityId,tenantId,orgId,matrix:m});
   let healthOk=false,chainObserved=false;
   try{validateHealth(await get('/healthz',signal));healthOk=true;}catch{/* distinguish unavailable from PASS */}
   if(desk!=='waste'){
    try{safeChain(await get(endpoint(cityId,desk,null),signal),{cityId,tenantId,desk});chainObserved=true;}catch{/* read-only observation missing */}
   }
   if(!signal.aborted)setInfo({loading:false,error:'',scope,report:acceptanceSnapshot(scope,{matrixOk:true,healthOk,chainObserved})});
  }catch(e){if(!signal.aborted)setInfo({loading:false,error:e.message||'UNKNOWN',scope:null,report:null});}
 },[desk,cityId,tenantId,orgId]);
 useEffect(()=>{const ac=new AbortController();fetchEvidence(ac.signal);return()=>ac.abort();},[fetchEvidence,reload]);
 const tally=info.report?countStatuses(info.report.gates):null;
 return <section dir="rtl" className="ux20-root" aria-labelledby="ux20-title">
  <header className="ux20-hero"><div><div className="ux20-kicker">RHF CITY OS / FINAL ACCEPTANCE · UX20</div>
   <h2 id="ux20-title">مرکز پذیرش جامع</h2><p>شواهد قابل‌مشاهده از حساب جاری در کنار آزمون‌های هنوز اجرا‌نشده؛ بدون صدور گواهی پایان پروژه.</p>
   <div className="ux20-tags"><span>محدوده: {titles[desk]||'نامعتبر'}</span><span>دسترسی نقش‌محور</span><span>فقط خواندن</span></div></div>
   <div className="ux20-decision" aria-label="تصمیم انتشار، مجاز نیست"><small>تصمیم انتشار</small><strong>NO GO</strong><small>تا تکمیل شواهد و پذیرش مستقل</small></div>
  </header>
  <div className="ux20-actions"><div><h3>ارزیابی حساب جاری</h3><p>نتایج این صفحه، تأییدیه مرورگری سه نقش یا تست نفوذ نیستند.</p></div>
   <button type="button" onClick={()=>setReload(x=>x+1)} disabled={info.loading}>{info.loading?'در حال دریافت…':'بازخوانی ایمن شواهد'}</button></div>
  {info.loading&&<p role="status" className="ux20-message">در حال تطبیق نقش و محدوده سازمانی…</p>}
  {info.error&&<div role="alert" className="ux20-message ux20-error"><strong>نتیجه قابل اعتبارسنجی نیست</strong><p>{info.error}</p><p>هیچ داده‌ای به‌عنوان تأییدشده ارائه نمی‌شود.</p></div>}
  {info.report&&<>
   <div className="ux20-metrics" aria-label="خلاصه وضعیت آزمون‌ها">
    {Object.entries({PASS:'کنترل موفق',OBSERVED:'مشاهده‌شده',BLOCKED:'مانع',NOT_RUN:'اجرانشده'}).map(([key,label])=><div key={key} className={'ux20-metric ux20-metric-'+key.toLowerCase()}><span>{label}</span><strong>{fmt(tally[key])}</strong></div>)}
   </div>
   <div className="ux20-list-head"><h3>دروازه‌های پذیرش</h3><span>{fmt(info.report.gates.length)} بررسی</span></div>
   <ol className="ux20-list">{info.report.gates.map((g,i)=><li key={g.id}><div className="ux20-index">{fmt(i+1)}</div><div><div className="ux20-row"><h4>{g.title}</h4><span className={'ux20-pill ux20-pill-'+g.status.toLowerCase()}>{statusFA[g.status]}</span></div><p>{g.detail}</p></div></li>)}</ol>
   <footer className="ux20-foot"><strong>محدودیت سند:</strong> این صفحه فقط نتیجه جاری حساب را مشاهده می‌کند. گزارش کامل نصب و آزمون‌های سرور در آرشیو خصوصی UX20 ساخته می‌شود. بدون اسناد رسمی، UAT سه نقش، آزمون بار و بازیابی و اثبات مستقل ارزش شهری، تصمیم انتشار NO_GO است.</footer>
  </>}
 </section>;
}
