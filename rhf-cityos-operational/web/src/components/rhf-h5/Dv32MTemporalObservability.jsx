import React,{useEffect,useMemo,useState,useRef} from 'react';
// Read-only status: no POST, no workflow start and no signal.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const labels={NOT_STARTED_REPORTED:'در DV32J شروع‌شده گزارش نشده',WAITING_FOR_PLANNING_ACK:'در انتظار تأیید دریافت برنامه‌ریزی',ACKNOWLEDGED_NON_EXECUTING:'دریافت برنامه‌ریزی تأیید شده؛ بدون مجوز عملیات'};
async function get(path){const r=await fetch(path,{credentials:'same-origin'});const x=await r.json().catch(()=>({}));if(!r.ok)throw Error(x.error||`HTTP ${r.status}`);return x;}
export default function Dv32MTemporalObservability({cityId,municipalityId,selectedCityId,activeCityId}){
 const initial=[cityId,municipalityId,selectedCityId,activeCityId].find(v=>UUID.test(String(v||'')))||'';
 const [city,setCity]=useState(initial),[cities,setCities]=useState([]),[desk,setDesk]=useState('deputy');
 const [org,setOrg]=useState(''),[access,setAccess]=useState(null),[rows,setRows]=useState([]);
 const [states,setStates]=useState({}),[busy,setBusy]=useState(false),[error,setError]=useState('');const epoch=useRef(0);
 useEffect(()=>{if(initial)setCity(initial);},[initial]);
 useEffect(()=>{get('/api/v1/municipalities').then(x=>setCities(Array.isArray(x)?x:[])).catch(()=>{});},[]);
 const base=useMemo(()=>UUID.test(city)?`/api/v1/cities/${encodeURIComponent(city)}`:'',[city]);
 useEffect(()=>{epoch.current++;setOrg('');setAccess(null);setRows([]);setStates({});if(base)get(`${base}/dv32g-org-bindings`).then(setAccess).catch(()=>{});},[base]);
 useEffect(()=>{epoch.current++;setRows([]);setStates({});setError('');},[desk,org]);
 const query=()=>{const p=new URLSearchParams({desk});if(desk==='waste'&&access?.access==='ADMIN'&&UUID.test(org))p.set('orgId',org);return p.toString();};
 async function load(){if(!base)return;const current=++epoch.current;setBusy(true);setRows([]);setError('');setStates({});try{const x=await get(`${base}/dv32l-governed-readiness?${query()}`);if(current!==epoch.current)return;setRows(x.entries||[]);if(x.needsOrganizationSelection)setError('سازمان مجاز باید انتخاب یا به حساب مدیرعامل متصل شود.');}catch(e){if(current===epoch.current)setError(String(e.message));}finally{if(current===epoch.current)setBusy(false);}}
 async function status(row){if(!base||!UUID.test(row.reviewId))return;const current=epoch.current;setStates(s=>({...s,[row.reviewId]:{busy:true}}));try{const x=await get(`${base}/dv32m-temporal-status/${encodeURIComponent(row.reviewId)}?${query()}`);if(current===epoch.current)setStates(s=>({...s,[row.reviewId]:{data:x}}));}catch(e){if(current===epoch.current)setStates(s=>({...s,[row.reviewId]:{error:String(e.message)}}));}}
 return <section dir="rtl" style={{margin:'16px 0',padding:16,border:'1px solid #94a3b8',borderRadius:12,background:'#fff',color:'#0f172a'}}>
  <h3>DV32M | رصد وضعیت واقعی Temporal</h3>
  <p style={{fontSize:13}}>استعلام فقط‌خواندنی وضعیت پیگیری برنامه‌ریزی پس از تأیید مستقل و اعتبار شواهد. از این بخش هیچ Workflow آغاز یا تأیید دریافت نمی‌شود.</p>
  <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
   <label>شهرداری <select value={city} onChange={e=>setCity(e.target.value)}><option value="">انتخاب</option>{cities.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
   <label>میزکار <select value={desk} onChange={e=>{setDesk(e.target.value);setOrg('');}}><option value="mayor">شهردار</option><option value="deputy">معاون</option><option value="waste">پسماند</option></select></label>
   {desk==='waste'&&access?.access==='ADMIN'&&<label>سازمان <select value={org} onChange={e=>setOrg(e.target.value)}><option value="">انتخاب صریح</option>{access.eligibleOrganizations?.map(o=><option key={o.id} value={o.id}>{o.name_fa}</option>)}</select></label>}
   <button type="button" disabled={!base||busy} onClick={load}>بارگذاری بررسی‌های مجاز</button>
  </div>
  {error&&<p role="alert">{error}</p>}
  {rows.map(r=><article key={r.candidateId} style={{borderTop:'1px solid #e2e8f0',marginTop:10,paddingTop:10}}>
   <strong>{r.title}</strong> <span style={{fontSize:12}}>{r.gate}</span>
   {r.manualTemporalEligibility&&r.reviewId&&<div><button type="button" disabled={!!states[r.reviewId]?.busy} onClick={()=>status(r)}>استعلام زنده Temporal</button>
     {states[r.reviewId]?.data&&<p>{labels[states[r.reviewId].data.phase]||'وضعیت ناشناخته'} — {states[r.reviewId].data.observation}</p>}
     {states[r.reviewId]?.error&&<p role="alert">{states[r.reviewId].error}</p>}</div>}
  </article>)}
  <small>بدون اعزام، پرداخت، تخصیص منابع یا تأیید ارزش محقق‌شده؛ همه اقدامات انسانی فقط در میزکارهای قبلی.</small>
 </section>;
}
