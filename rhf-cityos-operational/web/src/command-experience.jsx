import React,{useEffect,useMemo,useRef,useState} from 'react';
import {classifyCases,serviceCoverage,filterCommands} from './command-core.mjs';
import {
  LayoutDashboard,Network,Layers3,ListChecks,ClipboardList,Route,ClipboardCheck,
  Gauge,TrendingUp,ShieldCheck,Activity,Search,ChevronDown,Plus,ArrowLeft,
  AlertTriangle,CheckCircle2,Clock3,Building2,Command,FileText,Target,
  Sparkles,BrainCircuit,Settings2,ArrowUpLeft,ExternalLink,X,Filter,ShieldAlert,MapPinned,Bell
} from 'lucide-react';

const FMT = n => Number.isFinite(Number(n)) ? new Intl.NumberFormat('fa-IR').format(Number(n)) : '۰';
const LABELS={RECEIVED:'دریافت‌شده',TRIAGED:'بررسی اولیه',ASSIGNED:'ارجاع‌شده',IN_PROGRESS:'در حال اجرا',AWAITING_ACCEPTANCE:'در انتظار پذیرش',CLOSED:'مختومه',REJECTED:'ردشده',PLANNED:'برنامه‌ریزی‌شده',ACTIVE:'در اجرا',DONE:'تکمیل‌شده'};
const GROUPS=[
 {title:'مرکز فرماندهی',ids:['dashboard','deputy','work'],icon:LayoutDashboard},
 {title:'ساختار و خدمات شهری',ids:['org','modules','services'],icon:Layers3},
 {title:'اجرا و کنترل عملیات',ids:['cases','missions','execution','finance','finance-control','acceptance-trace','inspections','quality'],icon:Route},
 {title:'خلق ارزش و حکمرانی',ids:['urban-value','ai-native','urban-agent','digital-twins','capacity','outcomes','value','audit','users'],icon:TrendingUp}
];
const NAV_ICONS={'urban-value':Target,'ai-native':BrainCircuit,'urban-agent':BrainCircuit,'digital-twins':Layers3,'acceptance-trace':ClipboardCheck,'finance-control':FileText,finance:FileText,execution:FileText,deputy:Building2,dashboard:LayoutDashboard,work:Activity,org:Network,modules:Layers3,services:ListChecks,cases:ClipboardList,missions:Route,inspections:ClipboardCheck,quality:Gauge,capacity:Network,outcomes:TrendingUp,value:TrendingUp,users:ShieldCheck,audit:ShieldCheck};
const NAV_LABELS={'urban-value':'فرصت‌ها و خلق ارزش شهری','ai-native':'دستیار هوشمند و دانش شهری','urban-agent':'عامل راهبری عملیات شهری','digital-twins':'دوقلوهای دیجیتال شهری','acceptance-trace':'پذیرش یکپارچه عملیات','finance-control':'مرکز کنترل مالی معاونت',finance:'بودجه، قرارداد و صورت‌وضعیت',execution:'دستورکار، پیمانکار و هزینه',deputy:'میزکار معاون خدمات شهری',dashboard:'مرکز فرماندهی',work:'صف پیگیری و اقدام',org:'ساختار سازمانی',modules:'حوزه‌ها و سازمان‌های خدماتی',services:'شناسنامه خدمات و SLA',cases:'پرونده‌های خدمات شهری',missions:'مأموریت‌های اجرایی',inspections:'بازرسی و پذیرش',quality:'پایش کیفیت و سطح خدمت',capacity:'فعال‌سازی ظرفیت شهری',outcomes:'دفترکل ارزش عمومی',value:'طرح‌های خلق ارزش',users:'کاربران و اختیارات',audit:'تاریخچه و حسابرسی'};

