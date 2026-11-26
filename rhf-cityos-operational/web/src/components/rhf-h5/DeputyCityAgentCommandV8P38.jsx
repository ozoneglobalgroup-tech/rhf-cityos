import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,BrainCircuit,ClipboardCheck,Database,ExternalLink,FileSearch,GitMerge,LockKeyhole,PlayCircle,RefreshCw,ShieldAlert,ShieldCheck,Sparkles} from 'lucide-react';
import {CITY_AGENT_CATALOG,CITY_AGENT_COMMAND_VERSION,cityAgentProjection,runCityAgent,verifyBoundedRuntimeStatus} from './deputy-city-agent-command-v8p38-core.mjs';
import {NON_WASTE} from './deputy-multi-core.mjs';
import './deputy-city-agent-command-v8p38.css';
const n=x=>Number.isSafeInteger(x)?x.toLocaleString('fa-IR'):'—';
const E=x=>encodeURIComponent(String(x||''));
const label=id=>NON_WASTE.find(x=>x.id===id)?.name||id;
const icons={EVIDENCE:FileSearch,NEEDS:BrainCircuit,CAPACITY:GitMerge,REVIEW:ClipboardCheck};
export default function DeputyCityAgentCommandV8P38({board,city,api,onOpenRecord=()=>{},onPortfolio=()=>{},onGovernance=()=>{},onScenario=()=>{}}){
 const project=useMemo(()=>cityAgentProjection(board),[board]);
 const [selected,setSelected]=useState('NEEDS');
 const [run,setRun]=useState(null);
 const [runtime,setRuntime]=useState(null);
 const [runtimeState,setRuntimeState]=useState('NOT_CHECKED');
 const runtimeRequest=useRef(0);
 useEffect(()=>{runtimeRequest.current+=1;setRun(null);setRuntime(null);setRuntimeState('NOT_CHECKED');return()=>{runtimeRequest.current+=1};},[board,city]);
 const active=project.catalog.find(x=>x.id===selected)||CITY_AGENT_CATALOG[0];
 const Icon=icons[active.id]||BrainCircuit;
 const runAnalysis=()=>setRun(runCityAgent(project,active.id));
 async function checkRuntime(){
  if(!city||typeof api!=='function')return;
  const requestId=++runtimeRequest.current;setRuntimeState('CHECKING');setRuntime(null);
  try{const reply=await api(`/cities/${E(city)}/agent-status`);const verified=verifyBoundedRuntimeStatus(reply);
   if(!verified)throw Error('CONTRACT_INVALID');if(requestId!==runtimeRequest.current)return;setRuntime(verified);setRuntimeState('AVAILABLE');
  }catch{if(requestId===runtimeRequest.current){setRuntime(null);setRuntimeState('UNAVAILABLE');}}
 }
 return <section className="ac38" dir="rtl" data-rhf-agent-command={CITY_AGENT_COMMAND_VERSION} aria-label="مرکز مأموریت و تحلیل عامل‌محور معاونت">
  <header className="ac38-header"><div><span className="ac38-kicker"><Sparkles size={15}/> AGENTIC CITY MISSION CONTROL / V8P3.8</span><h3>مرکز مأموریت ایجنت‌های شهری</h3><p>تحلیل قابل توضیح روی پرونده‌های مجاز؛ هر نتیجه دارای ردّ شواهد و مسیر بررسی انسانی است.</p></div><span className="ac38-guard"><LockKeyhole size={15}/> پیشنهاد، نه دستور اجرایی</span></header>
  <div className="ac38-disclaimer"><ShieldAlert size={18}/><span>این چهار مهارت، <b>موتور تحلیل محلی قاعده‌محور</b> هستند، نه عامل خودمختار یا اجرای واقعی LangGraph/Temporal. داده‌ها آموزشی‌اند؛ تصمیم و اجرای عملیاتی فقط با اختیار انسانی و API موجود مجاز است.</span></div>
  {project.mode!=='SCOPED_SYNTHETIC'?<div className="ac38-empty"><Database size={24}/><strong>داده معتبر و دامنه‌دار دریافت نشده است</strong><p>تا پاسخ معتبر API، اجرای تحلیل و ارائه یافته غیرفعال است؛ هیچ شمارنده یا هشدار ساختگی جایگزین نمی‌شود.</p><button type="button" onClick={onPortfolio}>بررسی پرونده‌ها <ArrowLeft size={14}/></button></div>:<>
   {project.partial&&<div className="ac38-partial"><ShieldAlert size={16}/> API فقط ۲۰۰ پرونده را برمی‌گرداند. نتیجه تنها درباره مجموعه دریافت‌شده است، نه کل شهر.</div>}
   <div className="ac38-stats"><div><small>پرونده‌های مجازِ دریافت‌شده</small><b>{n(project.sourceCount)}</b></div><div><small>مهارت‌های قابل اجرای دستی</small><b>{n(project.catalog.length)}</b></div><div><small>یافته‌های قاعده‌محور در مجموعه</small><b>{n(project.findings.length)}</b></div><div><small>ارزش عمومی تأییدشده</small><b>نامعلوم / اثبات‌نشده</b></div></div>
   <div className="ac38-grid"><div className="ac38-selector"><h4>انتخاب مأموریت تحلیلی</h4>{project.catalog.map(a=>{const AgentIcon=icons[a.id];const count=project.findings.filter(f=>f.agentId===a.id).length;return <button type="button" key={a.id} aria-pressed={selected===a.id} onClick={()=>{setSelected(a.id);setRun(null)}}><span className="ac38-icon"><AgentIcon size={19}/></span><span className="ac38-selector-text"><b>{a.name}</b><small>{a.goal}</small></span><span className="ac38-number">{n(count)}</span></button>})}<div className="ac38-selector-note"><ShieldCheck size={16}/> اجرا فقط با انتخاب کاربر و صرفاً در مرورگر انجام می‌شود.</div></div>
    <div className="ac38-main"><div className="ac38-main-head"><div><small><Icon size={16}/> HUMAN-IN-THE-LOOP ANALYSIS</small><h4>{active.name}</h4><p>{active.domain} · {active.goal}</p></div><button type="button" className="ac38-run" onClick={runAnalysis}><PlayCircle size={17}/> اجرای تحلیل فقط‌خواندنی</button></div>
     {!run?<div className="ac38-idle"><BrainCircuit size={28}/><strong>تحلیل هنوز اجرا نشده است</strong><p>برای مشاهده یافته، دلایل، پرونده‌های مرجع و مجهولات، «اجرای تحلیل» را انتخاب کنید.</p></div>:
       <div className="ac38-result" aria-live="polite"><div className="ac38-result-head"><span><ShieldCheck size={17}/> اجرای محلی · بدون فراخوانی مدل</span><b>{n(run.findings.length)} یافته قابل بررسی</b></div>
        {run.findings.length===0?<div className="ac38-idle"><Database size={22}/>{run.note}</div>:
         <div className="ac38-findings">{run.findings.slice(0,14).map(f=><article key={f.id}><div className="ac38-finding-head"><strong>{f.title}</strong><span>نیازمند بررسی انسانی</span></div><p>{f.explanation}</p><div className="ac38-meta"><span>منابع: {f.sourceCodes.join(' · ')}</span><span>ارجاعات DEMO: {f.evidenceRefs.length?n(f.evidenceRefs.length):'ثبت نشده'}</span></div><details><summary>ردّ شواهد و مجهولات</summary><div className="ac38-detail">{f.sourceCodes.map((c,i)=><button type="button" key={`${f.id}:${i}`} onClick={()=>onOpenRecord(f.sourceOrgKeys[i],f.recordIds[i])}>{label(f.sourceOrgKeys[i])} · {c} <ExternalLink size={13}/></button>)}<p><b>برای اعتبارسنجی:</b> {f.unknowns.join('؛ ')}</p><small>ردّ محاسبه: {f.method} · هیچ ارزش یا ظرفیت آزاد تأیید نشده است.</small></div></details><button className="ac38-open" type="button" onClick={()=>onOpenRecord(f.sourceOrgKeys[0],f.recordIds[0])}>بازکردن پرونده منبع <ArrowLeft size={14}/></button></article>)}</div>}
        {run.findings.length>14&&<p className="ac38-more">فقط ۱۴ نتیجه نخست نمایش داده شده؛ بقیه در محاسبات محدود مرورگر قرار دارند.</p>}
       </div>}
    </div></div>
   </>}
  <div className="ac38-runtime"><div><h4>وضعیت سرویس عامل رسمی RUVOS</h4><p>کنترل فقط‌خواندنی API موجود برای پرونده‌های خدمات شهری؛ <b>متفاوت از مهارت‌های آموزشی این صفحه</b>.</p></div><button type="button" disabled={runtimeState==='CHECKING'||!city} onClick={checkRuntime}><RefreshCw size={15}/> بررسی سرویس رسمی</button>
   <span role="status">{runtimeState==='NOT_CHECKED'?'بررسی نشده':runtimeState==='CHECKING'?'در حال بررسی...':runtimeState==='UNAVAILABLE'?'وضعیت سرویس یا دسترسی این نقش قابل تأیید نیست':runtime?.modelEnabled?'موتور محدود فعال است؛ استفاده از مدل نیازمند رضایت صریح':'ابزارهای فقط‌خواندنی فعال‌اند؛ مدل خارجی غیرفعال است'}</span>
  </div>
  <footer className="ac38-footer"><div><b>مرز اختیار</b><span>هیچ POST، PATCH یا DELETE از این مؤلفه ارسال نمی‌شود. بازبینی و تأیید تنها در دفتر V8P2 و با کنترل سمت سرور انجام می‌شود.</span></div><div><button type="button" onClick={onGovernance}>گراف اختیار <ArrowLeft size={13}/></button><button type="button" onClick={onScenario}>سناریوهای آموزشی <ArrowLeft size={13}/></button></div></footer>
 </section>;
}
