import React,{useMemo,useState} from 'react';
import {Building2,ShieldAlert,ChevronDown,ChevronUp,Search,ArrowLeft,Network,ClipboardList,FileCheck2,MapPin} from 'lucide-react';
import {deriveDeputyPortfolio} from './portfolio-model.mjs';
import {readinessFromPortfolio,filterReadinessRows,displayNumber} from './org-readiness-core.mjs';
import './org-readiness.css';
/** F1.2V read-only operational visibility, using already authenticated and city-scoped parent data.
 * No GET to new not-yet-mounted APIs; no changes to city structures, cases, agents or database.
 */
export default function OrgReadinessWorkspace({city,cityName,units,cases,navigate}){
 const [opened,setOpened]=useState(true),[query,setQuery]=useState(''),[tab,setTab]=useState('all'),[selected,setSelected]=useState('');
 const base=useMemo(()=>deriveDeputyPortfolio({city,cityName,units,cases}),[city,cityName,units,cases]);
 const data=useMemo(()=>readinessFromPortfolio(base),[base]);
 const shown=useMemo(()=>filterReadinessRows(data,{query,tab,max:80}),[data,query,tab]);
 const detail=data.rows.find(r=>r.id===selected);
 const goto=section=>{if(typeof navigate==='function')navigate(section);};
 return <section dir="rtl" className="rhf-f12v" data-rhf-f12v="f12v-org-readiness-v0.1" aria-label="آمادگی ساختار سازمانی معاونت خدمات شهری">
  <header className="rhf-f12v-head">
   <div className="rhf-f12v-heading"><div className="rhf-f12v-icon"><Network size={21}/></div><div><small>F1.2 · پوشش سازمان‌ها و کیفیت داده</small><h2>آمادگی ساختار سازمان‌های تابعه</h2><p>{cityName||'شهرداری انتخاب‌شده'} · بررسی واحدهای ثبت‌شده، وابستگی‌ها و موارد نیازمند تکمیل</p></div></div>
   <button type="button" className="rhf-f12v-toggle" aria-expanded={opened} onClick={()=>setOpened(v=>!v)}>{opened?'بستن':'نمایش'} {opened?<ChevronUp size={16}/>:<ChevronDown size={16}/>}</button>
  </header>
  <div className="rhf-f12v-kpis">
   <div><span>واحدهای موجود در داده شهرداری</span><strong>{displayNumber(data.counts.loaded)}</strong><small>دریافت از سامانه فعلی</small></div>
   <div><span>واحدهای کاندید حوزه معاونت</span><strong>{displayNumber(data.counts.candidates)}</strong><small>براساس انواع واحد در ساختار</small></div>
   <div><span>وابستگی قابل ردیابی در ساختار</span><strong>{data.counts.roots?displayNumber(data.counts.linked):'—'}</strong><small>نه تأیید حقوقی تشکیلات</small></div>
   <div><span>نیازمند تطبیق سازمانی</span><strong>{displayNumber(data.counts.unverified)}</strong><small>تشخیص قطعی وابستگی انجام نشده</small></div>
  </div>
  {opened&&<div className="rhf-f12v-body">
    <div className="rhf-f12v-banner"><ShieldAlert size={19}/><div><b>وضعیت رسمی سازمان‌ها هنوز قابل تأیید نیست.</b><p>F1.2 در نسخه عملیاتی منتشر نشده است. شناسنامه مصوب، مدیر مسئول، مجوز ایجاد سازمان و پیشرفت پروژه فقط پس از اتصال به API، گردش تصویب و شواهد معتبر نمایش داده می‌شود.</p></div></div>
    <div className="rhf-f12v-alerts"><span><FileCheck2 size={15}/> شناسنامه رسمی: نیازمند اتصال داده</span><span><MapPin size={15}/> ریشه معاونت: {data.counts.roots?displayNumber(data.counts.roots):'شناسایی نشد'}</span><span><ClipboardList size={15}/> پیشرفت تأییدشده: —</span></div>
    <div className="rhf-f12v-controls"><div className="rhf-f12v-tabs" role="group" aria-label="فیلتر وابستگی">
     {[["all","همه"],["linked","دارای زنجیره ثبت‌شده"],["unverified","نیازمند بررسی"]].map(([v,l])=><button key={v} type="button" aria-pressed={tab===v} className={tab===v?'active':''} onClick={()=>setTab(v)}>{l}</button>)}
    </div><label className="rhf-f12v-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="جست‌وجوی سازمان یا اداره" aria-label="جست‌وجوی واحد سازمانی"/></label></div>
    <div className="rhf-f12v-columns"><div className="rhf-f12v-list" aria-label="فهرست واحدهای موجود">{shown.length===0?<div className="rhf-f12v-empty">{data.status==='NOT_LOADED'?'اطلاعات واحدهای شهرداری هنوز بارگذاری نشده است.':'ردیفی مطابق جست‌وجو و فیلتر موجود نیست.'}</div>:shown.map(r=><button type="button" key={r.id} className={'rhf-f12v-unit '+(selected===r.id?'is-selected':'')} onClick={()=>setSelected(r.id)}><Building2 size={17}/><span><b>{r.name}</b><small>{r.domain} · {r.affiliation==='TREE_LINKED'?'زنجیره ثبت‌شده':'وابستگی نامشخص'}</small></span><ArrowLeft size={16}/></button>)}</div>
    <aside className="rhf-f12v-detail" aria-live="polite">{detail?<><small>جزئیات واحد</small><h3>{detail.name}</h3><div className="rhf-f12v-details"><span>نوع واحد</span><b>{detail.kind}</b><span>وابستگی</span><b>{detail.affiliation==='TREE_LINKED'?'دارای مسیر ثبت‌شده تا معاونت':'نیازمند بررسی'}</b><span>شناسنامه رسمی</span><b>وضعیت نامشخص</b><span>پرونده‌های بازِ مرتبط</span><b>{displayNumber(detail.openCases)}</b><span>پیشرفت برنامه و پروژه</span><b>داده تأییدشده موجود نیست</b></div></>:<><Network size={24}/><h3>جزئیات سازمان</h3><p>یک واحد را انتخاب کنید. اطلاعات صرفاً از ساختار موجود شهرداری استخراج شده است؛ کارت‌های حوزه خدمت به‌معنی وجود سازمان مصوب نیستند.</p></>}
     <div className="rhf-f12v-actions"><button type="button" disabled={typeof navigate!=='function'} onClick={()=>goto('org')}>مشاهده ساختار سازمانی <ArrowLeft size={14}/></button><button type="button" disabled={typeof navigate!=='function'} onClick={()=>goto('cases')}>پرونده‌ها <ArrowLeft size={14}/></button></div>
    </aside></div>
    <footer>فقط‌خواندنی · داده شهر انتخابی · بدون ایجاد سازمان، تصویب، مأموریت خودکار یا Migration · شاخص‌های رسمی پس از استقرار F1.2E</footer>
  </div>}
 </section>;
}
