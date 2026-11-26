import React,{useEffect,useMemo,useState} from 'react';
import {Activity,ArrowLeft,AlertTriangle,BarChart3,Bot,Building2,ClipboardList,FileText,RefreshCw,Search,ShieldCheck} from 'lucide-react';
import {NON_WASTE} from './deputy-multi-core.mjs';
import {buildPortfolio,filterPortfolio,PORTFOLIO_VERSION,STATUS_LABELS} from './deputy-portfolio-v8p3-core.mjs';
import './deputy-portfolio-v8p3.css';
import DeputyAgenticOpportunityV8P32 from './DeputyAgenticOpportunityV8P32.jsx';
import DeputyAuthorityGraphV8P33 from './DeputyAuthorityGraphV8P33.jsx';
import DeputyOpportunityExchangeV8P34 from './DeputyOpportunityExchangeV8P34.jsx';
import DeputyScenarioStudioV8P35 from './DeputyScenarioStudioV8P35.jsx';
const E=x=>encodeURIComponent(String(x||''));
const n=x=>new Intl.NumberFormat('fa-IR').format(x);
const name=id=>NON_WASTE.find(o=>o.id===id)?.name||'حوزه نامشخص';
const date=d=>{const t=Date.parse(d);return Number.isFinite(t)?new Intl.DateTimeFormat('fa-IR',{dateStyle:'short'}).format(new Date(t)):'نامشخص'};

