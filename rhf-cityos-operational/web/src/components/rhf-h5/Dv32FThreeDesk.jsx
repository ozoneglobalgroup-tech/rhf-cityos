import React,{useEffect,useState} from 'react';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const valid=x=>UUID.test(String(x||''));
const desks=[['mayor','شهردار'],['deputy','معاونت خدمات شهری و محیط‌زیست'],['waste','مدیرعامل سازمان پسماند']];
const box={background:'#f8fafc',border:'1px solid #dbe2ea',borderRadius:10,padding:12};
const th={textAlign:'right',borderBottom:'1px solid #e2e8f0',padding:'7px 9px'};
const Num=({n,label})=><div style={{...box,flex:'1 1 110px',minWidth:110}}><div style={{fontSize:20,fontWeight:700}}>{n??0}</div><div style={{fontSize:12,color:'#475569'}}>{label}</div></div>;
const convertError=async r=>{if(r.ok)return r.json();if(r.status===403)throw Error('دسترسی این نقش به میزکار مجاز نیست. برای مدیرعامل پسماند، انتساب سازمانی مستقل باید تکمیل شود.');if(r.status===401)throw Error('نشست منقضی شده است؛ مجدداً وارد شوید.');throw Error(`HTTP ${r.status}`);};
/** Advisory-only companion panel; parent DV32D remains unchanged. */
export default function Dv32FThreeDesk({cityId:parentCity,municipalityId,selectedCityId,activeCityId}) {
 const inherited=[parentCity,municipalityId,selectedCityId,activeCityId].find(valid)||'';
 const [cities,setCities]=useState([]),[city,setCity]=useState(inherited),[desk,setDesk]=useState('deputy');
 const [org,setOrg]=useState(''),[data,setData]=useState(null),[err,setErr]=useState(''),[loading,setLoading]=useState(false);
 useEffect(()=>{if(inherited)setCity(inherited);},[inherited]);
 useEffect(()=>{const c=new AbortController();fetch('/api/v1/municipalities',{credentials:'same-origin',signal:c.signal}).then(convertError).then(x=>{if(!c.signal.aborted)setCities(Array.isArray(x)?x:[]);}).catch(e=>{if(!c.signal.aborted)setErr(e.message);});return ()=>c.abort();},[]);
 useEffect(()=>{setOrg('');},[city,desk]);
 useEffect(()=>{
  setData(null);setErr('');if(!valid(city))return;
  const c=new AbortController(),params=new URLSearchParams({desk});if(desk==='waste'&&valid(org))params.set('orgId',org);
  setLoading(true);
  fetch(`/api/v1/cities/${encodeURIComponent(city)}/dv32f-executive-command?${params.toString()}`,{credentials:'same-origin',signal:c.signal})
   .then(convertError).then(x=>{if(!c.signal.aborted)setData(x);}).catch(e=>{if(!c.signal.aborted)setErr(e.message);})
   .finally(()=>{if(!c.signal.aborted)setLoading(false);});return ()=>c.abort();
 },[city,desk,org]);
 const wasteOptions=data?.organization?.eligibleWasteOrganizations||[];
 return <section aria-label="میزکارهای مدیریتی DV32F" dir="rtl" style={{border:'1px solid #94a3b8',background:'#fff',color:'#0f172a',borderRadius:14,padding:18,margin:'16px 0',fontFamily:'inherit'}}>
  <h3 style={{margin:'0 0 8px'}}>DV32F | سه میزکار مدیریتی روی یک هسته عملیاتی</h3>
  <p style={{margin:'0 0 12px',color:'#475569',fontSize:13}}>خلاصه‌های قابل ردیابی و فقط‌خواندنی؛ بدون اعزام، تخصیص خودکار یا ادعای ارزش تأییدشده. اطلاعات هر شهرداری مستقل است.</p>
  <div role="tablist" aria-label="انتخاب میزکار" style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
   {desks.map(([code,label])=><button key={code} type="button" role="tab" aria-selected={desk===code} onClick={()=>setDesk(code)} style={{border:'1px solid #94a3b8',borderRadius:8,padding:'8px 11px',background:desk===code?'#1e293b':'#f8fafc',color:desk===code?'white':'#0f172a',cursor:'pointer'}}>{label}</button>)}
  </div>
  <label style={{display:'inline-flex',alignItems:'center',gap:8,marginBottom:10}}>شهرداری
   <select value={city} onChange={e=>setCity(e.target.value)} aria-label="شهرداری برای میزکارها" style={{padding:8,border:'1px solid #94a3b8',borderRadius:7}}>
    <option value="">انتخاب کنید</option>{cities.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}
    {city&&!cities.some(c=>c.id===city)&&<option value={city}>شهرداری انتخابی</option>}
   </select>
  </label>
  {desk==='waste'&&wasteOptions.length>0&&<label style={{display:'flex',alignItems:'center',gap:8,margin:'6px 0 12px'}}>سازمان پسماند
   <select value={org} onChange={e=>setOrg(e.target.value)} style={{padding:8,border:'1px solid #94a3b8',borderRadius:7}}><option value="">انتخاب سازمان</option>{wasteOptions.map(x=><option key={x.id} value={x.id}>{x.name} ({x.code})</option>)}</select>
  </label>}
  {!city&&<p>ابتدا شهرداری مورد نظر را انتخاب کنید.</p>}
  {loading&&<p role="status">در حال دریافت داده‌های مجاز…</p>}
  {err&&<p role="alert" style={{color:'#991b1b'}}>{err}</p>}
  {data&&<>
   {desk==='waste'&&data.organization.missingScope&&<p role="status" style={box}>{wasteOptions.length?'سازمان پسماند را از فهرست انتخاب کنید. تا آن زمان هیچ رقم شهری به‌عنوان عملکرد پسماند نمایش داده نمی‌شود.':'سازمان پسماند در ساختار سازمانی این شهرداری به‌طور قابل تشخیص ثبت نشده است؛ ابتدا پیکربندی سازمان لازم است.'}</p>}
   {!(desk==='waste'&&data.organization.missingScope)&&<>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',margin:'12px 0'}}>
     <Num label="پرونده‌های باز" n={data.cases.openCases}/><Num label="پرونده بحرانی باز" n={data.cases.criticalOpenCases}/>
     <Num label="مأموریت‌های ثبت‌شده" n={desk==='waste'?'—':data.missions.total}/>
     <Num label="مخازن ظرفیت" n={data.capacity.resourcePools}/>
     <Num label="رزروهای فعال" n={data.capacity.reservedAllocations}/>
    </div>
    {desk==='deputy'&&<div style={{overflowX:'auto'}}><h4 style={{margin:'14px 0 6px'}}>عملکرد مستقیم واحدها</h4><table style={{borderCollapse:'collapse',width:'100%',fontSize:13}}><thead><tr><th style={th}>واحد</th><th style={th}>نوع</th><th style={th}>پرونده باز</th><th style={th}>بحرانی باز</th></tr></thead><tbody>
     {data.organization.directUnitSummaries.map(x=><tr key={x.id}><td style={th}>{x.name} ({x.code})</td><td style={th}>{x.kind}</td><td style={th}>{x.directOpenCases}</td><td style={th}>{x.directCriticalCases}</td></tr>)}
     {!data.organization.directUnitSummaries.length&&<tr><td colSpan={4} style={th}>هیچ واحد فعالی ثبت نشده است.</td></tr>}
    </tbody></table>{data.organization.directUnitRowsTruncated&&<p>فقط ۸۰ واحد نخست نمایش داده شده است.</p>}</div>}
    <h4 style={{margin:'16px 0 6px'}}>اقدام پیشنهادی برای بررسی انسانی</h4>
    {data.advisory.map(x=><div key={x.key} style={{...box,marginBottom:8}}><strong>{x.title}</strong><div style={{fontSize:13}}>{x.reason}</div><small style={{color:'#64748b'}}>شواهد: {x.evidence.join(' | ')}</small></div>)}
   </>}
   <p style={{fontSize:12,color:'#475569',marginBottom:0}}>این گزارش تأیید عملیات، ارزش مالی یا تحقق نتایج شهری نیست. دسترسی مستقیم نقش مدیرعامل پسماند تا ایجاد و اعتبارسنجی انتساب سازمانی فعال نمی‌شود.</p>
  </>}
 </section>;
}
