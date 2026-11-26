import React,{useEffect,useRef,useState} from 'react';
import {context,url,safeReport,prepare,checkAction} from './Dv32UX8PlanningCore.mjs';
const panel={border:'1px solid #c8dce7',background:'#fff',borderRadius:12,padding:20,color:'#16354a'};
const input={width:'100%',padding:10,font:'inherit',border:'1px solid #afc3d0',borderRadius:8,boxSizing:'border-box'};
const button={background:'#17637a',color:'#fff',border:0,borderRadius:8,padding:'10px 16px',cursor:'pointer'};
async function call(url,body,signal){const r=await fetch(url,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',signal,headers:body?{'Content-Type':'application/json','X-RHF-DV32UX8-Intent':'EXPLICIT_PLANNING_DRAFT_ONLY'}:undefined,body:body?JSON.stringify(body):undefined});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||`HTTP ${r.status}`);return d}
export default function Dv32UX8ApprovedCasePlanning({desk,tab,cityId,tenantId,orgId,currentRole}){
 let ctx;try{ctx=context({desk,tab,cityId,tenantId,orgId})}catch{}
 const [report,setReport]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[selected,setSelected]=useState(''),[resourceId,setResourceId]=useState(''),[note,setNote]=useState('');const serial=useRef(0);
 const scope=ctx?`${ctx.cityId}:${ctx.tenantId}:${currentRole}`:'INVALID';
 useEffect(()=>{const n=++serial.current,ac=new AbortController();setReport(null);setError('');setNotice('');setSelected('');setResourceId('');setNote('');if(!ctx)return()=>ac.abort();setBusy(true);call(url(ctx),null,ac.signal).then(d=>{if(n===serial.current&&!ac.signal.aborted)setReport(safeReport(d,ctx))}).catch(e=>{if(n===serial.current&&!ac.signal.aborted)setError(e.message)}).finally(()=>{if(n===serial.current&&!ac.signal.aborted)setBusy(false)});return()=>ac.abort()},[scope]);
 async function refresh(){if(!ctx)return;const n=++serial.current;setError('');setBusy(true);try{const d=safeReport(await call(url(ctx)),ctx);if(n===serial.current)setReport(d)}catch(e){if(n===serial.current)setError(e.message)}finally{if(n===serial.current)setBusy(false)}}
 const candidate=report?.candidates.find(x=>x.caseId===selected&&x.currentEvidence&&report?.plans.every(p=>p.caseId!==selected));
 const resources=(report?.resources||[]).filter(x=>x.ownerUnitId===candidate?.unitId);
 async function submit(e){e.preventDefault();if(!ctx||busy||!report?.canWrite||currentRole!=='MUNICIPAL_ADMIN'||report.truncated||!candidate)return;
  let body;try{if(resourceId&&!resources.some(r=>r.id===resourceId))throw Error('RESOURCE_UNIT_MISMATCH');if(!globalThis.crypto?.randomUUID)throw Error('RANDOM_UUID_UNAVAILABLE');body=prepare(candidate.caseId,candidate.reviewId,resourceId||null,note,globalThis.crypto.randomUUID())}catch(e){setError(e.message);return}
  if(!window.confirm('این برگه فقط برای برنامه‌ریزی است؛ هیچ رزرو منابع، شروع Temporal، مأموریت یا مجوز اعزام ایجاد نمی‌شود. تأیید می‌کنید؟'))return;
  const n=++serial.current;setError('');setNotice('');setBusy(true);try{checkAction(await call(url(ctx),body),ctx);const d=safeReport(await call(url(ctx)),ctx);if(n===serial.current){setReport(d);setNote('');setSelected('');setResourceId('');setNotice('برگه برنامه‌ریزی ثبت شد. وضعیت پرونده DRAFT است و هیچ منبعی رزرو نشده است.')}}catch(e){if(n===serial.current)setError(e.message)}finally{if(n===serial.current)setBusy(false)}
 }
 if(!ctx)return <section role="alert" style={panel}>این ماژول تنها در میزکار مجاز معاونت قابل نمایش است.</section>;
 return <section dir="rtl" style={panel}><header style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><h2 style={{margin:0}}>برنامه‌ریزی پرونده‌های تأییدشده</h2><button type="button" style={button} disabled={busy} onClick={refresh}>تازه‌سازی</button></header>
 <p>دامنه شیراز | تأیید مستقل برای برنامه‌ریزی | بدون مجوز عملیاتی | <strong>FINAL_GO=NO</strong></p>
 {busy&&<p role="status">در حال دریافت داده‌ها…</p>}{error&&<p role="alert" style={{color:'#a42036'}}>{error}</p>}{notice&&<p role="status" style={{color:'#147b51'}}>{notice}</p>}
 {report&&<><p>پرونده‌های بررسی‌شده: {report.candidates.length} | برگه‌های ثبت‌شده: {report.plans.length} | منابع قابل مشاهده: {report.resources.length}</p>{report.truncated&&<p role="alert">فهرست ناقص است؛ ثبت برگه جدید متوقف می‌شود.</p>}
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:12}}><div style={panel}><h3>پرونده‌های تأییدشده برای برنامه‌ریزی</h3>{report.candidates.length===0?<p>هنوز تأیید مستقل معتبری ثبت نشده است.</p>:report.candidates.map(x=><p key={x.caseId}><strong>{x.summary}</strong> — {x.currentEvidence?'شواهد جاری':'شواهد تغییر کرده‌اند'}</p>)}</div>
 <div style={panel}><h3>برگه‌های برنامه‌ریزی</h3>{report.plans.length===0?<p>هیچ برگه‌ای ثبت نشده است.</p>:report.plans.map(x=><p key={x.id}><strong>{x.status}</strong> — {x.currentEvidence?'شواهد جاری':'نیازمند بازبینی شواهد'} {x.resourceLinked?'| منبع مشاهده‌شده (رزرو نشده)':''}</p>)}</div></div>
 {report.canWrite&&currentRole==='MUNICIPAL_ADMIN'&&!report.truncated?<form onSubmit={submit} style={{display:'grid',gap:12,marginTop:16,maxWidth:720}}><h3>ثبت برگه برنامه‌ریزی توسط مدیر مجاز</h3>
 <label>پرونده تأییدشده<select style={input} required value={selected} onChange={e=>{setSelected(e.target.value);setResourceId('')}}><option value="">انتخاب پرونده</option>{report.candidates.filter(x=>x.currentEvidence&&!report.plans.some(p=>p.caseId===x.caseId)).map(x=><option key={x.caseId} value={x.caseId}>{x.summary}</option>)}</select></label>
 <label>منبع برای مشاهده ظرفیت (اختیاری و بدون رزرو)<select style={input} value={resourceId} onChange={e=>setResourceId(e.target.value)}><option value="">بدون انتخاب منبع</option>{resources.map(x=><option value={x.id} key={x.id}>{x.name} — {x.unit}</option>)}</select></label>
 <label>شرح برنامه‌ریزی و مبنای اقدام<textarea style={input} required minLength={16} maxLength={550} rows={3} value={note} onChange={e=>setNote(e.target.value)} /></label>
 <button type="submit" disabled={busy||!candidate} style={button}>ثبت برگه پیش‌نویس برنامه‌ریزی</button><small>تأیید انسانی UX7 باید معتبر و شواهد پرونده بدون تغییر باشد. ثبت این برگه تخصیص، اعزام یا دستور کار نیست.</small></form>:<p>ثبت فقط با مجوز مدیر شهرداری در محدوده شیراز امکان‌پذیر است.</p>}
 </>}</section>;
}