export default function DeputyPortfolioV8P3({city,api,assignmentId=null,isSystemAdmin=false,onOpenRecord=()=>{},onOpenOrg=()=>{},onFull=()=>{},compact=false}){
 const [board,setBoard]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[epoch,setEpoch]=useState(0);
 const [org,setOrg]=useState('ALL'),[status,setStatus]=useState('ALL'),[query,setQuery]=useState('');
 const auth=assignmentId&&!isSystemAdmin?`?assignmentId=${E(assignmentId)}`:'';
 const path=`/cities/${E(city)}/org-deputy-dossiers${auth}`;
 useEffect(()=>{if(!city)return;let live=true;setBoard(null);setError('');setBusy(true);
  api(path).then(payload=>{if(live)setBoard(buildPortfolio(payload,city))})
   .catch(ex=>{if(live){setBoard(null);setError(ex?.message||'عدم دسترسی به پرونده‌های مجاز معاونت')}})
   .finally(()=>{if(live)setBusy(false)});
  return()=>{live=false};
 },[city,path,api,epoch]);
 const visible=useMemo(()=>board?filterPortfolio(board.rows,{org,status,query}):[],[board,org,status,query]);
 const flagged=useMemo(()=>new Set(board?.indicators.map(s=>s.id)||[]),[board]);
 const max=Math.max(1,...(board?.organizations||[]).map(o=>o.records));
 return <section className={`dp3-shell${compact?' dp3-compact':''}`} dir="rtl" data-rhf-v8p3={PORTFOLIO_VERSION}>
  <header className="dp3-header"><div><small>V8P3.1 · READ-ONLY · AUTHENTICATED API</small><h2>{compact?'پایش پرونده‌های تخصصی معاونت':'مرکز پایش بین‌سازمانی و صف پرونده‌های معاونت'}</h2><p>منبع مستقیم: دفتر تخصصی V8P2 در PostgreSQL؛ فقط داده آموزشی SYNTHETIC و بدون تأیید منفعت عمومی</p></div><div className="dp3-header-actions"><button type="button" onClick={()=>setEpoch(v=>v+1)} disabled={busy}><RefreshCw size={15}/> بازخوانی سرور</button>{compact&&<button className="dp3-primary" type="button" onClick={onFull}>نمای کامل <ArrowLeft size={15}/></button>}</div></header>
  {error&&<div className="dp3-error" role="alert"><AlertTriangle size={18}/>{error}؛ هیچ آمار جایگزین یا نمونه ساختگی در این نما نمایش داده نمی‌شود.</div>}
  {busy&&<div className="dp3-loading" role="status">در حال دریافت داده‌های مجاز از API...</div>}
  {!busy&&!board&&!error&&<div className="dp3-loading">اطلاعاتی دریافت نشده است.</div>}
  {board&&<>
   {board.partial&&<div className="dp3-warning" role="status"><AlertTriangle size={17}/> سقف ۲۰۰ پرونده API فعال است؛ آمار زیر فقط بر اساس پرونده‌های برگشتی محاسبه شده و آمار کل شهر نیست.</div>}
   <div className="dp3-kpis" aria-label="شاخص‌های پرونده‌های ذخیره‌شده">
    <Stat icon={FileText} label="پرونده‌های برگشتی API" value={n(board.total)} hint={board.partial?'فقط نخستین ۲۰۰ پرونده':'همه پرونده‌های برگشتی'}/>
    <Stat icon={ClipboardList} label="در انتظار بررسی مستقل" value={n(board.counts.SUBMITTED)} hint="وضعیت SUBMITTED" attention={board.counts.SUBMITTED>0}/>
    <Stat icon={Activity} label="پرونده دارای شاخص نمونه" value={n(board.indicators.length)} hint="قاعده‌محور؛ نه هشدار واقعی"/>
    <Stat icon={Building2} label="حوزه دارای داده" value={`${n(board.coverage)} / ۱۱`} hint="حوزه منطقی، نه سازمان ثبت‌شده"/>
   </div>
   {!compact&&<DeputyAgenticOpportunityV8P32 board={board} city={city} api={api} assignmentId={assignmentId} isSystemAdmin={isSystemAdmin} onOpenRecord={onOpenRecord} onRefresh={()=>setEpoch(v=>v+1)}/>}
   {!compact&&<DeputyAuthorityGraphV8P33 city={city} api={api} assignmentId={assignmentId} isSystemAdmin={isSystemAdmin}/>}
   {!compact&&<DeputyOpportunityExchangeV8P34 city={city} api={api} assignmentId={assignmentId} isSystemAdmin={isSystemAdmin} onOpenRecord={onOpenRecord}/>}
   {!compact&&<DeputyScenarioStudioV8P35 city={city} api={api} assignmentId={assignmentId} isSystemAdmin={isSystemAdmin} onOpenRecord={onOpenRecord} onRefresh={()=>setEpoch(v=>v+1)}/>}
   {!compact&&<><div className="dp3-two-col">
    <section className="dp3-panel"><h3><BarChart3 size={18}/> توزیع پرونده‌های تخصصی</h3><p>شمار پرونده‌ها؛ مقادیر شاخص‌های با واحد متفاوت با هم جمع نمی‌شوند.</p><div className="dp3-bars">{board.organizations.map(o=><button type="button" key={o.orgKey} onClick={()=>onOpenOrg(o.orgKey)} title={`ورود به دفتر ${o.name}`}><span>{o.name}</span><span className="dp3-track"><span style={{width:`${o.records/max*100}%`}}/></span><strong>{n(o.records)}</strong><ArrowLeft size={14}/></button>)}</div></section>
    <section className="dp3-panel"><h3><Bot size={18}/> پیشنهادهای بررسی مبتنی بر قواعد</h3><p>این خروجی «ایجنت خودمختار» نیست؛ صرفاً محاسبه شفاف روی فرم‌های ذخیره‌شده است.</p><div className="dp3-signals">{board.indicators.slice(0,9).map(s=><article key={s.id}><div><strong>{name(s.orgKey)}</strong><span>{s.label}: {n(s.quantity)}</span><small>{s.code} · {s.source}</small><p>پیشنهاد قابل بررسی انسانی: {s.proposal}</p></div><button type="button" onClick={()=>onOpenRecord(s.orgKey,s.id)}>پرونده و شواهد <ArrowLeft size={14}/></button></article>)}{board.indicators.length===0&&<p className="dp3-empty">شاخص مثبتی در پرونده‌های برگشتی یافت نشد؛ این به معنی نبود خطر واقعی نیست.</p>}{board.indicators.length>9&&<p>فقط ۹ پیشنهاد اول نمایش داده شده‌اند؛ پرونده‌های دیگر را در جدول بررسی کنید.</p>}</div></section>
   </div></>}
   {compact?<div className="dp3-short"><div><strong>صف فوری بررسی داخلی</strong><span>{n(board.pending.length)} پرونده نمونه در انتظار بازبینی</span></div>{board.pending.slice(0,3).map(r=><button key={r.id} type="button" onClick={()=>onOpenRecord(r.orgKey,r.id)}>{name(r.orgKey)} · {r.title}<ArrowLeft size={14}/></button>)}{board.pending.length===0&&<span>در داده‌های برگشتی پرونده SUBMITTED وجود ندارد.</span>}</div>:<section className="dp3-panel"><div className="dp3-list-head"><div><h3><ClipboardList size={18}/> صف یکپارچه پرونده‌ها</h3><p>ورود به پرونده، به همان دفتر سازمانی V8P2 هدایت می‌شود؛ تصمیم‌گیری فقط با مجوز سرور و بازبین مستقل امکان‌پذیر است.</p></div><span>{n(visible.length)} رکورد نمایش‌داده‌شده</span></div>
    <div className="dp3-filters"><label>حوزه<select value={org} onChange={e=>setOrg(e.target.value)}><option value="ALL">تمام حوزه‌ها</option>{NON_WASTE.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label><label>وضعیت<select value={status} onChange={e=>setStatus(e.target.value)}><option value="ALL">تمام وضعیت‌ها</option>{Object.entries(STATUS_LABELS).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label><label className="dp3-search"><Search size={16}/> <input aria-label="جست‌وجوی پرونده" placeholder="عنوان، شماره یا شرح پرونده" value={query} onChange={e=>setQuery(e.target.value)}/></label></div>
    <div className="dp3-table-wrap"><table><thead><tr><th>پرونده و منبع</th><th>حوزه</th><th>وضعیت</th><th>تاریخ ثبت نرم‌افزاری</th><th>شاخص نمونه</th><th>اقدام مجاز</th></tr></thead><tbody>{visible.map(r=><tr key={r.id}><td><strong>{r.title}</strong><small>{r.code}</small></td><td>{name(r.orgKey)}</td><td><span className={`dp3-status dp3-${r.status.toLowerCase()}`}>{STATUS_LABELS[r.status]}</span></td><td>{date(r.createdAt)}</td><td>{flagged.has(r.id)?'نیازمند بازبینی داده نمونه':'بدون شاخص تعریف‌شده'}</td><td><button type="button" onClick={()=>onOpenRecord(r.orgKey,r.id)}>باز کردن پرونده <ArrowLeft size={14}/></button></td></tr>)}</tbody></table>{visible.length===0&&<div className="dp3-empty">پرونده‌ای با این فیلتر در پاسخ مجاز وجود ندارد. {board.total===0?'برای داده آموزشی از بارگذاری مجاز دفتر تخصصی استفاده کنید.':''}</div>}</div>
   </section>}
   <footer className="dp3-foot"><ShieldCheck size={17}/> حریم دسترسی توسط API و سمت تأییدشده کنترل می‌شود. بدون بارگذاری، اعزام، تغییر وضعیت، اجرای مستقل ایجنت یا تأیید ارزش عمومی. {board.partial?'پاسخ محدود به ۲۰۰ پرونده است.':'دامنه نمایش فقط پاسخ معتبر همین شهرداری است.'}</footer>
  </>}
 </section>;
}
function Stat({icon:Icon,label,value,hint,attention=false}){return <div className={`dp3-stat${attention?' dp3-attention':''}`}><Icon size={19}/><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>}
