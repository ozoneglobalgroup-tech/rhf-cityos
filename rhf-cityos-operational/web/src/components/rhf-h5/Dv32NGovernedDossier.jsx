import React,{useEffect,useMemo,useRef,useState} from 'react';
// DV32N: user-initiated read-only evidence snapshot; no POST, workflow start, or approval.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function read(url){const r=await fetch(url,{credentials:'same-origin',cache:'no-store'});const x=await r.json().catch(()=>({}));if(!r.ok)throw Error(x.error||`HTTP ${r.status}`);return x;}
const gateLabel={REVIEW_REQUIRED:'نیازمند درخواست بررسی انسانی',STALE_EVIDENCE_REQUIRES_NEW_REVIEW:'شواهد تغییر کرده است',ELIGIBLE_FOR_MANUAL_DV32J_CHECK:'تأیید شده فقط برای برنامه‌ریزی',AWAITING_INDEPENDENT_HUMAN_REVIEW:'در انتظار بررسی مستقل',HUMAN_REVIEW_NOT_APPROVED:'بررسی انسانی تأیید نشده',REVIEW_QUEUE_TRUNCATED_MANUAL_RECONCILIATION:'فهرست ناقص، بررسی مجدد لازم است'};
export default function Dv32NGovernedDossier({cityId,municipalityId,selectedCityId,activeCityId}){
 const initial=[cityId,municipalityId,selectedCityId,activeCityId].find(v=>UUID.test(String(v||'')))||'';
 const [city,setCity]=useState(initial),[cities,setCities]=useState([]),[desk,setDesk]=useState('deputy');
 const [access,setAccess]=useState(null),[org,setOrg]=useState('');const [rows,setRows]=useState([]);
 const [selected,setSelected]=useState(''),[includeTemporal,setIncludeTemporal]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const epoch=useRef(0);const base=useMemo(()=>UUID.test(city)?`/api/v1/cities/${encodeURIComponent(city)}`:'',[city]);
 useEffect(()=>{if(initial)setCity(initial);},[initial]);
 useEffect(()=>{read('/api/v1/municipalities').then(x=>setCities(Array.isArray(x)?x:[])).catch(()=>{});},[]);
 useEffect(()=>{const n=++epoch.current;setAccess(null);setOrg('');setRows([]);setSelected('');setError('');if(base)read(`${base}/dv32g-org-bindings`).then(x=>{if(epoch.current===n)setAccess(x);}).catch(()=>{});},[base]);
 useEffect(()=>{epoch.current++;setRows([]);setSelected('');setIncludeTemporal(false);setError('');setMessage('');},[desk,org]);
 const query=extra=>{const q=new URLSearchParams({desk});if(desk==='waste'&&access?.access==='ADMIN'&&UUID.test(org))q.set('orgId',org);if(extra)q.set('includeTemporal','1');return q.toString();};
 async function load(){if(!base)return;const n=++epoch.current;setBusy(true);setRows([]);setSelected('');setMessage('');setError('');try{const x=await read(`${base}/dv32l-governed-readiness?${query(false)}`);if(n!==epoch.current)return;setRows(Array.isArray(x.entries)?x.entries:[]);if(x.needsOrganizationSelection)setError('سازمان باید صریحاً انتخاب شده یا به حساب مجاز متصل باشد.');}catch(e){if(n===epoch.current)setError(String(e.message));}finally{if(n===epoch.current)setBusy(false);}}
 async function download(){const row=rows.find(x=>x.candidateId===selected);if(!row||!base)return;const n=epoch.current;setBusy(true);setError('');setMessage('');try{
  const x=await read(`${base}/dv32n-evidence-dossier/${encodeURIComponent(row.candidateId)}?${query(includeTemporal)}`);
  if(n!==epoch.current)return;
  if(x.schema!=='RHF-DV32N-GOVERNED-EVIDENCE-DOSSIER-v1'||x.controls?.executionAuthorization!==false)throw Error('INVALID_DOSSIER');
  const blob=new Blob([JSON.stringify(x,null,2)],{type:'application/json;charset=utf-8'});
  const link=document.createElement('a'),local=URL.createObjectURL(blob);link.href=local;
  link.download=`rhf-dv32n-${row.candidateId.replace(/[^a-z0-9-]/g,'-').slice(0,55)}.json`;
  document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(local);
  setMessage('گزارش جاری دریافت شد؛ این فایل امضای دیجیتال یا تأیید ارزش محقق‌شده نیست.');
 }catch(e){if(n===epoch.current)setError(String(e.message));}finally{if(n===epoch.current)setBusy(false);}}
 const selectedRow=rows.find(x=>x.candidateId===selected);
 const eligible=!!selectedRow?.manualTemporalEligibility&&selectedRow?.evidenceCurrent===true;
 return <section dir="rtl" style={{background:'#fff',color:'#0f172a',border:'1px solid #94a3b8',borderRadius:12,padding:16,margin:'16px 0'}}>
  <h3>DV32N | پرونده ردیابی شواهد و تصمیم</h3>
  <p style={{fontSize:13}}>دریافت یک Snapshot فقط‌خواندنی از منشأ شواهد، تحلیل ایجنت، آخرین تصمیم انسانی و در صورت مجازبودن، وضعیت Temporal. فاقد داده شخصی، مجوز عملیات و ادعای ارزش محقق‌شده.</p>
  <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'end'}}>
   <label>شهرداری <select value={city} onChange={e=>setCity(e.target.value)}><option value="">انتخاب</option>{cities.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
   <label>میزکار <select value={desk} onChange={e=>setDesk(e.target.value)}><option value="mayor">شهردار</option><option value="deputy">معاون</option><option value="waste">پسماند</option></select></label>
   {desk==='waste'&&access?.access==='ADMIN'&&<label>سازمان <select value={org} onChange={e=>setOrg(e.target.value)}><option value="">انتخاب صریح</option>{access.eligibleOrganizations?.map(o=><option key={o.id} value={o.id}>{o.name_fa}</option>)}</select></label>}
   <button type="button" disabled={!base||busy} onClick={load}>بارگذاری پیشنهادهای مجاز</button>
  </div>
  {rows.length>0&&<div style={{display:'flex',flexDirection:'column',gap:8,marginTop:12}}>
   <label>پیشنهاد <select style={{maxWidth:'100%',minWidth:240}} value={selected} onChange={e=>{setSelected(e.target.value);setIncludeTemporal(false);}}><option value="">انتخاب کنید</option>{rows.map(r=><option key={r.candidateId} value={r.candidateId}>{r.title} — {gateLabel[r.gate]||r.gate}</option>)}</select></label>
   <label style={{fontSize:13}}><input type="checkbox" checked={includeTemporal} disabled={!eligible} onChange={e=>setIncludeTemporal(e.target.checked)}/> استعلام زنده Temporal نیز ضمیمه شود (صرفاً پس از تأیید معتبر)</label>
   <div><button type="button" disabled={!selected||busy} onClick={download}>دریافت پرونده JSON</button></div>
  </div>}
  {message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}
  <small>هش SHA-256 فقط برای کنترل تغییر Snapshot است؛ امضا یا تصدیق قانونی نیست.</small>
 </section>;
}