export function EnterpriseSidebar({active,navigate,modules=[],systemAdmin=false,stats,displayName=''}){
 const [closed,setClosed]=useState({});
 const flip=title=>setClosed(s=>({...s,[title]:!s[title]}));
 return <>
  <div className="enterprise-profile">
   <div className="enterprise-avatar"><Building2 size={19}/></div>
   <div><b>RHF City OS</b><small>شهر خالق ارزش · فرماندهی و حکمرانی</small></div>
  </div>
  <nav aria-label="ناوبری اصلی" className="enterprise-nav">
   {GROUPS.map(g=>{const Icon=g.icon;const items=g.ids.filter(id=>systemAdmin||id!=='users');const opened=!closed[g.title]||items.includes(active);return <section key={g.title} className="nav-group">
    <button type="button" className="nav-group-head" aria-expanded={opened} onClick={()=>flip(g.title)}><Icon size={15}/><span>{g.title}</span><ChevronDown className={opened?'chev opened':'chev'} size={14}/></button>
    {opened&&<div className="nav-group-items">{items.map(id=>{const I=NAV_ICONS[id];return <button type="button" key={id} aria-current={active===id?'page':undefined} className={active===id?'nav-active':''} onClick={()=>navigate(id)}><I size={17}/><span>{NAV_LABELS[id]}</span>{id==='cases'&&Number(stats?.overdue)>0&&<em className="nav-count">{FMT(stats.overdue)}</em>}</button>})}</div>}
   </section>})}
   <details className="nav-domain-list"><summary><Layers3 size={15}/> دسترسی سریع به حوزه‌ها <span>{FMT(modules.length)}</span></summary>
    <div>{modules.map(m=><button type="button" key={m.code} onClick={()=>navigate('services',{kind:'moduleCode',value:m.code,label:`خدمات حوزه ${m.name_fa}`})}><span className="domain-dot"/>{m.name_fa}</button>)}</div>
   </details>
  </nav>
  <div className="enterprise-sidebar-footer"><span className="health-dot"/><div><b>هسته خدمات شهری</b><small>دسترسی‌ها بر اساس API و شهرداری فعال</small></div></div>
 </>;
}

export function CommandCenterHero({cityName,stats,setupDone,setupTotal,navigate,openForm,canCreate}){
 const totalCases=(stats?.cases||[]).reduce((a,c)=>a+Number(c.n||0),0);
 return <section className="command-hero command-hero-v137" aria-label="نمای فرماندهی شهر">
  <div className="hero-city-art" aria-hidden="true"><span className="hero-orbit orbit-one"/><span className="hero-orbit orbit-two"/><span className="hero-landscape"/><span className="hero-cityscape"/><span className="hero-node node-a"/><span className="hero-node node-b"/><span className="hero-node node-c"/><span className="hero-node node-d"/><span className="hero-data-grid"/></div>
  <div className="hero-head"><span className="hero-kicker"><Activity size={15}/> RHF CITY OS · VALUE GOVERNANCE</span><span className="hero-context"><Building2 size={14}/>{cityName||'شهرداری انتخابی'}</span></div>
  <div className="hero-content"><div className="hero-copy"><p className="hero-eyebrow">یکپارچگی داده · هوش عملیاتی · خدمت بهتر به شهروند</p><h2>از مشاهده شهر تا <em>فرماندهی خدمت</em></h2><p>پرونده، مأموریت، ظرفیت، دوقلوی دیجیتال و سنجش ارزش؛ در یک جریان عملیاتی قابل پیگیری و حسابرسی.</p><div className="hero-buttons"><button type="button" onClick={()=>navigate('work')} className="hero-action">مشاهده صف اقدامات <ArrowLeft size={18}/></button><button type="button" onClick={()=>navigate('modules')} className="hero-outline"><Layers3 size={16}/> حوزه‌های خدمات شهری</button>{canCreate&&<button type="button" onClick={()=>openForm('case')} className="hero-outline"><Plus size={16}/> پرونده جدید</button>}</div></div></div>
  <div className="hero-launchpad" aria-label="دسترسی‌های اصلی فرماندهی">
   {[["deputy","میزکار معاونت","مدیریت عملیات",Building2],["digital-twins","دوقلوهای دیجیتال","وضعیت مستند شهر",MapPinned],["outcomes","دفترکل ارزش","پیامدهای تأییدشده",TrendingUp],["urban-agent","عامل هوشمند","تحلیل و پیشنهاد",BrainCircuit]].map(([id,label,desc,Icon])=><button type="button" key={id} onClick={()=>navigate(id)}><span className="launch-icon"><Icon size={19}/></span><span><strong>{label}</strong><small>{desc}</small></span><ArrowLeft size={15} className="launch-arrow"/></button>)}
  </div>
 </section>;
}

