import React,{useEffect,useRef,useState} from 'react';
import {context,url,safeReport,revise,actionCheck} from './Dv32UX10RevisionCore.mjs';
const panel={border:'1px solid #c9dce6',borderRadius:12,background:'#fff',color:'#12364a',padding:18};
const field={font:'inherit',border:'1px solid #a4b9c8',borderRadius:8,padding:10,width:'100%',boxSizing:'border-box'};
const btn={font:'inherit',padding:'9px 16px',border:0,borderRadius:7,background:'#0e6478',color:'#fff',cursor:'pointer'};
async function call(path,body,signal){const r=await fetch(path,{method:body?'POST':'GET',cache:'no-store',credentials:'same-origin',signal,headers:body?{'Content-Type':'application/json','X-RHF-DV32UX10-Intent':'EXPLICIT_RETURNED_CASE_REVISION_ONLY'}:undefined,body:body?JSON.stringify(body):undefined});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||`HTTP ${r.status}`);return d}
export default function Dv32UX10ReturnedCaseRevision({desk,tab,cityId,tenantId,orgId,currentRole}){
 let ctx;try{ctx=context({desk,tab,cityId,tenantId,orgId})}catch{}
 const [data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[caseId,setCaseId]=useState(''),[description,setDescription]=useState(''),[evidence,setEvidence]=useState(''),[note,setNote]=useState('');const seq=useRef(0);
 const scope=ctx?`${ctx.cityId}:${ctx.tenantId}:${currentRole}`:'INVALID';
 useEffect(()=>{const n=++seq.current,ac=new AbortController();setData(null);setError('');setNotice('');setCaseId('');if(!ctx)return()=>ac.abort();setBusy(true);call(url(ctx),null,ac.signal).then(d=>{if(n===seq.current&&!ac.signal.aborted)setData(safeReport(d,ctx))}).catch(e=>{if(n===seq.current&&!ac.signal.aborted)setError(e.message)}).finally(()=>{if(n===seq.current&&!ac.signal.aborted)setBusy(false)});return()=>ac.abort()},[scope]);
 async function refresh(){if(!ctx)return;const n=++seq.current;setError('');setBusy(true);try{const d=safeReport(await call(url(ctx)),ctx);if(n===seq.current)setData(d)}catch(e){if(n===seq.current)setError(e.message)}finally{if(n===seq.current)setBusy(false)}}
 async function submit(e){e.preventDefault();if(!ctx||busy||data?.truncated||!data?.canWrite||currentRole!=='MUNICIPAL_ADMIN')return;
  let body;try{const row=data.eligible.find(x=>x.caseId===caseId);if(!row||!globalThis.crypto?.randomUUID)throw Error('ELIGIBLE_RETURNED_CASE_REQUIRED');body=revise({caseId,priorReviewId:row.priorReviewId,requestId:globalThis.crypto.randomUUID(),description,evidenceNote:evidence,note})}catch(e){setError(e.message);return}
  if(!window.confirm('مستندات پرونده DRAFT ویرایش و در دفتر حسابرسی ثبت می‌شود. تأیید قبلی معتبر نمی‌ماند و بررسی مستقل جدید لازم است. تأیید می‌کنید؟'))return;
  const n=++seq.current;setBusy(true);setError('');setNotice('');try{actionCheck(await call(url(ctx),body),ctx);const d=safeReport(await call(url(ctx)),ctx);if(n===seq.current){setData(d);setCaseId('');setDescription('');setEvidence('');setNote('');setNotice('مستندات اصلاح شد. برای بررسی مستقل جدید به منوی «بررسی مستقل پرونده‌های واقعی» مراجعه کنید.')}}catch(e){if(n===seq.current)setError(e.message)}finally{if(n===seq.current)setBusy(false)}
 }
 if(!ctx)return <section role="alert" style={panel}>این ماژول فقط در میزکار مجاز معاونت در دسترس است.</section>;
 return <section dir="rtl" className="rhf-ux-module" style={panel}><header style={{display:'flex',justifyContent:'space-between',gap:12}}><h2 style={{margin:0}}>اصلاح پرونده برگشت‌خورده و دور بعدی بررسی</h2><button type="button" onClick={refresh} disabled={busy} style={btn}>تازه‌سازی</button></header>
 <p>فقط پرونده واقعی <strong>DRAFT</strong> با آخرین رأی <code>RETURNED_FOR_EVIDENCE</code> و بدون برگه برنامه‌ریزی قابل اصلاح است. هیچ مأموریتی صادر نمی‌شود؛ <strong>NO_GO</strong>.</p>
 {busy&&<p role="status">در حال دریافت…</p>}{error&&<p className="rhf-ux-alert" role="alert" style={{color:'#b42333'}}>{error}</p>}{notice&&<p className="rhf-ux-success" role="status" style={{color:'#167346'}}>{notice}</p>}
 {data&&<><div className="rhf-ux-metrics"><span className="rhf-ux-metric">پرونده‌های واجد شرایط: {data.eligible.length}</span><span className="rhf-ux-metric">اصلاحات ثبت‌شده: {data.revisions.length}</span></div>{data.truncated&&<p role="alert">لیست ناقص است؛ تغییر داده متوقف می‌شود.</p>}
 {data.canWrite&&currentRole==='MUNICIPAL_ADMIN'&&!data.truncated?<form className="rhf-ux-form" onSubmit={submit} style={{display:'grid',gap:12,maxWidth:740}}><label>پرونده برگشت‌خورده<select style={field} value={caseId} required onChange={e=>setCaseId(e.target.value)}><option value="">انتخاب</option>{data.eligible.map(x=><option key={x.caseId} value={x.caseId}>{x.summary}</option>)}</select></label>
 <label>شرح اصلاح‌شده پرونده<textarea style={field} required minLength={15} maxLength={800} rows={3} value={description} onChange={e=>setDescription(e.target.value)}/></label>
 <label>شواهد اصلاح‌شده<textarea style={field} required minLength={12} maxLength={300} rows={3} value={evidence} onChange={e=>setEvidence(e.target.value)}/></label>
 <label>دلیل اصلاح و شرح ارجاع<textarea style={field} required minLength={16} maxLength={550} rows={3} value={note} onChange={e=>setNote(e.target.value)}/></label>
 <button type="submit" style={btn} disabled={busy||!caseId}>ثبت نسخه اصلاح‌شده، بدون تأیید یا اعزام</button></form>:<p>ویرایش توسط حساب مدیر مجاز شهرداری شیراز انجام می‌شود.</p>}
 <h3>تاریخچه اصلاحات</h3>{data.revisions.length===0?<p>هیچ اصلاحی ثبت نشده است.</p>:data.revisions.map(x=><p key={x.id}><code>{x.id}</code> — پرونده <code>{x.caseId}</code></p>)}
 <p>پس از ثبت، باید با حساب دیگری تصمیم بررسی مستقل اتخاذ شود؛ برنامه‌ریزی قدیمی خودکار احیا یا صادر نمی‌شود.</p></>}
 </section>;
}
