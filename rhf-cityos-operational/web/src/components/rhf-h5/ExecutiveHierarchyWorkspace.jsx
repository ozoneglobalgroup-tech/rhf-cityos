import React,{useEffect,useMemo,useState} from 'react';
import {Activity,AlertTriangle,ArrowLeft,BrainCircuit,Building2,CheckCircle2,ClipboardList,FileCheck2,Landmark,Layers3,LockKeyhole,Network,RefreshCw,Recycle,ShieldCheck,Target,UserRoundCheck,Users} from 'lucide-react';
import {buildOrganizationHierarchy,validateWasteContext,executivePolicy,aggregateCaseCount,safeCityOverview,hierarchyUATReport,isSyntheticShiraz,UAT_V7,ORG_OS_V7} from './executive-hierarchy-core.mjs';
const F=x=>typeof x==='number'&&Number.isFinite(x)?x.toLocaleString('fa-IR'):'نامشخص';
const LABELS={city:'ساختار شهردار',deputy:'معاونت خدمات شهری',waste:'سازمان پسماند'};
const SAFE_ROLES=new Set(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR','AUDITOR']);
const DOMAINS=[
 ['COLLECTION','جمع‌آوری، تفکیک و باسکول'],['FLEET','ناوگان و ماشین‌آلات'],['MAINTENANCE','تعمیرات و توقف'],['CONTRACTOR','پیمانکاران و قراردادها'],['CONTRACT_EVAL','ارزیابی پیمانکاران'],['SHIFT','شیفت و منابع انسانی'],['QUALITY','کیفیت و بازرسی'],['FACILITY','مراکز پردازش و دفع'],['EDUCATION','آموزش و مشارکت'],['VIOLATION','تخلفات ـ محدود'],['LEGAL','حقوقی ـ محدود']
];
const AGENTS_CITY=[['عامل پایش راهبرد شهر','مشاهده خلاصه‌های مجاز معاونت‌ها'],['عامل کشف ظرفیت شهری','پیشنهاد فرصت با داده و اختیار معتبر'],['عامل پایش ریسک عمومی','تجمیع و ارجاع هشدارهای مهم به معاون مسئول']];
const AGENTS_DEPUTY=[['عامل پایش سطح خدمت','شناسایی انحراف‌های مستند SLA'],['عامل هماهنگی سازمان‌ها','کشف وابستگی عملیات بین سازمان‌های تابع'],['عامل فرصت‌یاب معاونت','تحلیل ظرفیت و پیشنهاد بررسی مستقل']];
const AGENTS=[['عملیات و خدمات','بررسی وضعیت مأموریت و شواهد'],['باسکول و جریان مواد','کشف نقص سند و مغایرت توزین'],['ناوگان','کشف ریسک توقف و ظرفیت بلااستفاده'],['پیمانکار','مغایرت تعهد و عملکرد ثبت‌شده'],['کیفیت','بررسی شکایات و بازرسی‌ها'],['فرصت‌یاب ارزش','پیشنهاد نیازمند خط مبنا و تأیید مستقل']];
function Metric({name,value,sub,icon:Icon}){return <article className="rh7-metric"><Icon size={17}/><span>{name}</span><strong>{F(value)}</strong><small>{sub}</small></article>}
function Blocked({title,children}){return <div className="rh7-blocked"><LockKeyhole size={21}/><div><strong>{title}</strong><p>{children}</p></div></div>}
function Heading({title,desc}){return <div className="rh7-heading"><h3>{title}</h3><p>{desc}</p></div>}
export default function ExecutiveHierarchyWorkspace({city,cityName,units,cases,services,access,me,api,navigate,loaded=false}){
 const role=access?.role||'';
 const [wasteContext,setWasteContext]=useState(null),[contextState,setContextState]=useState('NOT_LOADED'),[contextError,setContextError]=useState('');
 const [view,setView]=useState('blocked'),[uat,setUat]=useState({}),[message,setMessage]=useState('');
 const hierarchy=useMemo(()=>loaded?buildOrganizationHierarchy({units,city,cityName}):{state:'NOT_LOADED',error:'هنوز اطلاعات احراز هویت و ساختار شهرداری کامل دریافت نشده است.'},[units,city,cityName,loaded]);
 const trial=isSyntheticShiraz(cityName);
 useEffect(()=>{let active=true;setWasteContext(null);setContextError('');setContextState('NOT_LOADED');setUat({});
  if(!loaded||!trial||!city||!SAFE_ROLES.has(role)||typeof api!=='function')return()=>{active=false};
  setContextState('LOADING');
  api(`/cities/${encodeURIComponent(city)}/waste-pilot`).then(data=>{
   if(!active)return;
   const result=validateWasteContext(data,city,hierarchy.waste);
   setWasteContext(result.state==='VALID'?data:null);setContextState(result.state);
   if(result.state!=='VALID')setContextError('پاسخ معتبر سازمان پسماند یا ارتباط آن با ساختار سازمانی دریافت نشد.');
  }).catch(e=>{if(active){setContextState('ERROR');setContextError(e?.message||'دریافت محدوده سازمانی ناموفق بود');}});
  return()=>{active=false};
 },[city,trial,role,api,hierarchy.waste?.id,loaded]);
 const context=useMemo(()=>validateWasteContext(wasteContext,city,hierarchy.waste),[wasteContext,city,hierarchy.waste]);
 const policy=useMemo(()=>executivePolicy({role,systemAdmin:me?.systemAdmin===true,userId:me?.id,managerId:context.managerId,contextState,organizationReady:hierarchy.organizationReady}),[role,me?.systemAdmin,me?.id,context.managerId,contextState,hierarchy.organizationReady]);
 useEffect(()=>{setView(policy.defaultView)},[policy.defaultView,city]);
 const cityStats=safeCityOverview(cases);
 const deputyStats=aggregateCaseCount(cases,services,hierarchy.deputyIds);
 const wasteStats=aggregateCaseCount(cases,services,hierarchy.wasteIds);
 const accessToView=(id)=>id==='city'?policy.canCityPreview:id==='deputy'?policy.canDeputyPreview:id==='waste'?policy.canWaste:false;
 const selected=accessToView(view)?view:'blocked';
 const uatResult=hierarchyUATReport(uat);
 function report(){const lines=[`RHF CITY ORG OS V7.1 — ${cityName||'نامشخص'}`,`نتیجه: ${uatResult.complete?'COMPLETE (SELF-REPORTED)':'INCOMPLETE'}`,`PASS=${uatResult.summary.pass} FAIL=${uatResult.summary.fail} NOT_RUN=${uatResult.summary.notRun}`,...uatResult.rows.map(t=>`${t.id}\t${t.result}\t${t.title}`),'تذکر: تأیید فنی احراز هویت واقعی شهردار و مدیران، منوط به مجوزهای سمت‌محور در API است.'];
  if(typeof navigator!=='undefined'&&navigator.clipboard?.writeText){navigator.clipboard.writeText(lines.join('\n')).then(()=>setMessage('گزارش آزمون کپی شد.')).catch(()=>setMessage('مرورگر امکان کپی گزارش ندارد.'));}
  else setMessage('کپی گزارش در این مرورگر در دسترس نیست.');
 }
 return <section className="rh7" dir="rtl" data-rhf-hierarchy={ORG_OS_V7} aria-label="ساختار سلسله‌مراتبی سیستم‌عامل شهر">
   <div className="rh7-hero"><div className="rh7-topline"><Network size={17}/> RHF CITY OS — EXECUTIVE HIERARCHY V7.1</div><h2>یک شهرداری، چند معاونت و سیستم‌عامل‌های سازمانی</h2><p>ریشه ساختار: شهردار ← معاونت‌های مسئول ← سازمان‌ها و واحدهای تابع. هر مقام، فقط خلاصه‌های مجاز مربوط به مأموریت خود را دریافت می‌کند.</p><div className="rh7-notes"><span><ShieldCheck size={15}/> هویت فعلی: {me?.displayName||'کاربر احراز هویت‌شده'} / {role||'نامشخص'}</span><span><AlertTriangle size={15}/> {trial?'شهرداری شیراز — داده آزمایشی':'بدون داده سازمانی آزمایشی'}</span></div></div>
   {hierarchy.state!=='READY'?<Blocked title="ساختار معتبر بارگذاری نشد">{hierarchy.error}</Blocked>:<>
   <div className="rh7-path"><div className="rh7-path-node"><Landmark size={20}/><span>شهرداری {cityName||'انتخابی'}</span><b>سطح شهردار</b><small>جایگاه سازمانی؛ انتساب شخصی شهردار در API موجود نیست</small></div><span className="rh7-path-arrow">↓</span><div className="rh7-path-node"><Building2 size={20}/><span>{hierarchy.deputy?.title||'معاونت خدمات شهری — هنوز تعیین نشده'}</span><b>سطح معاونت</b><small>{hierarchy.deputy?'ارتباط از org_units تأیید شد':'نیازمند تعریف یا اصلاح رابطه واحدها'}</small></div><span className="rh7-path-arrow">↓</span><div className="rh7-path-node"><Recycle size={20}/><span>{hierarchy.waste?.title||'سازمان مدیریت پسماند — هنوز تعیین نشده'}</span><b>سطح سازمان</b><small>{hierarchy.organizationReady?'ارتباط معاونت ← سازمان معتبر است':'محیط تخصصی تا تکمیل ساختار فعال نمی‌شود'}</small></div></div>
   <div className="rh7-views" role="group" aria-label="انتخاب لایه سازمانی">
     {Object.entries(LABELS).map(([id,title])=><button type="button" key={id} aria-pressed={selected===id} disabled={!accessToView(id)} onClick={()=>setView(id)}>{id==='city'?<Landmark size={17}/>:id==='deputy'?<Building2 size={17}/>:<Recycle size={17}/>}<span>{title}</span>{!accessToView(id)&&<LockKeyhole size={13}/>}</button>)}
   </div>
   {selected==='blocked'&&<Blocked title="محدوده مدیریتی اثبات نشده است">{role==='DEPUTY'?'نقش DEPUTY در API فعلی به معاونت مشخص انتساب ندارد. تا زمان ثبت سمت و محدوده مجاز در سرور، نمای تجمیعی اختصاصی معاون باز نمی‌شود.':role==='DIRECTOR'?'ورود اختصاصی مدیرعامل پسماند منوط به انتساب manager_user_id به شناسه همین حساب و اعتبارسنجی از API است.':role==='MUNICIPAL_ADMIN'?'نمای مدیریت شهرداری تنها در نشست مدیر سامانه برای آزمایش فعال است؛ این دسترسی به معنای احراز سمت شهردار نیست.':'برای این نقش، نمای مدیریتی سلسله‌مراتبی بدون تعیین محدوده سروری نمایش داده نمی‌شود.'}</Blocked>}
   {selected==='city'&&<>
     <Heading title="مرکز تجمیع سطح شهرداری — پیش‌نمایش مدیر سامانه" desc="این نمای شهر، ابزار برنامه‌ریزی داشبورد شهردار است و ادعای ورود واقعی حساب شهردار ندارد. جزئیات سازمانی و حقوقی به بالا منتقل نمی‌شود."/>
     <div className="rh7-metrics"><Metric icon={Building2} name="معاونت‌های تعریف‌شده" value={hierarchy.deputies.length} sub="از ساختار واحدهای بارگذاری‌شده"/><Metric icon={ClipboardList} name="پرونده‌های مشاهده‌شده در شهر" value={cityStats.count} sub="فهرست محدود؛ نه کل شهر در صورت سقف API"/><Metric icon={ShieldCheck} name="منفعت عمومی مستقل" value={null} sub="هنوز احراز نشده"/></div>
     <div className="rh7-panel"><h4><BrainCircuit size={17}/> عامل‌های تخصصی سطح شهردار — طرح اولیه</h4><div className="rh7-agents">{AGENTS_CITY.map(([name,description])=><article key={name}><b>{name}</b><p>{description}</p><small>بدون اجرای زنده و بدون دسترسی مستقل</small></article>)}</div></div>
     <div className="rh7-panel"><h4>معاونت‌های شهرداری</h4>{hierarchy.deputies.length===0?<p className="rh7-muted">معاونتی در ساختار دریافت‌شده ثبت نشده است.</p>:hierarchy.deputies.map(u=><article key={u.id} className="rh7-unit"><div><b>{u.title}</b><small>{u.code}</small></div>{u.id===hierarchy.deputy?.id?<button onClick={()=>setView('deputy')}>نمای تجمیعی معاونت <ArrowLeft size={14}/></button>:<span className="rh7-small">محیط اختصاصی در این نسخه پیکربندی نشده</span>}</article>)}</div>
   </>}
   {selected==='deputy'&&<>
     <Heading title="میزکار معاون خدمات شهری و محیط‌زیست" desc="این سطح فقط خلاصه عملکرد سازمان‌های تابع را ارائه می‌کند. دفتر تخصصی هر سازمان در محیط خودش باقی می‌ماند."/>
     <div className="rh7-metrics"><Metric icon={Building2} name="سازمان‌های تابعه ثبت‌شده" value={hierarchy.deputyOrganizations.length} sub="بر اساس رابطه والد و زیرمجموعه"/><Metric icon={ClipboardList} name="پرونده‌های منتسب به این معاونت" value={deputyStats.count} sub="اتصال صریح واحد یا خدمت؛ سقف ۳۰۰ ردیف"/><Metric icon={Target} name="ارزش مستقل تأییدشده" value={null} sub="فاقد شواهد مستقل"/></div>
     <div className="rh7-panel"><h4><BrainCircuit size={17}/> عامل‌های سطح معاونت — طرح اولیه</h4><div className="rh7-agents">{AGENTS_DEPUTY.map(([name,description])=><article key={name}><b>{name}</b><p>{description}</p><small>بدون اجرای زنده و بدون دسترسی مستقل</small></article>)}</div></div>
     <div className="rh7-panel"><h4>سازمان‌ها و واحدهای زیرمجموعه معاونت</h4>{hierarchy.deputyOrganizations.length===0?<p className="rh7-muted">ساختار سازمان‌های تابعه در API موجود نیست.</p>:hierarchy.deputyOrganizations.map(u=><article key={u.id} className="rh7-unit"><div><b>{u.title}</b><small>{u.code}</small></div>{u.id===hierarchy.waste?.id?<button onClick={()=>setView('waste')}>ورود به خلاصه پسماند <ArrowLeft size={14}/></button>:<span className="rh7-small">بدون ماژول اختصاصی در پایلوت فعلی</span>}</article>)}</div>
     <div className="rh7-cta"><button onClick={()=>navigate?.('deputy')}><Building2 size={16}/> بازکردن میزکار موجود معاونت <ArrowLeft size={15}/></button><span>سامانه موجود تغییری نمی‌کند؛ اختیارات و داده‌ها همچنان تابع API فعلی‌اند.</span></div>
   </>}
   {selected==='waste'&&<>
     <Heading title="محیط مدیرعامل سازمان مدیریت پسماند" desc="داشبورد سازمان، کارهای قابل پیگیری و ابزارهای تخصصی متصل به V6؛ ورود واقعی مدیرعامل تنها با تطبیق انتساب سازمانی مجاز است."/>
     <div className="rh7-metrics"><Metric icon={Layers3} name="دفترهای تخصصی موجود" value={11} sub="کاتالوگ ماژول‌ها، نه آمار عملکرد"/><Metric icon={ClipboardList} name="پرونده‌های دارای انتساب صریح" value={wasteStats.count} sub="با واحد یا خدمت مرتبط؛ فهرست محدود"/><Metric icon={Users} name="زیرواحدهای ثبت‌شده" value={hierarchy.subUnits.length} sub="داده ساختار واقعی، نه نیروی انسانی"/></div>
     <div className="rh7-status"><UserRoundCheck size={18}/><div><b>{policy.assignedDirector?'مدیر ثبت‌شده سازمان، مطابق هویت نشست':'پیش‌نمایش مدیر سامانه از سازمان پسماند'}</b><small>محدوده پسماند در داده پایلوت {contextState==='VALID'?'خوانده و تطبیق شد':'تأیید نشده'}؛ وضعیت: {contextError||contextState}</small></div></div>
     <div className="rh7-cta"><button onClick={()=>navigate?.('waste-pilot')}><Recycle size={16}/> ورود به سیستم‌عامل جامع پسماند V6 <ArrowLeft size={15}/></button><span>دفترهای رسمی، ثبت شواهد و صف بازبینی در V6 حفظ شده‌اند.</span></div>
     <div className="rh7-panel"><h4>ابزارهای تخصصی سازمان — همان ۱۱ دفتر موجود</h4><div className="rh7-modules">{DOMAINS.map(([id,title])=><button key={id} type="button" onClick={()=>navigate?.('waste-pilot',{kind:'wasteDomain',value:id})}>{title}<ArrowLeft size={13}/></button>)}</div><p className="rh7-muted">دکمه‌ها به محیط موجود V6 هدایت می‌شوند؛ این نسخه هیچ فرم یا پایگاه داده موازی ایجاد نمی‌کند.</p></div>
     <div className="rh7-panel"><h4><BrainCircuit size={17}/> عامل‌های تخصصی قابل توسعه</h4><div className="rh7-agents">{AGENTS.map(([name,description])=><article key={name}><b>{name}</b><p>{description}</p><small>مقصد طراحی؛ اجرای چندعاملی زنده برقرار نشده</small></article>)}</div></div>
   </>}
   <div className="rh7-disclaimer"><ShieldCheck size={17}/><p>در V7.1 هویت کاربر از نشست موجود می‌آید؛ هیچ رمز عبور یا نقش شهردار جدید ساخته نمی‌شود. خواندن ساختار به معنی اثبات انتساب مقام نیست. اجرای یک نشست مستقل شهردار، معاون و مدیرعامل نیازمند نقش/انتساب سازمانی قابل استعلام در سرور و RLS سازمان‌محور است.</p></div>
   <details className="rh7-test"><summary><FileCheck2 size={17}/> آزمون پذیرش معماری سلسله‌مراتبی — {UAT_V7.length.toLocaleString('fa-IR')} کنترل</summary><p>این آزمون‌ها باید پس از استقرار و با حساب‌های مستقل انجام شوند. وضعیت پیش‌فرض همه «اجرا نشده» است.</p><div className="rh7-test-rows">{UAT_V7.map(([id,title],i)=><label key={id}><span>{(i+1).toLocaleString('fa-IR')}. {title}</span><select value={uat[id]||'NOT_RUN'} onChange={e=>setUat(v=>({...v,[id]:e.target.value}))}><option value="NOT_RUN">اجرا نشده</option><option value="PASS">موفق</option><option value="FAIL">ناموفق</option></select></label>)}</div><div className="rh7-cta"><button onClick={report}>کپی گزارش آزمون</button><span>PASS: {uatResult.summary.pass} · FAIL: {uatResult.summary.fail} · اجرا نشده: {uatResult.summary.notRun}</span></div>{message&&<p role="status">{message}</p>}</details>
   </>}
   <footer className="rh7-foot"><Activity size={15}/> لایه سازمانی V7.1، خواندنی و بدون تغییر API/DB — مرجع حقیقی اختیار و حسابرسی همچنان RUVOS است.</footer>
 </section>;
}
