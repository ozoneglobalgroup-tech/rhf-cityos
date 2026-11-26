import React,{useEffect,useRef,useState} from 'react';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const stages={NEW:'دریافت آزمایشی',TRIAGED:'ارزیابی آزمایشی',PLANNING:'برنامه‌ریزی آزمایشی',ACK_PENDING:'تأیید فرضی',SIMULATED_CLOSE:'اختتام شبیه‌سازی'};
async function json(r){const b=await r.json().catch(()=>({}));if(!r.ok)throw Error(b.error||`HTTP ${r.status}`);return b;}
export default function Dv32Q6SyntheticLifecycle({cityId,municipalityId,selectedCityId,activeCityId}){
 const incoming=[cityId,municipalityId,selectedCityId,activeCityId].find(x=>UUID.test(String(x||'')))||'';
 const [city,setCity]=useState(incoming),[cities,setCities]=useState([]),[data,setData]=useState(null),[busy,setBusy]=useState(false),[reason,setReason]=useState('تمرین ثبت تصمیم انسانی در پایلوت مصنوعی'),[error,setError]=useState('');
 const serial=useRef(0);
 useEffect(()=>{if(incoming)setCity(incoming);},[incoming]);
 useEffect(()=>{let on=true;fetch('/api/v1/municipalities',{credentials:'same-origin',cache:'no-store'}).then(json).then(x=>{if(on&&Array.isArray(x))setCities(x);}).catch(()=>{});return()=>{on=false;};},[]);
 const endpoint=UUID.test(city)?`/api/v1/cities/${encodeURIComponent(city)}/dv32q6-synthetic-lifecycle`:null;
 useEffect(()=>{serial.current++;setData(null);setError('');setBusy(false);},[endpoint]);
 async function load(){if(!endpoint)return;const k=++serial.current;setBusy(true);setError('');setData(null);
  try{const x=await fetch(endpoint,{credentials:'same-origin',cache:'no-store'}).then(json);
   if(x.schema!=='RHF-DV32Q6-SIMULATED-LIFECYCLE-v1'||x.cityId!==city||x.acceptance!=='NO_GO'||x.operationalAuthorization!==false)throw Error('INVALID_SYNTHETIC_SCOPE');
   if(k===serial.current)setData(x);
  }catch(e){if(k===serial.current)setError(e.message);}finally{if(k===serial.current)setBusy(false);}
 }
 async function advance(row){if(!endpoint||busy||row.version>=4)return;
  if(!window.confirm(`صرفاً در محیط ساختگی: انتقال ${row.scenarioCode} به مرحله بعد؟`))return;
  const k=++serial.current;setBusy(true);setError('');try{
   const result=await fetch(endpoint,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-RHF-DV32Q6-Intent':'EXPLICIT_SYNTHETIC_STEP_ONLY'},body:JSON.stringify({scenarioCode:row.scenarioCode,expectedVersion:row.version,reason,confirm:'SIMULATION_ONLY_NO_FIELD_OPERATION'})}).then(json);
   if(result.schema!=='RHF-DV32Q6-SIMULATED-ACTION-v1'||result.isSynthetic!==true||result.acceptance!=='NO_GO')throw Error('INVALID_SIM_ACTION');
   const x=await fetch(endpoint,{credentials:'same-origin',cache:'no-store'}).then(json);
   if(k===serial.current&&x.cityId===city&&x.acceptance==='NO_GO')setData(x);
  }catch(e){if(k===serial.current)setError(e.message);}finally{if(k===serial.current)setBusy(false);}
 }
 return <section dir="rtl" style={{background:'#fff7ed',border:'2px solid #c2410c',borderRadius:12,padding:18,margin:'18px 0',color:'#431407'}}>
  <h3>DV32Q.6 | چرخه تمرینی ۳۴ سناریو — فقط شبیه‌سازی</h3>
  <p><strong>هیچ مرحله‌ای به مأموریت، پرونده، مجوز انسانی واقعی یا Temporal منتقل نمی‌شود.</strong> رویدادها صرفاً در جدول ایزوله تمرینی ثبت می‌شوند.</p>
  <label>شهرداری <select value={city} onChange={e=>setCity(e.target.value)}><option value="">انتخاب</option>{cities.map(c=><option key={c.id} value={c.id}>{c.name||c.name_fa||c.id}</option>)}</select></label>{' '}
  <button type="button" disabled={!endpoint||busy} onClick={load}>بازخوانی چرخه‌های تمرینی</button>
  <label style={{display:'block',marginTop:10}}>علت اقدام تمرینی <input style={{width:'min(90%,500px)'}} maxLength={160} value={reason} onChange={e=>setReason(e.target.value)} /></label>
  {data&&<><p>رویدادهای ثبت‌شده: <b>{data.trainingEvents}</b> | پرونده واقعی: {data.realCaseCount} | خدمات واقعی فعال: {data.realActiveServices} | واحد واقعی فعال: {data.realActiveUnits}</p>
   <div style={{maxHeight:410,overflow:'auto'}}><table style={{width:'100%',fontSize:13}}><thead><tr><th>سناریو</th><th>حوزه</th><th>محدوده</th><th>مرحله تمرینی</th><th>اقدام</th></tr></thead><tbody>{data.scenarios.map(s=><tr key={s.scenarioCode}>
    <td>{s.scenarioCode}</td><td>{s.demoOrganization}</td><td>{s.territoryCode}</td><td>{stages[s.rehearsalState]} ({s.version}/4)</td>
    <td><button type="button" disabled={busy||s.version>=4} onClick={()=>advance(s)}>ثبت انتقال تمرینی</button></td>
   </tr>)}</tbody></table></div><small>وضعیت انتشار NO_GO؛ هیچ خروجی این تمرین، شواهد ارزش شهری یا UAT احرازشده محسوب نمی‌شود.</small></>}
  {error&&<p role="alert">{error}</p>}
 </section>;
}
