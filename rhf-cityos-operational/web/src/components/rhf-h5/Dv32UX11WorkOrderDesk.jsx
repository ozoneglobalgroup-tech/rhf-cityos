import React,{useEffect,useRef,useState} from 'react';
import {UUID} from './Dv32UX4RouterCore.mjs';
const names={'work-orders':'dv32ux11-work-orders','temporal-handoff':'dv32ux12-temporal-handoff'};
const header={'X-RHF-DV32UX11-Intent':'EXPLICIT_TWO_PERSON_WORKFLOW_NO_DISPATCH'};
async function request(url,body,signal){
 const res=await fetch(url,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',signal,headers:body?{'Content-Type':'application/json',...header}:undefined,body:body?JSON.stringify(body):undefined});
 const obj=await res.json().catch(()=>({}));if(!res.ok)throw Error(obj.error||`HTTP ${res.status}`);return obj;
}
const field={font:'inherit',border:'1px solid #8daebf',borderRadius:9,padding:'11px 13px',background:'#fff',color:'#10344a',width:'100%',boxSizing:'border-box'};
const button={font:'inherit',border:0,borderRadius:9,padding:'11px 17px',background:'#006779',color:'#fff',fontWeight:650,cursor:'pointer'};
export default function Dv32UX11WorkOrderDesk({desk,tab,cityId,tenantId,orgId,currentRole}){
 const valid=desk==='deputy'&&Object.hasOwn(names,tab)&&UUID.test(cityId)&&UUID.test(tenantId)&&!orgId;
 const [state,setState]=useState(null),[err,setErr]=useState(''),[success,setSuccess]=useState(''),[busy,setBusy]=useState(false);
 const [mode,setMode]=useState('PREPARE'),[plan,setPlan]=useState(''),[proposal,setProposal]=useState(''),[title,setTitle]=useState(''),[instructions,setInstructions]=useState(''),[reason,setReason]=useState(''),[decision,setDecision]=useState('CLEARED_FOR_HANDOFF_REQUEST');
 const serial=useRef(0);const base=valid?`/api/v1/cities/${encodeURIComponent(cityId)}/${names[tab]}`:'';
 const who=`${cityId}|${tenantId}|${tab}|${currentRole}`;
 useEffect(()=>{const n=++serial.current,c=new AbortController();setState(null);setErr('');setSuccess('');if(!valid)return()=>c.abort();setBusy(true);
 request(base,null,c.signal).then(d=>{if(n!==serial.current||c.signal.aborted)return;if(d.cityId!==cityId||d.tenantId!==tenantId||d.finalGo!=='NO_GO'||d.temporalStarted!==false||d.dispatchAuthorized!==false||!Array.isArray(d.items))throw Error('UNTRUSTED_SERVER_RESPONSE');setState(d);}).catch(e=>{if(n===serial.current&&!c.signal.aborted)setErr(e.message)}).finally(()=>{if(n===serial.current&&!c.signal.aborted)setBusy(false)});return()=>c.abort();},[who]);
 async function reload(){if(!valid)return;const n=++serial.current;setBusy(true);setErr('');try{const d=await request(base);if(d.cityId!==cityId||d.tenantId!==tenantId||d.finalGo!=='NO_GO'||d.temporalStarted!==false||d.dispatchAuthorized!==false||!Array.isArray(d.items))throw Error('UNTRUSTED_SERVER_RESPONSE');if(n===serial.current)setState(d);}catch(e){if(n===serial.current)setErr(e.message)}finally{if(n===serial.current)setBusy(false)}}
 async function submit(e){e.preventDefault();if(!valid||busy||!state?.canWrite||state.truncated||currentRole!=='MUNICIPAL_ADMIN')return;
  if(!globalThis.crypto?.randomUUID){setErr('SECURE_UUID_REQUIRED');return}
  let body;
  if(tab==='work-orders')body=mode==='PREPARE'?{action:mode,confirm:'I_CONFIRM_DRAFT_WORK_ORDER_NO_FIELD_DISPATCH',requestId:crypto.randomUUID(),planId:plan,title,instructions}
   :{action:'DECIDE',confirm:'I_INDEPENDENTLY_REVIEWED_CURRENT_EVIDENCE',proposalId:proposal,decision,reason};
  else body={action:'REQUEST_HANDOFF',confirm:'I_REQUEST_OPERATOR_HANDOFF_NOT_WORKFLOW_START',requestId:crypto.randomUUID(),proposalId:proposal,reason};
  if(!window.confirm('ثبت این اقدام فقط یک درخواست قابل حسابرسی است. هیچ اعزام میدانی، تخصیص منابع یا اجرای Temporal انجام نمی‌شود. تأیید می‌کنید؟'))return;
  const n=++serial.current;setBusy(true);setErr('');setSuccess('');try{const result=await request(base,body);if(result.temporalStarted!==false||result.dispatchAuthorized!==false||result.finalGo!=='NO_GO')throw Error('ACTION_RESPONSE_UNTRUSTED');
   if(n===serial.current){setSuccess('در دفتر حسابرسی ثبت شد؛ هیچ گردش‌کار یا عملیات میدانی آغاز نشده است.');setReason('');setInstructions('');setTitle('');setPlan('');setProposal('');}
   const d=await request(base);if(d.cityId!==cityId||d.tenantId!==tenantId||d.finalGo!=='NO_GO')throw Error('REPORT_SCOPE_MISMATCH');if(n===serial.current)setState(d);
  }catch(e){if(n===serial.current)setErr(e.message)}finally{if(n===serial.current)setBusy(false)}
 }
 if(!valid)return <section role="alert" className="rhf-ux-module">این مسیر تنها در معاونت خدمات شهری شهرداری مجاز است.</section>;
 const isWork=tab==='work-orders';const decisionList=(state?.items||[]).filter(x=>x.decision==='PENDING'&&!x.ownProposal&&!x.ownCase&&!x.ownReview);
 const handoffList=(state?.items||[]).filter(x=>x.canRequest);
 return <section dir="rtl" className="rhf-ux-module rhf-ux-work-orders" aria-label={isWork?'دستورکارهای پیشنهادی':'تحویل مستند به مسئول Temporal'}>
  <header className="rhf-ux-module-heading"><div><span className="rhf-ux-kicker">RHF / GOVERNED OPERATIONS</span><h2>{isWork?'درخواست دستورکار و بررسی مستقل':'دفتر درخواست تحویل به مسئول Temporal'}</h2>
   <p>{isWork?'برگه برنامه‌ریزی تأییدشده، به پیشنهاد دستورکار تبدیل می‌شود و سپس فرد دیگر درباره آن تصمیم می‌گیرد.':'پس از بررسی مستقل دستورکار، شخص ثالث فقط درخواست تحویل به مسئول گردش‌کار را ثبت می‌کند.'}</p></div><button type="button" style={button} disabled={busy} onClick={reload}>تازه‌سازی</button></header>
  <div className="rhf-ux-stepper" aria-label="مراحل کنترل انسانی"><span>۱. پرونده معتبر</span><span>۲. بررسی مستقل</span><span>۳. برگه برنامه‌ریزی</span><span>۴. دستورکار</span><span>۵. درخواست تحویل</span></div>
  <p className="rhf-ux-boundary"><strong>مرز عملیاتی:</strong> هیچ رزرو منبع، صدور مأموریت اجرایی، شروع Temporal یا اثبات ارزش شهری در این صفحه انجام نمی‌شود. FINAL_GO=NO.</p>
  {busy&&<p role="status">در حال بررسی مجوز و سوابق…</p>}{err&&<p role="alert" className="rhf-ux-alert">{err}</p>}{success&&<p role="status" className="rhf-ux-success">{success}</p>}
  {state&&<><div className="rhf-ux-metrics"><span className="rhf-ux-metric">دفتر: {state.items.length} مورد</span><span className="rhf-ux-metric">{isWork?`در انتظار تصمیم: ${state.items.filter(x=>x.decision==='PENDING').length}`:`در انتظار اپراتور: ${state.items.filter(x=>x.handoffId).length}`}</span><span className="rhf-ux-metric">وضعیت: کنترل انسانی</span></div>
   {state.truncated&&<p role="alert">فهرست کامل نیست؛ اقدامات جدید برای جلوگیری از تصمیم با داده ناقص مسدود است.</p>}
   <div className="rhf-ux-columns"><article className="rhf-ux-subpanel"><h3>سوابق اخیر</h3>{state.items.length===0?<p>هنوز موردی ثبت نشده است.</p>:state.items.map(x=><div key={x.id} className="rhf-ux-item"><strong>{x.title}</strong><small dir="ltr">{x.id}</small><span>{isWork?x.decision:x.handoffStatus}</span></div>)}</article>
   <article className="rhf-ux-subpanel"><h3>نقش و مسئولیت</h3><p>مشاهده و کنترل سوابق تابع محدوده شهرداری و نقش حساب جاری است. حساب ایجادکننده نمی‌تواند تصمیم خود را تأیید کند.</p><p>درخواست تحویل تنها پس از تصمیم مستقل و به دست شخص ثالث ثبت می‌شود.</p></article></div>
   {state.canWrite&&currentRole==='MUNICIPAL_ADMIN'&&!state.truncated?<form className="rhf-ux-form" onSubmit={submit} style={{maxWidth:760,marginTop:18}}>
    <h3>{isWork?'ثبت درخواست انسانی دستورکار':'ثبت درخواست تحویل برای بررسی اپراتور'}</h3>
    {isWork&&<label>اقدام<select style={field} value={mode} onChange={e=>setMode(e.target.value)}><option value="PREPARE">پیشنهاد دستورکار از روی برگه برنامه‌ریزی</option><option value="DECIDE">تصمیم مستقل درباره پیشنهاد فرد دیگر</option></select></label>}
    {isWork&&mode==='PREPARE'?<><label>برگه برنامه‌ریزی<select style={field} required value={plan} onChange={e=>setPlan(e.target.value)}><option value="">انتخاب</option>{(state.plans||[]).map(x=><option key={x.id} value={x.id}>{x.summary||x.caseId}</option>)}</select></label>
     <label>عنوان دستورکار پیشنهادی<input style={field} required minLength={8} maxLength={160} value={title} onChange={e=>setTitle(e.target.value)}/></label>
     <label>شرح پیشنهادی اقدامات<textarea style={field} required minLength={16} maxLength={500} rows={4} value={instructions} onChange={e=>setInstructions(e.target.value)}/></label></>:
     <><label>{isWork?'دستورکار آماده بررسی مستقل':'دستورکار تأییدشده و آماده درخواست تحویل'}<select style={field} required value={proposal} onChange={e=>setProposal(e.target.value)}><option value="">انتخاب</option>{(isWork?decisionList:handoffList).map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
     {isWork&&<label>نظر بررسی‌کننده<select style={field} value={decision} onChange={e=>setDecision(e.target.value)}><option value="CLEARED_FOR_HANDOFF_REQUEST">مجاز برای درخواست تحویل، نه اجرا</option><option value="RETURNED_FOR_REVISION">بازگشت برای اصلاح</option><option value="REJECTED">رد درخواست</option></select></label>}
     <label>دلیل مستند<textarea style={field} required minLength={16} maxLength={500} rows={3} value={reason} onChange={e=>setReason(e.target.value)}/></label></>}
    <button type="submit" style={button} disabled={busy||(isWork&&mode==='PREPARE'?!plan:!proposal)}>ثبت با تأیید صریح و حسابرسی</button>
    <small>اقدام با حساب فعلی ثبت می‌شود؛ نام، شهر و شناسه بازیگر از فرم کاربر پذیرفته نمی‌شود.</small>
   </form>:<p>امکان ثبت فقط برای مدیر مجاز شهرداری شیراز فعال است.</p>}</>}
 </section>;
}
