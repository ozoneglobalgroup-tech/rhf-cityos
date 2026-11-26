import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Activity,ArrowLeft,BrainCircuit,CheckCircle2,ClipboardCheck,Database,LockKeyhole,PlayCircle,RefreshCw,ShieldAlert,ShieldCheck} from 'lucide-react';
import {AGENT_BRIDGE_VERSION,AGENT_INTENTS,makeInternalFollowup,mayDecide,planRequest,scopedServiceCases,validId,verifyAudit,verifyFollowups,verifyPlan,verifyServerStatus} from './governed-agent-bridge-v8p39-core.mjs';
import './governed-agent-bridge-v8p39.css';
const E=x=>encodeURIComponent(String(x||''));
const roles=new Set(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR']);
const actionLabels={AUTHORIZE:'تأیید مستقل',REJECT:'رد مستند',EXECUTE:'ثبت فعال‌سازی پیگیری داخلی',CANCEL:'لغو مستند'};
const statuses={PROPOSED:'پیشنهادشده',AUTHORIZED:'تأییدشده',REJECTED:'ردشده',EXECUTED:'پیگیری داخلی فعال',CANCELLED:'لغوشده'};
export default function DeputyGovernedAgentBridgeV8P39({city,api,actorId=null,onGovernance=()=>{}}){
 const [open,setOpen]=useState(false),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [status,setStatus]=useState(null),[cases,setCases]=useState(null),[followups,setFollowups]=useState(null),[history,setHistory]=useState(null);
 const [caseId,setCaseId]=useState(''),[intent,setIntent]=useState('NEXT_SAFE_ACTION'),[useModel,setUseModel]=useState(false),[consent,setConsent]=useState(false),[plan,setPlan]=useState(null),[reviewId,setReviewId]=useState(''),[reviewAction,setReviewAction]=useState(''),[reviewNote,setReviewNote]=useState('');
 const token=useRef(0),keyRef=useRef(null);
 const url=useMemo(()=>`/cities/${E(city)}`,[city]);
 useEffect(()=>{token.current+=1;setOpen(false);setStatus(null);setCases(null);setFollowups(null);setHistory(null);setPlan(null);setCaseId('');setConsent(false);setUseModel(false);keyRef.current=null;setError('');setNotice('');return()=>{token.current+=1};},[city]);
 const canRun=roles.has(status?.role);
 const selected=cases?.find(c=>c.id===caseId)||null;
 function clearPlan(){setPlan(null);keyRef.current=null;setConsent(false);}
 function contractError(){throw Error('پاسخ API با قرارداد ایمن عامل و مرز شهرداری سازگار نیست. هیچ نتیجه‌ای پذیرفته نشد.');}
 async function load(){
  if(!city||typeof api!=='function')return;
  const n=++token.current;setLoading(true);setError('');setNotice('');setPlan(null);keyRef.current=null;
  try{
   const [s,c,f,h]=await Promise.all([api(`${url}/agent-status`),api(`${url}/cases`),api(`${url}/agent-followups`),api(`${url}/agent-history`)]);
   const ok=verifyServerStatus(s),list=scopedServiceCases(c),queue=verifyFollowups(f),audit=verifyAudit(h);
   if(!ok||!list||!queue||!audit||f.scope!==city)contractError();
   if(n!==token.current)return;
   setStatus(ok);setCases(list);setFollowups(queue);setHistory(audit);
   setCaseId(previous=>list.some(x=>x.id===previous)?previous:'');
  }catch(e){if(n===token.current){setStatus(null);setCases(null);setFollowups(null);setHistory(null);setError(e?.message||'عدم دسترسی به API مجاز');}}
  finally{if(n===token.current)setLoading(false)}
 }
 function toggle(){if(open){token.current++;setOpen(false);clearPlan();setStatus(null);setCases(null);setFollowups(null);setHistory(null);setError('');return;}setOpen(true);void load();}
 async function analyze(){
  if(busy||loading||!selected)return;
  const body=planRequest({caseId,intent,useModel,consent,role:status?.role,status});
  if(!body){setError('نوع پرونده، سطح دسترسی یا رضایت ارسال مدل معتبر نیست');return;}
  const n=token.current;setBusy(true);setError('');setNotice('');clearPlan();
  try{const result=verifyPlan(await api(`${url}/agent-plan`,'POST',body),body);if(!result)contractError();if(n!==token.current)return;setPlan(result);setNotice('تحلیل سروری انجام و ردّ حداقلی حسابرسی ثبت شد؛ هیچ اقدام اجرایی صادر نشده است.');
   const [h,f]=await Promise.all([api(`${url}/agent-history`),api(`${url}/agent-followups`)]);
   if(n===token.current){const audit=verifyAudit(h),queue=verifyFollowups(f);if(audit)setHistory(audit);if(queue&&f.scope===city)setFollowups(queue);}
  }catch(e){if(n===token.current)setError(e?.message||'تحلیل ناموفق بود');}
  finally{if(n===token.current)setBusy(false)}
 }
 async function propose(){
  const note=makeInternalFollowup(plan);if(!note||busy||!canRun||plan.caseId!==caseId)return;
  if(!window.confirm('یک پیشنهاد پیگیری داخلی با شواهد محدود ثبت شود؟ این کار تخصیص، اعزام، پرداخت یا دستور عملیاتی نیست.'))return;
  if(!keyRef.current){const key=window.crypto?.randomUUID?.();if(!validId(key)){setError('امکان تولید کلید درخواست معتبر وجود ندارد');return;}keyRef.current=key;}
  const requestKey=keyRef.current,n=token.current;setBusy(true);setError('');setNotice('');
  try{const r=await api(`${url}/agent-followups`,'POST',{caseId,kind:'CASE_FOLLOWUP',note,requestKey});
   if(!r?.action||r.action.requestKey!==requestKey||r.action.caseId!==caseId)contractError();
   if(n!==token.current)return;
   setNotice('پیشنهاد پیگیری داخلی ثبت شد. برای تأیید، بازبین مستقلی لازم است.');clearPlan();const refreshed=await api(`${url}/agent-followups`);const items=verifyFollowups(refreshed);if(n===token.current&&items&&refreshed.scope===city)setFollowups(items);
  }catch(e){if(n===token.current)setError(e?.message||'ثبت پیشنهاد ناموفق بود؛ همان کلید درخواست برای تلاش مجدد نگه داشته شد');}
  finally{if(n===token.current)setBusy(false)}
 }
 function selectDecision(row,action){if(!mayDecide(action,status?.role,row,actorId))return;setReviewId(row.id);setReviewAction(action);setReviewNote('');setError('');}
 async function decide(){
  const row=followups?.find(r=>r.id===reviewId);if(busy||!mayDecide(reviewAction,status?.role,row,actorId)||reviewNote.trim().length<8||reviewNote.length>500)return;
  if(!window.confirm(`${actionLabels[reviewAction]} — فقط در صف پیگیری داخلی ثبت شود؟`))return;
  const n=token.current;setBusy(true);setError('');setNotice('');
  try{const result=await api(`${url}/agent-followups/${E(row.id)}`,'PATCH',{action:reviewAction,note:reviewNote.trim()});if(!result?.action||result.action.id!==row.id||result.affectedOperationalRecords!==0)contractError();
   if(n!==token.current)return;setNotice(`تصمیم «${actionLabels[reviewAction]}» در صف داخلی ثبت شد؛ رکورد عملیاتی دیگری تغییر نکرد.`);setReviewId('');setReviewNote('');setReviewAction('');
   const latest=await api(`${url}/agent-followups`);const list=verifyFollowups(latest);if(n===token.current&&list&&latest.scope===city)setFollowups(list);
  }catch(e){if(n===token.current)setError(e?.message||'عملیات توسط سرور رد شد');}finally{if(n===token.current)setBusy(false)}
 }
 return <section className="gb39" dir="rtl" data-rhf-governed-agent={AGENT_BRIDGE_VERSION} aria-label="ایجنت رسمی و اقدامات تحت حاکمیت معاونت">
  <div className="gb39-heading"><div><span className="gb39-overline"><BrainCircuit size={16}/> GOVERNED EXECUTION BRIDGE / V8P3.9</span><h3>ایجنت واقعی RUVOS و مسیر تصمیم انسانی</h3><p>اتصال به API عامل موجود؛ پرونده خدمات شهری، چهار ابزار خواندن، برنامه مستند، پیشنهاد پیگیری و تأیید مستقل.</p></div><button type="button" onClick={toggle} aria-expanded={open}>{open?'بستن میزکار':'ورود به اجرای تحت حاکمیت'} <ArrowLeft size={15}/></button></div>
  <div className="gb39-policy"><ShieldCheck size={17}/> تنها تحلیل سروریِ دارای مجوز و پیگیری اداری داخلی. این محیط LangGraph، Temporal، اعزام خودکار یا تأیید ارزش عمومی را اجرا نمی‌کند.</div>
  {!open?null:<div className="gb39-body">
    <div className="gb39-actions"><button type="button" onClick={load} disabled={loading||busy}><RefreshCw size={15}/> بازخوانی API و کارتابل</button><button type="button" onClick={onGovernance}><LockKeyhole size={15}/> گراف اختیار</button></div>
    {loading&&<p role="status">دریافت داده‌های دارای مجوز از RUVOS...</p>}
    {error&&<p role="alert" className="gb39-error">{error}</p>}
    {notice&&<p role="status" className="gb39-notice">{notice}</p>}
    {status&&cases&&<><div className="gb39-stats"><span><b>{status.role}</b><small>نقش مجاز API</small></span><span><b>{cases.length.toLocaleString('fa-IR')}</b><small>پرونده خدمات شهری دریافت‌شده (حداکثر ۳۰۰)</small></span><span><b>{followups?.length??'—'}</b><small>پیگیری‌های اخیر (حداکثر ۵۰)</small></span><span><b>{status.modelEnabled?'با رضایت':'غیرفعال'}</b><small>مدل خارجی</small></span></div>
     <p className="gb39-context"><Database size={16}/> این پرونده‌ها از API عملیاتی <code>/cases</code> خوانده می‌شوند؛ با ۲۸ پرونده آموزشی دفتر تخصصی V8P2 یکسان نیستند. وضعیت مصنوعی‌بودن هر پرونده باید جداگانه بررسی شود.</p>
     <div className="gb39-grid"><div className="gb39-panel"><h4><PlayCircle size={16}/> تحلیل محدود سروری</h4>
       <label>انتخاب پرونده خدمات شهری<select value={caseId} onChange={e=>{setCaseId(e.target.value);clearPlan();}} disabled={busy||loading}><option value="">انتخاب کنید</option>{cases.map(x=><option key={x.id} value={x.id}>{x.summary} · {x.status} · {x.id.slice(0,8)}</option>)}</select></label>
       <label>هدف تحلیل<select value={intent} onChange={e=>{setIntent(e.target.value);clearPlan();}} disabled={busy}>{AGENT_INTENTS.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
       <label className="gb39-check"><input type="checkbox" disabled={busy||!canRun||!status.modelEnabled} checked={useModel} onChange={e=>{setUseModel(e.target.checked);setConsent(false);clearPlan();}}/> افزودن تحلیل مدل خارجی (اختیاری)</label>
       {useModel&&<label className="gb39-check"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> رضایت صریح برای ارسال خلاصه محدود شواهد این پرونده به مدل خارجی</label>}
       <button className="gb39-primary" type="button" disabled={busy||loading||!canRun||!selected||useModel&&!consent} onClick={analyze}>{busy?'در حال اقدام...':'اجرای تحلیل مجاز'}</button>
       {!canRun&&<small>برای نقش شما اجرای عامل مجاز نیست؛ دریافت گزارش‌ها صرفاً خواندنی است.</small>}
       {selected&&<small>شناسه پرونده: <code>{selected.id}</code></small>}
      </div>
      <div className="gb39-panel"><h4><ClipboardCheck size={16}/> نتیجه و منشأ پیشنهاد</h4>{!plan?<p className="gb39-muted">هنوز برنامه معتبر سروری اجرا نشده است.</p>:<><p><b>ردّ ابزار:</b> {plan.toolTrace.join(' · ')}</p><p>مدل: {plan.modelUsed?'درخواست با رضایت اجرا شد':plan.modelStatus==='PROVIDER_UNAVAILABLE'?'سرویس مدل در دسترس نیست':'بدون مدل خارجی'}</p>{plan.modelComment&&<blockquote>{plan.modelComment} <small>توضیح مدل؛ تأییدنشده</small></blockquote>}
       <div className="gb39-facts">{plan.facts.map((f,i)=><div key={i}><small>{f.label}</small><b>{String(f.value)}</b></div>)}</div>
       {plan.steps.map((s,i)=><article className="gb39-step" key={i}><b>{i+1}. {s.label}</b><p>{s.reason}</p><small>نیازمند اقدام مجاز انسانی</small></article>)}
       <button className="gb39-primary" type="button" disabled={busy||!canRun||!makeInternalFollowup(plan)} onClick={propose}>ثبت پیشنهاد پیگیری داخلی (تأیید جداگانه)</button>
       <p className="gb39-muted">برنامه کامل در مرورگر نگه داشته می‌شود؛ API فقط هش شواهد و رویداد حسابرسی حداقلی ثبت می‌کند. ثبت پیگیری، اجرای عملیات شهری نیست.</p>
       </>}
      </div></div>
     <div className="gb39-panel"><h4><Activity size={16}/> صف پیگیری‌های انسانی</h4>{followups?.length?<div className="gb39-queue">{followups.map(x=><article key={x.id}><div className="gb39-row"><b>{x.caseSummary||x.caseId}</b><span>{statuses[x.status]}</span></div><p>{x.note}</p><small>شناسه درخواست: {x.id.slice(0,8)} · پیشنهاددهنده: {x.createdBy.slice(0,8)}</small><div className="gb39-row gb39-controls">{['AUTHORIZE','REJECT','EXECUTE','CANCEL'].filter(a=>mayDecide(a,status.role,x,actorId)).map(a=><button type="button" disabled={busy} key={a} onClick={()=>selectDecision(x,a)}>{actionLabels[a]}</button>)}</div></article>)}</div>:<p className="gb39-muted">در این شهرداری پیگیری ثبت‌شده‌ای در ۵۰ رکورد اخیر وجود ندارد.</p>}
      {reviewId&&<div className="gb39-confirm"><strong>{actionLabels[reviewAction]} برای درخواست {reviewId.slice(0,8)}</strong><label>دلیل و مستند تصمیم (۸ تا ۵۰۰ نویسه)<textarea rows={2} maxLength={500} value={reviewNote} onChange={e=>setReviewNote(e.target.value)}/></label><button type="button" disabled={busy||reviewNote.trim().length<8} onClick={decide}>ثبت تصمیم با هویت فعلی</button><button type="button" onClick={()=>setReviewId('')}>انصراف</button><small>سرور بازبینی توسط پیشنهاددهنده را حتی در صورت نمایش کنترل، رد می‌کند.</small></div>}
     </div>
     <div className="gb39-panel"><h4><ShieldCheck size={16}/> دفتر حسابرسی تحلیل‌های پیشین</h4>{history?.length?<div className="gb39-audit">{history.slice(0,10).map((x,i)=><div key={x.id||i}><span>{x.intent}</span><small>{x.tools} ابزار · {x.event}</small></div>)}</div>:<p className="gb39-muted">رویداد تحلیل ثبت‌شده‌ای در ۳۰ مورد اخیر دریافت نشد.</p>}<p className="gb39-muted">فقط گزارش ۳۰ اجرای اخیر است، نه تاریخچه کامل یا تضمین صحت شواهد. متن مدل و پرسش در تاریخچه ذخیره نمی‌شوند.</p></div>
    </>}
  </div>}
 </section>;
}
