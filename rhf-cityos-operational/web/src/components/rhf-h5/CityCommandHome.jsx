import React from 'react';
import {Activity,ArrowLeft,Bell,BookOpenCheck,BrainCircuit,Building2,ChartNoAxesCombined,ChevronLeft,ClipboardList,Clock3,FolderOpen,Layers3,MapPinned,ShieldCheck,Target,TriangleAlert} from 'lucide-react';
import './city-command-home.css';
/**
 * Optional replacement for the existing oversized homepage hero, NOT mounted.
 * Display values come from the existing RUVOS home/city API, with no placeholder records.
 * onNavigate must reuse current authenticated app router. Nothing writes to server.
 * Metrics: [{id,label,value,detail,tone}], priorities: [{id,title,subtitle,severity,route}],
 * destinations: [{id,label,description,route}], cityName: trusted selected city label.
 */
export default function CityCommandHome({cityName,metrics,priorities,destinations,onNavigate,loading=false,updatedAt,agentRoute}){
  const safeMetrics=Array.isArray(metrics)?metrics.slice(0,4):[];
  const safePriorities=Array.isArray(priorities)?priorities.slice(0,5):[];
  const safeDestinations=Array.isArray(destinations)?destinations.slice(0,4):[];
  const go=route=>{if(route&&typeof onNavigate==='function')onNavigate(route)};
  const validUpdatedAt=updatedAt&&Number.isFinite(new Date(updatedAt).valueOf())?new Date(updatedAt):null;
  const label=v=>(typeof v==='string'||typeof v==='number')?String(v):'—';
  return <section className="rhf-home-v2" data-rhf-h5="home-v3" dir="rtl" aria-label="مرکز فرماندهی شهری">
    <section className="rhf-home-v2__welcome">
      <div className="rhf-home-v2__welcome-copy"><span className="rhf-home-v2__overline"><Activity size={15}/> RHF CITY OS · COMMAND CENTER</span>
        <h1>مرکز فرماندهی و ارزش شهری</h1>
        <p>وضعیت امروز، تصمیم‌های مهم و مسیر اقدام — در یک نگاه</p>
        <div className="rhf-home-v2__scope"><Building2 size={15}/>{cityName?label(cityName):'شهرداری انتخاب‌شده'}<span aria-hidden="true">·</span><ShieldCheck size={15}/> داده‌های محدوده انتخاب‌شده</div>
      </div>
      <div className="rhf-home-v2__welcome-art" aria-hidden="true"><span className="rhf-home-v2__orb"><Activity size={58}/></span></div>
    </section>
    <section className="rhf-home-v2__metric-bar" aria-label="شاخص‌های عملیاتی">
      {safeMetrics.length===0?<p className="rhf-home-v2__empty">{loading?'در حال دریافت شاخص‌ها…':'شاخص‌های تأییدشده هنوز از API دریافت نشده‌اند.'}</p>:safeMetrics.map((m,i)=>{
        const I=[Layers3,ClipboardList,TriangleAlert,Clock3][i%4];
        return <article className="rhf-home-v2__metric" key={m.id||i}><div className="rhf-home-v2__metric-top"><span>{label(m.label)}</span><I size={19}/></div><strong>{label(m.value)}</strong><p>{label(m.detail)}</p></article>;
      })}
    </section>
    <div className="rhf-home-v2__content">
      <section className="rhf-home-v2__priority-card"><div className="rhf-home-v2__section-title"><div><span className="rhf-home-v2__section-icon"><Target size={19}/></span><div><h2>اکنون چه کاری مهم است؟</h2><p>موارد نیازمند بررسی و اقدام در شهرداری منتخب</p></div></div><span className="rhf-home-v2__small-meta">نمای عملیاتی</span></div>
      {safePriorities.length===0?<p className="rhf-home-v2__empty">{loading?'در حال دریافت اولویت‌ها…':'هیچ فهرست اولویت معتبری از API دریافت نشده است.'}</p>:<div className="rhf-home-v2__priorities">{safePriorities.map((p,i)=><button type="button" disabled={!p.route||typeof onNavigate!=='function'} onClick={()=>go(p.route)} className="rhf-home-v2__priority" key={p.id||i}><span className={'rhf-home-v2__sev rhf-home-v2__sev--'+(p.severity==='high'?'high':'normal')}><Target size={16}/></span><span className="rhf-home-v2__priority-text"><strong>{label(p.title)}</strong><small>{label(p.subtitle)}</small></span><ChevronLeft size={17}/></button>)}</div>}
      </section>
      <aside className="rhf-home-v2__agent-card"><div className="rhf-home-v2__agent-title"><span><BrainCircuit size={23}/></span><div><strong>راهبری هوشمند</strong><small>Urban Agent · Governed AI</small></div></div><h2>از تحلیل تا اقدام مسئولانه</h2><p>پیشنهادها مبتنی بر داده و در چارچوب مجوزهای انسانی بررسی می‌شوند.</p><div className="rhf-home-v2__agent-gate"><ShieldCheck size={15}/> اجرای خودکار هنوز غیرفعال است</div><button disabled={!agentRoute||typeof onNavigate!=='function'} onClick={()=>go(agentRoute)} type="button">ورود به میزکار عامل <ArrowLeft size={17}/></button></aside>
    </div>
    <section className="rhf-home-v2__destinations"><div className="rhf-home-v2__section-title"><div><span className="rhf-home-v2__section-icon"><MapPinned size={19}/></span><div><h2>ورود سریع به حوزه‌های کاری</h2><p>همان ماژول‌های موجود RHF City OS</p></div></div></div>
      <div className="rhf-home-v2__destinations-grid">{safeDestinations.length===0?<p className="rhf-home-v2__empty">مسیرهای مجاز توسط Router موجود تعریف می‌شوند.</p>:safeDestinations.map((d,i)=>{
        const I=[Building2,Layers3,ChartNoAxesCombined,BookOpenCheck][i%4];
        return <button type="button" disabled={!d.route||typeof onNavigate!=='function'} onClick={()=>go(d.route)} key={d.id||i}><span><I size={20}/></span><strong>{label(d.label)}</strong><small>{label(d.description)}</small><ArrowLeft size={16}/></button>;
      })}</div>
    </section>
    <footer className="rhf-home-v2__footer">آخرین به‌روزرسانی: {validUpdatedAt?new Intl.DateTimeFormat('fa-IR',{dateStyle:'medium',timeStyle:'short'}).format(validUpdatedAt):'—'} · داده ساختگی نمایش داده نمی‌شود.</footer>
  </section>;
}
