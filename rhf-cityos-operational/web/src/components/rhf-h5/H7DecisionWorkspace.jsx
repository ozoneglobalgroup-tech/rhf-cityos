import React,{useMemo,useState} from 'react';
import {Activity,ArrowLeft,BrainCircuit,Building2,CheckCheck,ClockAlert,ClipboardList,FileClock,Layers3,Route,ShieldCheck,Target,TriangleAlert} from 'lucide-react';
import {deriveH7DecisionSnapshot,selectH7Queue,h7Count} from './h7-decision-model.mjs';
import './h7-decision.css';
const tabs=[['all','همه موارد'],['overdue','دارای تأخیر'],['urgent','اولویت بالا'],['acceptance','در انتظار پذیرش']];
const available=new Set(['cases','deputy','execution','urban-agent','urban-value']);
const formatDue=t=>t===null?'—':new Intl.DateTimeFormat('fa-IR',{dateStyle:'medium'}).format(new Date(t));
/** H7 is a read-only presentation of the existing parent-app city-scoped data.
 * It cannot dispatch, approve, mutate records, or create an auth transport.
 */
export default function H7DecisionWorkspace({city,cityName,cases,units,modules,navigate}){
  const [tab,setTab]=useState('all');
  const snapshot=useMemo(()=>deriveH7DecisionSnapshot({city,cases,units,modules}),[city,cases,units,modules]);
  const visible=selectH7Queue(snapshot.queue,tab,7);
  const go=route=>{if(available.has(route)&&typeof navigate==='function')navigate(route)};
  const countFor=key=>snapshot.queue.filter(r=>key==='all'||r[key]).length;
  const metrics=[
    {key:'openCases',label:'پرونده‌های باز در این نما',icon:ClipboardList,description:'فقط ردیف‌های بارگذاری‌شده'},
    {key:'overdue',label:'پرونده‌های دارای تأخیر',icon:ClockAlert,description:'موعد معتبرِ گذشته و وضعیت باز'},
    {key:'urgent',label:'اولویت بالا یا بحرانی',icon:TriangleAlert,description:'بر اساس اولویت ثبت‌شده'},
    {key:'acceptance',label:'در انتظار پذیرش',icon:CheckCheck,description:'وضعیت ثبت‌شده در پرونده'}
  ];
  return <section className="rhf-h7" data-rhf-h7="decision-cockpit-v1" dir="rtl" aria-label="میزکار تصمیم شهری">
    <header className="rhf-h7__header">
      <div><div className="rhf-h7__eyebrow"><Activity size={15}/> RHF CITY OS · DECISION DESK</div>
        <h2>مرکز تصمیم و اقدام شهری</h2>
        <p>اولویت‌های عملیاتی، موارد موعدگذشته و مسیرهای اقدام در شهرداری انتخاب‌شده</p>
      </div>
      <div className="rhf-h7__scope"><Building2 size={17}/><span>{cityName||'شهرداری انتخاب‌شده'}</span><span className="rhf-h7__scope-caption">داده‌های بارگذاری‌شده این نما</span></div>
    </header>
    <div className="rhf-h7__metrics" aria-label="شاخص‌های پرونده‌های دریافت‌شده">
      {metrics.map(m=><article className="rhf-h7__metric" key={m.key}>
        <span className="rhf-h7__metric-icon"><m.icon size={19}/></span>
        <span className="rhf-h7__metric-label">{m.label}</span>
        <strong>{h7Count(snapshot.counts[m.key])}</strong>
        <small>{m.description}</small>
      </article>)}
    </div>
    <div className="rhf-h7__two-col">
      <section className="rhf-h7__queue" aria-label="صف بررسی پرونده‌های شهری">
        <div className="rhf-h7__section-head"><div><span className="rhf-h7__symbol"><Target size={19}/></span><div><h3>اکنون چه چیزی نیازمند رسیدگی است؟</h3><p>بر اساس اولویت و موعد پرونده‌ها؛ انتساب شخصی تأیید نشده است</p></div></div>
          <button className="rhf-h7__link" type="button" onClick={()=>go('cases')} disabled={typeof navigate!=='function'}>پرونده‌ها <ArrowLeft size={16}/></button>
        </div>
        <div className="rhf-h7__tabs" role="group" aria-label="فیلتر موارد نیازمند رسیدگی">{tabs.map(([id,label])=><button type="button" key={id} aria-pressed={tab===id} className={tab===id?'is-active':''} onClick={()=>setTab(id)}>{label}{snapshot.loaded&&<span>{h7Count(countFor(id))}</span>}</button>)}</div>
        {!snapshot.loaded?<div className="rhf-h7__empty" role="status"><FileClock size={22}/> فهرست پرونده‌ها از API در دسترس نیست؛ وضعیت صفر گزارش نمی‌شود.</div>:
        visible.length===0?<div className="rhf-h7__empty" role="status"><CheckCheck size={22}/> موردی با این فیلتر در ردیف‌های دریافت‌شده یافت نشد؛ این به معنی نبود پرونده در کل شهرداری نیست.</div>:
        <div className="rhf-h7__rows">{visible.map(r=><article className="rhf-h7__case" key={r.id}>
            <div className="rhf-h7__case-info"><strong>{r.title}</strong><div className="rhf-h7__case-meta"><span>{r.statusLabel}</span><span>{`اولویت ${r.priority}`}</span>{r.overdue&&<span className="rhf-h7__late">دارای تأخیر</span>}{r.due!==null&&<span>موعد: {formatDue(r.due)}</span>}</div></div>
            <button type="button" className="rhf-h7__case-open" disabled={typeof navigate!=='function'} onClick={()=>go('cases')} aria-label={`مشاهده فهرست پرونده‌ها برای ${r.title}`}>مشاهده <ArrowLeft size={14}/></button>
          </article>)}</div>}
        {snapshot.loaded&&snapshot.queue.length>7&&<p className="rhf-h7__footnote">حداکثر ۷ مورد در هر تب نشان داده می‌شود. برای مشاهده سایر پرونده‌ها به فهرست اصلی بروید.</p>}
      </section>
      <aside className="rhf-h7__side">
        <section className="rhf-h7__agent"><div className="rhf-h7__agent-head"><BrainCircuit size={24}/><div><strong>عامل راهبری عملیات شهری</strong><small>Agent Governance</small></div></div><p>تحلیل و پیشنهاد زیر نظارت انسانی؛ اجرای خودکار مأموریت در سامانه اصلی فعال نشده است.</p>
          <div className="rhf-h7__gates"><span><ShieldCheck size={16}/> تصمیم نهایی با مسئول مجاز</span><span><ClockAlert size={16}/> اجرای خودکار غیرفعال</span></div>
          <button type="button" onClick={()=>go('urban-agent')} disabled={typeof navigate!=='function'}>ورود به میزکار عامل <ArrowLeft size={17}/></button>
        </section>
        <section className="rhf-h7__shortcuts"><h3>دسترسی سریع</h3>{[
          ['deputy','میزکار معاونت خدمات شهری',Building2],['execution','دستورکار و هزینه عملیات',Route],['urban-value','فرصت‌ها و خلق ارزش',Layers3]
        ].map(([route,label,Icon])=><button type="button" key={route} onClick={()=>go(route)} disabled={typeof navigate!=='function'}><Icon size={17}/><span>{label}</span><ArrowLeft size={15}/></button>)}
        </section>
      </aside>
    </div>
    <footer className="rhf-h7__disclosure">مبنای نمایش: داده‌های موجود در حافظه برنامه پس از دریافت از API شهرداری منتخب. این شاخص‌ها آمار قطعی کل شهر، وظایف اختصاصی شما یا ارزش عمومی تأییدشده نیستند. عملیات اجرایی عامل غیرفعال است.</footer>
  </section>;
}
