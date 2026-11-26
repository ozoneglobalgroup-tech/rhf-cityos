import React,{useEffect,useRef,useState} from 'react';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const frame={border:'1px solid #cbd5e1',padding:16,borderRadius:12,margin:'18px 0',background:'#fff',color:'#0f172a'};
async function json(r){const x=await r.json().catch(()=>({}));if(!r.ok)throw Error(x.error||`HTTP ${r.status}`);return x;}
export default function Dv32Q3MissionCaseTrace({cityId,municipalityId,selectedCityId,activeCityId}){
 const incoming=[cityId,municipalityId,selectedCityId,activeCityId].find(x=>UUID.test(String(x||'')))||'';
 const [city,setCity]=useState(incoming),[cities,setCities]=useState([]),[data,setData]=useState(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[selected,setSelected]=useState(''),[slot,setSlot]=useState(''),[reason,setReason]=useState('');const serial=useRef(0);
 useEffect(()=>{if(incoming)setCity(incoming);},[incoming]);
 useEffect(()=>{fetch('/api/v1/municipalities',{credentials:'same-origin',cache:'no-store'}).then(json).then(x=>{if(Array.isArray(x))setCities(x);}).catch(()=>{});},[]);
 const endpoint=UUID.test(city)?`/api/v1/cities/${encodeURIComponent(city)}/dv32q3-mission-case-trace`:null;
 useEffect(()=>{serial.current++;setData(null);setSelected('');setSlot('');setError('');},[endpoint]);
 async function reload(){if(!endpoint)return;const id=++serial.current;setBusy(true);setError('');setData(null);try{
  const x=await fetch(endpoint,{credentials:'same-origin',cache:'no-store'}).then(json);
  if(x.schema!=='RHF-DV32Q3-MISSION-CASE-TRACE-v1'||x.release!=='NO_GO'||x.fieldDispatch!==false)throw Error('INVALID_SCOPED_RESULT');
  if(id===serial.current)setData(x);
 }catch(e){if(id===serial.current)setError(String(e.message));}finally{if(id===serial.current)setBusy(false);}}
 async function link(){if(!endpoint||!data?.canLink||!selected||!slot||reason.trim().length<20)return;
  setBusy(true);setError('');try{const r=await fetch(endpoint,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-RHF-DV32Q3-Intent':'EXPLICIT_CASE_MISSION_DRAFT_LINK'},body:JSON.stringify({action:'LINK_EXISTING_CASE_TO_MISSION_DRAFT',confirm:'NO_CASE_OR_MISSION_MUTATION',caseId:selected,slot:Number(slot),reason})}).then(json);
   if(r.caseUpdated!==false||r.fieldDispatch!==false||r.resourceAllocated!==false)throw Error('INVALID_MUTATION_RESPONSE');
   setSelected('');setSlot('');setReason('');await reload();
  }catch(e){setError(String(e.message));}finally{setBusy(false);}}
 return <section dir="rtl" style={frame}>
  <h3>DV32Q.3 | ردیابی پرونده واقعی تا مأموریت پیش‌نویس</h3>
  <p style={{fontSize:13}}>اتصال فقط با تطبیق شناسه خدمت و واحد سازمانی. این پیوند مجوز عملیات، اعزام، تخصیص منابع یا گواهی تحقق ارزش شهری نیست.</p>
  <label>شهرداری <select value={city} onChange={e=>setCity(e.target.value)}><option value="">انتخاب</option>{cities.map(x=><option key={x.id} value={x.id}>{x.name||x.name_fa||x.id}</option>)}</select></label>{' '}
  <button type="button" disabled={!endpoint||busy} onClick={reload}>استخراج ردیابی واقعی</button>
  {data&&<div><p><b>پرونده‌ها:</b> {data.count.existingCases} | <b>پیوند به مأموریت پیش‌نویس:</b> {data.count.linkedMissionDraft} | <b>پیوند معتبر با نگاشت جاری:</b> {data.count.currentMatchingDraftLinks} | <b>نیازمند بازبینی:</b> {data.count.staleDraftLinks} | <b>بدون پیوند:</b> {data.count.unlinkedMissionDraft} | <b>جایگاه مأموریت نگاشت‌شده:</b> {data.count.mappedDraftMissionSlots}/17</p>
   <p>پیوندهای محدوده پیش‌نویس: {data.count.provisionalTerritoryLinks} | <strong>وضعیت انتشار: NO_GO</strong></p>
   {data.slots.length===0&&<p>ابتدا عنوان معتبر مأموریت و تطبیق آن با یک خدمت فعال، توسط مدیر شهرداری در DV32Q.1 ثبت شود.</p>}
   {data.canLink&&<div style={{display:'grid',gap:8,maxWidth:680}}><h4>ثبت ارتباط تحت تأیید مستقیم مدیر</h4>
    <label>پرونده دارای خدمت واقعی <select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">انتخاب</option>{data.cases.map(c=><option value={c.id} key={c.id}>{c.id.slice(0,8)} | {c.module_code} | {c.status}</option>)}</select></label>
    {data.casesTruncated&&<small>فقط ۵۰ پرونده آخر قابل انتخاب‌اند؛ آمار کل دقیق است.</small>}
    <label>مأموریت پیش‌نویس <select value={slot} onChange={e=>setSlot(e.target.value)}><option value="">انتخاب</option>{data.slots.map(s=><option key={s.slot} value={s.slot}>جایگاه {s.slot} | {s.title_fa}</option>)}</select></label>
    <label>توجیه ارتباط (حداقل ۲۰ نویسه) <textarea value={reason} maxLength={1000} onChange={e=>setReason(e.target.value)} style={{width:'100%'}}/></label>
    <button type="button" onClick={link} disabled={busy||!selected||!slot||reason.trim().length<20}>ثبت پیوند فقط‌خواندنیِ عملیاتی</button>
   </div>}
   <small>هیچ داده خام شهروند، متن پرونده یا هویت ثبت‌کننده در فهرست نمایش داده نمی‌شود. پیوند ثبت‌شده در یک جدول مستقل ذخیره می‌شود و پرونده اصلی تغییر نمی‌کند.</small>
  </div>}
  {error&&<p role="alert">{error}</p>}
 </section>;
}
