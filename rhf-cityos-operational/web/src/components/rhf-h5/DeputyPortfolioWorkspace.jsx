import React,{useMemo,useState} from 'react';
import {Building2,ChevronDown,ChevronUp,FolderOpen,Layers3,Search,ShieldCheck,AlertTriangle,LayoutList,ArrowLeft,ClipboardList,Network} from 'lucide-react';
import {deriveDeputyPortfolio,filterPortfolioRows,displayCount,SERVICE_DOMAINS} from './portfolio-model.mjs';
import './deputy-portfolio.css';

/** Additive F1 view. All arrays are provided by the existing authenticated city app.
 * No raw fetch, user claims, writes, or invented progress values.
 */
export default function DeputyPortfolioWorkspace({city,cityName,units,cases,navigate}){
  const [expanded,setExpanded]=useState(false);
  const [only,setOnly]=useState('all');
  const [query,setQuery]=useState('');
  const [selected,setSelected]=useState(null);
  const [view,setView]=useState('structure');
  const snap=useMemo(()=>deriveDeputyPortfolio({city,cityName,units,cases}),[city,cityName,units,cases]);
  const list=useMemo(()=>filterPortfolioRows(snap,{only,query,limit:120}),[snap,only,query]);
  const org=snap.organizations.find(u=>u.id===selected);
  const go=route=>{if(typeof navigate==='function'&&['org','cases','deputy','modules','services'].includes(route))navigate(route);};
  return <section dir="rtl" className="rhf-f1" data-rhf-f1="national-deputy-portfolio-v0.1" aria-label="پرتفوی سازمان‌های معاونت خدمات شهری">
    <header className="rhf-f1__head">
      <div className="rhf-f1__brand"><div className="rhf-f1__emblem"><Network size={21}/></div><div>
        <div className="rhf-f1__kicker">F1 · NATIONAL SERVICES PORTFOLIO</div>
        <h2>سازمان‌ها و واحدهای تابعه خدمات شهری</h2>
        <p>پایش ساختار سازمانی {snap.cityName} · وابستگی فقط بر اساس زنجیره ثبت‌شده</p>
      </div></div>
      <button type="button" className="rhf-f1__toggle" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}>{expanded?'بستن میزکار':'نمایش پرتفوی'}{expanded?<ChevronUp size={17}/>:<ChevronDown size={17}/>}</button>
    </header>
    <div className="rhf-f1__stats">
      <div><span>واحدهای بارگذاری‌شده</span><strong>{displayCount(snap.counts.loadedUnits)}</strong></div>
      <div><span>واحدهای با وابستگی مستند</span><strong>{displayCount(snap.counts.verifiedSubunits)}</strong></div>
      <div><span>نیازمند بررسی وابستگی</span><strong>{displayCount(snap.counts.unverifiedSubunits)}</strong></div>
      <div><span>پیشرفت تأییدشده پروژه‌ها</span><strong>—</strong></div>
    </div>
    {expanded&&<div className="rhf-f1__body">
      <div className="rhf-f1__notice"><ShieldCheck size={17}/>
        <span>{snap.roots.length?`تعداد ${displayCount(snap.roots.length)} ریشه معاونت مرتبط در داده‌های دریافت‌شده شناسایی شد. وابستگی دیگر واحدها باید بررسی شود.`:'ریشه معتبر معاونت خدمات شهری در داده‌های دریافتی شناسایی نشد؛ هیچ سازمانی به‌صورت خودکار تابع معاونت فرض نمی‌شود.'}</span>
      </div>
      <div className="rhf-f1__tabs" role="group" aria-label="نمای پرتفوی">
        <button type="button" aria-pressed={view==='structure'} onClick={()=>setView('structure')}><LayoutList size={16}/> ساختار دریافت‌شده</button>
        <button type="button" aria-pressed={view==='catalog'} onClick={()=>setView('catalog')}><Layers3 size={16}/> قالب‌های ملی خدمات</button>
      </div>
      {view==='structure'?<>
        <div className="rhf-f1__tools"><label className="rhf-f1__search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="جست‌وجوی سازمان، اداره یا واحد" aria-label="جست‌وجوی واحد"/></label>
          <select aria-label="فیلتر وابستگی" value={only} onChange={e=>setOnly(e.target.value)}><option value="all">همه واحدهای قابل مشاهده</option><option value="verified">وابستگی مستند</option><option value="unverified">نیازمند بررسی</option></select>
        </div>
        {!snap.unitsLoaded?<div className="rhf-f1__empty"><AlertTriangle size={22}/> داده سازمانی از سامانه اصلی دریافت نشده است؛ هیچ عددی به‌جای داده نمایش داده نمی‌شود.</div>:
          list.length===0?<div className="rhf-f1__empty"><FolderOpen size={22}/> واحدی با این فیلتر در داده‌های بارگذاری‌شده یافت نشد.</div>:
          <div className="rhf-f1__layout"><div className="rhf-f1__rows" role="list" aria-label="فهرست واحدها">
            {list.map(u=><button type="button" role="listitem" key={u.id} className={`rhf-f1__unit ${selected===u.id?'is-selected':''}`} onClick={()=>setSelected(u.id)}><Building2 size={18}/><span className="rhf-f1__unit-name">{u.name}<small>{u.category.label} · {u.category.source==='NAME_HEURISTIC_NOT_APPROVED'?'دسته‌بندی پیشنهادی':'دسته‌بندی تعیین‌نشده'}</small></span><span className={`rhf-f1__state ${u.affiliation==='VERIFIED'?'is-verified':''}`}>{u.affiliation==='VERIFIED'?'وابستگی مستند':'نیازمند تطبیق'}</span></button>)}
          </div><aside className="rhf-f1__detail" aria-live="polite">
            {org?<><h3>{org.name}</h3><p>وضعیت وابستگی: {org.affiliation==='VERIFIED'?'تأییدشده با ساختار موجود':'احرازنشده'}</p>
              <div className="rhf-f1__detail-metrics"><div><span>پرونده باز مرتبط با شناسه واحد</span><strong>{displayCount(org.openLinkedCases)}</strong></div><div><span>پیشرفت پروژه‌ها</span><strong>نیازمند اتصال داده و تأیید شواهد</strong></div></div>
              <p className="rhf-f1__tiny">پرونده‌ها صرفاً از ردیف‌های دریافتی و دارای شناسه واحد شمرده شده‌اند؛ تعداد کل پرونده‌ها یا وظایف شخصی نیستند.</p></>:
              <><ClipboardList size={23}/><h3>جزئیات سازمان</h3><p>یکی از واحدهای فهرست را انتخاب کنید. سوابق پیشرفت و بودجه پس از اتصال منابع معتبر در فاز F2 نمایش داده می‌شوند.</p></>}
            <div className="rhf-f1__links"><button type="button" onClick={()=>go('org')} disabled={typeof navigate!=='function'}>ساختار سازمانی <ArrowLeft size={15}/></button><button type="button" onClick={()=>go('cases')} disabled={typeof navigate!=='function'}>پرونده‌ها <ArrowLeft size={15}/></button></div>
          </aside></div>}
        {snap.unitsLoaded&&snap.organizations.length>list.length&&<p className="rhf-f1__tiny">حداکثر ۱۲۰ ردیف برای مرور سریع نمایش داده می‌شود. برای مشاهده همه واحدها از صفحه ساختار سازمانی استفاده کنید.</p>}
      </>:<div className="rhf-f1__catalog"><p>این فهرست «قالب حوزه خدمت» است، نه چارت رسمی شهرداری منتخب. هر حوزه تنها با تصویب و تنظیم ارتباط سازمانی فعال می‌شود.</p><div className="rhf-f1__catalog-grid">{SERVICE_DOMAINS.map(s=><div key={s.code}><Layers3 size={16}/>{s.name}<span>قابل پیکربندی</span></div>)}</div></div>}
      <footer className="rhf-f1__foot">F1 فقط‌خواندنی · بدون Migration · بدون مأموریت خودکار · بدون آمار پیشرفت تخمینی · مدیریت حوزه اختیار و شواهد در فازهای بعد</footer>
    </div>}
  </section>;
}
