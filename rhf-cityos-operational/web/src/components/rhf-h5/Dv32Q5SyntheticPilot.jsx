import React,{useEffect,useRef,useState} from 'react';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const labels={NEW:'دریافت ساختگی',TRIAGED:'دسته‌بندی ساختگی',PLANNING:'برنامه‌ریزی ساختگی',ACK_PENDING:'در انتظار تأیید فرضی',SIMULATED_CLOSE:'اختتام شبیه‌سازی'};
const card={background:'#fffbeb',border:'2px solid #b45309',borderRadius:12,padding:18,color:'#451a03',margin:'18px 0'};
async function getJson(r){const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||`HTTP ${r.status}`);return j;}
export default function Dv32Q5SyntheticPilot({cityId,municipalityId,selectedCityId,activeCityId}){
 const incoming=[cityId,municipalityId,selectedCityId,activeCityId].find(x=>UUID.test(String(x||'')))||'';
 const [city,setCity]=useState(incoming),[cities,setCities]=useState([]),[data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const serial=useRef(0);useEffect(()=>{if(incoming)setCity(incoming);},[incoming]);
 useEffect(()=>{let active=true;fetch('/api/v1/municipalities',{credentials:'same-origin',cache:'no-store'}).then(getJson).then(x=>{if(active&&Array.isArray(x))setCities(x);}).catch(()=>{});return()=>{active=false;};},[]);
 const endpoint=UUID.test(city)?`/api/v1/cities/${encodeURIComponent(city)}/dv32q5-synthetic-pilot`:null;
 useEffect(()=>{serial.current++;setData(null);setError('');setBusy(false);},[endpoint]);
 async function reload(){if(!endpoint)return;const token=++serial.current;setBusy(true);setData(null);setError('');try{const x=await fetch(endpoint,{credentials:'same-origin',cache:'no-store'}).then(getJson);
  if(x.schema!=='RHF-DV32Q5-SYNTHETIC-PILOT-v1'||x.cityId!==city||x.dataClass!=='SIMULATION_ONLY_NEVER_OPERATIONAL'||x.acceptance!=='NO_GO'||x.operationalAuthorization!==false)throw Error('INVALID_SIMULATION_SCOPE');
  if(token===serial.current)setData(x);
 }catch(e){if(token===serial.current)setError(e.message);}finally{if(token===serial.current)setBusy(false);}}
 return <section dir="rtl" style={card}>
  <h3>DV32Q.5 | سناریوهای ایزوله آزمایشی شیراز</h3>
  <p><strong>فقط شبیه‌سازی، نه داده واقعی شهرداری.</strong> اطلاعات این پنل هیچ پرونده، مأموریت، مدیر، ناوگان، تأییدیه یا ارزش شهری واقعی ایجاد نمی‌کند.</p>
  <label>شهرداری <select value={city} onChange={e=>setCity(e.target.value)}><option value="">انتخاب</option>{cities.map(c=><option key={c.id} value={c.id}>{c.name||c.name_fa||c.id}</option>)}</select></label>{' '}
  <button type="button" disabled={!endpoint||busy} onClick={reload}>نمایش سناریوهای ساختگی</button>
  {data&&<div>
   <p><strong>{data.syntheticCases} سناریوی ساختگی</strong> در {data.syntheticTerritories} محدوده و {data.syntheticMissionSlotReferences} جایگاه مأموریتِ بدون تأیید رسمی.</p>
   <p><strong>داده واقعی:</strong> {data.realCaseCount} پرونده، {data.realActiveServices} خدمت فعال، {data.realActiveUnits} واحد فعال، {data.officialMappedSlots}/17 نگاشت رسمی پیش‌نویس.</p>
   <p>وضعیت‌های شبیه‌سازی: {Object.entries(data.simulatedStates).map(([k,v])=>`${labels[k]||k}: ${v}`).join(' | ')}</p>
   <div style={{maxHeight:340,overflow:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><thead><tr><th>سناریو</th><th>محدوده</th><th>جایگاه</th><th>حوزه آزمایشی</th><th>مرحله فرضی</th></tr></thead><tbody>{data.rows.map(x=><tr key={x.scenario_code}><td>{x.scenario_code}</td><td>{x.territory_code}</td><td>{x.mission_slot}</td><td>{x.demo_organization}</td><td>{labels[x.simulation_state]}</td></tr>)}</tbody></table></div>
   <small>تمام داده‌ها synthetic هستند، ارزش شهری تأیید نشده است، هیچ مجوز اجرا صادر نشده و تصمیم انتشار NO_GO باقی می‌ماند.</small>
  </div>}
  {error&&<p role="alert">{error}</p>}
 </section>;
}
