import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {UUID,DESKS,CONFIG,createMatrixUrl,parseMatrix,mayOpen,scopedDeskUrl,scopedQueueUrl,summarizeReadOnly} from './Dv32UX3GatewayCore.mjs';
const border='1px solid #cddde8';
const button={borderRadius:10,border:'1px solid #bfd2df',background:'#fff',color:'#123753',padding:'9px 15px',fontFamily:'inherit',cursor:'pointer'};
async function getJson(url,signal){const r=await fetch(url,{credentials:'same-origin',cache:'no-store',signal});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||`HTTP ${r.status}`);return d;}
function chooseCity(props){return [props.cityId,props.municipalityId,props.selectedCityId,props.activeCityId].find(v=>UUID.test(String(v||'')))||'';}
export default function Dv32UX3Gateway(props){
 const incoming=chooseCity(props);const [city,setCity]=useState(incoming),[cities,setCities]=useState([]);
 const [open,setOpen]=useState(false),[desk,setDesk]=useState(''),[org,setOrg]=useState(''),[orgs,setOrgs]=useState([]);
 const [matrix,setMatrix]=useState(null),[evidence,setEvidence]=useState(null);
 const [busy,setBusy]=useState(false),[loadingDesk,setLoadingDesk]=useState(false),[error,setError]=useState('');
 const epoch=useRef(0),deskEpoch=useRef(0);
 useEffect(()=>{if(incoming)setCity(incoming);},[incoming]);
 useEffect(()=>{const ctrl=new AbortController();getJson('/api/v1/municipalities',ctrl.signal).then(x=>{if(Array.isArray(x))setCities(x);}).catch(()=>{});return()=>ctrl.abort();},[]);
 useEffect(()=>{let active=true;setOrg('');setOrgs([]);if(UUID.test(city))getJson(`/api/v1/cities/${encodeURIComponent(city)}/dv32g-org-bindings`).then(d=>{if(active&&d.access==='ADMIN'&&Array.isArray(d.eligibleOrganizations))setOrgs(d.eligibleOrganizations.filter(o=>UUID.test(o.id)));}).catch(()=>{});return()=>{active=false;};},[city]);
 useEffect(()=>{epoch.current++;deskEpoch.current++;setMatrix(null);setDesk('');setEvidence(null);setError('');},[city,org]);
 useEffect(()=>{if(!open)return;const onKey=e=>{if(e.key==='Escape'){setOpen(false);setDesk('');}};document.addEventListener('keydown',onKey);const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.removeEventListener('keydown',onKey);document.body.style.overflow=old;};},[open]);
 async function inspect(){if(!UUID.test(city))return;const seq=++epoch.current;deskEpoch.current++;setBusy(true);setError('');setMatrix(null);setDesk('');setEvidence(null);
  try{const d=await getJson(createMatrixUrl(city,org));const parsed=parseMatrix(d,city);if(seq===epoch.current)setMatrix(parsed);}
  catch(e){if(seq===epoch.current)setError(e.message);}finally{if(seq===epoch.current)setBusy(false);}
 }
 async function enter(target){if(!mayOpen(matrix,target))return;const row=matrix.rows[target];if(target==='waste'&&!UUID.test(row.organizationId||''))return;
  const seq=++deskEpoch.current;setDesk(target);setEvidence(null);setLoadingDesk(true);setError('');
  try{const [discovery,queue]=await Promise.all([getJson(scopedDeskUrl(city,target,row.organizationId)),getJson(scopedQueueUrl(city,target,row.organizationId))]);
   const d=summarizeReadOnly({discovery,queue,desk:target,cityId:city,tenantId:matrix.scope.tenantId,orgId:row.organizationId});
   if(seq===deskEpoch.current)setEvidence(d);
  }catch(e){if(seq===deskEpoch.current)setError(e.message);}finally{if(seq===deskEpoch.current)setLoadingDesk(false);}
 }
 function close(){epoch.current++;deskEpoch.current++;setOpen(false);setDesk('');setError('');setEvidence(null);}
 const header=<div style={{display:'flex',gap:10,alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',marginBottom:20}}>
  <div><div style={{fontSize:12,letterSpacing:1,color:'#398f92'}}>RHF CITY OS / THREE ROLE-BOUND WORKSPACES</div><h2 style={{margin:'5px 0',fontSize:24,color:'#153b59'}}>سه سیستم‌عامل مدیریتی مستقل</h2><div style={{fontSize:13,color:'#50677a'}}>یک هسته مشترک RUVOS؛ سه محیط کاری با دامنه دسترسی مستقل</div></div>
  <button type="button" onClick={close} style={button} aria-label="بستن انتخاب سیستم‌عامل">✕ بستن</button>
 </div>;
 const portal=<div dir="rtl" role="dialog" aria-modal="true" aria-label="انتخاب سه سیستم‌عامل RHF City OS" style={{position:'fixed',inset:0,zIndex:2147483000,background:'rgba(10,33,48,.65)',padding:14,display:'grid',placeItems:'center'}}>
  <div style={{width:'min(1120px,100%)',maxHeight:'min(92vh,1000px)',overflowY:'auto',background:'#f5f9fb',color:'#153b59',borderRadius:17,padding:'clamp(15px,3vw,28px)',boxShadow:'0 16px 65px rgba(0,0,0,.24)',fontFamily:'inherit'}}>
   {header}
   <div style={{display:'flex',flexWrap:'wrap',gap:12,alignItems:'end',borderBottom:border,paddingBottom:18,marginBottom:18}}>
    <label style={{fontSize:13,fontWeight:700}}>شهرداری<br/><select value={city} onChange={e=>setCity(e.target.value)} style={{...button,minWidth:185,marginTop:6}}><option value="">انتخاب شهرداری</option>{cities.map(c=><option key={c.id} value={c.id}>{c.name||c.name_fa||c.id}</option>)}{city&&!cities.some(c=>c.id===city)&&<option value={city}>شهرداری فعلی</option>}</select></label>
    {orgs.length>0&&<label style={{fontSize:13,fontWeight:700}}>سازمانِ انتخاب‌شده توسط مدیر شهرداری<br/><select value={org} onChange={e=>setOrg(e.target.value)} style={{...button,minWidth:195,marginTop:6}}><option value="">بدون انتخاب سازمان</option>{orgs.map(o=><option key={o.id} value={o.id}>{o.name_fa||o.code||o.id}</option>)}</select></label>}
    <button type="button" style={{...button,background:'#086d78',color:'#fff'}} disabled={!UUID.test(city)||busy} onClick={inspect}>{busy?'در حال بررسی…':'بررسی مجوز سه میزکار'}</button>
    <span style={{color:'#6a7f8e',fontSize:12}}>فقط مجوز حساب واردشده بررسی می‌شود؛ بدون اعطای نقش جدید</span>
   </div>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(235px,1fr))',gap:14}}>
    {DESKS.map(id=>{const x=CONFIG[id],row=matrix?.rows?.[id],allowed=row?.canOpen===true,selected=desk===id;
      const status=!matrix?'برای ورود ابتدا مجوز را بررسی کنید':allowed?'دسترسی فعلی مجاز است':row?.discovery==='SELECT_ORGANIZATION'?'انتخاب سازمان معتبر لازم است':'این حساب به این میزکار دسترسی ندارد';
      return <article key={id} style={{padding:18,border:selected?`2px solid ${x.accent}`:border,borderRadius:14,background:'#fff',boxShadow:selected?'0 5px 20px #98b6be44':'none'}}>
       <div aria-hidden="true" style={{fontSize:37,marginBottom:8}}>{x.icon}</div><h3 style={{fontSize:18,minHeight:52,margin:'4px 0 5px'}}>{x.title}</h3><p style={{color:'#597387',fontSize:13,minHeight:42}}>{x.subtitle}</p>
       <p style={{fontSize:12,fontWeight:650,color:allowed?'#067452':'#826338',minHeight:34}}>{status}</p>
       <button type="button" disabled={!allowed||loadingDesk} onClick={()=>enter(id)} style={{...button,width:'100%',background:allowed?x.accent:'#e9eff2',color:allowed?'white':'#78858b',cursor:allowed?'pointer':'not-allowed'}}>ورود به {id==='mayor'?'میزکار شهردار':id==='deputy'?'میزکار معاونت':'میزکار پسماند'}</button>
      </article>;
    })}
   </div>
   {desk&&matrix?.rows?.[desk]?.canOpen&&<section style={{background:'#fff',marginTop:18,padding:20,border:`2px solid ${CONFIG[desk].accent}`,borderRadius:12}}>
     <div style={{display:'flex',flexWrap:'wrap',justifyContent:'space-between',gap:10,alignItems:'center'}}>
      <h3 style={{margin:0}}>{CONFIG[desk].icon} {CONFIG[desk].title} — میزکار اختصاصی</h3><button type="button" style={button} onClick={()=>{deskEpoch.current++;setDesk('');setEvidence(null);setError('');}}>بازگشت به سه سیستم‌عامل</button>
     </div>
     <p style={{fontSize:13,color:'#64748b'}}>دامنه دسترسی از سامانه و انتساب سازمانی واقعی گرفته شده است؛ انتخاب کارت مجوزی ایجاد نمی‌کند.</p>
     <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(205px,1fr))',gap:8}}>{CONFIG[desk].areas.map(a=><div key={a} style={{padding:13,background:'#f2f7fa',borderRadius:8,fontSize:13,border:border}}>{a}</div>)}</div>
     <h4>خلاصه زنده شواهد و بررسی انسانی</h4>
     {loadingDesk?<p>در حال خواندن اطلاعات مجاز…</p>:evidence?<div style={{display:'flex',flexWrap:'wrap',gap:16}}><strong>فرصت‌های قابل مشاهده: {evidence.candidates}</strong><strong>بررسی‌های قابل مشاهده: {evidence.reviews}</strong>{evidence.truncated&&<span>صف بررسی محدود شده؛ نیازمند بازبینی</span>}</div>:<p>شواهد هنوز تأیید نشده‌اند.</p>}
     <p style={{fontSize:12,color:'#64748b'}}>پوشش تمام ماژول‌های تخصصی و UAT نهایی هنوز تأیید نشده است. هیچ شروع Workflow، عملیات میدانی یا ادعای ارزش تحقق‌یافته در این نما انجام نمی‌شود.</p>
     <button type="button" style={{...button,background:'#e6f0f3'}} onClick={close}>بازگشت به ماژول‌های عملیاتی موجود</button>
   </section>}
   {error&&<p role="alert" style={{color:'#b91c1c',background:'#fee2e2',padding:10,borderRadius:8}}>{error}</p>}
   <p style={{fontSize:12,color:'#687d8b',marginTop:16}}>این درگاه، تفکیک ورودی و مشاهده نقش‌محور را ایجاد می‌کند. ماژول‌های قدیمیِ مشترک همچنان برای مهاجرت تدریجی حفظ می‌شوند. وضعیت انتشار: NO_GO تا UAT و تأیید مستقل.</p>
  </div>
 </div>;
 return <>
  <section dir="rtl" id="rhf-three-os-gateway" style={{background:'linear-gradient(115deg,#0c3b5a,#087b80)',borderRadius:15,padding:'18px 20px',margin:'16px 0',color:'#fff',boxShadow:'0 6px 19px #285d6a38'}}>
   <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
    <div><strong style={{fontSize:18}}>سه سیستم‌عامل تخصصی RHF City OS</strong><div style={{fontSize:13,marginTop:5}}>شهردار · معاونت خدمات شهری · مدیرعامل سازمان مدیریت پسماند</div></div>
    <button type="button" onClick={()=>setOpen(true)} style={{...button,background:'#fff',fontWeight:750}}>🏛️ 🏙️ ♻️ انتخاب سیستم‌عامل</button>
   </div>
  </section>
  {createPortal(<button type="button" onClick={()=>setOpen(true)} aria-label="انتخاب سه سیستم‌عامل مستقل RHF City OS" style={{position:'fixed',bottom:17,left:20,zIndex:2147482990,border:'1px solid #4ab7b2',borderRadius:30,background:'#075a70',color:'#fff',boxShadow:'0 5px 17px #0d39474d',padding:'10px 15px',fontSize:13,fontWeight:700,fontFamily:'inherit',cursor:'pointer'}}>🏛️ 🏙️ ♻️ سه سیستم‌عامل</button>,document.body)}
  {open&&createPortal(portal,document.body)}
 </>;
}
