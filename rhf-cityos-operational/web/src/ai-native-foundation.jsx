import React,{useCallback,useEffect,useRef,useState} from 'react';
import {BrainCircuit,BookOpen,ShieldCheck,RefreshCcw,Send,ClipboardCheck,History,Info} from 'lucide-react';
import './ai-native-foundation.css';
const draft={title:'',sourceRef:'',body:''};
export default function AiNativeFoundation({city,cityName,api,access,actorId,navigate}){
 const serial=useRef(0),[view,setView]=useState('assistant'),[state,setState]=useState(null),[busy,setBusy]=useState(false),[answerBusy,setAnswerBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[form,setForm]=useState(draft),[reviews,setReviews]=useState({}),[question,setQuestion]=useState(''),[selected,setSelected]=useState(''),[consent,setConsent]=useState(false),[answer,setAnswer]=useState(null);
 const editable=['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR'].includes(access?.role);
 const reload=useCallback(async()=>{if(!city)return;let n=++serial.current;setBusy(true);setError('');try{let [status,docs,trail,values]=await Promise.all([
  api(`/cities/${city}/ai-status`),api(`/cities/${city}/ai-knowledge`),api(`/cities/${city}/ai-interactions`),api(`/cities/${city}/value-cases`)]);
  if(n===serial.current)setState({city,status,docs:docs.rows||[],audit:trail.rows||[],values:values.rows||[]});
 }catch(e){if(n===serial.current)setError(e.message)}finally{if(n===serial.current)setBusy(false)}},[city,api]);
 useEffect(()=>{setState(null);setAnswer(null);setConsent(false);setQuestion('');setSelected('');setForm(draft);setNotice('');reload();return()=>{serial.current++}},[reload,city]);
 const run=async(fn,msg)=>{setError('');setNotice('');setBusy(true);try{await fn();setNotice(msg);await reload()}catch(e){setError(e.message)}finally{setBusy(false)}};
 const create=e=>{e.preventDefault();run(()=>api(`/cities/${city}/ai-knowledge`,'POST',form),'منبع در وضعیت پیش‌نویس ثبت شد؛ هنوز برای مدل قابل استفاده نیست.')};
 const review=(id,action)=>run(()=>api(`/cities/${city}/ai-knowledge/${id}`,'PATCH',{action,reviewNote:reviews[id]||''}),'بررسی مستقل منبع ثبت شد.');
 async function ask(e){e.preventDefault();setError('');setAnswer(null);setAnswerBusy(true);try{let r=await api(`/cities/${city}/ai-assist`,'POST',{question,valueCaseId:selected||null,externalConsent:consent});setAnswer(r);setConsent(false);await reload()}catch(e){setError(e.message)}finally{setAnswerBusy(false)}}
 let active=state?.city===city?state:null;
 return <section dir="rtl" className="aina">
  <header className="aina-header"><div><small>RHF ACOS / AI-NATIVE FOUNDATION</small><h2>دستیار مستند و دانش شهری</h2><p>{cityName} · تحلیل محدود، ارجاع‌پذیر و تحت کنترل انسانی</p></div><button onClick={reload} disabled={busy}><RefreshCcw size={16}/> بازخوانی</button></header>
  <div className="aina-alert"><ShieldCheck size={20}/><span>این نسخه دستیار فقط‌خواندنی است؛ هیچ قرارداد، بودجه، تخصیص منابع یا وضعیت پرونده‌ای را تغییر نمی‌دهد. خروجی AI پیشنهاد است، نه تصمیم اداری یا اثبات ارزش عمومی.</span></div>
  {error&&<div className="aina-error" role="alert">{error}</div>}{notice&&<div className="aina-success" role="status">{notice}</div>}
  {!active&&!error&&<p>در حال خواندن داده‌های شهرداری انتخاب‌شده...</p>}
  {active&&<>
   <div className="aina-metrics"><article><small>اتصال مدل خارجی</small><strong>{active.status.enabled?'آماده با رضایت کاربر':'غیرفعال'}</strong></article><article><small>منابع تأییدشده</small><strong>{active.docs.filter(x=>x.status==='APPROVED').length}</strong></article><article><small>درخواست ثبت‌شده</small><strong>{active.audit.length}</strong><small>حداکثر ۵۰ درخواست اخیر</small></article></div>
   <nav className="aina-tabs">{[['assistant','دستیار تحلیلی',BrainCircuit],['knowledge','دانش شهری',BookOpen],['audit','حسابرسی AI',History]].map(([id,label,Icon])=><button key={id} className={view===id?'active':''} onClick={()=>setView(id)}><Icon size={16}/>{label}</button>)}</nav>
   {view==='assistant'&&<div className="aina-panel"><h3><BrainCircuit size={19}/> تحلیل هوشمندِ پرونده ارزش</h3>
    <div className="aina-info"><Info size={17}/> مدل: {active.status.model} · {active.status.enabled?'فعال در سرور':'به‌صورت امن غیرفعال؛ کلید در مرورگر وارد نمی‌شود'}</div>
    <form onSubmit={ask} className="aina-form">
      <label>پرونده فرصت ارزش (اختیاری)<select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">بدون پرونده خاص</option>{active.values.map(v=><option value={v.id} key={v.id}>{v.title}</option>)}</select></label>
      <label>پرسش مستند<textarea minLength="6" maxLength="650" value={question} onChange={e=>setQuestion(e.target.value)} required rows={4} placeholder="براساس خط مبنا و ظرفیت قابل استفاده، گام بعدی و شکاف شواهد را بررسی کن..."/></label>
      <label className="aina-check"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> اجازه می‌دهم فقط متن پرسش و زمینه محدود همین شهرداری برای این درخواست به سرویس مدل خارجی ارسال شود.</label>
      <button type="submit" className="aina-primary" disabled={!active.status.enabled||!consent||answerBusy||busy||question.trim().length<6}><Send size={16}/>{answerBusy?'در حال تحلیل':'تحلیل با AI'}</button>
    </form>
    {!active.status.enabled&&<p className="aina-warning">مدل AI هنوز در سرور فعال نشده است. برای فعال‌سازی امن، راهنمای README بسته نصب و تأیید مسئول داده را بررسی کنید. بدون اتصال، پاسخ مصنوعی نمایش داده نمی‌شود.</p>}
    {answer&&<article className="aina-answer"><h4>پاسخ پیشنهادی مدل — نیازمند راستی‌آزمایی</h4><p>{answer.answer}</p><p className="aina-small">{answer.notice}</p><h4>مراجع تأییدشده ارسال‌شده</h4>{answer.sources.length?answer.sources.map(s=><p key={s.id}><b>[{s.ref}]</b> {s.title} — {s.sourceRef}</p>):<p>منبع متنیِ منطبق پیدا نشد؛ پاسخ باید این محدودیت را لحاظ کند.</p>}</article>}
   </div>}
   {view==='knowledge'&&<div className="aina-panel"><h3><BookOpen size={19}/> مخزن دانش با بررسی مستقل</h3><p className="aina-small">منابع DRAFT به مدل منتقل نمی‌شوند؛ فقط سند APPROVED و مرتبط، آن هم پس از رضایت موردی قابل بازیابی است.</p>
    {editable&&<form onSubmit={create} className="aina-form"><label>عنوان سند<input required maxLength="160" value={form.title} onChange={e=>setForm(s=>({...s,title:e.target.value}))}/></label><label>مرجع قابل‌ردیابی<input required maxLength="350" value={form.sourceRef} onChange={e=>setForm(s=>({...s,sourceRef:e.target.value}))} placeholder="شناسه مصوبه، دستورالعمل یا گزارش با نسخه و تاریخ"/></label><label>چکیده مستند و بازبینی‌شده<textarea required minLength="30" maxLength="1600" rows={5} value={form.body} onChange={e=>setForm(s=>({...s,body:e.target.value}))}/></label><button disabled={busy} className="aina-primary">ثبت منبع پیش‌نویس</button></form>}
    {active.docs.length===0&&<p>هنوز منبع شهری ثبت نشده است.</p>}
    {active.docs.map(d=><article key={d.id} className="aina-doc"><strong>{d.title}</strong><small>{d.status} · {d.source_ref}</small><p>{d.body}</p>
    {editable&&d.status==='DRAFT'&&d.created_by!==actorId&&<div className="aina-review"><textarea rows={2} minLength={8} maxLength={800} placeholder="دلیل بررسی، مرجع اختیار و محدودیت‌های منبع" value={reviews[d.id]||''} onChange={e=>setReviews(s=>({...s,[d.id]:e.target.value}))}/><button disabled={busy||(reviews[d.id]||'').trim().length<8} onClick={()=>review(d.id,'APPROVE')}><ClipboardCheck size={16}/> تأیید مستقل</button><button disabled={busy||(reviews[d.id]||'').trim().length<8} onClick={()=>review(d.id,'REJECT')}>رد مستند</button></div>}
    </article>)}<p className="aina-small">حداکثر ۸۰ سند اخیر نمایش داده می‌شود.</p></div>}
   {view==='audit'&&<div className="aina-panel"><h3><History size={19}/> ردپای استفاده از مدل</h3><p className="aina-small">فقط هش درخواست، هش پاسخ، مدل و وضعیت ذخیره می‌شوند؛ متن محرمانه و کلید API در جدول AI ذخیره نمی‌شوند.</p>{active.audit.length===0&&<p>هنوز درخواست AI اجرا نشده است.</p>}{active.audit.map(x=><article key={x.id} className="aina-doc"><strong>{x.status} · {x.model}</strong><small>{new Date(x.requested_at).toLocaleString('fa-IR')} · {x.latency_ms} ms</small><code>request sha256: {x.request_sha256}</code></article>)}</div>}
  </>}
 </section>;
}
