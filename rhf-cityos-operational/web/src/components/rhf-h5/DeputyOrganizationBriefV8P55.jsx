import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Activity,ArrowLeft,BarChart3,Building2,CheckCircle2,ClipboardList,LockKeyhole,ShieldAlert,Target,X} from 'lucide-react';
import {organizationPulse,sampleTaskRows,UX55_VERSION} from './deputy-organization-v8p55-core.mjs';
import './deputy-organization-v8p55.css';
const nf=n=>Number.isFinite(n)?new Intl.NumberFormat('fa-IR').format(n):'—';
export default function DeputyOrganizationBriefV8P55({organization,cityName,onClose,onOpenWorkspace,onPerformance}){
 const closeRef=useRef(null),panelRef=useRef(null),[tab,setTab]=useState('units');
 const pulse=useMemo(()=>organizationPulse(organization),[organization]);
 const tasks=useMemo(()=>sampleTaskRows(organization),[organization]);
 useEffect(()=>{const previous=document.activeElement;closeRef.current?.focus();const key=e=>{if(e.key==='Escape'){e.preventDefault();onClose();}if(e.key==='Tab'){const controls=[...(panelRef.current?.querySelectorAll('button:not([disabled]),a[href],input:not([disabled])')||[])];if(!controls.length)return;const first=controls[0],last=controls[controls.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);previous?.focus?.()};},[onClose]);
 if(!organization||!pulse)return null;
 const d=organization.dimensions??{};
 return <div className="ux55-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
  <section ref={panelRef} className="ux55-sheet" role="dialog" aria-modal="true" aria-labelledby="ux55-sheet-heading" dir="rtl" data-rhf-organization-ux={UX55_VERSION}>
   <header className="ux55-head"><div className="ux55-breadcrumb"><Building2 size={17}/> حوزه تخصصی · {cityName||'شهرداری جاری'} <span>DEMO / آموزش</span></div><button className="ux55-close" ref={closeRef} type="button" onClick={onClose} aria-label="بستن جزئیات سازمان"><X size={20}/></button></header>
   <div className="ux55-cover"><div><p>میزکار سازمانی / Organization cockpit</p><h2 id="ux55-sheet-heading">{organization.name}</h2><span>{organization.mission}</span></div><div className="ux55-cover-score"><small>امتیاز نمونه PUC+</small><strong>{nf(pulse.score)}</strong><span>{pulse.veto?'VETO انطباق':'SYNTHETIC / DEMO'}</span></div></div>
   <div className="ux55-disclaimer"><ShieldAlert size={16}/> تمام اعداد، وضعیت‌ها و فعالیت‌های این بخش ساختگی هستند. پرونده واقعی، ظرفیت در دسترس یا ارزش عمومی تأییدشده محسوب نمی‌شوند.</div>
   <div className="ux55-overview"><div><small>واحد نمونه</small><strong>{nf(pulse.units.length)}</strong></div><div><small>دوره روند</small><strong>{nf(pulse.trend.length)}</strong></div><div><small>نمونه فعالیت</small><strong>{nf(tasks.length)}</strong></div><div><small>ارزش تأییدشده</small><strong>—</strong></div></div>
   <div className="ux55-dimensions" aria-label="مؤلفه‌های آموزشی PUC+">{[['P','عملکرد',35,'#226DB4'],['U','بهره‌وری',25,'#089949'],['C','انطباق',20,'#E42527'],['Plus','توسعه',20,'#F9B21D']].map(([key,label,w,color])=><div key={key}><span>{label} <small>{w}٪</small></span><strong>{nf(d[key])}</strong><div><i style={{width:`${Math.min(100,Math.max(0,d[key]||0))}%`,background:color}}/></div></div>)}</div>
   <nav className="ux55-tabs" aria-label="بخش‌های میزکار سازمان"><button type="button" onClick={()=>setTab('units')} aria-current={tab==='units'?'page':undefined}>واحدهای زیرمجموعه</button><button type="button" onClick={()=>setTab('tasks')} aria-current={tab==='tasks'?'page':undefined}>فعالیت‌های نمونه</button><button type="button" onClick={()=>setTab('trend')} aria-current={tab==='trend'?'page':undefined}>روند عملکرد</button></nav>
   {tab==='units'&&<div className="ux55-units">{pulse.units.map((u,i)=><article key={u.id}><div className="ux55-unit-head"><span>{String(i+1).padStart(2,'0')}</span><strong>{u.title}</strong><b>{nf(u.score)}/۱۰۰</b></div><div className="ux55-meter"><i style={{width:`${u.score}%`}}/></div><p>شاخص‌های صرفاً آموزشی · {nf(u.sampleCount)} رویداد نمونه تولیدشده در مدل نمایشی</p></article>)}</div>}
   {tab==='tasks'&&<div className="ux55-tasks">{tasks.map((t,i)=><article key={t.id}><ClipboardList size={18}/><div><strong>{t.title}</strong><small>{i===0?'نمونه نیازمند بررسی':i===1?'تحلیل آموزشی':'سناریوی ارائه محصول'}</small></div><span>DEMO</span></article>)}</div>}
   {tab==='trend'&&<div className="ux55-trend"><div className="ux55-trend-bars">{pulse.trend.map((v,i)=><div key={i}><strong>{nf(v)}</strong><i style={{height:`${v}%`}}/><small>{i+1}</small></div>)}</div><p>شش دوره نمونه · بدون اتصال به پلتفرم مستقل ارزیابی عملکرد</p></div>}
   <footer className="ux55-footer"><button type="button" className="ux55-secondary" onClick={onPerformance}><BarChart3 size={16}/> داشبورد جامع PUC+</button><button type="button" className="ux55-primary" onClick={onOpenWorkspace}><ArrowLeft size={17}/> ورود به میزکار تخصصی</button></footer>
   <div className="ux55-footnote"><LockKeyhole size={13}/> بازشدن این پنل به‌معنای اعطای مجوز سروری نیست؛ همه درخواست‌های عملیاتی همچنان تابع RBAC/RLS هستند.</div>
  </section></div>;
}