export function CommandContextRibbon({stats,loaded,navigate}){
 const count=(stats?.cases||[]).reduce((sum,x)=>sum+Number(x.n||0),0);
 const items=[
  {id:'modules',label:'حوزه فعال در کاتالوگ',value:stats?.activeModules,icon:Layers3},
  {id:'cases',label:'پرونده ثبت‌شده',value:loaded?count:null,icon:ClipboardList},
  {id:'cases',scope:{kind:'overdue',label:'پرونده‌های معوق'},label:'پرونده معوق',value:stats?.overdue,icon:AlertTriangle,danger:true},
  {id:'cases',scope:{kind:'status',value:'AWAITING_ACCEPTANCE',label:'در انتظار پذیرش'},label:'در انتظار پذیرش',value:stats?.awaiting,icon:Clock3},
 ];
 return <section className="rhf-context-ribbon" aria-label="آخرین خلاصه دریافتی از API شهرداری">
  <span className="ribbon-source"><span className={'ribbon-dot '+(loaded?'ready':'pending')}/>{loaded?'خلاصه داده‌های شهرداری انتخابی':'در انتظار دریافت داده'}</span>
  {items.map((x,i)=>{const Icon=x.icon;return <button type="button" key={i} className={x.danger&&Number(x.value)>0?'ribbon-warning':''} onClick={()=>navigate(x.id,x.scope||null)}><Icon size={16}/><b>{x.value===undefined||x.value===null?'—':FMT(x.value)}</b><span>{x.label}</span><ArrowLeft size={13}/></button>})}
 </section>;
}

export function CommandDashboardHeading({navigate}){
 return <div className="rhf-dashboard-heading"><div><span className="rhf-section-eyebrow">OPERATIONS & VERIFIED VALUE</span><h2>شاخص‌های کلیدی</h2><p>نمای کلی از پرونده‌ها، خدمات و وضعیت سازمان؛ بر اساس داده‌های شهرداری انتخابی</p></div><div className="rhf-dashboard-heading-actions"><button type="button" onClick={()=>navigate('work')}><Activity size={16}/> پیگیری کارهای امروز</button><button type="button" onClick={()=>navigate('urban-value')}><Target size={16}/> فرصت‌های خلق ارزش</button></div></div>
}

export function CommandFocusLinks({navigate}){
 const sections=[['capacity','فعال‌سازی ظرفیت','منابع، محدودیت دسترسی و ذخیره تاب‌آوری',Network],['finance-control','کنترل مالی','تعهدات، سقف اعتبار و تأیید مستقل',FileText],['ai-native','دانش و دستیار AI','تحلیل مستند در حدود اختیار',BrainCircuit],['acceptance-trace','پذیرش یکپارچه','زنجیره شواهد از پرونده تا نتیجه',ClipboardCheck]];
 return <section className="rhf-focus-links" aria-label="ارتباط بین اجزای سیستم‌عامل"><div className="rhf-focus-intro"><span className="rhf-section-eyebrow">ONE CITY · ONE CONTEXT</span><h3>از داده تا اقدام، از اقدام تا ارزش</h3><p>انتقال مستقیم به میزکار مرتبط با حفظ شهرداری انتخاب‌شده</p></div><div className="rhf-focus-grid">{sections.map(([id,title,desc,Icon])=><button type="button" key={id} onClick={()=>navigate(id)}><span className="rhf-focus-icon"><Icon size={19}/></span><strong>{title}</strong><small>{desc}</small><ArrowLeft size={16}/></button>)}</div></section>;
}

