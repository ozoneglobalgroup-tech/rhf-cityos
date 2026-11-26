import React,{useEffect,useState} from 'react';
import {endpoint,safeReport,safeDetail,safeStart,UUID} from './Dv32UX18ProofCore.mjs';
import './Dv32UX18_19Design.css';
export default function Dv32UX18OperatorProof({desk,cityId,tenantId,currentRole,orgId}){
 const [data,setData]=useState(null),[pending,setPending]=useState(false),[error,setError]=useState(''),[reason,setReason]=useState('');
 const [selection,setSelection]=useState(''),[status,setStatus]=useState(null),[op,setOp]=useState('');
 const [reload,setReload]=useState(0);
 useEffect(()=>{const c=new AbortController();setData(null);setSelection('');setStatus(null);setError('');
  if(!['mayor','deputy'].includes(desk)||!UUID.test(cityId)||!UUID.test(tenantId)||orgId){setError('دسترسی این گزارش برای محدوده انتخاب‌شده مجاز نیست.');return;}
  fetch(endpoint(cityId),{credentials:'same-origin',cache:'no-store',signal:c.signal}).then(async r=>{if(!r.ok)throw Error('دسترسی محدود یا پاسخ نامعتبر ('+r.status+')');return r.json();})
   .then(j=>{if(!c.signal.aborted)setData(safeReport(j,{cityId,tenantId}));})
   .catch(e=>{if(!c.signal.aborted)setError(e.message||'خطای دریافت داده');});return()=>c.abort();
 },[desk,cityId,tenantId,orgId,reload]);
 const operator=currentRole==='MUNICIPAL_ADMIN'&&desk==='deputy'&&data?.canStart===true;
 const chosen=data?.items.find(x=>x.handoffId===selection);
 async function inspect(id){setPending(true);setError('');try{const r=await fetch(endpoint(cityId,id),{credentials:'same-origin',cache:'no-store'});
  if(!r.ok)throw Error('استعلام Temporal ناموفق ('+r.status+')');const d=safeDetail(await r.json(),{cityId,tenantId,handoffId:id});setStatus(d);setSelection(id);
 }catch(e){setError(e.message);setStatus(null);}finally{setPending(false);}}
 async function start(){if(!operator||!chosen?.eligibleByIdentity||reason.trim().length<20)return;
  if(!window.confirm('فقط یک Workflow غیرعملیاتی بدون اعزام، تخصیص یا اجرای میدانی در Temporal ثبت می‌شود. تأیید می‌کنید؟'))return;
  setPending(true);setError('');try{const r=await fetch(endpoint(cityId,selection),{method:'POST',credentials:'same-origin',cache:'no-store',
   headers:{'content-type':'application/json','x-rhf-ux18-intent':'I_AUTHORIZE_NON_EXECUTING_TEMPORAL_PROOF'},
   body:JSON.stringify({confirm:'I_ACKNOWLEDGE_NON_EXECUTING_TEMPORAL_PROOF',reason:reason.trim()})});
   if(!r.ok)throw Error('درخواست پذیرفته نشد ('+r.status+')');const j=safeStart(await r.json(),{cityId,tenantId,handoffId:selection});
   setOp(j.alreadyStarted?'Workflow از قبل ثبت شده؛ رویداد تکراری ایجاد نشد.':'درخواست ایجاد Workflow غیرعملیاتی ثبت شد.');setReason('');await inspect(selection);
  }catch(e){setError(e.message||'خطا در ثبت');}finally{setPending(false);}}
 return <section className="rhfux1819" dir="rtl" aria-label="اثبات کنترل‌شده Temporal">
  <header className="rhfux1819__hero"><div className="rhfux1819__eyebrow">RHF CITY OS / UX18 · CONTROLLED TEMPORAL EVIDENCE</div>
   <h2>درگاه اپراتور Temporal</h2><p>مستندسازی یک اجرای واقعی اما کاملاً <b>غیرعملیاتی</b> در Temporal، تنها با تأیید صریح اپراتور مستقل</p>
   <div className="rhfux1819__chips"><span>بدون اعزام</span><span>بدون رزرو منبع</span><span>بدون دسترسی بین‌شهرداری</span><span>NO_GO</span></div></header>
  <div className="rhfux1819__toolbar"><h3>درخواست‌های تحویل موجود</h3><button type="button" onClick={()=>setReload(n=>n+1)} disabled={pending}>↻ بازخوانی</button></div>
  {error&&<p className="rhfux1819__error" role="alert">{error}</p>}
  {!data&&!error&&<p role="status">در حال بارگذاری درخواست‌های مجاز…</p>}
  {data&&<><div className="rhfux1819__metrics"><div><b>{data.items.length.toLocaleString('fa-IR')}</b><span>درخواست قابل مشاهده</span></div>
   <div><b>{data.items.filter(x=>x.eligibleByIdentity).length.toLocaleString('fa-IR')}</b><span>واجد شرایط این اپراتور</span></div>
   <div><b>۰</b><span>مجوز اجرای میدانی از UX18</span></div></div>
   {data.truncated&&<p>گزارش فقط ۴۰ درخواست اخیر را پوشش می‌دهد.</p>}
   {!data.items.length&&<div className="rhfux1819__empty">در این محدوده درخواست تحویل موجود نیست. ایجاد درخواست ساختگی مجاز نیست.</div>}
   <div className="rhfux1819__items">{data.items.map(item=><article key={item.handoffId} className="rhfux1819__item">
    <h4>{item.summary||'پرونده بدون عنوان'}</h4><p>شناسه درخواست: <code dir="ltr">{item.handoffId}</code></p>
    <p className="rhfux1819__hint">{item.eligibleByIdentity?'قابل بررسی برای شروع غیرعملیاتی':'مجوز اپراتور مستقل یا شواهد جاری احراز نشده'}</p>
    <button type="button" disabled={pending} onClick={()=>inspect(item.handoffId)}>مشاهده وضعیت ثبت در Temporal</button>
   </article>)}</div>
   {selection&&<div className="rhfux1819__detail"><h3>استعلام وضعیت Temporal</h3>
    <p>درخواست انتخاب‌شده: <code dir="ltr">{selection}</code></p>
    {status&&<p role="status">وضعیت مشاهده‌شده: <strong>{status.temporal}</strong> — این وضعیت اثبات اجرای خدمات میدانی نیست.</p>}
    {operator&&chosen?.eligibleByIdentity&&<><label htmlFor="ux18reason">دلیل مستند اقدام اپراتور مستقل (حداقل ۲۰ نویسه)</label>
     <textarea id="ux18reason" value={reason} maxLength={500} rows={3} onChange={e=>setReason(e.target.value)} placeholder="چرایی ثبت اثبات غیرعملیاتی در Temporal…"/>
     <button type="button" disabled={pending||reason.trim().length<20} onClick={start}>ثبت اجرای غیرعملیاتی با تأیید انسانی</button></>}
   </div>}
   {op&&<p role="status" className="rhfux1819__success">{op}</p>}
  </>}
  <footer className="rhfux1819__footer">شروع Workflow غیرعملیاتی، مجوز یا شواهد اجرای خدمات شهری نیست؛ تا آزمون پذیرش نهایی تصمیم انتشار NO_GO است.</footer>
 </section>;
}
