// UX6 human-controlled REAL DRAFT case intake, not a synthetic scenario flow.
import React,{useEffect,useRef,useState} from 'react';
import {context,path,safeReport,prepare,verifiedCreation} from './Dv32UX6CaseCore.mjs';
const panel={border:'1px solid #cbdbe5',borderRadius:12,background:'#fff',padding:18,color:'#18364a'};
const input={font:'inherit',width:'100%',maxWidth:680,padding:9,border:'1px solid #a8becb',borderRadius:7,boxSizing:'border-box'};
const button={...input,cursor:'pointer',width:'auto',background:'#0d6378',color:'#fff'};
const clean={serviceId:'',summary:'',description:'',evidenceNote:'',sourceReference:'',priority:'NORMAL'};
async function readJson(url,body,signal){const resp=await fetch(url,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',signal,headers:body?{'Content-Type':'application/json','X-RHF-DV32UX6-Intent':'EXPLICIT_REAL_SERVICE_CASE_INTAKE'}:undefined,body:body?JSON.stringify(body):undefined});const data=await resp.json().catch(()=>({}));if(!resp.ok)throw Error(data.error||`HTTP ${resp.status}`);return data;}
export default function Dv32UX6CaseIntake({desk,tab,cityId,tenantId,orgId,currentRole}){
 const [report,setReport]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[ok,setOk]=useState(''),[form,setForm]=useState(clean);
 const serial=useRef(0);let ctx=null;try{ctx=context({desk,tab,cityId,tenantId,orgId})}catch{}
 const key=ctx?`${ctx.cityId}:${ctx.tenantId}:${currentRole}`:'INVALID';
 useEffect(()=>{const n=++serial.current;const ac=new AbortController();setReport(null);setForm({...clean});setError('');setOk('');if(!ctx)return()=>ac.abort();setBusy(true);
  readJson(path(ctx),undefined,ac.signal).then(r=>{const safe=safeReport(r,ctx);if(n===serial.current&&!ac.signal.aborted)setReport(safe)}).catch(e=>{if(n===serial.current&&!ac.signal.aborted)setError(e.message)}).finally(()=>{if(n===serial.current&&!ac.signal.aborted)setBusy(false)});
  return()=>ac.abort();
 },[key]);
 async function reload(){if(!ctx)return;const n=++serial.current;setBusy(true);setError('');try{const safe=safeReport(await readJson(path(ctx)),ctx);if(n===serial.current)setReport(safe)}catch(e){if(n===serial.current)setError(e.message)}finally{if(n===serial.current)setBusy(false)}}
 async function submit(e){e.preventDefault();if(!ctx||!report?.canCreate||currentRole!=='MUNICIPAL_ADMIN'||busy)return;
  if(typeof crypto==='undefined'||typeof crypto.randomUUID!=='function'){setError('شناسه درخواست ایمن در این مرورگر موجود نیست');return}
  const requestId=crypto.randomUUID();let body;try{body=prepare(form,ctx,report,requestId)}catch(e){setError(e.message);return}
  if(!window.confirm('ایجاد پرونده واقعی در وضعیت DRAFT: آیا منبع ثبت، رضایت و اختیار قانونی برای ثبت را تأیید می‌کنید؟ هیچ مأموریت/اعزامی خودکار ساخته نمی‌شود.'))return;
  const n=++serial.current;setBusy(true);setError('');setOk('');try{verifiedCreation(await readJson(path(ctx),body),ctx,body);const updated=safeReport(await readJson(path(ctx)),ctx);if(n===serial.current){setReport(updated);setForm({...clean});setOk('پرونده واقعی در وضعیت پیش‌نویس ثبت شد؛ بررسی و مجوز اقدام جداگانه لازم است.')}}catch(e){if(n===serial.current)setError(e.message)}finally{if(n===serial.current)setBusy(false)}
 }
 const change=(k,v)=>setForm(s=>({...s,[k]:v}));
 if(!ctx)return <section style={panel} role="alert">این بخش فقط در سیستم‌عامل معاونت و شهرداری مجاز باز می‌شود.</section>;
 return <section dir="rtl" style={panel}><header style={{display:'flex',gap:10,justifyContent:'space-between',flexWrap:'wrap'}}><h2 style={{margin:0,fontSize:20}}>ثبت کنترل‌شده پرونده واقعی خدمات شهری</h2><button type="button" onClick={reload} disabled={busy} style={button}>تازه‌سازی</button></header>
 <p>فقط در شهرداری دارای مجوز <code>{cityId}</code> | ثبت اولیه: <strong>DRAFT</strong> | مجوز بهره‌برداری: <strong>NO_GO</strong></p>
 {busy&&<p role="status">در حال بررسی سرویس و پرونده‌های موجود…</p>}{error&&<p role="alert" style={{color:'#a31e32'}}>{error}</p>}{ok&&<p role="status" style={{color:'#146c43'}}>{ok}</p>}
 {report&&<><p>خدمات فعال با مالک فعال: <strong>{report.services.length}</strong> | پرونده‌های پیش‌نویس قابل مشاهده: <strong>{report.cases.length}</strong> {report.truncated?'(فهرست ناقص؛ بررسی دستی لازم است)':''}</p>
 <details><summary>پرونده‌های پیش‌نویس مجاز</summary>{report.cases.length===0?<p>هنوز پرونده واقعی ثبت نشده است.</p>:<ul>{report.cases.map(c=><li key={c.id}><strong>{c.summary}</strong> — {c.priority} — <code>{c.id}</code></li>)}</ul>}</details>
 {report.canCreate&&currentRole==='MUNICIPAL_ADMIN'?<form style={{display:'grid',gap:10,maxWidth:750,marginTop:16}} onSubmit={submit}><h3>اقدام صریح مدیر شهرداری</h3>
 <label>خدمت فعال واقعی<select style={input} value={form.serviceId} required onChange={e=>change('serviceId',e.target.value)}><option value="">انتخاب خدمت با واحد مالک فعال</option>{report.services.map(s=><option key={s.id} value={s.id}>{s.code} — {s.name_fa}</option>)}</select></label>
 <label>عنوان پرونده<input required minLength={8} maxLength={180} style={input} value={form.summary} onChange={e=>change('summary',e.target.value)}/></label>
 <label>شرح غیرشخصی مسئله<textarea required minLength={15} maxLength={800} style={input} rows={3} value={form.description} onChange={e=>change('description',e.target.value)}/></label>
 <label>شماره منبع ثبت رسمی<input required minLength={8} maxLength={120} style={input} value={form.sourceReference} onChange={e=>change('sourceReference',e.target.value)}/></label>
 <label>یادداشت مستندات (بدون اطلاعات هویتی شهروند)<textarea required minLength={12} maxLength={300} style={input} rows={2} value={form.evidenceNote} onChange={e=>change('evidenceNote',e.target.value)}/></label>
 <label>اولویت<select style={input} value={form.priority} onChange={e=>change('priority',e.target.value)}>{['LOW','NORMAL','HIGH','URGENT'].map(x=><option key={x} value={x}>{x}</option>)}</select></label>
 <button disabled={busy||report.services.length===0} style={button} type="submit">ثبت واقعی پیش‌نویس با تأیید صریح</button><small>این فرم برای سناریوهای ساختگی استفاده نمی‌شود. شماره منبع ثبت به‌تنهایی صحت مستقل مجوز را اثبات نمی‌کند. هیچ کار میدانی، تخصیص ناوگان یا Temporal اجرا نمی‌شود.</small></form>:<p>ثبت پرونده واقعی فقط برای مدیر مجاز شهرداری امکان‌پذیر است؛ سایر نقش‌ها فقط مشاهده دارند.</p>}</>}
 </section>;
}