export function ServiceCoverage({modules,services,navigate}){
 const rows=useMemo(()=>serviceCoverage(modules,services),[modules,services]);
 return <section className="ux-panel coverage-panel"><div className="ux-panel-head"><div><span className="ux-panel-kicker">SERVICE COVERAGE</span><h3>نقشه پوشش خدمات شهری</h3><p>از کاتالوگ حوزه‌ها به خدمات تعریف‌شده و سپس پرونده‌های واقعی بروید.</p></div><button className="ux-text-button" onClick={()=>navigate('modules')}>تمام حوزه‌ها <ArrowLeft size={15}/></button></div>
  {rows.length?<div className="coverage-grid">{rows.map(m=><button key={m.code} className="coverage-item" onClick={()=>navigate('services',{kind:'moduleCode',value:m.code,label:`خدمات ${m.name_fa}`})}><span className="coverage-icon"><Layers3 size={18}/></span><span className="coverage-text"><b>{m.name_fa}</b><small>{m.active?'حوزه فعال':'حوزه غیرفعال'} · {FMT(m.total)} خدمت تعریف‌شده</small></span><ArrowLeft size={15}/></button>)}</div>:<p className="ux-empty">کاتالوگ حوزه‌ها هنوز دریافت نشده است.</p>}
  <p className="ux-footnote"><ShieldAlert size={14}/> فعال‌بودن حوزه، به‌معنی پیاده‌سازی تمام فرایندهای تخصصی آن نیست. تعداد خدمات از داده‌های شهرداری انتخابی به‌دست آمده است.</p>
 </section>;
}

export function OperationsQueue({cases=[],missions=[],stats,navigate,openDetail,fmt=FMT,canCreate=false,openForm}){
 const {overdue,waiting,urgent}=classifyCases(cases);
 const active=missions.filter(m=>m.status==='ACTIVE'||m.status==='PLANNED');
 const [view,setView]=useState('overdue');
 const pools={overdue,waiting,urgent,active};const pool=pools[view]||[];
 return <section className="ux-panel queue-panel"><div className="ux-panel-head"><div><span className="ux-panel-kicker">ACTION CONTROL CENTER</span><h3>مرکز پیگیری و اقدام</h3><p>صف‌های کاری شهرداری انتخابی؛ اقدامات مجاز از پرونده و مأموریت انجام می‌شوند.</p></div><div className="queue-head-actions">{canCreate&&<button className="primary" onClick={()=>openForm('case')}><Plus size={16}/> پرونده جدید</button>}<button className="outline" onClick={()=>navigate('cases')}>همه پرونده‌ها</button></div></div>
  <div className="queue-tabs" role="tablist" aria-label="نوع پیگیری">
   {[['overdue','معوق',overdue.length],['waiting','در انتظار پذیرش',waiting.length],['urgent','اولویت بالا',urgent.length],['active','مأموریت باز',active.length]].map(([id,label,count])=><button role="tab" aria-selected={view===id} className={view===id?'selected':''} key={id} onClick={()=>setView(id)}>{label}<span>{fmt(count)}</span></button>)}
  </div>
  {pool.length?<div className="queue-rows">{pool.slice(0,8).map(r=><button type="button" key={r.id} className="queue-row" onClick={()=>openDetail(view==='active'?'missions':'cases',r)}><span className="queue-state"><ClipboardList size={18}/></span><span className="queue-record"><strong>{r.summary||r.title}</strong><small>{r.service_name||r.case_summary||r.unit_name||'مورد عملیاتی'} · {LABELS[r.status]||r.status}</small></span>{r.due_at&&<small className="queue-due">سررسید: {new Date(r.due_at).toLocaleDateString('fa-IR')}</small>}<ArrowLeft size={17}/></button>)}</div>:<div className="queue-empty"><CheckCircle2 size={26}/><div><b>موردی در این صف ثبت نشده است.</b><p>برای دیدن عملیات، داده شهرداری را انتخاب یا ثبت کنید؛ آمار ساختگی نشان داده نمی‌شود.</p></div></div>}
  <div className="queue-footer"><button onClick={()=>navigate(view==='active'?'missions':'cases',view==='overdue'?{kind:'overdue',label:'معوقات SLA'}:view==='waiting'?{kind:'status',value:'AWAITING_ACCEPTANCE',label:'در انتظار پذیرش'}:null)}>بازکردن فهرست مرتبط <ArrowLeft size={14}/></button><span>نمایش تا ۸ رکورد اول · فهرست کامل در ماژول مربوط</span></div>
 </section>;
}

