import React,{useEffect,useMemo,useState} from 'react';
// Display only: DV32H -> LangGraph -> human DV32I -> explicit DV32J. No POST or workflow starts.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const frame={border:'1px solid #cbd5e1',borderRadius:12,background:'#fff',padding:15,margin:'16px 0'};
async function get(url,signal){const res=await fetch(url,{credentials:'same-origin',signal});const d=await res.json().catch(()=>({}));if(!res.ok)throw Error(d.error||`HTTP ${res.status}`);return d;}
const statusLabels={REVIEW_REQUIRED:'نیازمند ثبت در دفتر DV32I',AWAITING_INDEPENDENT_HUMAN_REVIEW:'در انتظار نظر مستقل',
 STALE_EVIDENCE_REQUIRES_NEW_REVIEW:'شواهد تغییر کرده است؛ بررسی مجدد لازم است',HUMAN_REVIEW_NOT_APPROVED:'تأیید نشده',
 ELIGIBLE_FOR_MANUAL_DV32J_CHECK:'قابل بررسی برای درخواست دستی DV32J',REVIEW_QUEUE_TRUNCATED_MANUAL_RECONCILIATION:'صف بررسی ناقص؛ نیاز به تطبیق دستی'};
export default function Dv32LGovernedReadiness({cityId,municipalityId,selectedCityId,activeCityId}){
 const initial=[cityId,municipalityId,selectedCityId,activeCityId].find(x=>uuid.test(String(x||'')))||'';
 const [city,setCity]=useState(initial),[desk,setDesk]=useState('deputy'),[org,setOrg]=useState(''),[cities,setCities]=useState([]),[access,setAccess]=useState(null);
 const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{if(initial)setCity(initial);},[initial]);
 useEffect(()=>{const c=new AbortController();get('/api/v1/municipalities',c.signal).then(d=>setCities(Array.isArray(d)?d:[])).catch(()=>{});return()=>c.abort();},[]);
 const base=useMemo(()=>uuid.test(city)?`/api/v1/cities/${encodeURIComponent(city)}`:'',[city]);
 useEffect(()=>{setAccess(null);setOrg('');setData(null);if(!base)return;const c=new AbortController();get(`${base}/dv32g-org-bindings`,c.signal).then(setAccess).catch(()=>{});return()=>c.abort();},[base]);
 useEffect(()=>{setData(null);setError('');},[desk,org]);
 async function refresh(){if(!base)return;setBusy(true);setError('');setData(null);try{
  const p=new URLSearchParams({desk});if(desk==='waste'&&access?.access==='ADMIN'&&uuid.test(org))p.set('orgId',org);
  setData(await get(`${base}/dv32l-governed-readiness?${p.toString()}`));
 }catch(e){setError(e.message);}finally{setBusy(false);}}
 return <section dir="rtl" aria-label="DV32L زنجیره حکمرانی شواهد" style={{...frame,color:'#0f172a'}}>
  <h3>DV32L | زنجیره شواهد، تحلیل، تصمیم و پیگیری</h3>
  <p style={{fontSize:13}}>تطبیق زنده DV32H، توصیه LangGraph، تصمیم انسانی DV32I و آمادگی برای پیگیری دستی در Temporal DV32J. هیچ تصمیم یا Workflow از این صفحه ثبت نمی‌شود.</p>
  <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
   <label>شهرداری <select value={city} onChange={e=>setCity(e.target.value)}><option value="">انتخاب شهرداری</option>{cities.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
   <label>میزکار <select value={desk} onChange={e=>{setDesk(e.target.value);setOrg('');}}><option value="mayor">شهردار</option><option value="deputy">معاون خدمات شهری</option><option value="waste">مدیرعامل پسماند</option></select></label>
   {desk==='waste'&&access?.access==='ADMIN'&&<label>سازمان <select value={org} onChange={e=>setOrg(e.target.value)}><option value="">انتخاب صریح</option>{access.eligibleOrganizations?.map(x=><option key={x.id} value={x.id}>{x.name_fa}</option>)}</select></label>}
   <button type="button" disabled={!base||busy} onClick={refresh}>{busy?'در حال تطبیق...':'بررسی زنجیره حکمرانی'}</button>
  </div>
  {error&&<p role="alert" style={{color:'#b91c1c'}}>{error}</p>}
  {data?.needsOrganizationSelection&&<p>برای پسماند، سازمان مجاز باید به‌صورت صریح انتخاب یا به مدیرعامل انتساب داده شود.</p>}
  {data?.entries?.map(x=><article key={x.candidateId} style={{...frame,background:'#f8fafc',margin:'10px 0'}}>
   <strong>{x.title||x.candidateId}</strong><p>اولویت: {x.priority} | نظر LangGraph: {x.reviewCategory}</p>
   <p>وضعیت در دفتر انسانی: <strong>{statusLabels[x.gate]||x.gate}</strong></p>
   {x.reviewId&&<small>شناسه بررسی: {x.reviewId}</small>}
   <p style={{fontSize:12}}>{x.manualTemporalEligibility?'فقط کاربر دارای مجوز می‌تواند در پنل DV32J درخواست صریح پیگیری برنامه‌ریزی بدهد.':'تکمیل کنترل انسانی از طریق پنل DV32I لازم است.'}</p>
   <small>مجوز عملیات: خیر | ارزش شهری تحقق‌یافته: تأیید نشده</small>
  </article>)}
  <p style={{fontSize:12}}>وضعیت اجرای Temporal در این نما استعلام نمی‌شود. برای تصمیم و شروع/پیگیری دستی Workflow از پنل‌های موجود DV32I و DV32J استفاده کنید. این نما فقط داده‌های دارای مجوز را تطبیق می‌دهد.</p>
 </section>;
}
