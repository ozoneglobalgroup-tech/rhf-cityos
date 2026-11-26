import React,{useEffect,useMemo,useRef,useState} from 'react';
import OrganizationAccessWorkspace from './OrganizationAccessWorkspace.jsx';
import WasteExecutiveWorkspace from './WasteExecutiveWorkspace.jsx';
import WasteOsV9 from './WasteOsV9.jsx';
import DeputyPresentationWorkspace from './DeputyMultiOrgWorkspace.jsx';
import WasteRollupPanel from './WasteRollupPanel.jsx';
import {Activity,ArrowLeft,BookOpen,Building2,CheckCircle2,ClipboardCheck,ClipboardList,FileCheck2,Landmark,Layers3,LockKeyhole,Network,Recycle,RefreshCw,ShieldCheck,Target,Users,Wrench} from 'lucide-react';
import {ORG_PORTAL_V73,WASTE_DOMAIN_MENU,ROLE_TITLES,SECTION_LABELS,selectAuthorizedWorkspaces,canReadWaste,validateModuleResponse,validMenu,safeSummaryCount} from './org-portal-core.mjs';
import './organization-portal.css';
const enc=x=>encodeURIComponent(String(x||''));
const format=x=>typeof x==='number'&&Number.isFinite(x)?x.toLocaleString('fa-IR'):'نامشخص';
const text=x=>x===null||x===undefined||x===''?'—':String(x);
const icons={COLLECTION:Recycle,FLEET:Layers3,MAINTENANCE:Wrench,CONTRACTOR:Users,CONTRACT_EVAL:FileCheck2,SHIFT:Activity,QUALITY:ClipboardCheck,FACILITY:Building2,EDUCATION:BookOpen,LEGAL:LockKeyhole,VIOLATION:LockKeyhole};
function Banner({children}){return <div className="rh73-banner"><ShieldCheck size={17}/><span>{children}</span></div>}
export default function OrganizationPortalWorkspace({city,cityName,me,api,onNavigate,onManage,onLogout}){
 const admin=me?.systemAdmin===true;
 const readSequence=useRef(0);
 const [source,setSource]=useState(null),[chosen,setChosen]=useState(''),[menu,setMenu]=useState(null),[summary,setSummary]=useState(null);
 const [mode,setMode]=useState('home'),[selectedMenu,setSelectedMenu]=useState(''),[domain,setDomain]=useState('COLLECTION');
 const [moduleData,setModuleData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const workspaces=useMemo(()=>selectAuthorizedWorkspaces(source),[source]);
 const assigned=workspaces.find(w=>w.assignmentId===chosen)||null;
 const sections=assigned?validMenu(menu,assigned):[];
 async function load(){if(!city)return;const sequence=++readSequence.current;setBusy(true);setError('');try{const result=await api(`/cities/${enc(city)}/my-workspaces`);if(sequence===readSequence.current)setSource(result);}catch(e){if(sequence===readSequence.current){setSource(null);setError(e?.message||'دریافت میزکارهای مجاز ممکن نیست');}}finally{if(sequence===readSequence.current)setBusy(false)}}
 useEffect(()=>{setSource(null);setChosen('');setMenu(null);setSummary(null);setMode('home');setModuleData(null);load();return()=>{readSequence.current++}},[city,me?.id]);
 useEffect(()=>{if(!workspaces.some(w=>w.assignmentId===chosen)){setChosen(workspaces[0]?.assignmentId||'');setMode('home')}},[source,chosen]);
 useEffect(()=>{let active=true;setMenu(null);setSummary(null);setModuleData(null);if(!city||!chosen||!assigned)return()=>{active=false};
  Promise.all([api(`/cities/${enc(city)}/my-menu?assignmentId=${enc(chosen)}`),api(`/cities/${enc(city)}/org-executive-summary?assignmentId=${enc(chosen)}`)])
    .then(([m,s])=>{if(active){setMenu(m);setSummary(s);}}).catch(e=>{if(active)setError(e?.message||'عدم دریافت مجوز منو یا خلاصه مدیریت')});
  return()=>{active=false};
 },[city,chosen]);
 useEffect(()=>{let active=true;setModuleData(null);if(mode!=='domain'||!assigned||!canReadWaste(assigned)||!city)return()=>{active=false};
  if(['LEGAL','VIOLATION'].includes(domain))return()=>{active=false};
  setBusy(true);setError('');
  api(`/cities/${enc(city)}/org-waste-module?assignmentId=${enc(chosen)}&domain=${enc(domain)}`)
    .then(r=>{const valid=validateModuleResponse(r,{cityId:city,assignmentId:chosen,domain});if(active)setModuleData(valid);})
    .catch(e=>{if(active)setError(e?.message||'دریافت سوابق تخصصی ناموفق بود')})
    .finally(()=>{if(active)setBusy(false)});
  return()=>{active=false};
 },[city,chosen,domain,mode]);
 const menuAction=key=>{setSelectedMenu(key);if(key==='specialized-tools'&&canReadWaste(assigned)){setMode('domains');return}setMode('menu')};
 const openDomain=d=>{setDomain(d.id);setMode('domain');setModuleData(null)};
 const go=id=>onNavigate?.(id);
 const openAccess=()=>{if(typeof onManage==='function')onManage();else setMode('access')};
 if(assigned?.positionCode==='DEPUTY_HEAD'&&assigned?.assignmentId)return <DeputyPresentationWorkspace city={city} api={api} me={me} assignment={assigned} onNavigate={onNavigate} onLogout={onLogout}/>;
 if(assigned&&canReadWaste(assigned))return <WasteOsV9 city={city} cityName={cityName} me={me} api={api} onNavigate={onNavigate}><WasteExecutiveWorkspace city={city} api={api} me={me} assignment={assigned} summary={summary} onNavigate={onNavigate} onLogout={onLogout}/></WasteOsV9>;
 return <section className="rh73" dir="rtl" data-rhf-organization-portal={ORG_PORTAL_V73} aria-label="سیستم‌عامل سازمانی و منوی عملیاتی">
  <header className="rh73-hero"><div><small>RHF CITY OS / ORGANIZATION WORKSPACE V7.3</small><h2>میزکار و منوهای سازمانی</h2><p>پس از ورود، محیط کار از انتصاب تأییدشده سرور استخراج می‌شود. منوهای عملیاتی تنها به منابع مجاز متصل‌اند.</p></div><button onClick={load} disabled={busy} type="button"><RefreshCw size={17}/> بازخوانی</button></header>
  <Banner>پایلوت شیراز: هیچ سابقه آزمایشی به‌عنوان ارزش عمومی تأییدشده یا عملیات میدانی واقعی نمایش داده نمی‌شود.</Banner>
  {error&&<div className="rh73-error" role="alert">{error}</div>}
  {admin&&<section className="rh73-admin"><h3>دسترسی سریع مدیر سامانه به صفحات موجود</h3><button type="button" onClick={()=>go('waste-executive')} className="rh74-primary">ورود به سیستم‌عامل اختصاصی سازمان پسماند (V7.4)</button><p>این مسیرها با نشست مدیر سامانه اجرا می‌شوند؛ پیش‌نمایش مدیر سامانه به معنی احراز سمت شهردار نیست.</p><div className="rh73-grid">
    {[['executive-os','فرماندهی شهرداری',Landmark],['deputy','میزکار معاونت',Building2],['waste-pilot','سیستم‌عامل پسماند',Recycle],['org-iam','انتصاب‌ها و مجوزها',ShieldCheck],['users','کاربران و نقش‌ها',Users],['work','مرکز پیگیری',ClipboardList]].map(([id,label,Icon])=><button type="button" key={id} onClick={()=>go(id)}><Icon size={20}/><span>{label}</span><ArrowLeft size={14}/></button>)}
   </div><h4>ورود مستقیم به ۱۱ دفتر موجود پسماند</h4><div className="rh73-grid rh73-compact">{WASTE_DOMAIN_MENU.map(d=><button key={d.id} type="button" onClick={()=>onNavigate?.('waste-pilot',{kind:'wasteDomain',value:d.id})}><span>{d.label}</span><ArrowLeft size={14}/></button>)}</div>
   </section>}
  {!admin&&workspaces.length===0&&mode==='access'&&<OrganizationAccessWorkspace city={city} me={me} api={api}/> }
  {!admin&&workspaces.length===0&&mode!=='access'&&<div className="rh73-empty"><LockKeyhole size={24}/><h3>هنوز میزکار سازمانی فعالی ندارید</h3><p>حساب یا انتصاب شما باید توسط مدیر سامانه ثبت و توسط بازبین مستقل تأیید شود. تا آن زمان هیچ داده مدیریتی باز نمی‌شود.</p><button type="button" onClick={openAccess}>مشاهده وضعیت انتصاب من</button></div>}
  {workspaces.length>0&&!assigned&&<div className="rh73-empty" role="status" aria-live="polite"><h3>در حال آماده‌سازی میزکار سازمانی</h3><p>در حال انتخاب انتصاب تأییدشده و دریافت مجوزهای مربوط به این سمت...</p></div>}
  {workspaces.length>0&&assigned&&<>
   <div className="rh73-selector"><label>سمت فعال و محیط کار<select value={chosen} onChange={e=>setChosen(e.target.value)}>{workspaces.map(w=><option key={w.assignmentId} value={w.assignmentId}>{ROLE_TITLES[w.positionCode]} — {w.orgUnitName||'کل شهرداری'}</option>)}</select></label><span><ShieldCheck size={16}/> فقط‌خواندنی و محدود به انتصاب</span></div>
   <nav className="rh73-navigation" aria-label="منوی سمت سازمانی">
    <button type="button" aria-current={mode==='home'?'page':undefined} onClick={()=>setMode('home')}><Landmark size={17}/> میزکار من</button>
    {sections.map(s=><button type="button" key={s} aria-current={selectedMenu===s&&mode!=='home'?'page':undefined} onClick={()=>menuAction(s)}><Layers3 size={16}/>{SECTION_LABELS[s]}</button>)}
    {canReadWaste(assigned)&&<button type="button" aria-current={['domains','domain'].includes(mode)?'page':undefined} onClick={()=>setMode('domains')}><Recycle size={17}/> ۱۱ دفتر سازمان پسماند</button>}
    <button type="button" onClick={openAccess}><ShieldCheck size={17}/> انتصاب‌ها و دسترسی من</button>
   </nav>
   {mode==='access'&&<OrganizationAccessWorkspace city={city} me={me} api={api}/> }
   {mode==='home'&&<div className="rh73-content"><h3>{ROLE_TITLES[assigned.positionCode]} — {assigned.orgUnitName||'شهرداری'}</h3><p>خلاصه بر پایه پرونده‌های دارای انتساب صریح به سازمان یا واحد است؛ فهرست ناقص به‌صورت صفر ساختگی نمایش داده نمی‌شود.</p>
     <div className="rh73-stats"><article><small>پرونده‌های صریحاً منتسب</small><strong>{format(safeSummaryCount(summary,chosen))}</strong></article><article><small>ارزش شهری مستقل</small><strong>تأیید نشده</strong></article><article><small>وضعیت اختیار</small><strong>خواندنی</strong></article></div>
     {['MAYOR','DEPUTY_HEAD'].includes(assigned.positionCode)&&<WasteRollupPanel city={city} assignment={assigned} api={api}/>}
     <div className="rh73-grid">{sections.map(s=><button type="button" key={s} onClick={()=>menuAction(s)}>{SECTION_LABELS[s]}<ArrowLeft size={15}/></button>)}</div>
   </div>}
   {mode==='menu'&&<div className="rh73-content"><button className="rh73-back" onClick={()=>setMode('home')}><ArrowLeft size={16}/> بازگشت به میزکار</button><h3>{SECTION_LABELS[selectedMenu]||'میزکار'}</h3>
      {['mayor-summary','deputy-summary','organization-summary','department-summary','audit-summary','oversight'].includes(selectedMenu)?<><p>این نما صرفاً خلاصه ثبت‌شده و مجاز را نمایش می‌دهد. جزئیات زیرمجموعه بدون انتساب و مجوز در سرور قابل دریافت نیست.</p><div className="rh73-stats"><article><small>پرونده‌های منتسب</small><strong>{format(safeSummaryCount(summary,chosen))}</strong></article><article><small>ارزش شهری</small><strong>تأیید نشده</strong></article></div>
      {['MAYOR','DEPUTY_HEAD'].includes(assigned.positionCode)&&<WasteRollupPanel city={city} assignment={assigned} api={api}/>}</>:<div className="rh73-hint"><LockKeyhole size={19}/><div><strong>ابزار اجرایی این بخش هنوز API سمت‌محور ندارد.</strong><p>عنوان و اختیار منو از سرور آمده است؛ برای جلوگیری از دسترسی سراسری، ثبت تصمیم، گردش‌کار عامل و عملیات اجرایی از این سمت فعال نمی‌شود.</p></div></div>}
    </div>}
   {mode==='domains'&&canReadWaste(assigned)&&<div className="rh73-content"><h3>۱۱ حوزه تخصصی پسماند</h3><p>۹ دفتر عملیاتی با API سازمان‌محور و فقط‌خواندنی؛ حقوقی و تخلفات نیازمند سیاست دسترسی مستقل.</p><div className="rh73-grid rh73-compact">{WASTE_DOMAIN_MENU.map(d=>{const Icon=icons[d.id]||Layers3;return <button type="button" key={d.id} onClick={()=>openDomain(d)}><Icon size={17}/>{d.label}{d.restricted&&<LockKeyhole size={13}/>}<ArrowLeft size={13}/></button>})}</div></div>}
   {mode==='domain'&&canReadWaste(assigned)&&<div className="rh73-content"><button className="rh73-back" onClick={()=>setMode('domains')}><ArrowLeft size={16}/> همه حوزه‌ها</button><h3>{WASTE_DOMAIN_MENU.find(x=>x.id===domain)?.label}</h3>
    {['LEGAL','VIOLATION'].includes(domain)?<div className="rh73-hint"><LockKeyhole size={20}/><div><strong>دسترسی داده‌های محرمانه فعال نیست.</strong><p>منو قابل انتخاب است، اما بدون تفویض صریح مجوز حقوقی/تخلفات، داده‌ای از سرور خوانده نمی‌شود.</p></div></div>:
     <><p>فقط خواندن سوابق متعلق به سازمان منصوب‌شده. ثبت، تصمیم مستقل و اعزام از این مسیر مجاز نیست.</p>{busy&&!moduleData?<p>در حال دریافت سوابق...</p>:null}
       {moduleData&&<><div className="rh73-stats"><article><small>سوابق قابل مشاهده</small><strong>{format(moduleData.rows.length)}{moduleData.partial?' +':''}</strong></article><article><small>وضعیت داده</small><strong>{moduleData.partial?'بخشی':'تا سقف ۱۰۰'}</strong></article></div>
        {moduleData.rows.length===0?<p className="rh73-hint">در این دفتر هنوز سابقه قابل مشاهده ثبت نشده است؛ صفر به معنی نبود فعالیت میدانی نیست.</p>:<div className="rh73-records">{moduleData.rows.map(r=><article key={r.id}><div><strong>{text(r.code)}</strong><span>{text(r.reviewState)}</span></div><small>پرونده: {r.caseId?'منتسب با شناسه صریح':'بدون انتساب'} · مستند: {text(r.evidenceRef)}</small><dl>{Object.entries(r.payload||{}).map(([key,value])=><React.Fragment key={key}><dt>{key}</dt><dd>{text(value)}</dd></React.Fragment>)}</dl></article>)}</div>}
       </>}</>}
    </div>}
  </>}
  <footer className="rh73-footer"><ShieldCheck size={16}/> V7.3 · همه دکمه‌های این میزکار مقصد یا توضیح محدودیت دارند؛ هیچ مجوزی از طرف رابط صادر نمی‌شود.</footer>
 </section>;
}
