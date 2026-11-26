import React,{useEffect,useRef,useState} from 'react';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const card={border:'1px solid #cbd5e1',borderRadius:12,background:'#fff',color:'#0f172a',padding:16,margin:'18px 0'};
const names={EXISTING_DRAFT_LINK_REVIEW:'دارای پیوند پیش‌نویس؛ نیازمند بازبینی اعتبار',CASE_WITHOUT_SERVICE:'پرونده فاقد خدمت مشخص',SERVICE_NOT_MAPPED_TO_MISSION:'خدمت بدون مأموریت پیش‌نویس نگاشت‌شده',OWNER_UNIT_MISMATCH:'عدم تطبیق واحد سازمانی',AMBIGUOUS_MISSION_MAPPING:'چند مأموریت ممکن؛ نیازمند تصمیم انسانی',ELIGIBLE_FOR_EXPLICIT_MANUAL_LINK:'آماده بررسی برای پیوند دستی'};
async function getJson(r){const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||`HTTP ${r.status}`);return j;}
export default function Dv32Q4MappingWorklist({cityId,municipalityId,selectedCityId,activeCityId}){
 const incoming=[cityId,municipalityId,selectedCityId,activeCityId].find(x=>UUID.test(String(x||'')))||'';
 const [city,setCity]=useState(incoming),[cities,setCities]=useState([]),[data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');const serial=useRef(0);
 useEffect(()=>{if(incoming)setCity(incoming);},[incoming]);
 useEffect(()=>{let active=true;fetch('/api/v1/municipalities',{credentials:'same-origin',cache:'no-store'}).then(getJson).then(x=>{if(active&&Array.isArray(x))setCities(x);}).catch(()=>{});return()=>{active=false;};},[]);
 const endpoint=UUID.test(city)?`/api/v1/cities/${encodeURIComponent(city)}/dv32q4-mapping-worklist`:null;
 useEffect(()=>{serial.current++;setData(null);setError('');setBusy(false);},[endpoint]);
 async function reload(){if(!endpoint)return;const token=++serial.current;setBusy(true);setError('');setData(null);try{
  const x=await fetch(endpoint,{credentials:'same-origin',cache:'no-store'}).then(getJson);
  if(x.schema!=='RHF-DV32Q4-MAPPING-WORKLIST-v1'||x.cityId!==city||x.acceptance!=='NO_GO'||x.autoMapping!==false||x.fieldDispatch!==false)throw Error('INVALID_PILOT_SCOPE');
  if(token===serial.current)setData(x);
 }catch(e){if(token===serial.current)setError(e.message);}finally{if(token===serial.current)setBusy(false);}}
 return <section dir="rtl" style={card}>
  <h3>DV32Q.4 | فهرست واقعی پرونده‌های قابل اتصال به مأموریت</h3>
  <p>این بخش فقط پرونده‌های موجود را با نگاشت‌های معتبرِ پیش‌نویس مطابقت می‌دهد. هیچ تأیید، اصلاح پرونده، اعزام یا شروع گردش‌کار انجام نمی‌شود.</p>
  <label>شهرداری <select value={city} onChange={e=>setCity(e.target.value)}><option value="">انتخاب</option>{cities.map(c=><option key={c.id} value={c.id}>{c.name||c.name_fa||c.id}</option>)}</select></label>{' '}
  <button type="button" disabled={!endpoint||busy} onClick={reload}>تحلیل زنده پرونده‌های موجود</button>
  {data&&<div>
   <p><strong>تعداد پرونده: {data.counts.total}</strong> | محدوده‌های پیش‌نویس: {data.areas.district} منطقه و {data.areas.gardens} باغات | جایگاه‌های مأموریت: {data.slots.length}/17</p>
   <table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><th style={{textAlign:'right'}}>طبقه‌بندی</th><th>تعداد</th></tr></thead><tbody>{Object.entries(names).map(([code,label])=><tr key={code}><td style={{borderTop:'1px solid #e2e8f0',padding:6}}>{label}</td><td style={{textAlign:'center'}}>{data.counts[code]}</td></tr>)}</tbody></table>
   <h4>خدمت‌های قابل بررسی برای نگاشت مأموریت</h4>
   <div style={{maxHeight:220,overflow:'auto'}}>{data.services.map(s=><p key={s.id} style={{fontSize:13}}>{s.name_fa} ({s.code}) — {s.case_count} پرونده — {s.mapped?'دارای نگاشت پیش‌نویس':'فاقد نگاشت مأموریت'}</p>)}</div>
   <h4>پرونده‌های دارای تنها یک نگاشت ممکن</h4>
   {data.candidates.length===0?<p>هنوز هیچ پرونده‌ای در این گروه نیست. ابتدا در DV32Q.1 نگاشت مأموریت به خدمت فعال انجام شود.</p>:<div style={{maxHeight:240,overflow:'auto'}}>{data.candidates.map(x=><p key={x.case_id} style={{fontSize:13}}>پرونده {x.case_id.slice(0,8)} — مأموریت {x.mission_slot} — {x.module_code} — {x.status}</p>)}</div>}
   {data.limitedCandidates&&<p>فقط ۱۰۰ مورد نخست نمایش داده شده؛ شمارش کل مستقل و کامل است.</p>}
   <small>برای ثبت هر پیوند، مدیر مجاز باید از پنل DV32Q.3 اقدام و توجیه را ثبت کند. فهرست بالا مجوز خودکار محسوب نمی‌شود. وضعیت انتشار: NO_GO.</small>
  </div>}
  {error&&<p role="alert">{error}</p>}
 </section>;
}