const COMMANDS=[
 ['dashboard','مرکز فرماندهی','داشبورد مدیریت شهری',LayoutDashboard],
 ['deputy','میزکار معاون خدمات شهری','نمای سازمان‌ها، مناطق، SLA و ظرفیت',Building2],
 ['finance','قرارداد و صورت‌وضعیت','بودجه، تعهد و تأیید مستقل',FileText],
 ['finance-control','مرکز کنترل مالی','هشدارها، تعهدات، معوقات و Drill-down',FileText],
 ['acceptance-trace','پذیرش یکپارچه عملیات','ردیابی پرونده تا گواهی و ارزش',ClipboardCheck],
 ['work','مرکز پیگیری و اقدام','صف پرونده‌ها و مأموریت‌ها',Activity],
 ['org','ساختار سازمانی','سازمان‌ها، ادارات، مناطق',Network],
 ['modules','حوزه‌های خدمات شهری','کاتالوگ ۲۳ حوزه',Layers3],
 ['services','شناسنامه خدمت و SLA','خدمات و کیفیت',ListChecks],
 ['cases','پرونده‌های خدمات','درخواست‌ها و پذیرش',ClipboardList],
 ['missions','مأموریت‌های اجرایی','اجرا و مسئولیت',Route],
 ['inspections','بازرسی و پذیرش','شواهد و کنترل کیفیت',ClipboardCheck],
 ['quality','پایش سطح خدمت','شاخص SLA',Gauge],
 ['urban-value','پرونده ارزش شهری','نیاز، اختیار، ظرفیت و فرصت ارزش‌آفرینی',Target],
 ['ai-native','دستیار هوشمند شهر','دانش معتبر، تحلیل محدود AI و حسابرسی',Target],
 ['urban-agent','عامل عملیات شهری','شواهد پرونده، ابزارهای فقط‌خواندنی و برنامه اقدام کنترل‌شده',BrainCircuit],
 ['digital-twins','دوقلوهای دیجیتال','مدل دارایی و خدمت و شواهد دارای منبع و زمان',Layers3],
 ['capacity','فعال‌سازی ظرفیت شهری','موجودی، کیفیت، مجوز و تخصیص',Network],
 ['outcomes','دفترکل ارزش عمومی','شواهد و پیامدهای چندبعدی',TrendingUp],
 ['value','خلق ارزش شهری','خط مبنا، پیامد و شواهد',TrendingUp],
 ['audit','حسابرسی','تاریخچه تغییرات',ShieldCheck]
];
export function CommandPalette({open,onClose,navigate,openForm,openDetail,canCreate,modules=[],units=[],services=[],cases=[]}){
 const [q,setQ]=useState('');const input=useRef(null);
 useEffect(()=>{if(open){setQ('');requestAnimationFrame(()=>input.current?.focus())}},[open]);
 const items=useMemo(()=>{
  const plain=COMMANDS.map(([id,title,desc,icon])=>({id:'page-'+id,title,desc,icon,run:()=>navigate(id)}));
  const custom=[...modules.map(m=>({id:'mod-'+m.code,title:m.name_fa,desc:'حوزه خدمات شهری',icon:Layers3,run:()=>navigate('services',{kind:'moduleCode',value:m.code,label:`خدمات ${m.name_fa}`})})),
   ...units.map(m=>({id:'unit-'+m.id,title:m.name_fa,desc:'واحد سازمانی',icon:Building2,run:()=>openDetail('org',m)})),
   ...services.map(s=>({id:'service-'+s.id,title:s.name_fa,desc:'خدمت شهری',icon:ListChecks,run:()=>openDetail('services',s)})),
   ...cases.map(c=>({id:'case-'+c.id,title:c.summary,desc:'پرونده خدمات شهری',icon:ClipboardList,run:()=>openDetail('cases',c)}))];
  if(canCreate)custom.unshift(...[['org','تعریف واحد سازمانی'],['service','تعریف خدمت و SLA'],['case','پرونده جدید'],['mission','مأموریت جدید'],['value','طرح ارزش جدید']].map(([id,title])=>({id:'new-'+id,title,desc:'اقدام سریع',icon:Plus,run:()=>openForm(id)})));
  return [...plain,...custom];
 },[modules,units,services,cases,canCreate,navigate,openForm,openDetail]);
 const matches=filterCommands(items,q);
 if(!open)return null;
 return <div className="palette-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="palette-modal" role="dialog" aria-modal="true" aria-label="جست‌وجو و اقدام سریع"><div className="palette-search"><Search size={20}/><input ref={input} value={q} onChange={e=>setQ(e.target.value)} placeholder="جست‌وجوی ماژول، پرونده، خدمت یا اقدام..." onKeyDown={e=>{if(e.key==='Enter'&&matches.length){e.preventDefault();matches[0].run();onClose()}if(e.key==='Escape')onClose()}}/><button onClick={onClose} aria-label="بستن"><X size={18}/></button></div><div className="palette-results">{matches.length?matches.map((item,i)=>{const Icon=item.icon;return <button key={item.id} onClick={()=>{item.run();onClose()}}><span className="palette-icon"><Icon size={17}/></span><span><b>{item.title}</b><small>{item.desc}</small></span>{i===0&&<kbd>Enter</kbd>}<ArrowLeft size={15}/></button>}):<div className="palette-empty">نتیجه‌ای برای این عبارت پیدا نشد.</div>}</div><footer>جست‌وجو فقط در داده‌های بارگذاری‌شده شهرداری انتخابی · Ctrl / ⌘ + K</footer></section></div>;
}

