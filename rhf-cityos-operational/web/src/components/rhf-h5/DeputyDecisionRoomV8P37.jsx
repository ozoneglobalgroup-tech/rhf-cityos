import React,{useMemo,useState} from 'react';
import {ArrowLeft,BookOpenCheck,CheckCheck,ChevronDown,ClipboardCheck,FileClock,FileText,Filter,LockKeyhole,Search,ShieldAlert,ShieldCheck,Sparkles,UserRoundCheck} from 'lucide-react';
import {NON_WASTE} from './deputy-multi-core.mjs';
import {DECISION_ROOM_VERSION,DECISION_TABS,decisionRoomProjection,filterDecisionRows,decisionGate} from './deputy-decision-room-v8p37-core.mjs';
import './deputy-decision-room-v8p37.css';
const N=x=>new Intl.NumberFormat('fa-IR').format(x);
const name=x=>NON_WASTE.find(o=>o.id===x)?.name||'حوزه نامشخص';
const status={DRAFT:'پیش‌نویس',SUBMITTED:'در انتظار بازبینی',REVIEWED:'بررسی داخلی انجام شده',REJECTED:'رد آزمایشی',FIXTURE:'نمونه آموزشی'};
export default function DeputyDecisionRoomV8P37({board,onOpenRecord=()=>{},onPortfolio=()=>{},onScenario=()=>{}}){
 const p=useMemo(()=>decisionRoomProjection(board),[board]);
 const [tab,setTab]=useState('REVIEWABLE'),[orgKey,setOrgKey]=useState('ALL'),[query,setQuery]=useState(''),[expanded,setExpanded]=useState(null);
 const rows=useMemo(()=>filterDecisionRows(p,{tab,orgKey,query}),[p,tab,orgKey,query]);
 const max=Math.max(1,...p.byMission.map(x=>x.submitted));
 return <section className="dr37" dir="rtl" data-rhf-decision-room={DECISION_ROOM_VERSION} aria-label="کارتابل تصمیم معاونت خدمات شهری">
  <div className="dr37-head"><div><small><Sparkles size={14}/> HUMAN-GOVERNED DECISION ROOM / V8P3.7</small><h3>کارتابل تصمیم و ارجاع معاونت</h3><p>کارهای قابل اقدام، محدودیت اختیار و کدهای ارجاع؛ بر اساس پرونده‌های ذخیره‌شده همان شهرداری</p></div><span className="dr37-chip"><LockKeyhole size={14}/> بدون تأیید یا اقدام خودکار</span></div>
  {p.mode!=='SCOPED_SYNTHETIC'?<div className="dr37-empty" role="status"><ShieldAlert size={24}/><strong>پرونده مجاز برای ساخت کارتابل دریافت نشده است</strong><p>تا دریافت داده معتبر از API، هیچ وظیفه، اقدام یا هشدار ساختگی نمایش داده نمی‌شود.</p><button type="button" onClick={onPortfolio}>بررسی اتصال دفتر پرونده‌ها <ArrowLeft size={14}/></button></div>:<>
   {p.partial&&<div className="dr37-warning"><ShieldAlert size={15}/> سقف API برابر ۲۰۰ پرونده است؛ شمارهای زیر فقط به مجموعه دریافت‌شده تعلق دارد، نه کل شهر.</div>}
   <div className="dr37-stats">
    <Stat icon={UserRoundCheck} name="قابل ارجاع برای بازبینی من" value={p.canReview?N(p.reviewable.length):'بدون مجوز'} caption="خود-بازبینی ممنوع"/>
    <Stat icon={FileClock} name="تمام پرونده‌های SUBMITTED" value={N(p.submitted.length)} caption="صرفاً پرونده‌های آموزشی"/>
    <Stat icon={FileText} name="پیش‌نویس‌های من" value={p.canCreate?N(p.myDrafts.length):'بدون مجوز'} caption="قابل اصلاح در دفتر تخصصی"/>
    <Stat icon={BookOpenCheck} name="کد ارجاع آزمایشی ثبت نشده" value={N(p.withoutEvidenceRefs)} caption="نه فقدان مدرک واقعی"/>
   </div>
   <div className="dr37-main"><div className="dr37-work">
    <div className="dr37-tabs" role="group" aria-label="فیلتر کارتابل">{DECISION_TABS.map(t=><button type="button" key={t.id} aria-pressed={tab===t.id} onClick={()=>{setTab(t.id);setExpanded(null)}}>{t.label}</button>)}</div>
    <div className="dr37-filters"><label><Filter size={15}/> حوزه تخصصی<select value={orgKey} onChange={e=>{setOrgKey(e.target.value);setExpanded(null)}}><option value="ALL">تمام حوزه‌ها</option>{NON_WASTE.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select><ChevronDown size={13}/></label><label><Search size={15}/> جست‌وجو<input type="search" value={query} maxLength={100} placeholder="عنوان یا کد پرونده" onChange={e=>{setQuery(e.target.value);setExpanded(null)}}/></label></div>
    <div className="dr37-rows" aria-live="polite">{rows.length?rows.slice(0,40).map(r=>{const g=decisionGate(r,p);return <article key={r.id} className={expanded===r.id?'dr37-active':''}><button type="button" className="dr37-row" aria-expanded={expanded===r.id} onClick={()=>setExpanded(v=>v===r.id?null:r.id)}><span className="dr37-row-icon"><ClipboardCheck size={18}/></span><span className="dr37-row-text"><strong>{r.title}</strong><small>{name(r.orgKey)} · {r.code} · {status[r.status]}</small></span><span className="dr37-evidence" data-has-refs={r.evidenceRefs.length>0?'yes':'no'}>{r.evidenceRefs.length?`${N(r.evidenceRefs.length)} ارجاع نمونه`:'بدون ارجاع نمونه'}</span><ChevronDown size={15}/></button>{expanded===r.id&&<div className="dr37-row-detail"><p>{r.description}</p><div className="dr37-gate"><ShieldCheck size={16}/><span><b>{g.label}</b><small>{g.hint}</small></span></div>{r.evidenceRefs.length>0&&<div className="dr37-references">{r.evidenceRefs.map(e=><span key={e.referenceCode}>{e.label} · <code>{e.referenceCode}</code></span>)}</div>}<button type="button" className="dr37-open" onClick={()=>onOpenRecord(r.orgKey,r.id)}>گشودن پرونده، شواهد و تاریخچه در دفتر تخصصی <ArrowLeft size={14}/></button></div>}</article>}):<div className="dr37-empty-results"><CheckCheck size={22}/><strong>پرونده‌ای با این فیلتر پیدا نشد</strong><p>نبود نتیجه، به معنای نبود نیاز یا مسئله واقعی شهری نیست.</p><button type="button" onClick={()=>{setTab('ALL');setOrgKey('ALL');setQuery('');setExpanded(null)}}>پاک‌کردن فیلترها</button></div>}</div>
    {rows.length>40&&<p className="dr37-note">فقط ۴۰ پرونده نخست از {N(rows.length)} نتیجه این فیلتر نمایش داده شده است؛ برای مشاهده کامل به دفتر تخصصی مراجعه کنید.</p>}
   </div>
   <aside className="dr37-side"><div className="dr37-side-head"><span><Sparkles size={16}/> پیشنهادهای راهنمایی</span><small>قاعده‌محور · نه ایجنت خودمختار</small></div>
    {p.recommendations.length?p.recommendations.map(rec=><button type="button" key={rec.kind} onClick={()=>onOpenRecord(rec.orgKey,rec.id)}><strong>{rec.title}</strong><span>{rec.description}</span><small>مشاهده مستندات <ArrowLeft size={12}/></small></button>):<div className="dr37-side-empty">در این پاسخ، وظیفه قابل پیشنهاد بر اساس قواعد مشاهده نشد. وضعیت کل شهر قابل استنتاج نیست.</div>}
    <div className="dr37-mission-head">توزیع صف در پنج مأموریت</div><div className="dr37-mission-bars">{p.byMission.map(x=><div key={x.id}><span>{x.name}</span><b>{N(x.submitted)}</b><div className="dr37-track"><i style={{width:`${x.submitted/max*100}%`}}/></div></div>)}</div>
    <button className="dr37-scenarios" type="button" onClick={onScenario}>بازکردن سناریوهای آموزشی <ArrowLeft size={14}/></button>
   </aside></div>
   <div className="dr37-footer"><ShieldAlert size={16}/><span>ارجاع سند صرفاً کد DEMO است و سند حقیقی را اثبات نمی‌کند. کنترل نهایی اختیار، نسخه پرونده، منع خودبازبینی و یادداشت تصمیم در API موجود V8P2 اجرا می‌شود. هیچ اعزام، تخصیص منبع یا ارزش عمومی تأییدشده‌ای در این کارتابل ایجاد نمی‌شود.</span></div>
  </>}
 </section>;
}
function Stat({icon:Icon,name,value,caption}){return <div className="dr37-stat"><div><Icon size={19}/><span>{name}</span></div><strong>{value}</strong><small>{caption}</small></div>}
