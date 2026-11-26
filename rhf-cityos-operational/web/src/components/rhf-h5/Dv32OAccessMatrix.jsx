import React,{useEffect,useMemo,useRef,useState} from 'react';
// DV32O checks ONLY the current authenticated user's effective READ access.
// Never impersonate roles; no POST, service account or database mutations.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const name={mayor:'شهردار',deputy:'معاون خدمات شهری',waste:'مدیرعامل سازمان پسماند'};
const status={ALLOWED:'مجاز در محدوده فعلی',DENIED:'دسترسی مجاز نیست',SELECT_ORGANIZATION:'انتخاب صریح سازمان لازم است',NOT_CHECKED:'بررسی نشده'};
async function read(uri){const r=await fetch(uri,{credentials:'same-origin',cache:'no-store'});const b=await r.json().catch(()=>({}));if(!r.ok)throw Error(b.error||`HTTP ${r.status}`);return b;}
export default function Dv32OAccessMatrix({cityId,municipalityId,selectedCityId,activeCityId}){
 const initial=[cityId,municipalityId,selectedCityId,activeCityId].find(x=>UUID.test(String(x||'')))||'';
 const [city,setCity]=useState(initial),[cities,setCities]=useState([]),[org,setOrg]=useState(''),[orgs,setOrgs]=useState([]);
 const [matrix,setMatrix]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const serial=useRef(0),bindingSerial=useRef(0),base=useMemo(()=>UUID.test(city)?`/api/v1/cities/${encodeURIComponent(city)}`:'',[city]);
 useEffect(()=>{if(initial)setCity(initial);},[initial]);
 useEffect(()=>{read('/api/v1/municipalities').then(x=>setCities(Array.isArray(x)?x:[])).catch(()=>{});},[]);
 useEffect(()=>{const n=++bindingSerial.current;++serial.current;setOrg('');setOrgs([]);setMatrix(null);setError('');
  if(base)read(`${base}/dv32g-org-bindings`).then(x=>{if(bindingSerial.current===n&&x.access==='ADMIN')setOrgs(Array.isArray(x.eligibleOrganizations)?x.eligibleOrganizations:[]);}).catch(()=>{});
 },[base]);
 useEffect(()=>{serial.current++;setMatrix(null);setError('');},[org]);
 async function run(){if(!base)return;const n=++serial.current;setBusy(true);setError('');setMatrix(null);
  try{const q=new URLSearchParams();if(UUID.test(org))q.set('orgId',org);
   const uri=`${base}/dv32o-access-matrix${q.size?'?'+q.toString():''}`;
   const x=await read(uri);if(n!==serial.current)return;
   if(x.schema!=='RHF-DV32O-CURRENT-IDENTITY-ACCESS-MATRIX-v1'||x.controls?.readOnly!==true||
      x.limits?.finalProductAcceptance!=='NOT_CERTIFIED'||!Array.isArray(x.rows)||x.rows.length!==3)throw Error('UNEXPECTED_ACCESS_REPORT');
   setMatrix(x);
  }catch(e){if(n===serial.current)setError(String(e.message));}finally{if(n===serial.current)setBusy(false);}
 }
 return <section dir="rtl" style={{border:'1px solid #94a3b8',borderRadius:12,padding:16,margin:'16px 0',background:'#fff',color:'#0f172a'}}>
  <h3>DV32O | ماتریس دسترسی واقعی سه میزکار</h3>
  <p style={{fontSize:13}}>کنترل فقط‌خواندنیِ قابلیت مشاهده و صف بررسی در هویت فعلی. هیچ نقشی جعل یا مجوز جدیدی صادر نمی‌شود. این گزارش جایگزین آزمون پذیرش با حساب‌های واقعی سه نقش نیست.</p>
  <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'end'}}>
   <label>شهرداری <select value={city} onChange={e=>setCity(e.target.value)}><option value="">انتخاب کنید</option>{cities.map(c=><option key={c.id} value={c.id}>{c.name||c.name_fa||c.id}</option>)}</select></label>
   {orgs.length>0&&<label>سازمان پسماند برای پیش‌نمایش مدیر <select value={org} onChange={e=>setOrg(e.target.value)}><option value="">انتخاب نشده</option>{orgs.map(o=><option key={o.id} value={o.id}>{o.name_fa||o.code||o.id}</option>)}</select></label>}
   <button type="button" onClick={run} disabled={!base||busy}>{busy?'در حال بررسی…':'اجرای ماتریس مجوز فعلی'}</button>
  </div>
  {matrix&&<div style={{marginTop:12}}>
   <p><b>نقش جاری:</b> {matrix.role} — <b>محدوده:</b> شهرداری انتخاب‌شده</p>
   <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><thead><tr>
    <th style={{textAlign:'right',padding:8,borderBottom:'1px solid #cbd5e1'}}>میزکار</th>
    <th style={{textAlign:'right',padding:8,borderBottom:'1px solid #cbd5e1'}}>کشف شواهد</th>
    <th style={{textAlign:'right',padding:8,borderBottom:'1px solid #cbd5e1'}}>صف بررسی</th>
    <th style={{textAlign:'right',padding:8,borderBottom:'1px solid #cbd5e1'}}>ثبت درخواست</th>
    <th style={{textAlign:'right',padding:8,borderBottom:'1px solid #cbd5e1'}}>اختیار بررسی مستقل</th>
   </tr></thead><tbody>{matrix.rows.map(r=><tr key={r.desk}>
    <td style={{padding:8,borderBottom:'1px solid #e2e8f0'}}>{name[r.desk]||r.desk}</td>
    <td style={{padding:8,borderBottom:'1px solid #e2e8f0'}}>{status[r.discovery]||'نامشخص'}</td>
    <td style={{padding:8,borderBottom:'1px solid #e2e8f0'}}>{status[r.reviewQueue]||'نامشخص'}</td>
    <td style={{padding:8,borderBottom:'1px solid #e2e8f0'}}>{r.canSubmitReview?'بله، با تأیید صریح':'خیر'}</td>
    <td style={{padding:8,borderBottom:'1px solid #e2e8f0'}}>{r.canDecideForOtherUser?'مشروط به عدم خودتأییدی':'خیر'}</td>
   </tr>)}</tbody></table></div>
   <p style={{fontSize:12}}>این بررسی فقط بر اساس درخواست‌های مجاز DV32H و DV32I انجام شده است؛ سایر APIها، چرخه کامل Temporal و حساب‌های کاربران دیگر بررسی نشده‌اند.</p>
   <p style={{fontSize:12}}><b>آزمون سرتاسری احرازشده:</b> اجرا نشده — <b>پذیرش نهایی محصول:</b> تأیید نشده</p>
  </div>}
  {error&&<p role="alert">{error}</p>}
  <small>محدوده سازمانی برای مدیرعامل پسماند تنها از انتساب فعال DV32G تعیین می‌شود؛ فیلتر سازمان نمی‌تواند انتساب وی را تغییر دهد.</small>
 </section>;
}
