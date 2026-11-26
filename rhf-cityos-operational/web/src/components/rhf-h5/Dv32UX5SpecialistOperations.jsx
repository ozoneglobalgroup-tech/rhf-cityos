// DV32UX5 — existing backend capabilities inside the correct role-bound OS.
// No cross-city selector, no role impersonation. Writes ONLY to existing DV32Q7 with explicit admin confirmation.
import React,{useEffect,useRef,useState} from 'react';
import {validateContext,readinessUrl,catalogUrl,pipelineUrl,temporalUrl,safeReadiness,safeCatalog,prepareAction,safePipeline,safeTemporal,ACTIONS} from './Dv32UX5SpecialistCore.mjs';
const box={border:'1px solid #d2dee7',borderRadius:12,padding:18,background:'#fff',color:'#15364f'};
const field={font:'inherit',padding:'9px',borderRadius:8,border:'1px solid #b6cad8',maxWidth:'100%'};
const button={...field,cursor:'pointer',background:'#0d6478',color:'#fff'};
const names={CREATE_UNIT:'ثبت واحد غیرفعال',CREATE_SERVICE:'ثبت خدمت غیرفعال',ACTIVATE_UNIT:'فعال‌سازی واحد',ACTIVATE_SERVICE:'فعال‌سازی خدمت'};
const init={action:'CREATE_UNIT',code:'',nameFa:'',kind:'ORGANIZATION',parentUnitId:'',moduleCode:'WASTE',description:'',slaHours:'24',outcomeMetric:'',ownerUnitId:'',unitId:'',serviceId:'',approvalReference:'',reason:''};
async function jsonFetch(url,signal,post){const r=await fetch(url,{method:post?'POST':'GET',credentials:'same-origin',cache:'no-store',signal,headers:post?{'Content-Type':'application/json','X-RHF-DV32Q7-Intent':'EXPLICIT_REAL_CATALOG_ACTION'}:undefined,body:post?JSON.stringify(post):undefined});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||`HTTP ${r.status}`);return d;}
export default function Dv32UX5SpecialistOperations({desk,tab,cityId,tenantId,orgId,currentRole}){
 const [report,setReport]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[form,setForm]=useState(init);
 const [selected,setSelected]=useState(''),[temporal,setTemporal]=useState(null),[temporalBusy,setTemporalBusy]=useState(false);
 const serial=useRef(0),temporalSerial=useRef(0);
 let context=null;try{context=validateContext({desk,tab,cityId,tenantId,orgId});}catch{}
 const key=context?`${context.desk}:${context.cityId}:${context.tenantId}:${context.orgId||''}:${context.tab}:${currentRole||''}`:`INVALID:${desk}:${tab}:${cityId}`;
 const endpoint=context?(desk==='mayor'?readinessUrl(context):desk==='deputy'?catalogUrl(context):pipelineUrl(context)):null;
 useEffect(()=>{const c=new AbortController(),id=++serial.current;temporalSerial.current++;setError('');setReport(null);setTemporal(null);setSelected('');setForm({...init});if(!endpoint){setBusy(false);return()=>c.abort();}setBusy(true);
  jsonFetch(endpoint,c.signal).then(raw=>{const validated=desk==='mayor'?safeReadiness(raw,context):desk==='deputy'?safeCatalog(raw,context):safePipeline(raw,context);
   if(id===serial.current&&!c.signal.aborted)setReport(validated);}).catch(e=>{if(id===serial.current&&!c.signal.aborted)setError(e.message);}).finally(()=>{if(id===serial.current&&!c.signal.aborted)setBusy(false);});
  return()=>{c.abort();};
 },[key]);
 async function refresh(){const id=++serial.current;setBusy(true);setError('');setReport(null);setTemporal(null);setSelected('');
  try{const raw=await jsonFetch(endpoint);const validated=desk==='mayor'?safeReadiness(raw,context):desk==='deputy'?safeCatalog(raw,context):safePipeline(raw,context);
   if(id===serial.current)setReport(validated);}catch(e){if(id===serial.current)setError(e.message);}finally{if(id===serial.current)setBusy(false);}}
 async function observe(){if(!report||desk!=='waste')return;const eligible=report.entries.find(x=>x.reviewId===selected&&x.canObserve);if(!eligible){setError('بررسی انسانی مجاز با شواهد جاری انتخاب نشده است.');return;}
  const id=++temporalSerial.current;setTemporalBusy(true);setTemporal(null);setError('');
  try{const raw=await jsonFetch(temporalUrl(context,selected));const out=safeTemporal(raw,context,selected);if(id===temporalSerial.current)setTemporal(out);}catch(e){if(id===temporalSerial.current)setError(e.message);}finally{if(id===temporalSerial.current)setTemporalBusy(false);}}
 async function submit(e){e.preventDefault();if(!report||desk!=='deputy'||!report.canMutate||busy)return;
  let action;try{action=prepareAction(form.action,form,context,report);}catch(e){setError(e.message);return;}
  if(!window.confirm('این اقدام جدول واقعی واحدها یا خدمات شهرداری را تغییر می‌دهد. آیا شماره سند و مجوز اقدام را تأیید می‌کنید؟'))return;
  const id=++serial.current;setBusy(true);setError('');
  try{const raw=await jsonFetch(endpoint,undefined,action);
   if(raw.schema!=='RHF-DV32Q7-ADMIN-ACTION-v1'||raw.acceptance!=='NO_GO'||raw.verifiedUrbanValue!==false||raw.temporalStarted!==false||raw.automaticFieldDispatch!==false)throw Error('UNTRUSTED_CATALOG_ACTION_RESULT');
   const next=await jsonFetch(endpoint);const safe=safeCatalog(next,context);if(id===serial.current){setReport(safe);setForm({...init});}}
  catch(e){if(id===serial.current)setError(e.message);}finally{if(id===serial.current)setBusy(false);}}
 function update(name,value){setForm(s=>({...s,[name]:value}));}
 const inp=(name,title,extra={})=><label key={name} style={{display:'grid',gap:4}}>{title}<input style={field} value={form[name]} onChange={e=>update(name,e.target.value)} required {...extra}/></label>;
 const choice=(name,title,values)=><label key={name} style={{display:'grid',gap:4}}>{title}<select required style={field} value={form[name]} onChange={e=>update(name,e.target.value)}><option value="">انتخاب کنید</option>{values.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label>;
 if(!context)return <p role="alert" style={box}>این بخش برای نقش و محدوده انتخاب‌شده مجاز نیست.</p>;
 return <section dir="rtl" style={box}>
  <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap'}}><h2 style={{margin:0,fontSize:20}}>{desk==='mayor'?'حسابرسی واقعی آمادگی و حکمرانی':desk==='deputy'?'مدیریت مصوب واحدها و خدمات واقعی':'مشاهده وضعیت گردش‌کار سازمان پسماند'}</h2>
   <button type="button" style={button} onClick={refresh} disabled={busy}>تازه‌سازی داده معتبر</button></div>
  <p style={{fontSize:12,color:'#5c7583'}}>شهرداری انتخاب‌شده: <code>{cityId}</code> {desk==='waste'&&<>| سازمان دارای انتساب: <code>{orgId}</code></>} | هسته مشترک RUVOS</p>
  {busy&&<p role="status">در حال بررسی دسترسی و دریافت داده…</p>}
  {error&&<p role="alert" style={{color:'#ad2434',overflowWrap:'anywhere'}}>{error}</p>}
  {desk==='mayor'&&report&&<><p><strong>وضعیت انتشار: NO_GO</strong> — این ممیزی مجوز بهره‌برداری یا تأیید نقش‌های دیگر نیست.</p>
   <p>نقش حساب فعلی: {report.role||'—'} | الزامات تأییدنشده: {report.gaps.length}</p>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:8}}>{report.observed.map(x=><div key={x.desk} style={box}><strong>{x.desk==='mayor'?'شهردار':x.desk==='deputy'?'معاونت':'پسماند'}</strong><p>دسترسی مشاهده: {x.discovery}</p><p>زنجیره شواهد: {x.chain||'NOT_VERIFIED'}</p></div>)}</div>
   <h3>شکاف‌های پذیرش</h3>{report.gaps.map(x=><p key={x.id}><strong>{x.priority} · {x.id}</strong> — {x.status}<span style={{display:'block',fontSize:12}}>{x.description}</span></p>)}
  </>}
  {desk==='deputy'&&report&&<><p>واحد فعال: <strong>{report.counts.activeUnits}</strong> | خدمت فعال: <strong>{report.counts.activeServices}</strong> | مأموریت نگاشت‌شده پیش‌نویس: <strong>{report.counts.draftMappedSlots}/۱۷</strong></p>
   <details><summary>واحدها و خدمات موجود (فقط همین شهرداری)</summary>
    <h4>واحدها</h4><ul>{report.units.map(x=><li key={x.id}>{x.code} — {x.name_fa} — {x.active?'فعال':'غیرفعال'}</li>)}</ul>
    <h4>خدمات</h4><ul>{report.services.map(x=><li key={x.id}>{x.code} — {x.name_fa} — {x.active?'فعال':'غیرفعال'}</li>)}</ul></details>
   {report.canMutate&&currentRole==='MUNICIPAL_ADMIN'?<form onSubmit={submit} style={{display:'grid',gap:10,marginTop:15,maxWidth:720}}>
    <h3 style={{margin:0}}>اقدام واقعی مدیر شهرداری — با تأیید صریح</h3>
    <label>نوع اقدام <select style={field} value={form.action} onChange={e=>update('action',e.target.value)}>{ACTIONS.map(x=><option key={x} value={x}>{names[x]}</option>)}</select></label>
    {['CREATE_UNIT','CREATE_SERVICE'].includes(form.action)&&<>{inp('code','کد رسمی لاتین', {minLength:3,maxLength:32})}{inp('nameFa','نام مصوب', {minLength:4,maxLength:120})}</>}
    {form.action==='CREATE_UNIT'&&<>{inp('kind','نوع واحد', {minLength:3,maxLength:40})}<label>واحد بالادست (اختیاری) <select style={field} value={form.parentUnitId} onChange={e=>update('parentUnitId',e.target.value)}><option value="">بدون واحد بالادست</option>{report.units.map(x=><option value={x.id} key={x.id}>{x.name_fa}</option>)}</select></label></>}
    {form.action==='CREATE_SERVICE'&&<>{inp('moduleCode','کد ماژول', {minLength:3,maxLength:40})}{inp('description','شرح خدمت', {minLength:12,maxLength:500})}
     {choice('ownerUnitId','واحد مالک',report.units.map(x=>({id:x.id,title:x.name_fa})))}{inp('slaHours','SLA بر حسب ساعت', {type:'number',min:1,max:8760})}{inp('outcomeMetric','شاخص نتیجه، نه ادعای تحقق', {minLength:4,maxLength:120})}</>}
    {form.action==='ACTIVATE_UNIT'&&choice('unitId','واحد غیرفعال',report.units.filter(x=>!x.active).map(x=>({id:x.id,title:x.name_fa})))}
    {form.action==='ACTIVATE_SERVICE'&&choice('serviceId','خدمت غیرفعال',report.services.filter(x=>!x.active).map(x=>({id:x.id,title:x.name_fa})))}
    {inp('approvalReference','شماره سند یا مصوبه', {minLength:8,maxLength:120})}{inp('reason','توجیه اقدام', {minLength:12,maxLength:250})}
    <button type="submit" disabled={busy} style={button}>{names[form.action]} با تأیید مدیر</button>
    <small>وجود شماره سند به معنای احراز مستقل اعتبار مصوبه نیست. ایجاد مورد ابتدا غیرفعال است؛ فعال‌سازی اقدام مستقل نیاز دارد.</small>
   </form>:<p>این حساب مجوز تغییر کاتالوگ واقعی ندارد؛ مدیر مجاز شهرداری باید اقدام را با حساب مستقل خود انجام دهد.</p>}
  </>}
  {desk==='waste'&&report&&<><p>فرصت‌های بررسی‌شده: {report.entries.length} | صف ناقص: {report.truncated?'بله، بررسی دستی لازم است':'خیر'}</p>
   <div style={{display:'grid',gap:8}}>{report.entries.map(x=><div key={x.candidateId} style={box}><strong>{x.title}</strong><div style={{fontSize:12}}>وضعیت: {x.reviewStatus||'بدون بررسی'} | {x.gate} | مجاز برای مشاهده Temporal: {x.canObserve?'بله':'خیر'}</div></div>)}</div>
   <label style={{display:'block',marginTop:12}}>بررسی انسانی واجد شرایط <select style={{...field,display:'block'}} value={selected} onChange={e=>{temporalSerial.current++;setSelected(e.target.value);setTemporal(null);}}><option value="">انتخاب کنید</option>
    {report.entries.filter(x=>x.canObserve).map(x=><option key={x.reviewId} value={x.reviewId}>{x.title} ({x.reviewId})</option>)}
   </select></label>
   <button type="button" disabled={!selected||temporalBusy} style={{...button,marginTop:8}} onClick={observe}>مشاهده فقط‌خواندنی Temporal</button>
   {temporalBusy&&<p>در حال دریافت وضعیت…</p>}
   {temporal&&<div style={{...box,background:'#f4fafb',marginTop:10}}><p>مرحله: <strong>{temporal.phase||'—'}</strong></p><p>رویداد زنده مشاهده‌شده: {temporal.liveObserved?'بله':'خیر یا قابل اثبات نیست'}</p><p>زمان مشاهده: {temporal.checkedAt||'—'}</p><small>مشاهده به معنای شروع Workflow، اعزام یا مجوز اجرای عملیات نیست.</small></div>}
  </>}
  <p style={{fontSize:12,color:'#5f7485',borderTop:'1px solid #dce7ef',paddingTop:10,marginTop:18}}>DV32UX5 — بدون دستکاری خودکار داده‌های واقعی، ایجاد مجوز، اعزام یا ادعای ارزش شهری. آزمون پذیرش نهایی هنوز انجام نشده است؛ FINAL_GO=NO.</p>
 </section>;
}
