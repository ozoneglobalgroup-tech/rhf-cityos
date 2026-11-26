import React,{useEffect,useMemo,useState} from 'react';
import {Activity,ArrowLeft,ArrowUpRight,BarChart3,Bot,BrainCircuit,Building2,CheckCheck,ChevronLeft,ClipboardCheck,Clock3,Compass,Database,FileText,GitMerge,Layers3,LockKeyhole,MapPinned,Network,RefreshCw,SearchCheck,ShieldAlert,ShieldCheck,Sparkles,Target,TrendingUp,Users,Workflow,Zap} from 'lucide-react';
import {buildPortfolio} from './deputy-portfolio-v8p3-core.mjs';
import {NON_WASTE} from './deputy-multi-core.mjs';
import {CITY_FIRST_HOME_VERSION,cityFirstProjection,cityFirstAnswer} from './city-first-home-v8p36-core.mjs';
import './city-first-home-v8p36.css';
import DeputyExecutiveCockpitV8P54 from './DeputyExecutiveCockpitV8P54.jsx';
const DeputyLeaderDeskV8P60=React.lazy(()=>import('./DeputyLeaderDeskV8P60.jsx'));
// Deep analysis is fetched only after the executive user opens the expert panel.
const DeputyDecisionRoomV8P37=React.lazy(()=>import('./DeputyDecisionRoomV8P37.jsx'));
const DeputyCityAgentCommandV8P38=React.lazy(()=>import('./DeputyCityAgentCommandV8P38.jsx'));
const DeputyGovernedAgentBridgeV8P39=React.lazy(()=>import('./DeputyGovernedAgentBridgeV8P39.jsx'));
const DeputyOperationalAcceptanceV8P40=React.lazy(()=>import('./DeputyOperationalAcceptanceV8P40.jsx'));
const DeputyScenarioReconciliationV8P41=React.lazy(()=>import('./DeputyScenarioReconciliationV8P41.jsx'));
const DeputyAgentMissionLedgerV8P50=React.lazy(()=>import('./DeputyAgentMissionLedgerV8P50.jsx'));
const PerformancePreviewV8P53=React.lazy(()=>import('./DeputyPerformanceV8P53.jsx').then(m=>({default:m.PerformancePreviewV8P53})));
const n=x=>Number.isSafeInteger(x)?new Intl.NumberFormat('fa-IR').format(x):'—';
const E=x=>encodeURIComponent(String(x||''));
const orgName=id=>NON_WASTE.find(o=>o.id===id)?.name||'حوزه نامشخص';
const ICONS=[Activity,ShieldCheck,Layers3,Building2,Users];
export default function DeputyCityFirstAIHomeV8P36({city,cityName,api,assignmentId=null,isSystemAdmin=false,actorId=null,onOpenRecord=()=>{},onOpenOrg=()=>{},onPortfolio=()=>{},onAgents=()=>{},onValues=()=>{},onDecisions=()=>{},onGovernance=()=>{},onScenario=()=>{},onPerformance=()=>{},onWaste=()=>{},onNavigate=()=>{}}){
 const [board,setBoard]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[epoch,setEpoch]=useState(0),[mode,setMode]=useState('SIGNALS');
 const [expertOpen,setExpertOpen]=useState(false);
 const auth=assignmentId&&!isSystemAdmin?`?assignmentId=${E(assignmentId)}`:'';
 const path=`/cities/${E(city)}/org-deputy-dossiers${auth}`;
 useEffect(()=>{if(!city)return;let live=true;setBoard(null);setBusy(true);setError('');
  api(path).then(reply=>{const scoped=buildPortfolio(reply,city);if(live)setBoard(scoped)}).catch(e=>{if(live){setBoard(null);setError(e?.message||'دریافت پرونده‌های مجاز امکان‌پذیر نیست')}}).finally(()=>{if(live)setBusy(false)});
  return()=>{live=false};
 },[api,city,path,epoch]);
 const state=useMemo(()=>cityFirstProjection(board),[board]);
 const answer=useMemo(()=>cityFirstAnswer(mode,state),[mode,state]);
 const hasData=state.mode==='SCOPED_SYNTHETIC';
 const max=Math.max(1,...state.topOrgs.map(o=>o.records));
 return <section className="cf36" dir="rtl" data-rhf-city-first={CITY_FIRST_HOME_VERSION}>
 <DeputyExecutiveCockpitV8P54 key={city} city={city} api={api} cityName={cityName} projection={state} loading={busy} error={error} onOpenRecord={onOpenRecord} onOpenOrg={onOpenOrg} onPerformance={onPerformance} onPortfolio={onPortfolio} onAgents={onAgents} onDecisions={onDecisions} onValues={onValues} onGovernance={onGovernance} onWaste={onWaste} onExplore={()=>setExpertOpen(true)} onNavigate={onNavigate}/>
 <details className="ux54-details" open={expertOpen} onToggle={e=>setExpertOpen(e.currentTarget.open)}>
  <summary><Layers3 size={19}/> بخش تحلیل پیشرفته RUVOS و تمام ابزارهای تخصصی <span>پرونده‌ها، ایجنت‌ها، کنترل شواهد، مأموریت پایدار و گزارش‌های تحلیلی</span></summary>
  {expertOpen&&<div className="ux54-details-body"><React.Suspense fallback={<div role="status" className="ux59-loading"><strong>در حال بارگذاری تحلیل پیشرفته…</strong><small>داده‌های واقعی فقط از API مجاز دریافت می‌شوند.</small></div>}>
  <div className="cf36-hero">
   <div className="cf36-hero-copy"><div className="cf36-eyebrow"><span className="cf36-live-dot"/> RHF CITY OS <span className="cf36-sep">/</span> AI-NATIVE CITY OPERATIONS</div>
    <h2>از دیدن شهر،<br/><em>تا خلق ارزش برای شهر.</em></h2>
    <p>مرکز تصمیم و هماهنگی معاونت خدمات شهری و محیط‌زیست؛ نیازها، ظرفیت‌ها، انسان‌ها و ایجنت‌ها حول نتیجه شهری سازمان‌دهی می‌شوند.</p>
    <div className="cf36-hero-actions"><button type="button" className="cf36-main-btn" onClick={onPortfolio}><Compass size={17}/> مرکز پایش و فرصت‌ها <ArrowLeft size={16}/></button><button type="button" className="cf36-ghost-btn" onClick={onDecisions}><ClipboardCheck size={17}/> تصمیم‌های نیازمند اقدام</button></div>
    <div className="cf36-hero-context"><span><MapPinned size={14}/>{cityName}</span><span><LockKeyhole size={14}/> دامنه شهرداری و سمت کنترل‌شده</span><span><ShieldCheck size={14}/> SYNTHETIC · ارزش تأییدشده: خیر</span></div>
   </div>
   <div className="cf36-operating-panel" aria-label="چرخه مدیریت شهری هوش‌مصنوعی‌محور"><div className="cf36-panel-top"><span>URBAN OPERATING LOOP</span><span className="cf36-panel-chip">HUMAN-GOVERNED</span></div>
    <div className="cf36-loop"><div><span className="cf36-loop-icon"><Database size={21}/></span><strong>حس‌کردن شهر</strong><small>SENSE · داده و شواهد</small></div><ChevronLeft size={18}/><div><span className="cf36-loop-icon"><BrainCircuit size={21}/></span><strong>تحلیل و کشف</strong><small>ANALYZE · عامل تصمیم‌یار</small></div><ChevronLeft size={18}/><div><span className="cf36-loop-icon"><Workflow size={21}/></span><strong>اقدام مجاز</strong><small>ORCHESTRATE · انسان در حلقه</small></div></div>
    <div className="cf36-panel-bottom"><ShieldAlert size={18}/><span>در این نسخه تحلیل‌ها قاعده‌محورند و اجرای خودمختار فعال نیست. هر پیشنهاد باید به مدرک و تصمیم انسانی متصل شود.</span></div>
   </div>
  </div>
  <div className="cf36-toolbar"><div><strong><Activity size={17}/> نبض مدیریتی شهر</strong><span>مبتنی بر پرونده‌های تخصصی برگشتی از API مجاز، نه عملکرد میدانی</span></div><button type="button" disabled={busy} onClick={()=>setEpoch(x=>x+1)}><RefreshCw size={15} className={busy?'cf36-rotating':''}/> بازخوانی</button></div>
  {error&&<div className="cf36-error" role="alert"><ShieldAlert size={18}/><span>داده پرونده‌های تخصصی دریافت نشد: {error}. آمار یا هشدار مصنوعی جایگزین پاسخ نامعتبر نشده است.</span></div>}
  {busy&&<div className="cf36-loading" role="status">در حال دریافت داده‌های دامنه‌دار RUVOS...</div>}
  {hasData&&state.partial&&<div className="cf36-warning" role="status"><ShieldAlert size={16}/> API حداکثر ۲۰۰ پرونده برمی‌گرداند؛ همه ارقام فقط برای مجموعه دریافت‌شده هستند و آمار کل شهر نیستند.</div>}
  <div className="cf36-kpis" aria-label="شاخص‌های ثبت‌شده در نرم‌افزار">
   <Kpi icon={Layers3} label="پرونده‌های آموزشی برگشتی" value={hasData?n(state.total):'—'} sub="ذخیره‌شده در PostgreSQL" onClick={onPortfolio}/>
   <Kpi icon={ClipboardCheck} label="در انتظار بررسی" value={hasData?n(state.pending):'—'} sub="صف SUBMITTED · نه بحران واقعی" onClick={onDecisions} tone="amber"/>
   <Kpi icon={BrainCircuit} label="سیگنال‌های تصمیم‌یار" value={hasData?n(state.signals):'—'} sub="قاعده‌محور · نیازمند بازبینی" onClick={onAgents}/>
   <Kpi icon={Building2} label="حوزه‌های دارای داده" value={hasData?`${n(state.domainCount)} / ۱۱`:'—'} sub="حوزه منطقی، نه سازمان حقوقی" onClick={onPortfolio}/>
   <Kpi icon={Target} label="ارزش عمومی احرازشده" value="—" sub="شواهد مستقل کافی وجود ندارد" onClick={onValues} tone="slate"/>
  </div>
  <PerformancePreviewV8P53 onOpen={onPerformance} onOpenOrg={onOpenOrg}/>
  <DeputyDecisionRoomV8P37 board={board} onOpenRecord={onOpenRecord} onPortfolio={onPortfolio} onScenario={onScenario}/>
  <DeputyCityAgentCommandV8P38 board={board} city={city} api={api} onOpenRecord={onOpenRecord} onPortfolio={onPortfolio} onGovernance={onGovernance} onScenario={onScenario}/>
  <DeputyGovernedAgentBridgeV8P39 city={city} api={api} actorId={actorId} onGovernance={onGovernance}/>
  <DeputyOperationalAcceptanceV8P40 city={city} board={board} api={api} onScenario={onScenario} onGovernance={onGovernance}/>
  <DeputyScenarioReconciliationV8P41 city={city} board={board} onScenario={onScenario} onOpenRecord={onOpenRecord}/>
  <DeputyAgentMissionLedgerV8P50 city={city} api={api} actorId={actorId} onGovernance={onGovernance}/>
  <div className="cf36-main-grid">
   <section className="cf36-card cf36-radar"><div className="cf36-card-head"><div><span className="cf36-kicker"><Sparkles size={15}/> DECISION RADAR</span><h3>چه چیزی امروز نیازمند توجه است؟</h3><p>صف و پیشنهادهای مبتنی بر پرونده؛ اولویت خودکار یا هشدار میدانی نیست.</p></div><button type="button" onClick={onPortfolio}>همه پرونده‌ها <ArrowLeft size={15}/></button></div>
    {!hasData?<div className="cf36-blank"><Database size={27}/><strong>هنوز پرونده معتبر دریافت نشده است</strong><span>از مرکز پایش، وضعیت API و داده‌های آموزشی را بررسی کنید.</span><button type="button" onClick={onScenario}>ورود به آزمایشگاه سناریوها</button></div>:
     state.queue.length?<div className="cf36-task-list">{state.queue.slice(0,4).map((r,i)=><button type="button" key={r.id} onClick={()=>onOpenRecord(r.orgKey,r.id)}><span className="cf36-queue-order">{String(i+1).padStart(2,'0')}</span><span className="cf36-task-body"><strong>{r.title}</strong><small>{orgName(r.orgKey)} · {r.code}</small></span><span className="cf36-task-status">در انتظار بررسی</span><ArrowLeft size={16}/></button>)}</div>:
     <div className="cf36-blank"><CheckCheck size={25}/><strong>پرونده SUBMITTED در داده برگشتی یافت نشد</strong><span>این به معنای نبود مسئله واقعی در شهر نیست.</span></div>}
    {hasData&&state.queue.length>4&&<button className="cf36-footer-link" type="button" onClick={onDecisions}>مشاهده سایر پرونده‌های صف <ArrowLeft size={14}/></button>}
   </section>
   <section className="cf36-card cf36-companion"><div className="cf36-card-head"><div><span className="cf36-kicker"><Bot size={15}/> AI COPILOT / SUPERVISED</span><h3>دستیار تصمیم معاون</h3><p>راهنمای قابل توضیح، مبتنی بر قواعد و شواهد موجود</p></div></div>
    <div className="cf36-question-list" aria-label="موضوع راهنمای تصمیم‌یار">{[['SIGNALS','کشف نیاز'],['CAPACITY','ظرفیت شهری'],['WORK','کارهای من'],['VALUE','خلق ارزش'],['SCENARIO','سناریوها']].map(([id,label])=><button type="button" key={id} aria-pressed={mode===id} onClick={()=>setMode(id)}>{label}</button>)}</div>
    <div className="cf36-answer"><div className="cf36-answer-label"><Sparkles size={15}/> تحلیل راهنمایی · غیرمولد</div><strong>{answer.title}</strong><p>{answer.description}</p><button type="button" onClick={answer.action==='value'?onValues:onPortfolio}>مشاهده شواهد و مسیر بررسی <ArrowLeft size={15}/></button></div>
    <div className="cf36-model-note"><LockKeyhole size={15}/> بدون صدور دستور اجرایی، تخصیص منابع یا تأیید ارزش عمومی</div>
   </section>
  </div>
  <section className="cf36-card cf36-missions"><div className="cf36-card-head"><div><span className="cf36-kicker"><MapPinned size={15}/> CITY FIRST / FIVE URBAN MISSIONS</span><h3>پنج مأموریت راهبردی؛ یک شهر</h3><p>نمای عرضی معاونت، مستقل از ساختار جزیره‌ای سازمان‌ها؛ مقادیر تنها شمار پرونده‌های آموزشی هستند.</p></div><button type="button" onClick={onPortfolio}>نمای بین‌سازمانی <ArrowLeft size={15}/></button></div>
   <div className="cf36-mission-grid">{(hasData?state.coverage:[]).map((m,i)=>{const Icon=ICONS[i];return <button type="button" key={m.id} onClick={()=>onPortfolio()} className="cf36-mission"><div className="cf36-mission-head"><span><Icon size={19}/></span><span className="cf36-mission-num">0{i+1}</span></div><h4>{m.name}</h4><p>{m.caption}</p><div className="cf36-mission-meta"><b>{n(m.records)}</b><span>پرونده نمونه</span><span className="cf36-mission-pending">{n(m.pending)} بررسی</span></div><div className="cf36-mission-line"><span style={{width:`${Math.min(100,m.records/Math.max(1,state.total)*100)}%`}}/></div></button>})}
    {!hasData&&<div className="cf36-mission-empty">پس از دریافت داده معتبر، پنج مأموریت شهری و توزیع پرونده‌ها در این بخش نمایش داده می‌شوند.</div>}</div>
  </section>
  <div className="cf36-bottom-grid">
   <section className="cf36-card cf36-organizations"><div className="cf36-card-head"><div><span className="cf36-kicker"><Network size={15}/> CROSS-ORGANIZATION SIGNALS</span><h3>نمای سازمان‌ها و حوزه‌ها</h3><p>توزیع پرونده‌ها؛ نه نمره عملکرد یا کیفیت خدمت</p></div></div>
    {hasData?<div className="cf36-org-bars">{state.topOrgs.map(o=><button type="button" key={o.orgKey} onClick={()=>onOpenOrg(o.orgKey)}><span>{o.name}</span><span className="cf36-org-track"><span style={{width:`${o.records/max*100}%`}}/></span><b>{n(o.records)}</b><ArrowLeft size={13}/></button>)}</div>:<p className="cf36-muted">اطلاعات معتبر از API هنوز دریافت نشده است.</p>}
    <button type="button" className="cf36-subtle-link" onClick={onWaste}>سیستم‌عامل تخصصی پسماند <ArrowLeft size={15}/></button>
   </section>
   <section className="cf36-card cf36-roadmap"><div className="cf36-card-head"><div><span className="cf36-kicker"><Target size={15}/> PUBLIC VALUE / GOVERNANCE</span><h3>از نیاز تا ارزشِ قابل اثبات</h3><p>مراحل کنترل و مجوز؛ مشاهده پرونده به معنی تأیید ارزش نیست.</p></div></div>
    <div className="cf36-value-steps">{[
     ['01','نیاز و شواهد','رکورد قابل انتساب'],
     ['02','تطبیق ظرفیت','سرنخ · هنوز تأییدنشده'],
     ['03','اختیار و تأیید','انسانِ صاحب صلاحیت'],
     ['04','اقدام قابل حسابرسی','بدون اجرای خودمختار در دمو'],
     ['05','راستی‌آزمایی ارزش','هنوز اثبات نشده']
    ].map(([number,title,sub],i)=><div key={number}><span>{number}</span><div><strong>{title}</strong><small>{sub}</small></div>{i===4?<ShieldAlert size={17}/>:<ChevronLeft size={16}/>}</div>)}</div>
    <div className="cf36-quick-actions"><button type="button" onClick={onValues}><Target size={16}/> دفتر فرصت‌ها</button><button type="button" onClick={onGovernance}><ShieldCheck size={16}/> گراف اختیار</button><button type="button" onClick={onScenario}><FileText size={16}/> سناریوهای آموزشی</button></div>
   </section>
  </div>
  <div className="cf36-trustbar"><div><ShieldCheck size={17}/><b>منبع: دفتر تخصصی V8P2 / PostgreSQL</b></div><span>همه داده‌های موجود در این نما SYNTHETIC هستند · مرز شهرداری و سمت با API کنترل می‌شود · هیچ نتیجه میدانی یا ارزش عمومی تأیید نشده است</span></div>
 </React.Suspense></div>}</details></section>;
}
function Kpi({icon:Icon,label,value,sub,onClick,tone=''}){return <button type="button" className={`cf36-kpi cf36-kpi-${tone}`} onClick={onClick}><div><Icon size={20}/><ArrowUpRight size={14}/></div><small>{label}</small><strong>{value}</strong><span>{sub}</span></button>}
