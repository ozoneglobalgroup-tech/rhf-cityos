import React,{useEffect,useMemo,useRef,useState} from 'react';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const style={border:'1px solid #cbd5e1',padding:16,borderRadius:12,margin:'18px 0',background:'#fff',color:'#0f172a'};
async function loadJSON(res){const data=await res.json().catch(()=>({}));if(!res.ok)throw Error(data.error||`HTTP ${res.status}`);return data;}
export default function Dv32Q2CaseTerritory({cityId,municipalityId,selectedCityId,activeCityId}){
 const incoming=[cityId,municipalityId,selectedCityId,activeCityId].find(x=>UUID.test(String(x||'')))||'';
 const [city,setCity]=useState(incoming),[cities,setCities]=useState([]),[data,setData]=useState(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[selected,setSelected]=useState(''),[territory,setTerritory]=useState(''),[reason,setReason]=useState('');
 const serial=useRef(0);
 useEffect(()=>{if(incoming)setCity(incoming);},[incoming]);
 useEffect(()=>{fetch('/api/v1/municipalities',{credentials:'same-origin',cache:'no-store'}).then(loadJSON).then(x=>{if(Array.isArray(x))setCities(x);}).catch(()=>{});},[]);
 const base=useMemo(()=>UUID.test(city)?`/api/v1/cities/${encodeURIComponent(city)}/dv32q2-territory-cases`:null,[city]);
 useEffect(()=>{serial.current++;setData(null);setSelected('');setTerritory('');setError('');},[base]);
 async function reload(){if(!base)return;const id=++serial.current;setBusy(true);setError('');setData(null);
  try{const d=await fetch(base,{credentials:'same-origin',cache:'no-store'}).then(loadJSON);
   if(d.schema!=='RHF-DV32Q2-CASE-TERRITORY-v1'||d.releaseAcceptance!=='NO_GO'||d.source!=='LIVE_SCOPED_SERVICE_CASES')throw Error('UNEXPECTED_SCOPED_RESPONSE');
   if(id===serial.current)setData(d);
  }catch(e){if(id===serial.current)setError(String(e.message));}finally{if(id===serial.current)setBusy(false);}
 }
 async function link(){if(!base||!data?.canLinkDraft||!selected||!territory||reason.trim().length<20)return;
  setBusy(true);setError('');try{
   const body={action:'CREATE_DRAFT_TERRITORY_LINK',confirm:'NO_CASE_MUTATION_DRAFT_TAG_ONLY',caseId:selected,territoryCode:territory,reason};
   const r=await fetch(base,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-RHF-DV32Q2-Intent':'EXPLICIT_PILOT_CASE_TERRITORY_LINK'},body:JSON.stringify(body)}).then(loadJSON);
   if(r.serviceCaseUpdated!==false||r.fieldMissionChanged!==false||r.dispatchCreated!==false)throw Error('UNEXPECTED_MUTATION_RESPONSE');
   setSelected('');setTerritory('');setReason('');await reload();
  }catch(e){setError(String(e.message));}finally{setBusy(false);}
 }
 const dist=data?.distribution||[];const distMap=Object.fromEntries(dist.map(x=>[x.territory_code,x.count]));
 return <section dir="rtl" style={style}>
  <h3>DV32Q.2 | برچسب محدوده برای پرونده‌های موجود</h3>
  <p style={{fontSize:13}}>فقط پیوند پیش‌نویس پرونده واقعی خدمات شهری به محدوده موقت شیراز. هیچ مختصات یا موقعیت جغرافیایی تأیید نمی‌شود و وضعیت پرونده، مأموریت، نیرو و منابع تغییر نمی‌کند.</p>
  <label>شهرداری <select value={city} onChange={e=>setCity(e.target.value)}><option value="">انتخاب</option>{cities.map(x=><option key={x.id} value={x.id}>{x.name||x.name_fa||x.id}</option>)}</select></label>{' '}
  <button type="button" disabled={!base||busy} onClick={reload}>بررسی پرونده‌های واقعی و میزان پوشش</button>
  {data&&<div style={{marginTop:12}}>
    <p><b>کل پرونده‌ها:</b> {data.metrics.totalExistingCases} | <b>دارای برچسب پیش‌نویس:</b> {data.metrics.linkedDraftTerritory} | <b>بدون برچسب:</b> {data.metrics.unlinked} | <b>پوشش پیش‌نویس:</b> {data.metrics.linkedPercent}%</p>
    <p>واحدهای فعال: {data.metrics.units} | خدمات فعال: {data.metrics.services} | محدوده‌های تعریف‌شده: {data.metrics.territoryDraftCount}</p>
    <div style={{maxWidth:650}}>{data.territories.map(x=><div key={x.code} style={{display:'flex',alignItems:'center',gap:8,marginBottom:7}}>
     <span style={{minWidth:125,fontSize:13}}>{x.name_fa} ({x.code})</span><div style={{background:'#f1f5f9',flex:1,height:10,borderRadius:6,overflow:'hidden'}}><div style={{background:'#64748b',height:10,width:`${Math.min(100,100*(distMap[x.code]||0)/Math.max(1,data.metrics.totalExistingCases))}%`}}/></div><b>{distMap[x.code]||0}</b>
    </div>)}</div>
    <p><strong>NO-GO:</strong> این برچسب‌ها جغرافیای رسمی یا صحت داده میدانی را تأیید نمی‌کنند.</p>
    {data.canLinkDraft&&<div style={{display:'grid',gap:8,maxWidth:650,marginTop:15}}>
     <h4>ثبت پیوند پیش‌نویس با تأیید صریح مدیر شهرداری</h4>
     <label>پرونده بدون برچسب <select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">انتخاب پرونده</option>{data.selectableCases.map(x=><option key={x.id} value={x.id}>{x.id.slice(0,8)} | {x.module_code} | {x.status}</option>)}</select></label>
     {data.selectableTruncated&&<small>فهرست فقط ۵۰ پرونده اخیر را نمایش می‌دهد؛ اعداد تجمیعی، کل پرونده‌های مجاز را پوشش می‌دهند.</small>}
     <label>محدوده موقت <select value={territory} onChange={e=>setTerritory(e.target.value)}><option value="">انتخاب محدوده</option>{data.territories.map(x=><option key={x.code} value={x.code}>{x.name_fa} ({x.code})</option>)}</select></label>
     <label>مبنای انتخاب محدوده (حداقل ۲۰ نویسه) <textarea value={reason} maxLength={1000} onChange={e=>setReason(e.target.value)} style={{width:'100%'}}/></label>
     <button type="button" disabled={busy||!selected||!territory||reason.trim().length<20} onClick={link}>ثبت برچسب پیش‌نویس؛ بدون تغییر عملیات</button>
    </div>}
    <small>نمایش پرونده‌ها محدود به داده‌های مجاز حساب فعلی است؛ عنوان یا متن خام پرونده شهروندی نمایش داده نمی‌شود.</small>
  </div>}
  {error&&<p role="alert">{error}</p>}
 </section>;
}
