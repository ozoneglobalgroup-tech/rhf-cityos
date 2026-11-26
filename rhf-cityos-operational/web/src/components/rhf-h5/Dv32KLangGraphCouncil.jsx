import React,{useEffect,useMemo,useState} from 'react';
// Read-only DV32K panel inside existing RHF City OS. No action buttons or synthetic value claims.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const style={border:'1px solid #cbd5e1',borderRadius:12,padding:16,margin:'16px 0',background:'#fff',color:'#0f172a'};
async function get(url,{signal}={}){const response=await fetch(url,{credentials:'same-origin',signal});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||`HTTP ${response.status}`);return data;}
export default function Dv32KLangGraphCouncil({cityId,municipalityId,selectedCityId,activeCityId}){
 const initial=[cityId,municipalityId,selectedCityId,activeCityId].find(x=>uuid.test(String(x||'')))||'';
 const [city,setCity]=useState(initial),[desk,setDesk]=useState('deputy'),[org,setOrg]=useState('');
 const [cities,setCities]=useState([]),[access,setAccess]=useState(null),[result,setResult]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 useEffect(()=>{if(initial)setCity(initial);},[initial]);
 useEffect(()=>{const c=new AbortController();get('/api/v1/municipalities',{signal:c.signal}).then(x=>setCities(Array.isArray(x)?x:[])).catch(()=>{});return()=>c.abort();},[]);
 const base=useMemo(()=>uuid.test(city)?`/api/v1/cities/${encodeURIComponent(city)}`:'',[city]);
 useEffect(()=>{setResult(null);setAccess(null);setOrg('');if(!base)return;const c=new AbortController();get(`${base}/dv32g-org-bindings`,{signal:c.signal}).then(setAccess).catch(()=>{});return()=>c.abort();},[base]);
 useEffect(()=>{setResult(null);setError('');},[desk,org]);
 async function run(){if(!base)return;setLoading(true);setError('');setResult(null);try{
  const p=new URLSearchParams({desk});if(desk==='waste'&&access?.access==='ADMIN'&&uuid.test(org))p.set('orgId',org);
  const data=await get(`${base}/dv32k-langgraph-brief?${p.toString()}`);setResult(data);
 }catch(e){setError(e.message);}finally{setLoading(false);}}
 return <section dir="rtl" style={style} aria-label="شورای تحلیل چندایجنتی DV32K">
  <h3>DV32K | شورای تحلیل شواهد با LangGraph</h3>
  <p style={{fontSize:13}}>چهار عامل تخصصیِ مبتنی بر قواعد؛ فقط تحلیل داده‌های مجاز و قابل ردیابی. بدون مدل زبانی، اعزام یا تأیید خودکار ارزش شهری.</p>
  <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'end'}}>
    <label>شهرداری <select value={city} onChange={e=>setCity(e.target.value)}><option value="">انتخاب شهرداری</option>{cities.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
    <label>میزکار <select value={desk} onChange={e=>{setDesk(e.target.value);setOrg('');}}><option value="mayor">شهردار</option><option value="deputy">معاون خدمات شهری</option><option value="waste">مدیرعامل پسماند</option></select></label>
    {desk==='waste'&&access?.access==='ADMIN'&&<label>سازمان <select value={org} onChange={e=>setOrg(e.target.value)}><option value="">انتخاب صریح</option>{access.eligibleOrganizations?.map(o=><option key={o.id} value={o.id}>{o.name_fa}</option>)}</select></label>}
    <button type="button" disabled={!base||loading} onClick={run}>{loading?'در حال تحلیل...':'اجرای تحلیل چندایجنتی'}</button>
  </div>
  {error&&<p role="alert" style={{color:'#b91c1c'}}>{error}</p>}
  {result?.needsOrganizationSelection&&<p>برای مشاهده داده سازمان باید سازمان مجاز انتخاب یا انتساب داده شود.</p>}
  {result?.recommendations?.map(x=><article key={x.id} style={{...style,background:'#f8fafc',margin:'10px 0'}}>
     <strong>{x.id}</strong><p>اولویت ثبت‌شده: {x.priority} | اقدام بعدی: بازبینی مستقل شواهد</p>
     <p style={{fontSize:12}}>نوع تحلیل: {x.reviewCategory}</p>
     <ul>{x.sourceMetrics?.map((m,i)=><li key={i}>{m.metric}: {m.count} ({m.source})</li>)}</ul>
     <small>خلق ارزش تحقق‌یافته: تأیید نشده | مجوز اجرا: صادر نشده</small>
  </article>)}
  <small>داده‌های تجمیعی فقط نشانه بررسی هستند؛ تأیید DV32I و پیگیری DV32J به‌صورت مستقل باقی می‌مانند.</small>
 </section>;
}
