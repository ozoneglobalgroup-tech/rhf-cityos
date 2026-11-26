// DV32UX4: independent, hash-addressable role workspaces on the SAME RUVOS app.
// All values are current-identity, authorized API reads. No auto-approval, no writes.
import React,{useEffect,useRef,useState} from 'react';
import './Dv32UX9DesignSystem.css';
import './Dv32UX11Flow.css';
import './Dv32UX15ExecutiveDesign.css';
import './Dv32UX16Acceptance.css';
import './Dv32UX17ChainView.css';
import './Dv32UX18_19Design.css';
import './Dv32UX20Acceptance.css';
import Dv32UX42DemoHub from './Dv32UX42DemoHub.jsx';
import {deskInfo} from './Dv32UX42DemoPolicy.mjs';
import {focusViewMode} from './Dv32UX43FocusPolicy.mjs';
import './Dv32UX43Focus.css';
const Dv32UX5SpecialistOperations=React.lazy(()=>import('./Dv32UX5SpecialistOperations.jsx'));
import {createPortal} from 'react-dom';
import {CONFIG,createMatrixUrl,parseMatrix,scopedDeskUrl,scopedQueueUrl} from './Dv32UX3GatewayCore.mjs';
import {UUID,DESKS,MENUS,TITLES,HINTS,parseRouteHash,routeHash,checkedAccess,safeWorkbenchData,dossierUrl,summarizeDossier,catalogSnapshot} from './Dv32UX4RouterCore.mjs';
const ctl={border:'1px solid #b6cad8',borderRadius:9,padding:'10px 13px',font:'inherit',background:'#fff',color:'#13374e',cursor:'pointer'};
const panel={border:'1px solid #d1dee7',borderRadius:12,background:'#fff',padding:18};
const heading={margin:'0 0 10px',fontSize:20,color:'#12334f'};
const Dv32UX6CaseIntake=React.lazy(()=>import('./Dv32UX6CaseIntake.jsx'));
const Dv32UX16Acceptance=React.lazy(()=>import('./Dv32UX16Acceptance.jsx'));
const Dv32UX17ChainView=React.lazy(()=>import('./Dv32UX17ChainView.jsx'));
const Dv32UX18OperatorProof=React.lazy(()=>import('./Dv32UX18OperatorProof.jsx'));
const Dv32UX19SecurityEvidence=React.lazy(()=>import('./Dv32UX19SecurityEvidence.jsx'));
const Dv32UX20Acceptance=React.lazy(()=>import('./Dv32UX20Acceptance.jsx'));
const Dv32UX13Portfolio=React.lazy(()=>import('./Dv32UX13Portfolio.jsx'));
const Dv32UX11WorkOrderDesk=React.lazy(()=>import('./Dv32UX11WorkOrderDesk.jsx'));
const Dv32UX9MissionReferences=React.lazy(()=>import('./Dv32UX9MissionReferences.jsx'));
const Dv32UX10ReturnedCaseRevision=React.lazy(()=>import('./Dv32UX10ReturnedCaseRevision.jsx'));
const Dv32UX7IndependentCaseReview=React.lazy(()=>import('./Dv32UX7IndependentCaseReview.jsx'));
const Dv32UX8ApprovedCasePlanning=React.lazy(()=>import('./Dv32UX8ApprovedCasePlanning.jsx'));
async function getJson(url,signal){const r=await fetch(url,{credentials:'same-origin',cache:'no-store',signal});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||`HTTP ${r.status}`);return d;}
function getCity(props){return [props.cityId,props.municipalityId,props.selectedCityId,props.activeCityId].find(v=>UUID.test(String(v||'')))||'';}
function currentRoute(){return parseRouteHash(window.location.hash);}
const count=n=>new Intl.NumberFormat('fa-IR').format(Number(n)||0);
export default function Dv32UX4RoleWorkspaces(props){
 const incoming=getCity(props);const [route,setRoute]=useState(()=>currentRoute());
 const [open,setOpen]=useState(()=>!!currentRoute()),[city,setCity]=useState(()=>currentRoute()?.cityId||incoming),[cities,setCities]=useState([]);
 const [org,setOrg]=useState(''),[orgs,setOrgs]=useState([]),[matrix,setMatrix]=useState(null),[matrixBusy,setMatrixBusy]=useState(false);
 const [detail,setDetail]=useState(null),[detailBusy,setDetailBusy]=useState(false),[catalog,setCatalog]=useState(null);
 const [dossier,setDossier]=useState(null),[dossierBusy,setDossierBusy]=useState(false),[selectedCandidate,setSelectedCandidate]=useState('');
 const [error,setError]=useState(''),authSerial=useRef(0),dataSerial=useRef(0),dialogRef=useRef(null),workspaceMainRef=useRef(null),lastFocusRoute=useRef('');
 useEffect(()=>{if(incoming&&!open)setCity(incoming);},[incoming,open]);
 useEffect(()=>{const c=new AbortController();getJson('/api/v1/municipalities',c.signal).then(d=>{if(!c.signal.aborted&&Array.isArray(d))setCities(d.filter(x=>UUID.test(x.id)));}).catch(()=>{});return()=>c.abort();},[]);
 useEffect(()=>{function sync(){const r=currentRoute();setRoute(r);if(r){setOpen(true);setCity(r.cityId);}else{setDetail(null);setCatalog(null);setDossier(null);}}
  window.addEventListener('hashchange',sync);window.addEventListener('popstate',sync);return()=>{window.removeEventListener('hashchange',sync);window.removeEventListener('popstate',sync);};},[]);
 useEffect(()=>{authSerial.current++;dataSerial.current++;setMatrix(null);setError('');setDetail(null);setCatalog(null);setDossier(null);setSelectedCandidate('');},[city,org]);
 useEffect(()=>{let alive=true;setOrgs([]);setOrg('');if(UUID.test(city))getJson(`/api/v1/cities/${encodeURIComponent(city)}/dv32g-org-bindings`).then(x=>{
  if(alive&&x.access==='ADMIN'&&Array.isArray(x.eligibleOrganizations))setOrgs(x.eligibleOrganizations.filter(y=>UUID.test(y.id)));}).catch(()=>{});
  return()=>{alive=false;};},[city]);
 useEffect(()=>{if(!open)return;const old=document.body.style.overflow;document.body.style.overflow='hidden';dialogRef.current?.focus();
  const key=e=>{if(e.key==='Escape')closeWorkspace();};window.addEventListener('keydown',key);
  return()=>{document.body.style.overflow=old;window.removeEventListener('keydown',key);};},[open]);
 async function inspect(){if(!UUID.test(city))return null;const n=++authSerial.current;dataSerial.current++;setMatrixBusy(true);setMatrix(null);setDetail(null);setCatalog(null);setDossier(null);setError('');
  try{const d=await getJson(createMatrixUrl(city,org));const m=parseMatrix(d,city);
   if(org&&m.rows.waste.canOpen===true&&m.rows.waste.organizationId!==org)throw Error('ORGANIZATION_SCOPE_MISMATCH');
   if(n===authSerial.current){setMatrix(m);return m;}}
  catch(e){if(n===authSerial.current)setError(e.message);}finally{if(n===authSerial.current)setMatrixBusy(false);}return null;
 }
 function move(r){setRoute(r);setDetail(null);setCatalog(null);setDossier(null);setSelectedCandidate('');
  const h=routeHash(r.cityId,r.desk,r.tab);if(window.location.hash!==h)window.location.hash=h;setOpen(true);
 }
 async function openDesk(desk,tab='overview'){const m=await inspect();if(!checkedAccess(m,city,desk,org)){setError('مجوز این سیستم‌عامل برای حساب و سازمان فعلی تأیید نشد.');return;}move({cityId:city,desk,tab});}
 async function changeTab(tab){if(!route)return;const old=route;
  if(!MENUS[old.desk].some(x=>x.id===tab))return;
  const m=await inspect();if(!checkedAccess(m,old.cityId,old.desk,org)){setError('دسترسی نقش یا سازمان هنگام تغییر مسیر دوباره تأیید نشد.');return;}
  if(city!==old.cityId)return;move({...old,tab});
 }
 function closeWorkspace(){authSerial.current++;dataSerial.current++;setOpen(false);setRoute(null);setMatrix(null);setDetail(null);setCatalog(null);setDossier(null);setError('');
  if(currentRoute())window.history.replaceState(null,'',window.location.pathname+window.location.search);}
 function changeCity(v){if(currentRoute())window.history.replaceState(null,'',window.location.pathname+window.location.search);setRoute(null);setCity(v);}
 function backToIntroduction(){authSerial.current++;dataSerial.current++;if(currentRoute())window.history.replaceState(null,'',window.location.pathname+window.location.search);setRoute(null);setMatrix(null);setMatrixBusy(false);setDetail(null);setCatalog(null);setDossier(null);setSelectedCandidate('');setError('');lastFocusRoute.current='';window.requestAnimationFrame(()=>dialogRef.current?.focus());}
 const allowed=!!route&&route.cityId===city&&checkedAccess(matrix,city,route.desk,org);
 const orgId=allowed?matrix.rows[route.desk].organizationId||'':'';
 const viewMode=focusViewMode({hasRoute:!!route,authorized:allowed,checking:matrixBusy,evaluated:!!matrix,failed:!!error});
 const activeDesk=allowed?deskInfo(route.desk):null;
 useEffect(()=>{if(!open||!allowed||!route)return;const key=[route.cityId,route.desk,route.tab].join(':');if(lastFocusRoute.current===key)return;lastFocusRoute.current=key;const frame=window.requestAnimationFrame(()=>workspaceMainRef.current?.focus());return()=>window.cancelAnimationFrame(frame);},[open,allowed,route?.cityId,route?.desk,route?.tab]);
 // Refresh the *current* server authorization matrix when the demo opens; no persona switching.
 useEffect(()=>{if(open&&!route&&UUID.test(city))inspect();},[open,city]);
 // Hash deep links are never trusted. Independently verify the current identity on arrival.
 useEffect(()=>{if(open&&route&&route.cityId===city&&!matrix&&!matrixBusy)inspect();},[open,route?.cityId,route?.desk,city]);
 useEffect(()=>{const n=++dataSerial.current;setDetail(null);setCatalog(null);setDossier(null);setSelectedCandidate('');
  if(!allowed)return;const c=new AbortController();setDetailBusy(true);
  Promise.all([getJson(scopedDeskUrl(city,route.desk,orgId),c.signal),getJson(scopedQueueUrl(city,route.desk,orgId),c.signal)]).then(([d,q])=>{
    const result=safeWorkbenchData({discovery:d,queue:q,desk:route.desk,cityId:city,tenantId:matrix.scope.tenantId,organizationId:orgId||null});
    if(n===dataSerial.current&&!c.signal.aborted)setDetail(result);
   }).catch(e=>{if(n===dataSerial.current&&!c.signal.aborted)setError(e.message);}).finally(()=>{if(n===dataSerial.current&&!c.signal.aborted)setDetailBusy(false);});
  if(route.tab==='catalog'&&route.desk==='deputy'){
   getJson(`/api/v1/cities/${encodeURIComponent(city)}/dv32q7-operational-catalog`,c.signal).then(x=>{
    const result=catalogSnapshot(x,city);if(n===dataSerial.current&&!c.signal.aborted)setCatalog(result);
   }).catch(e=>{if(n===dataSerial.current&&!c.signal.aborted)setError(e.message);});
  }
  return()=>{c.abort();};
 },[allowed,route?.cityId,route?.desk,route?.tab,city,orgId,matrix]);
 async function loadDossier(id){if(!allowed||!detail?.opportunities.some(x=>x.id===id))return;
  const n=dataSerial.current;setSelectedCandidate(id);setDossier(null);setDossierBusy(true);setError('');
  try{const obj=await getJson(dossierUrl(city,route.desk,orgId,id));
   const d=summarizeDossier(obj,{cityId:city,tenantId:matrix.scope.tenantId,desk:route.desk,organizationId:orgId||null,candidateId:id});
   if(n===dataSerial.current)setDossier(d);
  }catch(e){if(n===dataSerial.current)setError(e.message);}finally{if(n===dataSerial.current)setDossierBusy(false);}
 }
 const tab=allowed?route.tab:'',activeTitle=allowed?MENUS[route.desk].find(x=>x.id===tab)?.title:'';
 const pageContent=()=>{
  if(!allowed)return <div style={panel}>برای نمایش میزکار، ابتدا مجوز این حساب و انتساب سازمانی آن را بررسی کنید.</div>;
  const head=<><h2 style={heading}>{activeTitle}</h2><p style={{color:'#526b7b',marginTop:0}}>{HINTS[route.desk]}</p></>;
  if(tab==='temporal-proof'&&route.desk!=='waste')return <React.Suspense fallback={<div style={panel} role="status">در حال بارگذاری بررسی Temporal…</div>}><Dv32UX18OperatorProof desk={route.desk} cityId={city} tenantId={matrix.scope.tenantId} orgId={null} currentRole={matrix.role}/></React.Suspense>;
  if(tab==='acceptance-suite')return <React.Suspense fallback={<div style={panel} role="status">در حال بارگذاری مرکز پذیرش…</div>}><Dv32UX20Acceptance desk={route.desk} cityId={city} tenantId={matrix.scope.tenantId} orgId={orgId||null}/></React.Suspense>;
  if(tab==='security-evidence')return <React.Suspense fallback={<div style={panel} role="status">در حال دریافت شواهد امنیت…</div>}><Dv32UX19SecurityEvidence desk={route.desk} cityId={city} tenantId={matrix.scope.tenantId} orgId={orgId||null} currentRole={matrix.role}/></React.Suspense>;
  if(tab==='case-chain'&&route.desk!=='waste')return <React.Suspense fallback={<div style={panel} role="status">در حال آماده‌سازی ممیزی پرونده…</div>}><Dv32UX17ChainView desk={route.desk} cityId={city} tenantId={matrix.scope.tenantId} orgId={null}/></React.Suspense>;
  if(tab==='release-readiness')return <React.Suspense fallback={<div style={panel} role="status">در حال بارگذاری مرکز آمادگی…</div>}><Dv32UX16Acceptance desk={route.desk} cityId={city} tenantId={matrix.scope.tenantId} orgId={orgId||null}/></React.Suspense>;
  if(['domain-coverage','value-evidence','organization-assurance'].includes(tab))return <React.Suspense fallback={<div style={panel} role="status">در حال آماده‌سازی دفتر شواهد و پوشش سازمانی…</div>}><Dv32UX13Portfolio desk={route.desk} tab={tab} cityId={city} tenantId={matrix.scope.tenantId} orgId={orgId||null}/></React.Suspense>;
  if(['work-orders','temporal-handoff'].includes(tab)&&route.desk==='deputy')return <React.Suspense fallback={<div style={panel}>در حال بارگذاری دستورکار و کنترل تحویل…</div>}><Dv32UX11WorkOrderDesk desk={route.desk} tab={tab} cityId={city} tenantId={matrix.scope.tenantId} orgId={orgId||null} currentRole={matrix.role}/></React.Suspense>;
  if(tab==='mission-references'&&route.desk==='deputy')return <React.Suspense fallback={<div style={panel}>در حال بارگذاری نگاشت مأموریت‌ها…</div>}><Dv32UX9MissionReferences desk={route.desk} tab={tab} cityId={city} tenantId={matrix.scope.tenantId} orgId={orgId||null} currentRole={matrix.role}/></React.Suspense>;
  if(tab==='case-revisions'&&route.desk==='deputy')return <React.Suspense fallback={<div style={panel}>در حال بارگذاری اصلاح پرونده…</div>}><Dv32UX10ReturnedCaseRevision desk={route.desk} tab={tab} cityId={city} tenantId={matrix.scope.tenantId} orgId={orgId||null} currentRole={matrix.role}/></React.Suspense>;
  if(tab==='case-planning'&&route.desk==='deputy')return <React.Suspense fallback={<div style={panel}>در حال آماده‌سازی برنامه‌ریزی…</div>}><Dv32UX8ApprovedCasePlanning desk={route.desk} tab={tab} cityId={city} tenantId={matrix.scope.tenantId} orgId={orgId||null} currentRole={matrix.role}/></React.Suspense>;
  if(tab==='case-review'&&route.desk==='deputy')return <React.Suspense fallback={<div style={panel}>در حال آماده‌سازی بررسی مستقل…</div>}><Dv32UX7IndependentCaseReview desk={route.desk} tab={tab} cityId={city} tenantId={matrix.scope.tenantId} orgId={orgId||null} currentRole={matrix.role}/></React.Suspense>;
  if(tab==='cases'&&route.desk==='deputy')return <React.Suspense fallback={<div style={panel}>در حال آماده‌سازی ثبت پرونده…</div>}><Dv32UX6CaseIntake desk={route.desk} tab={tab} cityId={city} tenantId={matrix.scope.tenantId} orgId={orgId||null} currentRole={matrix.role}/></React.Suspense>;
  if(['readiness','operational-catalog','temporal-observation'].includes(tab))return <React.Suspense fallback={<div style={panel} role="status">در حال بارگذاری ماژول تخصصی…</div>}><Dv32UX5SpecialistOperations desk={route.desk} tab={tab} cityId={city} tenantId={matrix.scope.tenantId} orgId={orgId||null} currentRole={matrix.role}/></React.Suspense>;
  if(tab==='overview')return <section style={panel}>{head}<div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
   <div style={panel}>فرصت‌های قابل مشاهده: <strong>{detail?count(detail.summary.candidates):'—'}</strong></div>
   <div style={panel}>بررسی‌های انسانی: <strong>{detail?count(detail.summary.reviews):'—'}</strong></div>
   <div style={panel}>دامنه دسترسی: <strong>{route.desk==='waste'?'سازمان مشخص':'شهرداری'}</strong></div>
  </div><p>شواهد در این نما فقط‌خواندنی و نیازمند تصمیم انسانی‌اند. هیچ عملیات میدانی یا ارزش محقق‌شده تأیید نمی‌شود.</p></section>;
  if(tab==='opportunities')return <section style={panel}>{head}{detail?.opportunities.length===0?<p>فرصتی با شواهد مجاز در این محدوده شناسایی نشده است.</p>:
   detail?.opportunities.map(x=><article key={x.id} style={{...panel,marginBottom:10,background:'#f6fafc'}}><strong>{x.title}</strong><p>{x.description}</p>
    <small>اولویت: {x.priority||'—'} | گروه‌های شواهد: {count(x.evidenceCount)} | شناسه: <code>{x.id}</code></small></article>)}
   <p>در این مرحله پیشنهادها مجوز تخصیص منابع یا شروع Workflow نیستند.</p></section>;
  if(tab==='reviews')return <section style={panel}>{head}<p>دفتر بررسی انسانی در محدوده همین سیستم‌عامل:</p>
   {detail&&Object.keys(detail.reviews).length===0?<p>بررسی ثبت‌شده‌ای در این محدوده مشاهده نشد.</p>:Object.entries(detail?.reviews||{}).map(([k,v])=><p key={k}><code>{k}</code> — {count(v)}</p>)}
   <p>مجاز به تصمیم در این حساب: {detail?.canDecide?'طبق کنترل سرور، بله':'خیر یا هنوز تأییدنشده'}. تغییر وضعیت در این نمای فقط‌خواندنی امکان‌پذیر نیست.</p></section>;
  if(tab==='dossiers')return <section style={panel}>{head}<p>برای هر فرصتِ واقعاً قابل مشاهده، خلاصه پرونده ردیابی شواهد DV32N را بدون تغییر داده دریافت کنید.</p>
   <label>فرصت مجاز <select style={{...ctl,maxWidth:'100%'}} value={selectedCandidate} onChange={e=>{setSelectedCandidate(e.target.value);setDossier(null);}}>
    <option value="">انتخاب</option>{(detail?.opportunities||[]).map(x=><option key={x.id} value={x.id}>{x.title}</option>)}
   </select></label>{' '}<button type="button" style={ctl} disabled={!selectedCandidate||dossierBusy} onClick={()=>loadDossier(selectedCandidate)}>دریافت Snapshot</button>
   {dossier&&<div style={{...panel,background:'#f7fafb',marginTop:10}}><p><strong>{dossier.title}</strong></p>
    <p>وضعیت بررسی: {dossier.reviewStatus||'—'} | دروازه: {dossier.gate||'—'} | شواهد جاری: {dossier.evidenceCurrent?'بله':'خیر'}</p>
    <p>تاریخ Snapshot: {dossier.snapshotAt||'—'} | شناسه بررسی هش (امضانشده): <code style={{overflowWrap:'anywhere'}}>{dossier.checksum}</code></p>
    <p>این پرونده، گواهی عملیات واقعی یا ارزش محقق‌شده نیست.</p></div>}</section>;
  if(tab==='catalog')return <section style={panel}>{head}{catalog?<><p>واحدهای فعال: {count(catalog.activeUnits)} | خدمات فعال: {count(catalog.activeServices)} | مأموریت‌های دارای نگاشت پیش‌نویس: {count(catalog.draftMappedSlots)}/۱۷</p>
   <p>این نما فقط وضعیت را می‌خواند. ایجاد یا فعال‌سازی واحد/خدمت همچنان به تأیید و اقدام مجزای مدیر مجاز نیاز دارد.</p></>:<p>کاتالوگ این شهر یا این نقش در API فعلی مجاز/قابل دسترس نیست.</p>}</section>;
  if(tab==='organization')return <section style={panel}>{head}<p>شناسه سازمان مجاز در DV32G: <code style={{overflowWrap:'anywhere'}}>{orgId}</code></p>
   <p>این شناسه از ماتریس مجوز و انتساب واقعی حساب فعلی گرفته شده و از آدرس یا منوی کاربر پذیرفته نمی‌شود.</p>
   <p>عملیات پسماند، ناوگان و قراردادها در این صفحه تا تکمیل ماژول‌های مربوط به‌عنوان اجراشده نمایش داده نمی‌شوند.</p></section>;
  return <section style={panel}>{head}<p>وضعیت آمادگی انتشار: <strong>NO_GO</strong>. آزمون مستقل سه نقش، پوشش مأموریت‌ها و استقرار نهایی هنوز تأیید نشده‌اند.</p></section>;
 };
 const modal=<div dir="rtl" role="dialog" className="rhf-ux-shell" aria-modal="true" aria-label="سه سیستم‌عامل RHF City OS" tabIndex={-1} ref={dialogRef}
  style={{position:'fixed',inset:0,zIndex:2147483000,background:'#edf4f8',color:'#15364f',overflowY:'auto',fontFamily:'inherit'}}>
  <header className="rhf-ux-header" style={{position:'sticky',top:0,zIndex:3,background:'#0a3e55',color:'#fff',padding:'14px clamp(16px,3vw,40px)',display:'flex',gap:12,alignItems:'center',justifyContent:'space-between',flexWrap:'wrap'}}>
   <div><strong style={{fontSize:19}}>🏛️ 🏙️ ♻️ RHF City OS — سه سیستم‌عامل مستقل</strong><div style={{fontSize:12,opacity:.88}}>هسته مشترک RUVOS • دسترسی بر اساس نقش و شهرداری و سازمان</div></div>
   <button type="button" onClick={closeWorkspace} style={ctl}>بازگشت به سامانه اصلی ✕</button>
  </header>
  <div style={{padding:'18px clamp(15px,3vw,40px)',maxWidth:1450,margin:'0 auto'}}>
   <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'end',marginBottom:17}}>
    <label>شهرداری<br/><select value={city} onChange={e=>changeCity(e.target.value)} style={ctl}><option value="">انتخاب شهرداری</option>
     {cities.map(x=><option key={x.id} value={x.id}>{x.name||x.name_fa||x.id}</option>)}
     {city&&!cities.some(x=>x.id===city)&&<option value={city}>شهرداری انتخاب‌شده</option>}</select></label>
    {orgs.length>0&&<label>سازمان منتخب مدیر شهرداری<br/><select value={org} onChange={e=>setOrg(e.target.value)} style={ctl}><option value="">انتخاب نشده</option>{orgs.map(x=><option key={x.id} value={x.id}>{x.name_fa||x.code||x.id}</option>)}</select></label>}
    <button type="button" style={{...ctl,background:'#0d6c76',color:'#fff'}} disabled={!UUID.test(city)||matrixBusy} onClick={inspect}>{matrixBusy?'در حال بررسی…':'تازه‌سازی مجوز حساب جاری'}</button>
   </div>
   {viewMode==='INTRO'&&<Dv32UX42DemoHub
     citySelected={UUID.test(city)}
     cityLabel={cities.find(c=>c.id===city)?.name||cities.find(c=>c.id===city)?.name_fa||'شهرداری انتخاب‌شده'}
     desks={DESKS.map(d=>({key:d,title:TITLES[d],hint:HINTS[d],icon:CONFIG[d].icon,accent:CONFIG[d].accent,authorized:checkedAccess(matrix,city,d,org)}))}
     loading={matrixBusy}
     evaluated={Boolean(matrix)}
     onInspect={inspect}
     onEnter={d=>openDesk(d)}
   />}
   {viewMode==='WORKBENCH'&&<section className="rhf-d43__focusbar" aria-label="مأموریت میزکار جاری" role="region">
    <div className="rhf-d43__focus-copy"><span className="rhf-d43__kicker">میزکار مجاز • {activeDesk.caption}</span><h2>{TITLES[route.desk]}</h2><p>{activeDesk.mission}</p><small>محدوده نمایش توسط سرور برای حساب جاری تأیید شده است؛ مجوز اجرایی جداگانه بررسی می‌شود.</small></div>
    <div className="rhf-d43__focus-actions"><span className="rhf-d43__current-tab" aria-label="بخش جاری">{activeTitle||'مرور کلی'}</span><button type="button" onClick={backToIntroduction}>بازگشت به مرکز معرفی</button></div>
   </section>}
   {viewMode==='VERIFYING'&&<div className="rhf-d43__verification" role="status">در حال بررسی مجوز سمت و شهرداری از سرور…</div>}
   {viewMode==='WORKBENCH'&&<div className="rhf-ux-work-layout" style={{display:'grid',gridTemplateColumns:'minmax(190px,255px) minmax(0,1fr)',gap:15,alignItems:'start'}}>
    <nav className="rhf-ux-sidebar" aria-label={`منوی ${TITLES[route.desk]}`} style={{...panel,position:'sticky',top:95,padding:8}}>
     <h3 style={{fontSize:15,margin:'7px 10px 12px'}}>{TITLES[route.desk]}</h3>
     {MENUS[route.desk].map(m=><button type="button" key={m.id} disabled={matrixBusy} aria-current={tab===m.id?'page':undefined} onClick={()=>changeTab(m.id)}
      style={{display:'block',width:'100%',textAlign:'right',marginBottom:5,...ctl,background:tab===m.id?CONFIG[route.desk].accent:'#fff',color:tab===m.id?'#fff':'#15364f'}}>{m.icon} {m.title}</button>)}
    </nav>
    <main id="rhf-d43-active-content" tabIndex={-1} ref={workspaceMainRef} className="rhf-d43__main" style={{minWidth:0}}>{detailBusy&&<p role="status">در حال دریافت شواهد مجاز…</p>}{pageContent()}</main>
   </div>}
   {viewMode==='RESTRICTED'&&<section className="rhf-d43__blocked" role="alert"><strong>این میزکار برای حساب جاری مجاز نیست</strong><p>ورود مستقیم از نشانی یا انتخاب نمای معرفی، انتصاب و مجوز جدید ایجاد نمی‌کند. برای بررسی مجدد، از دکمه «تازه‌سازی مجوز» استفاده کنید.</p><button type="button" onClick={backToIntroduction}>بازگشت به مرکز معرفی</button></section>}
   {error&&<p role="alert" style={{...panel,color:'#a82323',background:'#fff1f2'}}>{error}</p>}
   <p style={{fontSize:12,color:'#637b88',marginTop:19}}>سه سیستم‌عامل و ۴۲ مسیر نقش‌محور با دسترسی احرازشده؛ ماژول‌های عملیاتی قدیمی در سامانه اصلی حفظ شده‌اند. UAT سه حساب مستقل هنوز انجام نشده و وضعیت نهایی NO_GO است.</p>
  </div>
 </div>;
 return <>
  <section dir="rtl" className="rhf-ux-entry" id="rhf-three-os-gateway" style={{margin:'16px 0',background:'linear-gradient(115deg,#0b4664,#058487)',color:'#fff',padding:18,borderRadius:14}}>
   <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><div><strong>🏛️ 🏙️ ♻️ مرکز معرفی و سه میزکار مدیریتی</strong>
    <div style={{fontSize:13}}>شهردار • معاونت خدمات شهری • مدیرعامل سازمان مدیریت پسماند</div></div>
    <button type="button" style={ctl} onClick={()=>setOpen(true)}>آغاز معرفی مأموریت‌محور</button></div>
  </section>
  {createPortal(<button type="button" aria-label="گشودن مرکز معرفی سه سیستم‌عامل" onClick={()=>setOpen(true)} style={{...ctl,position:'fixed',left:15,bottom:17,zIndex:2147482990,background:'#0b526d',color:'#fff',borderRadius:30}}>🏛️ 🏙️ ♻️ سه سیستم‌عامل</button>,document.body)}
  {open&&createPortal(modal,document.body)}
 </>;
}
