import React,{useEffect,useMemo,useState} from 'react';
// RHF DV32H: native operational city-scoped evidence discovery; no executor or approval endpoint.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fmt=n=>new Intl.NumberFormat('fa-IR').format(Number(n)||0);
const panel={border:'1px solid #b6c5d7',padding:14,borderRadius:12,background:'#fff',margin:'16px 0'};
async function getJson(url,signal){const r=await fetch(url,{credentials:'same-origin',signal});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error||`HTTP ${r.status}`);return b;}
export default function Dv32HAgentBriefing({cityId,municipalityId,selectedCityId,activeCityId}){
 const propCity=[cityId,municipalityId,selectedCityId,activeCityId].find(x=>UUID.test(String(x||'')))||'';
 const [city,setCity]=useState(propCity),[cities,setCities]=useState([]),[desk,setDesk]=useState('deputy');
 const [access,setAccess]=useState(null),[org,setOrg]=useState(''),[report,setReport]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [revision,setRevision]=useState(0);
 useEffect(()=>{if(propCity)setCity(propCity);},[propCity]);
 useEffect(()=>{const ctrl=new AbortController();getJson('/api/v1/municipalities',ctrl.signal).then(x=>{if(!ctrl.signal.aborted)setCities(Array.isArray(x)?x:[]);}).catch(()=>{});return()=>ctrl.abort();},[]);
 const base=useMemo(()=>UUID.test(city)?`/api/v1/cities/${encodeURIComponent(city)}`:null,[city]);
 useEffect(()=>{setAccess(null);setOrg('');setReport(null);if(!base)return;const ctrl=new AbortController();getJson(base+'/dv32g-org-bindings',ctrl.signal)
    .then(x=>{if(!ctrl.signal.aborted)setAccess(x);}).catch(()=>{});return()=>ctrl.abort();},[base]);
 useEffect(()=>{if(!base){setReport(null);return;}const ctrl=new AbortController();setReport(null);setError('');setBusy(true);
    const params=new URLSearchParams({desk});if(desk==='waste'&&access?.access==='ADMIN'&&UUID.test(org))params.set('orgId',org);
    getJson(`${base}/dv32h-agent-briefing?${params}`,ctrl.signal)
       .then(x=>{if(!ctrl.signal.aborted)setReport(x);})
       .catch(e=>{if(!ctrl.signal.aborted)setError(e.message);})
       .finally(()=>{if(!ctrl.signal.aborted)setBusy(false);});return()=>ctrl.abort();},[base,desk,org,access,revision]);
 return <section dir="rtl" aria-label="DV32H ایجنت شناسایی فرصت" style={{...panel,fontFamily:'inherit',color:'#0f172a'}}>
   <h3 style={{margin:'0 0 6px'}}>DV32H | ایجنت کشف فرصت و شواهد شهری</h3>
   <p style={{fontSize:13,color:'#475569'}}>نسخه تحلیل مبتنی بر قواعد: پیشنهادِ قابل بررسی انسانی، بدون اجرای خودکار، بدون ارزش‌گذاری تأییدشده.</p>
   <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
     <label>شهرداری <select value={city} onChange={e=>setCity(e.target.value)}>
       <option value="">انتخاب کنید</option>{cities.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
       {city&&!cities.some(c=>c.id===city)&&<option value={city}>شهرداری انتخابی</option>}
     </select></label>
     <label>میزکار <select value={desk} onChange={e=>{setDesk(e.target.value);setOrg('');}}>
       <option value="mayor">شهردار</option><option value="deputy">معاون خدمات شهری</option>
       <option value="waste">مدیرعامل پسماند</option>
     </select></label>
     {desk==='waste'&&access?.access==='ADMIN'&&<label>سازمان پسماند <select value={org} onChange={e=>setOrg(e.target.value)}>
       <option value="">انتخاب صریح سازمان</option>
       {access.eligibleOrganizations?.map(x=><option key={x.id} value={x.id}>{x.name_fa}</option>)}
     </select></label>}
     <button type="button" disabled={!base||busy} onClick={()=>setRevision(x=>x+1)}>به‌روزرسانی شواهد</button>
   </div>
   {!base&&<p>ابتدا شهرداری را انتخاب کنید.</p>}
   {busy&&<p role="status">در حال بررسی داده‌های مجاز...</p>}
   {error&&<p role="alert" style={{color:'#b91c1c'}}>{error}</p>}
   {report?.needsOrganizationSelection&&<p role="status">برای گزارش پسماند، مدیر شهرداری باید سازمان را صریحاً انتخاب کند. مدیرعامل تنها سازمان منتسب خود را می‌بیند.</p>}
   {report?.candidates?.length>0&&<div>
     <p style={{fontSize:12,color:'#475569'}}>محدوده: {desk==='waste'?'سازمان مشخص و زیرمجموعه‌های فعال':'شهرداری مجاز'} | تعداد سیگنال: {fmt(report.candidates.length)} | وضعیت شواهد: تجمیعی و تأییدنشده</p>
     <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:10}}>
       {report.candidates.map(x=><article key={x.id} style={{...panel,margin:0,background:'#f8fafc'}}>
         <strong>{x.title}</strong> <small>({x.priority})</small>
         <p style={{fontSize:13}}>{x.description}</p>
         <ul style={{fontSize:12,paddingRight:18}}>{x.evidence.map((ev,i)=><li key={i}>{ev.source} — {ev.metric||ev.kind}: {ev.count===undefined?'—':fmt(ev.count)}</li>)}</ul>
         <p style={{fontSize:12,color:'#475569'}}>گام بعد: بررسی انسانیِ مستندات؛ بدون ثبت تأیید یا صدور مأموریت.</p>
       </article>)}
     </div>
   </div>}
   <p style={{fontSize:12,color:'#475569'}}>کنترل‌ها: RLS و احراز هویت، محدودسازی مدیرعامل به انتساب DV32G، عدم اجرای Temporal/LangGraph در این مرحله، بدون اعزام، تخصیص یا پرداخت خودکار.</p>
 </section>;
}
