import React,{useEffect,useMemo,useState} from 'react';
const U=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DESKS=[['mayor','شهردار'],['deputy','معاون خدمات شهری'],['waste','مدیرعامل سازمان پسماند']];
const fmt=x=>new Intl.NumberFormat('fa-IR').format(Number(x)||0);
const err=async r=>{const body=await r.json().catch(()=>({}));if(!r.ok)throw Error(body.error||`HTTP ${r.status}`);return body;};
const edge={border:'1px solid #cbd5e1',padding:12,borderRadius:10,background:'#fff'};
export default function Dv32GOrgIAM({cityId,municipalityId,selectedCityId,activeCityId}){
 const fromProps=[cityId,municipalityId,selectedCityId,activeCityId].find(x=>U.test(String(x||'')))||'';
 const [cities,setCities]=useState([]),[city,setCity]=useState(fromProps),[access,setAccess]=useState(null),[report,setReport]=useState(null);
 const [desk,setDesk]=useState('waste'),[orgId,setOrgId]=useState(''),[userId,setUserId]=useState('');
 const [reason,setReason]=useState(''),[confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [revision,setRevision]=useState(0);
 useEffect(()=>{if(fromProps)setCity(fromProps);},[fromProps]);
 useEffect(()=>{const ctrl=new AbortController();fetch('/api/v1/municipalities',{credentials:'same-origin',signal:ctrl.signal}).then(err).then(x=>{if(!ctrl.signal.aborted)setCities(Array.isArray(x)?x:[]);}).catch(()=>{});return()=>ctrl.abort();},[]);
 useEffect(()=>{setOrgId('');setUserId('');setReport(null);},[city]);
 const root=useMemo(()=>U.test(city)?`/api/v1/cities/${encodeURIComponent(city)}`:null,[city]);
 useEffect(()=>{
  if(!root)return;const ctrl=new AbortController();setError('');setAccess(null);
  fetch(root+'/dv32g-org-bindings',{credentials:'same-origin',signal:ctrl.signal}).then(err).then(x=>{if(!ctrl.signal.aborted)setAccess(x);})
   .catch(e=>{if(!ctrl.signal.aborted)setError(e.message);});return()=>ctrl.abort();
 },[root,revision]);
 useEffect(()=>{
  if(!root||!access){setReport(null);return;}
  const ctrl=new AbortController();setReport(null);
  // Director cannot select a different org. Admin must make an explicit org selection for preview.
  const params=access.access==='ADMIN'&&U.test(orgId)?'?orgId='+encodeURIComponent(orgId):'';
  fetch(root+'/dv32g-waste-command'+params,{credentials:'same-origin',signal:ctrl.signal}).then(err).then(x=>{if(!ctrl.signal.aborted)setReport(x);})
   .catch(e=>{if(!ctrl.signal.aborted)setError(e.message);});return()=>ctrl.abort();
 },[root,access,orgId]);
 const submit=async(kind,bindingId)=>{
  setError('');setNotice('');
  if(!root||busy)return;
  if(!confirm||reason.trim().length<16){setError('تأیید صریح و دلیل حداقل ۱۶ نویسه‌ای لازم است.');return;}
  setBusy(true);
  try{
   const grant=kind==='grant',body=grant?{userId,orgId,reason,confirm:'AUTHORIZE_ORGANIZATION_READ'}:{reason,confirm:'REVOKE_ORGANIZATION_READ'};
   await fetch(root+'/dv32g-org-bindings'+(grant?'':'/'+bindingId),{method:grant?'POST':'DELETE',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(err);
   setNotice(grant?'انتساب سازمانی ثبت شد؛ فقط مجوز مشاهده ایجاد شده است.':'انتساب سازمانی لغو شد.');setReason('');setConfirm(false);setRevision(n=>n+1);
  }catch(e){setError(e.message);}finally{setBusy(false);}
 };
 return <section dir="rtl" aria-label="DV32G دسترسی سازمانی مدیرعامل پسماند" style={{...edge,margin:'16px 0',fontFamily:'inherit',color:'#0f172a'}}>
  <h3 style={{margin:'0 0 6px'}}>DV32G | انتساب سازمانی و میزکار مدیرعامل پسماند</h3>
  <p style={{fontSize:13,color:'#475569'}}>هسته واحد RHF City OS؛ اطلاعات محدود به شهرداری و سازمان مجاز. بدون تخصیص یا اعزام خودکار.</p>
  <label>شهرداری: <select value={city} onChange={e=>setCity(e.target.value)}><option value="">انتخاب کنید</option>{cities.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}{city&&!cities.some(c=>c.id===city)&&<option value={city}>شهرداری انتخابی</option>}</select></label>
  <p style={{fontSize:12}}>ارتباط با سه میزکار: {DESKS.map(x=>x[1]).join(' | ')}</p>
  {!city&&<p>ابتدا شهرداری را انتخاب کنید.</p>}
  {error&&<p role="alert" style={{color:'#b91c1c'}}>{error}</p>}{notice&&<p role="status" style={{color:'#166534'}}>{notice}</p>}
  {access?.access==='DIRECTOR'&&<p style={edge}>{access.ownBinding?`انتساب تأییدشده: ${access.ownBinding.organizationName}`:'برای این حساب انتساب سازمان پسماند ثبت نشده است. مدیر شهرداری باید آن را تأیید کند.'}</p>}
  {access?.access==='ADMIN'&&<div style={{...edge,background:'#f8fafc',marginTop:12}}>
   <h4 style={{margin:'0 0 8px'}}>مدیریت مجوز مدیرعامل — فقط مدیر شهرداری</h4>
   <p style={{fontSize:12}}>ابتدا در بخش مدیریت کاربران، نقش DIRECTOR را برای کاربر همین شهرداری تعریف کنید؛ سپس سازمان را به‌صورت صریح انتخاب کنید.</p>
   <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
    <label>سازمان پسماند <select value={orgId} onChange={e=>setOrgId(e.target.value)}><option value="">انتخاب سازمان</option>{access.eligibleOrganizations?.map(o=><option key={o.id} value={o.id}>{o.name_fa} ({o.code})</option>)}</select></label>
    <label>کاربر مدیرعامل <select value={userId} onChange={e=>setUserId(e.target.value)}><option value="">انتخاب کاربر DIRECTOR</option>{access.eligibleDirectors?.map(u=><option key={u.id} value={u.id}>{u.name} ({u.username})</option>)}</select></label>
   </div>
   <label style={{display:'block',margin:'10px 0'}}>دلیل اعطای دسترسی <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={2} maxLength={1000} style={{display:'block',width:'100%',boxSizing:'border-box'}}/></label>
   <label><input type="checkbox" checked={confirm} onChange={e=>setConfirm(e.target.checked)}/> تأیید انسانی: این انتساب فقط برای مشاهده اطلاعات سازمان انتخابی است</label>
   <div style={{margin:'10px 0'}}><button type="button" disabled={!U.test(orgId)||!U.test(userId)||!confirm||reason.trim().length<16||busy} onClick={()=>submit('grant')}>ثبت انتساب سازمانی</button></div>
   <h4 style={{marginBottom:6}}>انتساب‌های فعال</h4>
   {access.activeBindings?.map(b=><div key={b.id} style={{...edge,marginBottom:6}}><strong>{b.user_name}</strong> — {b.org_name}
     <button type="button" disabled={!confirm||reason.trim().length<16||busy} onClick={()=>submit('revoke',b.id)} style={{marginRight:12}}>لغو انتساب با دلیل بالا</button></div>)}
   {!access.activeBindings?.length&&<p style={{fontSize:12}}>هیچ انتساب فعالی ثبت نشده است.</p>}
   {access.truncated&&<p role="alert">فهرست بیش از ظرفیت نمایش است؛ پیش از صدور مجوز، وضعیت سازمان را بررسی کنید.</p>}
  </div>}
  {report?.needsOrganizationSelection&&<p>برای مشاهده گزارش، سازمان پسماند را از فهرست بالا انتخاب کنید؛ داده شهری به‌صورت پیش‌فرض نمایش داده نمی‌شود.</p>}
  {report&&!report.needsOrganizationSelection&&<div style={{...edge,marginTop:12}}>
    <h4>گزارش محدود به سازمان: {report.scope.organizationName}</h4>
    <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
     <p>پرونده‌های باز: <b>{fmt(report.cases.open)}</b></p><p>پرونده‌های بحرانی: <b>{fmt(report.cases.criticalOpen)}</b></p>
     <p>منابع: <b>{fmt(report.capacity.resourcePools)}</b></p><p>رزروهای فعال: <b>{fmt(report.capacity.reservedAllocations)}</b></p>
    </div>
    <p>پیشنهاد بررسی: {report.advisory?.[0]?.type}؛ نیازمند بررسی و تأیید انسانی.</p>
  </div>}
  <p style={{fontSize:12,color:'#475569'}}>این نما فقط‌خواندنی است؛ هیچ مأموریت، پرداخت، تخصیص، خلق ارزش تأییدشده یا اعزام میدانی اجرا نمی‌کند.</p>
 </section>;
}
