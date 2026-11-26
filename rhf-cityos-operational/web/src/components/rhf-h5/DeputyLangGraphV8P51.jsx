import React,{useEffect,useMemo,useRef,useState} from 'react';
import {BrainCircuit,RefreshCw,ShieldCheck,Route,Database} from 'lucide-react';
import {validateGraphRuntime,validateGraphRunList,canStartGraphRun,graphRunLabels,validUUID} from './agent-graph-v8p51-core.mjs';
import './agent-graph-v8p51.css';
const E=s=>encodeURIComponent(String(s||''));
export default function DeputyLangGraphV8P51({city,api,role,actorId,missions=[]}){
 const base=useMemo(()=>`/cities/${E(city)}`,[city]);
 const [runtime,setRuntime]=useState(null),[runs,setRuns]=useState(null),[missionId,setMissionId]=useState('');
 const [loading,setLoading]=useState(false),[running,setRunning]=useState(false),[error,setError]=useState(''),[note,setNote]=useState('');
 const epoch=useRef(0),reqKey=useRef(null);
 useEffect(()=>{epoch.current++;setRuntime(null);setRuns(null);setMissionId('');setError('');setNote('');reqKey.current=null;return()=>{epoch.current++}},[city,actorId]);
 const eligible=missions.filter(m=>canStartGraphRun(m,role));
 async function load(){if(!city||typeof api!=='function')return;const n=++epoch.current;setLoading(true);setError('');
  try{const [r,list]=await Promise.all([api(`${base}/agent-graph-runtime`),api(`${base}/agent-graph-runs`)]);
   if(!validateGraphRuntime(r,city,role)||!validateGraphRunList(list,city))throw Error('پاسخ اجرای گراف یا حوزه دسترسی معتبر نیست');
   if(n!==epoch.current)return;setRuntime(r);setRuns(list.rows);
  }catch(e){if(n===epoch.current){setError(e?.message||'سرویس گراف در دسترس نیست');setRuntime(null);setRuns(null)}}
  finally{if(n===epoch.current)setLoading(false)}
 }
 useEffect(()=>{if(city)void load();},[city,actorId]);
 async function execute(){if(running||loading||!canStartGraphRun(missions.find(m=>m.id===missionId),role)||!runtime||!validUUID(missionId))return;
  if(!window.confirm('فقط تحلیل چهارگرهی LangGraph روی شواهد مجاز اجرا می‌شود؛ هیچ اقدام عملیاتی، پرداخت یا تأیید منفعت عمومی انجام نمی‌شود. ادامه می‌دهید؟'))return;
  const key=reqKey.current||window.crypto?.randomUUID?.();if(!validUUID(key)){setError('امکان ساخت کلید اجرای یکتا وجود ندارد');return;}
  reqKey.current=key;const n=epoch.current;setRunning(true);setError('');setNote('');
  try{const r=await api(`${base}/agent-graph-runs`,'POST',{missionId,requestKey:key,acknowledgeReadOnly:true});
   if(r?.scope!==city||r?.run?.requestKey!==key||r?.run?.dispatched!==false||r?.run?.autoWrites!==0)throw Error('خروجی اجرای گراف معتبر نیست');
   if(n!==epoch.current)return;reqKey.current=null;setNote(r.run.status==='COMPLETED'?'تحلیل چهارگرهی ثبت شد؛ پیشنهادها نیازمند تصمیم انسانی هستند.':'وضعیت اجرای گراف ثبت شد؛ برای جزئیات تاریخچه را بررسی کنید.');await load();
  }catch(e){if(n===epoch.current)setError(e?.message||'اجرای گراف ناموفق شد؛ برای تکرار ایمن کلید درخواست حفظ شد.')}finally{setRunning(false)}
 }
 return <section className="ag51" dir="rtl" aria-label="اجرای واقعی LangGraph فقط خواندنی" data-rhf-langgraph="RHF-AGENT-GRAPH-V8P5.1">
  <header><div><small>RUVOS / ACTUAL LANGGRAPH.JS — GOVERNED ANALYSIS</small><h4><BrainCircuit size={18}/> تحلیل تخصصی چهارمرحله‌ای</h4><p>مأموریت مستقل تأییدشده ← کشف نیاز ← بررسی ظرفیت ← کنترل مالی ← بازبینی شواهد. هیچ اقدام میدانی اجرا نمی‌شود.</p></div><button type="button" disabled={loading||running} onClick={load}><RefreshCw size={14}/> به‌روزرسانی</button></header>
  {error&&<p role="alert" className="ag51-error">{error}</p>}{note&&<p role="status" className="ag51-note">{note}</p>}
  {runtime&&<div className="ag51-status"><span><ShieldCheck size={15}/> {runtime.graphEngine}</span><span>Temporal: متصل نیست</span><span>عملیات خودکار: ۰</span><span>نتیجه عمومی جدید تأییدشده: ۰</span></div>}
  <div className="ag51-controls"><label>مأموریت دارای مجوز مستقل<select value={missionId} disabled={running} onChange={e=>{setMissionId(e.target.value);reqKey.current=null}}><option value="">انتخاب مأموریت مجاز</option>{eligible.map(m=><option value={m.id} key={m.id}>{m.caseSummary||m.caseId} — {m.id.slice(0,8)}</option>)}</select></label><button type="button" disabled={!runtime||loading||running||!missionId||!canStartGraphRun(eligible.find(m=>m.id===missionId),role)} onClick={execute}><Route size={15}/>{running?'در حال تحلیل…':'اجرای تحلیل مجاز (فقط‌خواندنی)'}</button></div>
  {!eligible.length&&<p className="ag51-info">برای شروع، یک مأموریت باید ابتدا ثبت و سپس توسط بازبین مستقل به وضعیت AUTHORIZED منتقل شود.</p>}
  {runs&&<div className="ag51-runs"><h5><Database size={16}/> تاریخچه اجراهای قابل حسابرسی</h5>{runs.length===0?<p>اجرایی در دامنه مجاز ثبت نشده است.</p>:runs.slice(0,15).map(r=><article key={r.id}><div className="ag51-rhead"><b>{graphRunLabels[r.status]||r.status}</b><small>{r.id.slice(0,8)} · مأموریت {r.missionId.slice(0,8)}</small></div><p>هش شواهد: {r.evidenceSha256.slice(0,16)}… · {r.engine}</p>{r.trace?.length>0&&<div className="ag51-steps">{r.trace.map((t,i)=><span key={i}>{t.node}: {t.result}</span>)}</div>}{r.result?.next&&<p className="ag51-action">پیشنهاد: {r.result.next.label} — فقط برای بررسی انسانی</p>}{r.status==='RUNNING'&&<p>ممکن است اجرا در اثر قطع سرویس ناتمام مانده باشد؛ این نسخه بازیابی خودکار ندارد.</p>}</article>)}</div>}
 </section>;
}
