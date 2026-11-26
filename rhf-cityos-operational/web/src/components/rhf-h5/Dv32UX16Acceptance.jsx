// Live, scoped municipal acceptance cockpit. It never certifies absent external evidence.
import React,{useCallback,useEffect,useState} from 'react';
import {safePipeline} from './Dv32UX5SpecialistCore.mjs';
import {acceptanceUrl,evaluateCityReadiness,evaluateWasteReadiness,releaseInvariant} from './Dv32UX16AcceptanceCore.mjs';
import './Dv32UX16Acceptance.css';
const fa=n=>new Intl.NumberFormat('fa-IR').format(n);
const STATUS=Object.freeze({PASS:'کنترل منبع موفق',OBSERVED:'شواهد مشاهده شد',BLOCKED:'مسدود',NOT_RUN:'آزمون انجام نشده'});
async function read(url,signal){
 const r=await fetch(url,{credentials:'same-origin',cache:'no-store',signal,headers:{Accept:'application/json'}});
 const d=await r.json().catch(()=>null);
 if(!r.ok)throw Error(typeof d?.error==='string'?d.error:`HTTP ${r.status}`);
 return d;
}
function Gate({g,i}){return <article className="ux16-gate" aria-label={`${g.title}؛ ${STATUS[g.status]}`}>
 <div className="ux16-step" aria-hidden="true">{String(i+1).padStart(2,'0')}</div>
 <div className="ux16-gate-main"><div className="ux16-gate-head"><h3>{g.title}</h3><span className={`ux16-state ux16-${g.status.toLowerCase()}`}>{STATUS[g.status]}</span></div>
 <p>{g.detail}</p><small dir="ltr">{g.proof}</small></div></article>}
export default function Dv32UX16Acceptance({desk,cityId,tenantId,orgId}){
 const [result,setResult]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[reload,setReload]=useState(0);
 const load=useCallback(async(signal)=>{
  setLoading(true);setError('');setResult(null);
  try{
   const url=acceptanceUrl({desk,cityId,tenantId,orgId});const raw=await read(url,signal);
   const scoped=desk==='waste'?safePipeline(raw,{desk,cityId,tenantId,orgId,tab:'temporal-observation'}):raw;
   const report=desk==='waste'?evaluateWasteReadiness(scoped,{desk,cityId,tenantId,orgId}):evaluateCityReadiness(scoped,{desk,cityId,tenantId,orgId});
   releaseInvariant(report);if(!signal.aborted)setResult(report);
  }catch(e){if(!signal.aborted)setError(e?.message||'READINESS_READ_FAILED')}
  finally{if(!signal.aborted)setLoading(false)}
 },[desk,cityId,tenantId,orgId]);
 useEffect(()=>{const c=new AbortController();load(c.signal);return()=>c.abort()},[load,reload]);
 const canShow=!!result&&!loading&&!error;
 return <section className="rhf-ux-module ux16-root" dir="rtl" aria-labelledby="ux16-heading">
 <header className="ux16-hero"><div><span className="ux16-eyebrow">RHF CITY OS · RELEASE ASSURANCE</span><h2 id="ux16-heading">مرکز آمادگی بهره‌برداری</h2>
  <p>گزارش مبتنی بر داده‌های مجازِ حساب فعلی، با تفکیک شواهد مشاهده‌شده از آزمون‌های انجام‌نشده.</p></div>
  <div className="ux16-status"><span className="ux16-overline">تصمیم انتشار</span><strong>NO GO</strong><span>نیازمند شواهد و پذیرش مستقل</span></div></header>
 <div className="ux16-toolbar"><span>محدوده: {desk==='mayor'?'شهردار':desk==='deputy'?'معاونت خدمات شهری':'سازمان پسماند'}</span>
 <button type="button" onClick={()=>setReload(v=>v+1)} disabled={loading} aria-label="به‌روزرسانی شواهد آمادگی">{loading?'در حال کنترل…':'بازخوانی شواهد'}</button></div>
 {loading&&<p className="ux16-message" role="status">در حال بررسی اعتبار داده و محدوده حساب…</p>}
 {error&&<div className="ux16-message ux16-error" role="alert"><strong>اعتبار گزارش احراز نشد.</strong><p>{error}</p><p>برای ایمنی، داده‌های نامعتبر نمایش داده نمی‌شوند و وضعیت انتشار همچنان NO GO است.</p></div>}
 {canShow&&<>
 <div className="ux16-metrics" aria-label="خلاصه وضعیت گیت‌های آمادگی">
  <div><span>کنترل منبع موفق</span><strong>{fa(result.tally.PASS)}</strong></div>
  <div><span>شواهد مشاهده‌شده</span><strong>{fa(result.tally.OBSERVED)}</strong></div>
  <div><span>موانع تأییدشده</span><strong>{fa(result.tally.BLOCKED)}</strong></div>
  <div><span>آزمون‌نشده</span><strong>{fa(result.tally.NOT_RUN)}</strong></div></div>
 <div className="ux16-sectionhead"><div><h3>دروازه‌های پذیرش</h3><p>شمارش رویدادها به‌معنی عبور خودکار از مراحل بعدی نیست.</p></div><span>{fa(result.entries.length)} کنترل</span></div>
 <div className="ux16-list">{result.entries.map((g,i)=><Gate key={g.id} g={g} i={i}/>)}</div>
 <footer className="ux16-footer"><strong>مرز انتشار:</strong> نگاشت رسمی مأموریت‌ها، صحت ارزش شهری، اجرای Temporal و آزمون سه نقش با این گزارش تأیید نشده‌اند.
 {result.sourceTimestamp&&<p>زمان منبع: <time dateTime={result.sourceTimestamp}>{new Date(result.sourceTimestamp).toLocaleString('fa-IR')}</time></p>}
 <p>این گزارش فقط‌خواندنی است و هیچ مأموریت، رزرو، گردش‌کار یا مجوزی ایجاد نمی‌کند.</p></footer></>}
 </section>;
}