export function OperationalAlerts({stats,navigate}){
 const [open,setOpen]=useState(false);
 const overdue=Number(stats?.overdue||0),waiting=Number(stats?.awaiting||0),fail=Number(stats?.failed_inspections||0);
 const total=overdue+waiting+fail;
 return <div className="alerts-control"><button type="button" className="alerts-trigger" onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-label={`هشدارهای عملیات: ${FMT(total)} مورد`} title="هشدارهای داده عملیاتی"><Bell size={18}/>{total>0&&<span>{FMT(total)}</span>}</button>{open&&<div className="alerts-menu"><div className="alerts-menu-head"><b>هشدارهای عملیاتی</b><button onClick={()=>setOpen(false)} aria-label="بستن"><X size={15}/></button></div>
  {[{title:'پرونده‌های معوق',count:overdue,icon:AlertTriangle,target:'cases',scope:{kind:'overdue',label:'معوقات SLA'}},{title:'در انتظار پذیرش',count:waiting,icon:ClipboardCheck,target:'cases',scope:{kind:'status',value:'AWAITING_ACCEPTANCE',label:'در انتظار پذیرش'}},{title:'بازرسی مردود',count:fail,icon:ShieldAlert,target:'inspections',scope:{kind:'result',value:'FAIL',label:'بازرسی مردود'}}].map(a=>{const Icon=a.icon;return <button key={a.title} className="alerts-row" onClick={()=>{navigate(a.target,a.scope);setOpen(false)}}><Icon size={17}/><span>{a.title}</span><strong>{FMT(a.count)}</strong><ArrowLeft size={13}/></button>})}
  <p>تعدادها از API شهرداری انتخابی دریافت شده‌اند؛ این بخش سرویس اعلان لحظه‌ای نیست.</p>
 </div>}</div>;
}
