import React,{useEffect,useMemo,useState} from 'react';
import CityValueBridge from './CityValueBridge.jsx';
import Dv2Readiness from './Dv2Readiness.jsx';
import {Activity,AlertTriangle,ArrowLeft,BarChart3,BookOpen,Building2,CheckCircle2,ChevronDown,ClipboardCheck,ClipboardList,FileText,Filter,Layers3,LockKeyhole,RefreshCw,Recycle,Search,Settings2,ShieldCheck,Target,Truck,Users,Workflow,Wrench,Bot,ExternalLink} from 'lucide-react';
import {WASTE_OS_NAV,ALL_WASTE_ITEMS,BRAND_COPY,findWasteItem,validateWasteSnapshot,wasteCategorySummary} from './waste-os-catalog.mjs';
import './waste-os-v9.css';
import {wasteRolePresentation} from './waste-role-presentation.mjs';
import {WasteRecordComposer,WasteReviewPanel} from './WasteRecordComposer.jsx';
const iconSet={dashboard:BarChart3,building:Building2,truck:Truck,recycle:Recycle,people:Users,briefcase:FileText,finance:BarChart3,shield:ShieldCheck,workflow:Workflow,agent:Bot,target:Target,chart:BarChart3,settings:Settings2};
const fnum=n=>typeof n==='number'&&Number.isFinite(n)?new Intl.NumberFormat('fa-IR').format(n):'—';
const cleanText=(v,f='—')=>v===null||v===undefined||v===''?f:String(v);
const prettyDate=v=>{if(!v)return '—';const t=Date.parse(v);return Number.isFinite(t)?new Intl.DateTimeFormat('fa-IR',{dateStyle:'medium'}).format(t):'—'};
const recordStatus={SUBMITTED:'در انتظار بررسی',VERIFIED:'بررسی داخلی تأیید شده',REJECTED:'رد شده'};
function Pill({children,tone='neutral'}){return <span className={'rhf-w9-pill rhf-w9-pill--'+tone}>{children}</span>}
function Tile({label,value,sub,Icon,action}){return <button type="button" className="rhf-w9-tile" onClick={action} disabled={!action}><span className="rhf-w9-tile__icon">{Icon&&<Icon size={19}/>}</span><span>{label}</span><b>{value}</b><small>{sub}</small></button>}
function Empty({title,detail}){return <div className="rhf-w9-empty"><Layers3 size={24}/><b>{title}</b><p>{detail}</p></div>}
function EvidenceTable({records}){
 if(!records?.length)return <Empty title="سابقه‌ای در محدوده مجاز نمایش داده نشد" detail="صفر رکورد به معنی نبود عملیات میدانی نیست؛ فقط موارد قابل مشاهده در این محدوده شمارش می‌شوند."/>;
 return <div className="rhf-w9-scroll"><table className="rhf-w9-table"><thead><tr><th>کد سابقه</th><th>نوع</th><th>تاریخ</th><th>وضعیت بررسی</th><th>مرجع مستند</th></tr></thead><tbody>
  {records.slice(0,100).map((r,i)=><tr key={r.id||i}><td><b>{cleanText(r.record_code,r.id)}</b></td><td>{cleanText(r.record_kind)}</td><td>{prettyDate(r.occurred_at||r.created_at)}</td><td><Pill tone={r.review_state==='VERIFIED'?'green':r.review_state==='REJECTED'?'red':'amber'}>{recordStatus[r.review_state]||cleanText(r.review_state)}</Pill></td><td><span className="rhf-w9-evidence" title={cleanText(r.evidence_ref)}>{cleanText(r.evidence_ref)}</span></td></tr>)}
 </tbody></table></div>
}
function HeaderNotice({loaded,denied,cityName}){
 return <div className="rhf-w9-trust"><ShieldCheck size={16}/><span>شهر فعال: <b>{cleanText(cityName)}</b> · {loaded?'سوابق محدود به سازمان مجاز دریافت شده است':denied?'API عملیاتی یا انتصاب سازمانی هنوز برای این شهر فعال نیست':'داده‌ای برای این سازمان تأیید نشده است'} · تأیید سابقه به معنی تأیید ارزش عمومی نیست</span></div>
}
export default function WasteOsV9({city,cityName,me,api,onNavigate,children}){
 const [mode,setMode]=useState('dashboard');
 const [selected,setSelected]=useState('overview');
 const [expanded,setExpanded]=useState('command');
 const [q,setQ]=useState('');
 const [snapshot,setSnapshot]=useState(null);
 const [loading,setLoading]=useState(false);
 const [loadingContext,setLoadingContext]=useState('');
 const [failure,setFailure]=useState(null);
 const [revision,setRevision]=useState(0);
 const [authorizedWorkspaces,setAuthorizedWorkspaces]=useState({city:'',viewerId:'',revision:-1,rows:[]});
 const [workspacesStatus,setWorkspacesStatus]=useState('loading');
 const [showAll,setShowAll]=useState(false);
 const isDemo=/(?:دمو|آزمایش|آزماي)/.test(cityName||'');
 const isAdmin=me?.systemAdmin===true;
 const accessScopeMatches=authorizedWorkspaces.city===city&&authorizedWorkspaces.viewerId===me?.id&&authorizedWorkspaces.revision===revision;
 const currentWorkspaces=accessScopeMatches?authorizedWorkspaces.rows:[];
 // On every refresh, stale role evidence becomes unusable until the new response arrives.
 const presentation=wasteRolePresentation({isAdmin,workspacesStatus:accessScopeMatches?workspacesStatus:'loading',workspaces:currentWorkspaces});
 const currentRole=presentation.roleLabel;
 // A role change can revoke access to legacy operations while the screen is open.
 useEffect(()=>{if(mode==='legacy'&&presentation.mode!=='ORG_CEO')setMode('dashboard')},[mode,presentation.mode]);
 const active=findWasteItem(selected)||findWasteItem('overview');
 const scopedSnapshot=presentation.canRead&&snapshot?.cityId===city&&snapshot?._viewerId===me?.id?snapshot:null;
 const currentLoading=loading&&loadingContext===`${city}:${me?.id||''}`;
 const visibleFailure=failure?.city===city&&failure?.viewerId===me?.id?failure.message:'';
 const categories=useMemo(()=>wasteCategorySummary(scopedSnapshot?.rows),[scopedSnapshot]);
 const summaryRows=scopedSnapshot?.rows||[];
 const pending=summaryRows.filter(r=>r.review_state==='SUBMITTED').length;
 const verified=summaryRows.filter(r=>r.review_state==='VERIFIED').length;
 useEffect(()=>{
  // Reset at render boundary to avoid any previous city's data carrying over.
  setMode('dashboard');setSelected('overview');setExpanded('command');setQ('');setSnapshot(null);setFailure(null);setAuthorizedWorkspaces({city:'',viewerId:'',revision:-1,rows:[]});setWorkspacesStatus('loading');setRevision(0);setShowAll(false);
 },[city,me?.id]);
 useEffect(()=>{
  let active=true;if(!city||!me?.id){setWorkspacesStatus('blocked');return()=>{active=false}};
  setAuthorizedWorkspaces({city:'',viewerId:'',revision:-1,rows:[]});setWorkspacesStatus('loading');
  api(`/cities/${encodeURIComponent(city)}/my-workspaces`).then(r=>{
   if(!active)return;
   const list=Array.isArray(r?.workspaces)?r.workspaces:Array.isArray(r?.assignments)?r.assignments:Array.isArray(r)?r:[];
   setAuthorizedWorkspaces({city,viewerId:me.id,revision,rows:list.filter(x=>x&&typeof x==='object')});
   setWorkspacesStatus('ready');
  }).catch(()=>{if(active){setAuthorizedWorkspaces({city,viewerId:me.id,revision,rows:[]});setWorkspacesStatus('restricted')}});
  return()=>{active=false};
 },[city,me?.id,api,revision]);
 useEffect(()=>{
  let active=true;
  if(!city||!me?.id||!presentation.canRead){setLoading(false);setSnapshot(null);setFailure(null);return()=>{active=false}};
  setLoading(true);setLoadingContext(`${city}:${me.id}`);setSnapshot(null);setFailure(null);
  api(`/cities/${encodeURIComponent(city)}/waste-suite`).then(r=>{
    if(!active)return;
    try{setSnapshot({...validateWasteSnapshot(r,city),_viewerId:me.id});}catch(e){setFailure({city,viewerId:me.id,message:e.message});setSnapshot(null);}
  }).catch(e=>{if(active){setFailure({city,viewerId:me.id,message:cleanText(e?.message,'دسترسی یا سرویس سازمان در دسترس نیست')});setSnapshot(null)}})
  .finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[city,me?.id,api,revision,presentation.canRead]);
 const filtered=useMemo(()=>WASTE_OS_NAV.map(group=>({...group,items:group.items.filter(item=>!q||[item.title,group.title].join(' ').includes(q.trim()))})).filter(group=>group.items.length),[q]);
 function open(item){
  setSelected(item.id);
  setExpanded(item.groupId||WASTE_OS_NAV.find(x=>x.items.some(i=>i.id===item.id))?.id||'command');
  if(item.id==='overview'){setMode('dashboard');return}
  setMode('detail');setShowAll(false);
 }
 function navigate(target){onNavigate?.(target)}
 const matched=active?.domain?summaryRows.filter(r=>r.record_kind===active.domain):[];
 return <section className="rhf-w9" dir="rtl" aria-label="سیستم‌عامل مدیریت پسماند نسخه ۹" data-rhf-waste-os="v9" data-rhf-waste-access={presentation.mode}>
  <header className="rhf-w9-hero">
   <div className="rhf-w9-hero__eyebrow"><Recycle size={17}/> RHF CITY OS · WASTE ORGANIZATION V9.0 <Pill tone={isDemo?'amber':'neutral'}>{isDemo?'محیط دمو':'وضعیت عملیاتی نیازمند احراز'}</Pill></div>
   <div className="rhf-w9-hero__row"><div><h1>{presentation.title}</h1><p>{BRAND_COPY.wasteMotto}</p><small>{presentation.mode==='ORG_CEO'?BRAND_COPY.ceoMotto:'نمای داده‌ها فقط در چارچوب سمت تأییدشده و مجوز سروری'}</small></div>
    <div className="rhf-w9-user"><span><Users size={17}/> {cleanText(me?.displayName,me?.username||'کاربر فعال')}</span><b>{currentRole}</b><small>{cityName||'شهرداری انتخاب‌شده'}</small></div></div>
   <div className="rhf-w9-actions"><button type="button" onClick={()=>{setRevision(x=>x+1);setFailure(null)}} disabled={currentLoading}><RefreshCw size={16}/> بازخوانی داده مجاز</button><button type="button" onClick={()=>navigate('deputy')}><Building2 size={16}/> معاونت خدمات شهری</button><button type="button" onClick={()=>navigate('org-iam')}><LockKeyhole size={16}/> انتصاب و دسترسی</button>{presentation.mode==='ORG_CEO'&&<button type="button" onClick={()=>setMode(x=>x==='legacy'?'dashboard':'legacy')}><ArrowLeft size={16}/> {mode==='legacy'?'بازگشت به نسخه ۹':'ورود به بخش‌های نسخه قبلی'}</button>}</div>
  </header>
  {isDemo&&<div className="rhf-w9-alert"><AlertTriangle size={17}/>{BRAND_COPY.demoNotice}</div>}
  <HeaderNotice loaded={!!scopedSnapshot} denied={!!visibleFailure} cityName={cityName}/>
  {visibleFailure&&<div className="rhf-w9-error"><AlertTriangle size={16}/> محدودیت دریافت داده عملیاتی: <code>{visibleFailure}</code>. مجوز یا قفل پایلوت را از رابط کاربری دور نمی‌زنیم.</div>}
  {!presentation.canRead?<div className="rhf-w9-error" role="status"><LockKeyhole size={18}/>{presentation.blockedReason} — فقط پس از تأیید سمت از سرور، داده‌ها و زیرسامانه‌های سازمانی بارگذاری می‌شوند.</div>:mode==='legacy'&&presentation.mode==='ORG_CEO'?<div className="rhf-w9-legacy"><div className="rhf-w9-legacy__head"><h2>بخش‌های موجود سازمان پسماند</h2><button type="button" onClick={()=>setMode('dashboard')}>بازگشت به فرماندهی نسخه ۹</button></div>{children}</div>:
  <div className="rhf-w9-layout">
   <aside className="rhf-w9-nav" aria-label="منوها و زیرمنوهای سازمان پسماند"><div className="rhf-w9-nav__title"><Layers3 size={18}/> زیرسامانه‌های سازمان <span>{fnum(WASTE_OS_NAV.length)} حوزه</span></div>
    <label className="rhf-w9-search"><Search size={16}/><input aria-label="جست‌وجوی منوهای پسماند" placeholder="جست‌وجوی حوزه و زیرمنو..." value={q} onChange={e=>setQ(e.target.value)}/></label>
    <button type="button" className={'rhf-w9-nav__home '+(mode==='dashboard'?'active':'')} onClick={()=>{setMode('dashboard');setSelected('overview')}}><BarChart3 size={18}/> {presentation.homeTitle}</button>
    {filtered.map(g=>{const Icon=iconSet[g.icon]||Layers3;return <div className="rhf-w9-nav__group" key={g.id}>
     <button type="button" className="rhf-w9-nav__groupbtn" aria-expanded={expanded===g.id||!!q} onClick={()=>setExpanded(e=>e===g.id?'':g.id)}><Icon size={17}/><span>{g.title}</span><ChevronDown size={15}/></button>
     {(expanded===g.id||!!q)&&<div className="rhf-w9-nav__items">{g.items.map(item=><button className={selected===item.id&&mode==='detail'?'chosen':''} type="button" key={item.id} onClick={()=>open(item)}>{item.title}<span aria-label={item.kind==='record'?'سوابق موجود':item.kind==='route'?'مسیر موجود':'نیازمند توسعه'} className={'rhf-w9-kind '+item.kind}>{item.kind==='record'?'●':item.kind==='route'?'↗':'◌'}</span></button>)}</div>}
    </div>})}
    <footer>● سوابق قابل خواندن (در صورت مجوز) · ↗ مسیر موجود در سیستم · ◌ برنامه توسعه</footer>
   </aside>
   <main className="rhf-w9-main">
    {(mode==='dashboard'||(mode==='detail'&&active?.groupId==='value'))&&<CityValueBridge city={city} actorId={me?.id} api={api} surface="waste" compact={mode==='dashboard'} onOpenGovernance={()=>navigate('urban-value')}/>}
 {mode==='dashboard'&&<Dv2Readiness city={city} actorId={me?.id} api={api} surface="waste" onOpenIam={()=>navigate('org-iam')}/>} 
    {mode==='dashboard'?<>
      <div className="rhf-w9-section-head"><div><small>{presentation.mode==='ORG_CEO'?'EXECUTIVE COMMAND CENTER':'AUTHORIZED ORGANIZATION VIEW'}</small><h2>{presentation.sectionTitle}</h2><p>تمام اعداد این نما فقط از سوابق قابل مشاهده در API همین شهر و سازمان محاسبه می‌شوند.</p></div><Pill tone={scopedSnapshot?'green':loading?'amber':'neutral'}>{scopedSnapshot?'داده سازمانی دریافت شد':loading?'در حال دریافت':'فاقد داده تأییدشده'}</Pill></div>
      <div className="rhf-w9-tiles">
       <Tile label="سوابق سازمانی قابل مشاهده" value={scopedSnapshot?fnum(summaryRows.length):'—'} sub={scopedSnapshot?.partial?'محدودیت حجم پاسخ API':'فقط محدوده شهر فعال'} Icon={ClipboardList}/>
       <Tile label="در انتظار بررسی" value={scopedSnapshot?fnum(pending):'—'} sub="تأیید مستقل ضروری است" Icon={ClipboardCheck}/>
       <Tile label="بررسی داخلی تأیید شده" value={scopedSnapshot?fnum(verified):'—'} sub="نه تأیید ارزش شهری" Icon={CheckCircle2}/>
       <Tile label="ارزش عمومی تأییدشده" value="تأیید نشده" sub="نیازمند شواهد و راستی‌آزمایی مستقل" Icon={Target}/>
      </div>
      <div className="rhf-w9-cards"><article className="rhf-w9-card"><h3><AlertTriangle size={18}/> اولویت‌های نیازمند بررسی</h3><p>سوابق ثبت‌شده با وضعیت SUBMITTED، مشروط به مجوز مشاهده</p>{scopedSnapshot?(pending?<EvidenceTable records={summaryRows.filter(r=>r.review_state==='SUBMITTED').slice(0,5)}/>:<Empty title="مورد منتظر بررسی در پاسخ مجاز مشاهده نشد" detail="این نتیجه فقط محدوده پاسخ این درخواست است."/>):<Empty title="داده عملیاتی قابل مشاهده نیست" detail="تا تأیید سازمان و مجوز، اولویت ساختگی نمایش داده نمی‌شود."/>}</article>
       <article className="rhf-w9-card"><h3><Activity size={18}/> توزیع سوابق حسب حوزه</h3><p>نمایی از دفترهای فعلی؛ بدون ادعای پوشش کامل فعالیت میدانی</p>{scopedSnapshot?<div className="rhf-w9-barchart">{[['COLLECTION','جمع‌آوری'],['FLEET','ناوگان'],['MAINTENANCE','تعمیرات'],['CONTRACTOR','پیمانکار'],['QUALITY','کنترل کیفیت'],['FACILITY','تأسیسات'],['SHIFT','شیفت']].map(([key,label])=><div key={key} className="rhf-w9-barline"><span>{label}</span><div><i style={{width:`${Math.min(100,Math.max(0,(categories[key]||0)*100/Math.max(1,summaryRows.length)))}%`}}/></div><b>{fnum(categories[key]||0)}</b></div>)}</div>:<Empty title="نمودار واقعی هنوز قابل ساخت نیست" detail="نمودارها تنها پس از دریافت موفق داده سازمانی ایجاد می‌شوند."/>}</article></div>
      <article className="rhf-w9-card"><div className="rhf-w9-section-head"><div><h3>دسترسی سریع به حوزه‌ها</h3><p>هر گزینه وضعیت پیاده‌سازی خود را به‌صراحت نشان می‌دهد.</p></div></div><div className="rhf-w9-shortcuts">{WASTE_OS_NAV.filter(g=>g.id!=='command').slice(0,12).map(g=>{const Icon=iconSet[g.icon]||Layers3;return <button type="button" key={g.id} onClick={()=>{setExpanded(g.id);open({...g.items[0],groupId:g.id})}}><Icon size={22}/><b>{g.short}</b><small>{fnum(g.items.length)} زیرمنو</small><ArrowLeft size={14}/></button>})}</div></article>
     </>:<>
      <div className="rhf-w9-section-head"><div><small>{WASTE_OS_NAV.find(g=>g.id===active?.groupId)?.title||'زیرسامانه تخصصی'}</small><h2>{active?.title||'نمای عملیاتی'}</h2><p>{active?.kind==='record'?'خواندن سوابق واقعی صرفاً با مجوز API سازمان و شهرداری':active?.kind==='route'?'این قابلیت در سیستم‌عامل موجود مسیر مستقل دارد':'این زیرسامانه هنوز به سرویس معتبر عملیاتی متصل نشده است'}</p></div><button className="rhf-w9-back" type="button" onClick={()=>setMode('dashboard')}><ArrowLeft size={16}/> داشبورد</button></div>
      {active?.kind==='record'?<article className="rhf-w9-card"><div className="rhf-w9-card__head"><h3><ClipboardList size={18}/> سوابق حوزه {active.title}</h3><Pill tone={scopedSnapshot?'green':'amber'}>{scopedSnapshot?`${fnum(matched.length)} سابقه قابل مشاهده`:'در انتظار دسترسی'}</Pill></div><p>دفتر منبع: <code>{active.domain}</code> · فرم ثبت و بررسی مستقل فقط با مجوز تأییدشده سرور در دسترس است. بدون مجوز داده‌ها فقط‌خواندنی‌اند.</p>{scopedSnapshot?<EvidenceTable records={showAll?matched:matched.slice(0,20)}/>:<Empty title="داده قابل نمایش نیست" detail={visibleFailure||'دریافت رکوردها هنوز موفق نبوده است.'}/>}
       <WasteRecordComposer key={`${city}:${me?.id}:${active?.domain}`} city={city} me={me} domain={active?.domain} api={api} canCreate={presentation.mode==='ORG_CEO' && !!scopedSnapshot?.policy?.permissions?.create && (!['LEGAL','VIOLATION'].includes(active?.domain) || scopedSnapshot?.role==='MUNICIPAL_ADMIN')} onDone={()=>setRevision(x=>x+1)}/>
       {scopedSnapshot&&!scopedSnapshot?.policy?.permissions?.create&&<p className="rhf-w91-permission-note">ثبت سوابق برای این حساب فعال نیست؛ کاربر عملیاتی باید انتصاب تأییدشده همان سازمان داشته باشد. بازبین شهرداری و مدیر سامانه فقط اختیارات نظارتی مصوب خود را دارند.</p>}
       <WasteReviewPanel key={`${city}:${me?.id}:${active?.domain}:review`} city={city} me={me} api={api} rows={matched} canReview={presentation.mode==='ORG_CEO' && !!scopedSnapshot?.policy?.permissions?.review} onDone={()=>setRevision(x=>x+1)}/> {scopedSnapshot&&matched.length>20&&!showAll&&<button type="button" onClick={()=>setShowAll(true)}>نمایش بیشتر (حداکثر ۱۰۰)</button>}</article>
       :active?.kind==='route'?<article className="rhf-w9-card rhf-w9-feature"><ExternalLink size={26}/><h3>ورود به قابلیت موجود در RHF City OS</h3><p>برای جلوگیری از ساخت نمای موازی، این زیرمنو به همان بخش عملیاتی موجود متصل می‌شود. مجوزها و داده‌ها را سرور کنترل می‌کند.</p><button type="button" className="rhf-w9-primary" onClick={()=>navigate(active.target)}>ورود به «{active.title}» <ArrowLeft size={16}/></button></article>
       :<article className="rhf-w9-card rhf-w9-feature"><LockKeyhole size={28}/><h3>نیازمند پیاده‌سازی Backend و معیار پذیرش</h3><p>منوی «{active?.title}» در معماری نسخه ۹ تعریف شده است، اما API و شواهد راه‌اندازی آن هنوز تأیید نشده‌اند؛ صفحه خالی با داده ساختگی یا دکمه عملیاتی بدون سرویس ایجاد نمی‌کنیم.</p><div className="rhf-w9-checks"><span>قید Tenant / City / Org</span><span>سمت و انتصاب تأییدشده</span><span>ثبت رویداد حسابرسی</span><span>شواهد و KPI قابل اندازه‌گیری</span><span>آزمون مستقل RLS و UAT</span></div></article>}
     </>}
   </main>
  </div>}
  <footer className="rhf-w9-footer"><ShieldCheck size={16}/> RHF WASTE OS V9 · همه داده‌ها از API مجاز می‌آیند؛ هیچ مجوز، انتصاب، نتیجه میدانی یا ارزش عمومی از این رابط ساخته یا تأیید نمی‌شود. {workspacesStatus==='restricted'?'تأیید وضعیت انتصاب در این نما ممکن نشد.':''}</footer>
 </section>;
}
