import React,{useEffect,useRef,useState} from 'react';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UI={CREATE_UNIT:'ایجاد واحد غیرفعال',CREATE_SERVICE:'ایجاد خدمت غیرفعال',ACTIVATE_UNIT:'فعال‌سازی واحد',ACTIVATE_SERVICE:'فعال‌سازی خدمت'};
async function readJson(r){const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||`HTTP ${r.status}`);return d;}
export default function Dv32Q7OperationalCatalog({cityId,municipalityId,selectedCityId,activeCityId}){
 const incoming=[cityId,municipalityId,selectedCityId,activeCityId].find(x=>UUID.test(String(x||'')))||'';
 const [city,setCity]=useState(incoming),[cities,setCities]=useState([]),[data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [action,setAction]=useState('CREATE_UNIT');
 const [code,setCode]=useState(''),[nameFa,setNameFa]=useState(''),[kind,setKind]=useState('ORGANIZATION'),[parentUnitId,setParentUnitId]=useState('');
 const [moduleCode,setModuleCode]=useState('WASTE'),[description,setDescription]=useState(''),[slaHours,setSlaHours]=useState('24'),[outcomeMetric,setOutcomeMetric]=useState(''),[ownerUnitId,setOwnerUnitId]=useState('');
 const [unitId,setUnitId]=useState(''),[serviceId,setServiceId]=useState(''),[reason,setReason]=useState(''),[approvalReference,setApprovalReference]=useState('');
 const serial=useRef(0);
 useEffect(()=>{if(incoming)setCity(incoming);},[incoming]);
 useEffect(()=>{let active=true;fetch('/api/v1/municipalities',{credentials:'same-origin',cache:'no-store'}).then(readJson).then(d=>{if(active&&Array.isArray(d))setCities(d);}).catch(()=>{});return()=>{active=false;};},[]);
 const endpoint=UUID.test(city)?`/api/v1/cities/${encodeURIComponent(city)}/dv32q7-operational-catalog`:null;
 useEffect(()=>{serial.current++;setData(null);setError('');setBusy(false);},[endpoint]);
 async function refresh(){if(!endpoint)return;const seq=++serial.current;setBusy(true);setError('');setData(null);
  try{const d=await fetch(endpoint,{credentials:'same-origin',cache:'no-store'}).then(readJson);
   if(d.schema!=='RHF-DV32Q7-OPERATIONAL-CATALOG-v1'||d.cityId!==city||d.acceptance!=='NO_GO')throw Error('RESPONSE_SCOPE_INVALID');
   if(seq===serial.current)setData(d);
  }catch(e){if(seq===serial.current)setError(e.message);}finally{if(seq===serial.current)setBusy(false);}
 }
 async function submit(e){e.preventDefault();if(!endpoint||!data?.operatorCanChange||busy)return;
  if(!window.confirm('تأیید می‌کنید این اقدام، برخلاف سناریوهای ساختگی، جدول واقعی واحدها یا خدمات شهرداری را تغییر می‌دهد؟'))return;
  const common={action,approvalReference,reason,confirm:'I_APPROVE_REAL_CITY_CATALOG_CHANGE'};
  const body=action==='CREATE_UNIT'?{...common,code,nameFa,kind,parentUnitId:parentUnitId||null}:
   action==='CREATE_SERVICE'?{...common,code,nameFa,moduleCode,description,ownerUnitId,slaHours:Number(slaHours),outcomeMetric}:
   action==='ACTIVATE_UNIT'?{...common,unitId}:{...common,serviceId};
  const seq=++serial.current;setBusy(true);setError('');try{
   const out=await fetch(endpoint,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-RHF-DV32Q7-Intent':'EXPLICIT_REAL_CATALOG_ACTION'},body:JSON.stringify(body)}).then(readJson);
   if(out.schema!=='RHF-DV32Q7-ADMIN-ACTION-v1'||out.acceptance!=='NO_GO')throw Error('ACTION_RESPONSE_INVALID');
   const d=await fetch(endpoint,{credentials:'same-origin',cache:'no-store'}).then(readJson);
   if(seq===serial.current&&d.cityId===city){setData(d);setError('');setCode('');setNameFa('');}
  }catch(err){if(seq===serial.current)setError(err.message);}finally{if(seq===serial.current)setBusy(false);}
 }
 return <section dir="rtl" style={{border:'2px solid #2563eb',borderRadius:12,padding:18,margin:'18px 0',background:'#eff6ff',color:'#172554'}}>
  <h3>DV32Q.7 | ایجاد و فعال‌سازی کنترل‌شده واحدها و خدمات واقعی</h3>
  <p><strong>این بخش بر خلاف شبیه‌سازی، داده مرجع واقعی شهرداری را تغییر می‌دهد.</strong> هیچ داده‌ای به‌صورت خودکار ایجاد یا فعال نمی‌شود. ثبت اقدام نیازمند مدیر مجاز، شماره مرجع تصویب و تأیید صریح است؛ مرجع تصویب توسط سامانه مستقلاً راستی‌آزمایی نمی‌شود.</p>
  <label>شهرداری <select value={city} onChange={e=>setCity(e.target.value)}><option value="">انتخاب شهرداری</option>{cities.map(c=><option key={c.id} value={c.id}>{c.name||c.name_fa||c.id}</option>)}</select></label>{' '}
  <button type="button" disabled={!endpoint||busy} onClick={refresh}>دریافت وضعیت واقعی</button>
  {data&&<><p><strong>واحد فعال: {data.counts.activeUnits} | خدمت فعال: {data.counts.activeServices} | نگاشت پیش‌نویس مأموریت: {data.counts.draftMappedSlots}/17</strong></p>
   <p>تعداد کل واحدها: {data.units.length} | کل خدمات: {data.services.length} | پذیرش نهایی: NO_GO</p>
   <details><summary>نمایش فهرست واحدها و خدمات</summary><div style={{maxHeight:220,overflow:'auto'}}>
    <strong>واحدها</strong><ul>{data.units.map(x=><li key={x.id}>{x.code} — {x.name_fa} ({x.kind}) — {x.active?'فعال':'غیرفعال'} — {x.id}</li>)}</ul>
    <strong>خدمات</strong><ul>{data.services.map(x=><li key={x.id}>{x.code} — {x.name_fa} ({x.module_code}) — {x.active?'فعال':'غیرفعال'} — {x.id}</li>)}</ul>
   </div></details>
   {data.operatorCanChange&&<form onSubmit={submit} style={{marginTop:12,display:'grid',gap:8,maxWidth:760}}>
    <label>اقدام <select value={action} onChange={e=>setAction(e.target.value)}>{Object.entries(UI).map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>
    {(action==='CREATE_UNIT'||action==='CREATE_SERVICE')&&<><label>کد رسمی لاتین <input required maxLength={32} value={code} onChange={e=>setCode(e.target.value)}/></label>
      <label>نام مصوب <input required maxLength={120} value={nameFa} onChange={e=>setNameFa(e.target.value)}/></label></>}
    {action==='CREATE_UNIT'&&<><label>نوع سازمانی مطابق کدهای معتبر سامانه <input required value={kind} maxLength={40} onChange={e=>setKind(e.target.value)}/></label>
      <label>واحد بالادست (اختیاری) <select value={parentUnitId} onChange={e=>setParentUnitId(e.target.value)}><option value="">بدون واحد بالادست</option>{data.units.map(x=><option key={x.id} value={x.id}>{x.name_fa}</option>)}</select></label></>}
    {action==='CREATE_SERVICE'&&<><label>کد ماژول <input required value={moduleCode} maxLength={40} onChange={e=>setModuleCode(e.target.value)}/></label>
      <label>شرح خدمت <input required maxLength={500} value={description} onChange={e=>setDescription(e.target.value)}/></label>
      <label>واحد مالک <select required value={ownerUnitId} onChange={e=>setOwnerUnitId(e.target.value)}><option value="">انتخاب واحد</option>{data.units.map(x=><option key={x.id} value={x.id}>{x.name_fa}</option>)}</select></label>
      <label>SLA (ساعت) <input required type="number" min="1" max="8760" value={slaHours} onChange={e=>setSlaHours(e.target.value)}/></label>
      <label>شاخص نتیجه (تعریف، نه ادعای تحقق) <input required maxLength={120} value={outcomeMetric} onChange={e=>setOutcomeMetric(e.target.value)}/></label></>}
    {action==='ACTIVATE_UNIT'&&<label>واحد غیرفعال <select required value={unitId} onChange={e=>setUnitId(e.target.value)}><option value="">انتخاب</option>{data.units.filter(x=>!x.active).map(x=><option key={x.id} value={x.id}>{x.name_fa}</option>)}</select></label>}
    {action==='ACTIVATE_SERVICE'&&<label>خدمت غیرفعال <select required value={serviceId} onChange={e=>setServiceId(e.target.value)}><option value="">انتخاب</option>{data.services.filter(x=>!x.active).map(x=><option key={x.id} value={x.id}>{x.name_fa}</option>)}</select></label>}
    <label>شناسه یا شماره سند مصوب <input required minLength={8} maxLength={120} value={approvalReference} onChange={e=>setApprovalReference(e.target.value)}/></label>
    <label>توجیه ثبت اقدام <textarea required minLength={12} maxLength={250} rows={2} value={reason} onChange={e=>setReason(e.target.value)} /></label>
    <button type="submit" disabled={busy||!approvalReference||!reason}>{UI[action]} با تأیید انسانی</button>
   </form>}
  </>}
  {error&&<p role="alert" style={{color:'#991b1b'}}>{error}</p>}
  <small>ثبت مورد واقعی به‌تنهایی به معنی تأیید ۱۷ مأموریت رسمی، اجرای عملیات میدانی، تحقق ارزش شهری یا عبور از آزمون پذیرش نیست.</small>
 </section>;
}
