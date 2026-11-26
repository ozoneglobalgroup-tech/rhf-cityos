import React,{useCallback,useEffect,useState} from 'react';
import {BrainCircuit,ShieldCheck,Search,FileText,ArrowLeft,RefreshCcw,AlertTriangle} from 'lucide-react';
import './governed-urban-agent.css';
const INTENTS=[['NEXT_SAFE_ACTION','گام اجرایی مجاز بعدی'],['CAPACITY_OPPORTUNITY','فرصت فعال‌سازی ظرفیت'],['FINANCIAL_CONTROL','کنترل زنجیره مالی']];
const LABELS={read_service_case:'شناسنامه پرونده',read_execution_evidence:'مأموریت، دستورکار و بازرسی',read_finance_evidence:'اسناد مالی همان پرونده',read_value_capacity_evidence:'ظرفیت و پیامد'};
const PATHS=new Set(['cases','missions','execution','finance','inspections','capacity','urban-value','outcomes']);
// Internal, reversible follow-up queue; no mutation of underlying service-case, finance, or capacity records.
function AgentFollowupQueue({city,api,access,cases}){
 const [items,setItems]=useState([]),[caseId,setCaseId]=useState(''),[note,setNote]=useState(''),[requestKey,setRequestKey]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const role=access?.role||'';const canPropose=['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR'].includes(role);
 const canReview=role==='MUNICIPAL_ADMIN';
 const load=useCallback(async()=>{if(!city)return;try{const r=await api(`/cities/${city}/agent-followups`);setItems(r.rows||[]);setError('');}catch(e){setError(e.message);}},[city,api]);
 useEffect(()=>{setItems([]);setCaseId('');setNote('');setRequestKey('');load()},[load]);
 async function propose(e){e.preventDefault();if(busy||!canPropose)return;setBusy(true);setError('');setMessage('');
  const k=requestKey||crypto.randomUUID();setRequestKey(k);
  try{await api(`/cities/${city}/agent-followups`,'POST',{caseId,requestKey:k,kind:'CASE_FOLLOWUP',note});setNote('');setCaseId('');setRequestKey('');setMessage('پیشنهاد پیگیری ثبت شد؛ نیازمند بررسی مستقل است.');await load();}
  catch(e){setError(e.message);}finally{setBusy(false);}}
 async function decide(x,action){const prompts={AUTHORIZE:'مرجع و مستند تأیید مستقل (حداقل ۸ کاراکتر):',REJECT:'دلیل رد (حداقل ۸ کاراکتر):',EXECUTE:'شرح بازکردن وظیفه پیگیری داخلی (حداقل ۸ کاراکتر):',CANCEL:'دلیل لغو وظیفه پیگیری داخلی (حداقل ۸ کاراکتر):'};
  const text=window.prompt(prompts[action]);if(text===null)return;if(text.trim().length<8){setError('شرح مستند باید حداقل ۸ کاراکتر باشد.');return;}
  if(action==='EXECUTE'&&!window.confirm('این اقدام فقط وظیفه پیگیری داخلی را فعال می‌کند؛ پرونده یا امور مالی را تغییر نمی‌دهد. ادامه می‌دهید؟'))return;
  setBusy(true);setError('');setMessage('');try{await api(`/cities/${city}/agent-followups/${x.id}`,'PATCH',{action,note:text.trim()});setMessage('وضعیت وظیفه ثبت شد؛ هیچ پرونده یا رکورد مالی تغییر نکرده است.');await load();}catch(e){setError(e.message);}finally{setBusy(false);}}
 const labels={PROPOSED:'پیشنهادشده',AUTHORIZED:'مجازشده',EXECUTED:'وظیفه پیگیری فعال',REJECTED:'ردشده',CANCELLED:'لغوشده'};
 return <section className="gua-follow" aria-label="صف اقدام عامل">
  <h3>صف اقدامات محدود عامل — پیگیری داخلی</h3>
  <p>این اولین ابزار نوشتنی تحت کنترل انسان است. تصویب باید با هویت جدا از پیشنهاددهنده انجام شود. اجرای آن صرفاً یک وظیفه داخلی ایجاد می‌کند و قابل لغو مستند است.</p>
  {error&&<p className="gua-error" role="alert">{error}</p>}{message&&<p className="gua-success" role="status">{message}</p>}
  {canPropose&&<form className="gua-follow-form" onSubmit={propose}>
    <label>پرونده مرتبط<select value={caseId} required onChange={e=>{setCaseId(e.target.value);setRequestKey('')}}><option value="">انتخاب پرونده شهرداری جاری</option>{cases.map(c=><option key={c.id} value={c.id}>{c.summary}</option>)}</select></label>
    <label>موضوع پیگیری قابل انجام (۱۲ تا ۶۰۰ کاراکتر)<textarea value={note} required minLength={12} maxLength={600} onChange={e=>{setNote(e.target.value);setRequestKey('')}} placeholder="برای مثال: بررسی و جمع‌آوری مستندات کسری ظرفیت پرونده DEMO-03"/></label>
    <button type="submit" disabled={!caseId||note.trim().length<12||busy}>پیشنهاد وظیفه پیگیری</button>
  </form>}
  <button type="button" disabled={busy} onClick={load}>بازخوانی صف اقدامات</button>
  {items.length===0?<p>برای شهرداری انتخابی، وظیفه‌ای ثبت نشده است.</p>:<div className="gua-follow-list">{items.map(x=><article key={x.id}>
   <b>{x.caseSummary||x.caseId}</b><span>{labels[x.status]||x.status}</span><p>{x.note}</p>
   <small>پیشنهاددهنده: {x.createdBy.slice(0,8)} · بازبین: {x.approvedBy?.slice(0,8)||'—'} · {new Date(x.createdAt).toLocaleString('fa-IR')}</small>
   <div className="gua-follow-buttons">
   {x.status==='PROPOSED'&&canReview&&<><button disabled={busy} type="button" onClick={()=>decide(x,'AUTHORIZE')}>تأیید مستقل</button><button disabled={busy} type="button" onClick={()=>decide(x,'REJECT')}>رد مستند</button></>}
   {x.status==='AUTHORIZED'&&canPropose&&<button disabled={busy} type="button" onClick={()=>decide(x,'EXECUTE')}>فعال‌کردن وظیفه داخلی</button>}
   {['PROPOSED','AUTHORIZED','EXECUTED'].includes(x.status)&&canReview&&<button disabled={busy} type="button" onClick={()=>decide(x,'CANCEL')}>لغو مستند</button>}
   </div></article>)}</div>}
  <p className="gua-foot">فهرست حداکثر ۵۰ وظیفه اخیر است. «اجراشده» فقط به معنی فعال‌شدن پیگیری در این صف است؛ هیچ دستورکار، اعتبار، پرداخت یا نتیجه عمومی تأیید نشده است.</p>
 </section>;
}
export default function GovernedUrbanAgent({city,cityName,cases=[],api,access,navigate}){
 const [status,setStatus]=useState(null),[history,setHistory]=useState([]),[caseId,setCaseId]=useState(''),[intent,setIntent]=useState('NEXT_SAFE_ACTION');
 const [useModel,setUseModel]=useState(false),[consent,setConsent]=useState(false),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const canRun=['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR'].includes(access?.role||'');
 const refresh=useCallback(async()=>{
  if(!city)return;setError('');setResult(null);setStatus(null);setHistory([]);setCaseId('');setBusy(true);
  try{let [s,h]=await Promise.all([api(`/cities/${city}/agent-status`),api(`/cities/${city}/agent-history`)]);setStatus(s);setHistory(h.rows||[]);}
  catch(e){setError(e.message);}finally{setBusy(false);}
 },[city,api]);
 useEffect(()=>{refresh()},[refresh]);
 async function run(e){e.preventDefault();if(!caseId||!canRun)return;setBusy(true);setResult(null);setError('');
  try{const r=await api(`/cities/${city}/agent-plan`,'POST',{caseId,intent,useModel,externalConsent:useModel?consent:false});setResult(r);let h=await api(`/cities/${city}/agent-history`);setHistory(h.rows||[]);}
  catch(e){setError(e.message);}finally{setBusy(false);}}
 return <section className="gua" dir="rtl">
  <header className="gua-head"><div><span className="gua-kicker"><BrainCircuit size={17}/> GOVERNED URBAN AGENT · V1.3.3</span><h2>عامل راهبری عملیات و خلق ارزش شهری</h2><p>اجرای ابزارهای ثابت فقط‌خواندنی، بررسی شواهد پرونده و پیشنهاد اقدام تحت نظارت انسان در {cityName||'شهرداری انتخابی'}</p></div><button type="button" onClick={refresh} disabled={busy}><RefreshCcw size={16}/> بازخوانی</button></header>
  <div className="gua-notice"><ShieldCheck size={19}/><span>این قابلیت هیچ مأموریت، دستورکار، قرارداد، هزینه، تخصیص منابع یا تأیید جدیدی ایجاد نمی‌کند. تنها رخداد ممیزی حداقلی ثبت می‌شود. اجرای مدل خارجی اختیاری و نیازمند رضایت موردی است.</span></div>
  {error&&<div role="alert" className="gua-error">{error}</div>}
  {status&&<div className="gua-meta"><span><b>سطح عامل:</b> {status.mode}</span><span><b>مدل:</b> {status.modelEnabled?'قابل استفاده با رضایت':'غیرفعال'}</span><span><b>محدودیت ابزار:</b> {status.maxTools} خواندن</span><span><b>نقش:</b> {status.role}</span></div>}
  <form className="gua-form" onSubmit={run}>
   <label>پرونده خدمات شهری
    <select value={caseId} onChange={e=>setCaseId(e.target.value)} required><option value="">یک پرونده واقعی از همین شهرداری انتخاب کنید</option>{cases.map(c=><option key={c.id} value={c.id}>{c.summary} — {c.status}</option>)}</select>
   </label>
   <label>هدف تحلیل
    <select value={intent} onChange={e=>setIntent(e.target.value)}>{INTENTS.map(([id,t])=><option key={id} value={id}>{t}</option>)}</select>
   </label>
   <label className="gua-check"><input type="checkbox" disabled={!status?.modelEnabled} checked={useModel&&!!status?.modelEnabled} onChange={e=>{setUseModel(e.target.checked);setConsent(false);}}/> افزودن تحلیل مدل زبانی (اختیاری)</label>
   {useModel&&<label className="gua-check"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> رضایت می‌دهم فقط خلاصه محدود شواهد همین پرونده به مدل خارجی ارسال شود.</label>}
   <button type="submit" disabled={!caseId||busy||!canRun||(useModel&&!consent)}><Search size={17}/>{busy?'در حال بررسی شواهد':'اجرای تحلیل فقط‌خواندنی'}</button>
   {!canRun&&<p className="gua-foot">این نقش فقط می‌تواند گزارش‌های مجاز را مشاهده کند؛ اجرای عامل برای مدیر و معاون تعریف شده است.</p>}
  </form>
  {result&&<div className="gua-results">
   <h3>گزارش شواهد و پیشنهاد بعدی</h3>
   <div className="gua-cards">{result.facts.map((f,i)=><article key={i}><small>{f.label}</small><strong>{f.value}</strong></article>)}</div>
   <h4>ابزارهای اجراشده در محدوده شهرداری</h4><div className="gua-tools">{result.toolTrace.map(t=><span key={t}>{LABELS[t]||t}</span>)}</div>
   <h4>برنامه پیشنهادی — نیازمند اقدام کاربر مجاز</h4>
   <div className="gua-steps">{result.steps.map((x,i)=><article key={i}><span className="gua-num">{i+1}</span><div><b>{x.label}</b><p>{x.reason}</p></div>{PATHS.has(x.where)&&<button type="button" onClick={()=>navigate(x.where)}>ورود به میزکار <ArrowLeft size={14}/></button>}</article>)}</div>
   {result.modelComment&&<div className="gua-model"><h4><BrainCircuit size={16}/> توضیح پیشنهادی مدل — تأییدنشده</h4><p>{result.modelComment}</p></div>}
   {result.modelStatus==='PROVIDER_UNAVAILABLE'&&<div className="gua-warning"><AlertTriangle size={16}/> ارتباط مدل ناموفق بود؛ برنامه فوق صرفاً براساس قواعد قطعی و داده ثبت‌شده است.</div>}
   <div className="gua-notice"><FileText size={17}/><span>{result.notices.join(' ')}</span></div>
  </div>}
  <div className="gua-history"><h3>حسابرسی اجراهای قبلی</h3>{history.length===0?<p>هنوز اجرای ثبت‌شده‌ای برای این شهرداری وجود ندارد.</p>:<div className="gua-historyrows">{history.map(x=><article key={x.id}><b>{x.details?.intent||'AGENT_PLAN'}</b><small>{new Date(x.created_at).toLocaleString('fa-IR')}</small><span>{(x.details?.toolNames||[]).length} ابزار · بدون تغییر عملیاتی</span></article>)}</div>}<p className="gua-foot">۳۰ رویداد اخیر؛ پرسش‌ها و پاسخ‌های مدل در این دفتر نگهداری نمی‌شوند. این گزارش جایگزین آزمون مستقل کیفیت، امنیت یا تأیید ارزش عمومی نیست.</p></div>
  <AgentFollowupQueue city={city} api={api} access={access} cases={cases}/>
 </section>;
}
