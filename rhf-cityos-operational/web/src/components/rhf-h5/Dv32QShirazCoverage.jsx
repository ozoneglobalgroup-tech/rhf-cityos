import React,{useEffect,useMemo,useRef,useState} from 'react';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const cols={borderBottom:'1px solid #e2e8f0',padding:6,textAlign:'right',verticalAlign:'top'};
const safeJson=async r=>{const b=await r.json().catch(()=>({}));if(!r.ok)throw Error(b.error||`HTTP ${r.status}`);return b;};
export default function Dv32QShirazCoverage({cityId,municipalityId,selectedCityId,activeCityId}){
 const chosen=[cityId,municipalityId,selectedCityId,activeCityId].find(x=>UUID.test(String(x||'')))||'';
 const [city,setCity]=useState(chosen),[cities,setCities]=useState([]),[data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [slot,setSlot]=useState(''),[title,setTitle]=useState(''),[axis,setAxis]=useState(''),[unit,setUnit]=useState(''),[service,setService]=useState(''),[reason,setReason]=useState('');
 const seq=useRef(0);const base=useMemo(()=>UUID.test(city)?`/api/v1/cities/${encodeURIComponent(city)}`:'',[city]);
 useEffect(()=>{if(chosen)setCity(chosen);},[chosen]);
 useEffect(()=>{fetch('/api/v1/municipalities',{credentials:'same-origin',cache:'no-store'}).then(safeJson).then(x=>{if(Array.isArray(x))setCities(x);}).catch(()=>{});},[]);
 useEffect(()=>{seq.current++;setData(null);setError('');setSlot('');},[base]);
 async function load(){if(!base)return;const id=++seq.current;setBusy(true);setError('');setData(null);
  try{const result=await fetch(`${base}/dv32q-shiraz-coverage`,{credentials:'same-origin',cache:'no-store'}).then(safeJson);
    if(id===seq.current){if(result.schema!=='RHF-DV32Q-SHIRAZ-PILOT-COVERAGE-v1'||result.releaseAcceptance!=='NO_GO')throw Error('UNTRUSTED_CATALOG_RESPONSE');setData(result);}}
  catch(e){if(id===seq.current)setError(String(e.message));}finally{if(id===seq.current)setBusy(false);}
 }
 async function save(){if(!data||!data.permissions.canMapDraft||!base)return;setBusy(true);setError('');
  try{const body={action:'SAVE_MISSION_DRAFT',confirm:'MAP_DRAFT_ONLY_NO_OPERATIONAL_AUTHORITY',slot:Number(slot),titleFa:title,axisCode:axis,ownerUnitId:unit,serviceId:service,reason};
    const r=await fetch(`${base}/dv32q-shiraz-coverage`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-RHF-DV32Q-Intent':'EXPLICIT_DRAFT_CATALOG_MAPPING'},body:JSON.stringify(body)}).then(safeJson);
    if(!r.saved||r.operationalAssignment!==false)throw Error('UNTRUSTED_MAPPING_RESPONSE');setReason('');await load();
  }catch(e){setError(String(e.message));}finally{setBusy(false);}
 }
 const mapped=data?.missionSlots||[];
 const compatibleServices=(data?.serviceDefinitions||[]).filter(x=>!unit||!x.owner_unit_id||x.owner_unit_id===unit);
 return <section dir="rtl" style={{padding:16,border:'1px solid #94a3b8',borderRadius:12,margin:'18px 0',background:'#fff',color:'#0f172a'}}>
  <h3>DV32Q | پیکربندی محدوده و مأموریت‌های پایلوت شیراز</h3>
  <p style={{fontSize:13}}>فقط داده‌های مرجع پیش‌نویس: ۱۱ منطقه و ناحیه ویژه باغات، پنج محور راهبردی و ۱۷ جایگاه مأموریت. عناوین مأموریت‌های نهایی و محدوده جغرافیایی هنوز تأیید نشده‌اند.</p>
  <div style={{display:'flex',gap:12,alignItems:'end',flexWrap:'wrap'}}>
   <label>شهرداری <select value={city} onChange={e=>setCity(e.target.value)}><option value="">انتخاب کنید</option>{cities.map(c=><option key={c.id} value={c.id}>{c.name||c.name_fa||c.id}</option>)}</select></label>
   <button type="button" disabled={!base||busy} onClick={load}>بررسی پیکربندی واقعی</button>
  </div>
  {data&&<div>
   <p>ردیف محدوده: {data.metrics.territoryDraftRows} | محور مرجع: {data.metrics.axesReferenceRows} | جایگاه مأموریت: {data.metrics.missionSlotRows} | نگاشت پیش‌نویس: {data.metrics.draftMappedSlots}/۱۷</p>
   <strong>وضعیت پذیرش: NO-GO — این فهرست مجوز اجرای عملیاتی نیست.</strong>
   <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><thead><tr><th style={cols}>کد محدوده</th><th style={cols}>نام موقت</th><th style={cols}>نوع</th><th style={cols}>اعتبار</th></tr></thead><tbody>{data.draftTerritoryInventory.map(x=><tr key={x.code}><td style={cols}>{x.code}</td><td style={cols}>{x.name_fa}</td><td style={cols}>{x.kind}</td><td style={cols}>تأیید نشده</td></tr>)}</tbody></table></div>
   <h4>۱۷ مأموریت مرجع (تا زمان نگاشت، نام رسمی فرض نمی‌شود)</h4>
   <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><thead><tr><th style={cols}>شماره</th><th style={cols}>عنوان</th><th style={cols}>محور</th><th style={cols}>وضعیت</th></tr></thead><tbody>{mapped.map(x=><tr key={x.slot}><td style={cols}>{x.slot}</td><td style={cols}>{x.title_fa||'نیازمند معرفی عنوان مرجع'}</td><td style={cols}>{x.axis_code||'نامشخص'}</td><td style={cols}>{x.mapping_status}</td></tr>)}</tbody></table></div>
   {data.permissions.canMapDraft&&<div style={{marginTop:12,display:'grid',gap:8,maxWidth:700}}>
    <h4>ثبت نگاشت پیش‌نویس توسط مدیر شهرداری</h4>
    <label>جایگاه مأموریت <select value={slot} onChange={e=>setSlot(e.target.value)}><option value="">انتخاب</option>{mapped.map(x=><option key={x.slot} value={x.slot}>{x.slot}</option>)}</select></label>
    <label>عنوان مأموریت مطابق سند مرجع <input style={{width:'100%'}} value={title} onChange={e=>setTitle(e.target.value)} maxLength={160}/></label>
    <label>محور <select value={axis} onChange={e=>setAxis(e.target.value)}><option value="">انتخاب</option>{data.draftAxes.map(x=><option key={x.code} value={x.code}>{x.name_fa}</option>)}</select></label>
    <label>واحد مسئول <select value={unit} onChange={e=>{setUnit(e.target.value);setService('');}}><option value="">انتخاب</option>{data.ownerUnits.map(x=><option key={x.id} value={x.id}>{x.name_fa}</option>)}</select></label>
    <label>خدمت عملیاتی واقعی <select value={service} onChange={e=>setService(e.target.value)}><option value="">انتخاب</option>{compatibleServices.map(x=><option key={x.id} value={x.id}>{x.name_fa} ({x.code})</option>)}</select></label>
    <label>مبنای ثبت / مستند نگاشت <textarea style={{width:'100%'}} value={reason} onChange={e=>setReason(e.target.value)} maxLength={1000}/></label>
    <button type="button" disabled={busy||!slot||title.trim().length<8||!axis||!unit||!service||reason.trim().length<16} onClick={save}>ثبت پیش‌نویس بدون مجوز اجرا</button>
   </div>}
  </div>}
  {error&&<p role="alert">{error}</p>}
  <small>هیچ پرونده شهروندی، مأموریت میدانی، رزرو ظرفیت، انتساب مدیر یا ادعای ارزش تأییدشده توسط این فرم ایجاد نمی‌شود.</small>
 </section>;
}
