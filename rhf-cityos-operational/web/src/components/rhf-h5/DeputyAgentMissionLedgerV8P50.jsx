import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,BrainCircuit,Database,FileClock,GitBranch,LockKeyhole,RefreshCw,ShieldAlert,ShieldCheck,Workflow} from 'lucide-react';
import {AGENT_MISSION_UI_VERSION,OBJECTIVES,ROLES,verifyRuntime,verifyMissions,mayReviewMission,mayWithdrawMission,validateNewMissionUI,validUUID} from './agent-mission-v8p50-core.mjs';
import './agent-mission-v8p50.css';
import DeputyLangGraphV8P51 from './DeputyLangGraphV8P51.jsx';
import DeputyTemporalV8P52 from './DeputyTemporalV8P52.jsx';
const E=x=>encodeURIComponent(String(x||''));
const LABELS={PROPOSED:'پیشنهادشده',AUTHORIZED:'مجوز بررسی ثبت‌شده',REJECTED:'ردشده',WITHDRAWN:'پس‌گرفته‌شده'};
export default function DeputyAgentMissionLedgerV8P50({city,api,actorId=null,onGovernance=()=>{}}){
 const [open,setOpen]=useState(false),[loading,setLoading]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [runtime,setRuntime]=useState(null),[missions,setMissions]=useState(null),[cases,setCases]=useState([]);
 const [caseId,setCaseId]=useState(''),[objective,setObjective]=useState('NEXT_SAFE_ACTION'),[note,setNote]=useState('');
 const [review,setReview]=useState(null),[reviewNote,setReviewNote]=useState('');
 const token=useRef(0),key=useRef(null),base=useMemo(()=>`/cities/${E(city)}`,[city]);
 useEffect(()=>{token.current++;setOpen(false);setRuntime(null);setMissions(null);setCases([]);setCaseId('');setReview(null);setReviewNote('');setNote('');setError('');setNotice('');key.current=null;return()=>{token.current++};},[city]);
 const canCreate=ROLES.includes(runtime?.role);
 async function load(){if(!city||typeof api!=='function')return;const n=++token.current;setLoading(true);setError('');
  try{const [s,m,c]=await Promise.all([api(`${base}/agent-mission-runtime`),api(`${base}/agent-missions`),api(`${base}/cases`)]);
   if(!verifyRuntime(s,city))throw Error('قرارداد ایمن دفتر مأموریت یا دامنه شهرداری نامعتبر است');
   const rows=verifyMissions(m,city);if(!rows||!Array.isArray(c)||c.length>300)throw Error('پاسخ مأموریت‌ها یا پرونده‌ها نامعتبر است');
   const filtered=c.filter(x=>validUUID(x?.id)&&typeof x.summary==='string');if(filtered.length!==c.length)throw Error('شناسه پرونده نامعتبر است');
   if(n!==token.current)return;setRuntime(s);setMissions(rows);setCases(filtered);setCaseId(v=>filtered.some(c=>c.id===v)?v:'');
  }catch(e){if(n===token.current){setRuntime(null);setMissions(null);setCases([]);setError(e?.message||'دسترسی به دفتر مأموریت ممکن نیست');}}
  finally{if(n===token.current)setLoading(false)}
 }
 async function propose(){if(saving||!canCreate||!caseId)return;const k=key.current||window.crypto?.randomUUID?.();const b=validateNewMissionUI({requestKey:k,caseId,objective,note});if(!b){setError('شناسه پرونده، هدف یا شرح درخواست معتبر نیست');return;}
  if(!window.confirm('فقط پیشنهاد مأموریت همراه هش شواهد ذخیره می‌شود. هیچ ایجنتی اجرا یا منبعی تخصیص نمی‌یابد. ادامه می‌دهید؟'))return;
  key.current=k;const n=token.current;setSaving(true);setError('');setNotice('');
  try{const res=await api(`${base}/agent-missions`,'POST',b);if(res?.scope!==city||res?.mission?.requestKey!==k||res?.mission?.dispatched!==false)throw Error('پاسخ ثبت مأموریت معتبر نیست');if(n!==token.current)return;
   key.current=null;setNote('');setNotice('پیشنهاد مأموریت ثبت شد؛ برای تصمیم مستقل در صف قرار گرفت.');await load();
  }catch(e){if(n===token.current)setError(e?.message||'ثبت ناموفق است؛ کلید درخواست برای تکرار ایمن نگه داشته شد');}
  finally{setSaving(false)}
 }
 async function decide(){if(saving||!review||reviewNote.trim().length<12)return;
  const row=missions?.find(x=>x.id===review.id);if(!row)return;
  if(review.action==='WITHDRAW'?!mayWithdrawMission(row,actorId):!mayReviewMission(row,runtime?.role,actorId))return;
  if(!window.confirm('این فقط تغییر وضعیت مجوز در دفتر مأموریت است؛ اجرای مدل و عملیات شهری انجام نمی‌شود. ثبت شود؟'))return;
  const n=token.current;setSaving(true);setError('');setNotice('');
  try{const res=await api(`${base}/agent-missions/${E(row.id)}`,'PATCH',{action:review.action,version:row.version,note:reviewNote.trim()});
   if(res?.scope!==city||res?.dispatched!==false||res?.affectedOperationalRecords!==0)throw Error('پاسخ تصمیم مأموریت نامعتبر است');
   if(n!==token.current)return;setReview(null);setReviewNote('');setNotice('تصمیم به‌صورت تراکنشی و قابل حسابرسی ثبت شد؛ اجرا همچنان غیرفعال است.');await load();
  }catch(e){if(n===token.current)setError(e?.message||'ثبت تصمیم ناموفق است');}finally{setSaving(false)}
 }
 return <section className="am50" dir="rtl" data-rhf-agent-mission={AGENT_MISSION_UI_VERSION} aria-label="دفتر مأموریت پایدار ایجنت‌ها">
  <header className="am50-head"><div><small>RUVOS / V8P5.0 — PERSISTENT AGENT MISSION LEDGER</small><h3><BrainCircuit size={21}/> دفتر مأموریت پایدار ایجنت‌های شهری</h3><p>پیوند شواهد سروری، پیشنهاد مأموریت و تأیید مستقل؛ آماده‌سازی دقیق برای اتصال آینده LangGraph و Temporal.</p></div><button type="button" onClick={()=>{if(open){token.current++;setOpen(false);setRuntime(null);setMissions(null)}else{setOpen(true);void load()}}}>{open?'بستن':'ورود به دفتر مأموریت'} <ArrowLeft size={15}/></button></header>
  <p className="am50-warning"><LockKeyhole size={16}/> مجوز ثبت‌شده به معنای اجرای مأموریت نیست. اجرای تحلیل فقط‌خواندنی LangGraph پس از مجوز مستقل و درخواست صریح ممکن است؛ اعزام خودکار غیرفعال است؛ وضعیت Temporal در پنل تخصصی نمایش داده می‌شود. هیچ هزینه یا منفعت عمومی جدید تأیید نمی‌شود.</p>
  {open&&<div className="am50-body"><div className="am50-top"><button onClick={load} disabled={loading||saving} type="button"><RefreshCw size={15}/> بازخوانی</button><button onClick={onGovernance} type="button"><ShieldCheck size={15}/> مشاهده گراف اختیار</button></div>
   {loading&&<p role="status">دریافت وضعیت مجاز از API...</p>}{error&&<p className="am50-error" role="alert">{error}</p>}{notice&&<p role="status" className="am50-notice">{notice}</p>}
   {runtime&&missions&&<><div className="am50-stats"><div><small>پیشنهادهای مشاهده‌شده</small><b>{missions.length.toLocaleString('fa-IR')}</b></div><div><small>در انتظار بررسی مستقل</small><b>{missions.filter(x=>x.status==='PROPOSED').length.toLocaleString('fa-IR')}</b></div><div><small>عملیات میدانی خودکار</small><b>۰</b></div><div><small>Temporal / Worker</small><b>بررسی در پنل Temporal</b></div></div>
    <div className="am50-columns"><div className="am50-panel"><h4><FileClock size={17}/> پیشنهاد مأموریت</h4><p>فقط به پرونده عملیاتی همان شهرداری متصل می‌شود. شواهد روی سرور با چهار ابزار مجاز محاسبه و هش آن ذخیره می‌شود.</p><label>پرونده خدمات شهری<select disabled={!canCreate||saving} value={caseId} onChange={e=>{setCaseId(e.target.value);key.current=null}}><option value="">انتخاب پرونده</option>{cases.map(c=><option key={c.id} value={c.id}>{c.summary} · {c.id.slice(0,8)}</option>)}</select></label><label>هدف مأموریت<select disabled={!canCreate||saving} value={objective} onChange={e=>{setObjective(e.target.value);key.current=null}}>{OBJECTIVES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label>دلیل و شرح پیشنهاد<textarea rows={3} maxLength={600} disabled={!canCreate||saving} value={note} onChange={e=>{setNote(e.target.value);key.current=null}} placeholder="شواهد و هدف بررسی را مشخص کنید"/></label><button type="button" className="am50-primary" disabled={!canCreate||saving||loading||!caseId||note.trim().length<12} onClick={propose}><Database size={16}/> ثبت پیشنهاد مأموریت (بدون اجرا)</button></div>
    <div className="am50-panel"><h4><Workflow size={17}/> صف مأموریت‌های قابل ممیزی</h4><p>فقط ۱۰۰ رکورد جدید نمایش داده می‌شود؛ تاریخچه کامل باید از API صفحه‌بندی‌شده دریافت شود.</p>{!missions.length?<p>مأموریتی در محدوده دسترسی فعلی ثبت نشده است.</p>:<div className="am50-rows">{missions.map(m=><article key={m.id}><div className="am50-row"><b>{m.caseSummary||m.caseId}</b><span>{LABELS[m.status]}</span></div><p>{m.note}</p><small>هش شواهد: {m.evidenceSha256?.slice(0,16)}… · نسخه {m.version} · نقش مسئول بازبینی مستقل</small><div className="am50-actions">{mayReviewMission(m,runtime.role,actorId)&&<><button type="button" onClick={()=>{setReview({id:m.id,action:'AUTHORIZE'});setReviewNote('')}}>ثبت مجوز</button><button type="button" onClick={()=>{setReview({id:m.id,action:'REJECT'});setReviewNote('')}}>رد</button></>}{mayWithdrawMission(m,actorId)&&<button type="button" onClick={()=>{setReview({id:m.id,action:'WITHDRAW'});setReviewNote('')}}>انصراف</button>}</div></article>)}</div>}</div></div>
    {review&&<div className="am50-review"><strong>تصمیم درباره مأموریت {review.id.slice(0,8)} — {review.action}</strong><label>دلیل مستند (حداقل ۱۲ نویسه)<textarea rows={2} maxLength={500} value={reviewNote} onChange={e=>setReviewNote(e.target.value)}/></label><button disabled={saving||reviewNote.trim().length<12} onClick={decide} type="button">ثبت تصمیم تراکنشی</button><button type="button" onClick={()=>setReview(null)}>انصراف</button></div>}
    <DeputyLangGraphV8P51 city={city} api={api} role={runtime.role} actorId={actorId} missions={missions}/>
    <DeputyTemporalV8P52 city={city} api={api} role={runtime.role} actorId={actorId} missions={missions}/>
    <div className="am50-foot"><GitBranch size={15}/> دفتر مأموریت PostgreSQL با RLS و رویدادهای فقط‌افزودنی. عملیات میدانی و مدل مولد اجرا نمی‌شوند؛ اجرای گراف فقط با درخواست صریح و مأموریت مجاز انجام می‌شود. <ShieldAlert size={15}/></div></>}
  </div>}
 </section>;
}
