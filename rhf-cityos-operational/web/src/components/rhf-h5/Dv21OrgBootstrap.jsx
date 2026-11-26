/** A deliberate, administrative action, never auto-executed by an AI agent. */
import React,{useEffect,useState} from 'react';
const E=s=>encodeURIComponent(String(s||''));
const CHECK='ایجاد ساختار آزمایشی';
const isUuid=s=>/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(String(s||''));
export default function Dv21OrgBootstrap({city,actorId,api,onProvisioned}){
 const key=`${city||''}:${actorId||''}`;
 const [state,setState]=useState({key:'',loading:true,preview:null,error:''});
 const [confirmName,setConfirmName]=useState(''),[confirmed,setConfirmed]=useState(false);
 const [saving,setSaving]=useState(false),[result,setResult]=useState(null);
 const [epoch,setEpoch]=useState(0);
 useEffect(()=>{
  let live=true;
  setState({key,loading:true,preview:null,error:''});setConfirmName('');setConfirmed(false);setResult(null);
  if(!isUuid(city)||!isUuid(actorId)||typeof api!=='function'){
   setState({key,loading:false,preview:null,error:'شهر یا نشست معتبر وجود ندارد.'});return()=>{live=false};
  }
  api(`/cities/${E(city)}/org-bootstrap`).then(data=>{
   if(data?.schema!=='RHF-DV21-ORG-PROVISION-v1'||data.cityId!==city||!isUuid(data.tenantId)||
    !Array.isArray(data.template)||data.guardrails?.commitRequiresExplicitConfirmation!==true||data.guardrails?.noAutomaticAppointments!==true)throw Error('DV21_PREVIEW_SCOPE_INVALID');
   if(live)setState({key,loading:false,preview:data,error:''});
  }).catch(e=>{if(live)setState({key,loading:false,preview:null,error:String(e?.message||e)})});
  return()=>{live=false};
 },[key,city,actorId,api,epoch]);
 const preview=state.key===key?state.preview:null;
 const allowed=preview?.canProvision===true&&confirmed&&confirmName===preview.cityName&&!saving;
 async function submit(){
  if(!allowed||!window.confirm(`ایجاد ${preview.template.length} واحد پیشنهادی برای «${preview.cityName}» در دیتابیس آزمایشی انجام شود؟ هیچ سمت یا مجوزی اعطا نمی‌شود.`))return;
  setSaving(true);
  try{
   const response=await api(`/cities/${E(city)}/org-bootstrap`,'POST',{
    confirmedCityId:city,confirmedCityName:preview.cityName,confirmation:CHECK,requestKey:crypto.randomUUID()});
   if(response?.schema!=='RHF-DV21-ORG-PROVISION-v1'||response.cityId!==city||response.tenantId!==preview.tenantId||response.status!=='STRUCTURE_CREATED_PENDING_IAM_AND_SECURITY_UAT')throw Error('DV21_COMMIT_RECEIPT_MISMATCH');
   setResult(`ساختار ثبت شد: ${response.created} واحد؛ بدون انتصاب یا فعال‌سازی خودکار.`);
   setConfirmed(false);setConfirmName('');onProvisioned?.();
  }catch(e){setResult('ثبت ناموفق بود؛ پایگاه داده و مجوزهای جاری را بررسی کنید. '+String(e?.message||e));}
  finally{setSaving(false);}
 }
 return <section className="rhf-dv21" dir="rtl" data-rhf-dv21="controlled-provisioning">
  <header><h3>DV2.1 · راه‌اندازی کنترل‌شده چارت سازمانی</h3><button type="button" onClick={()=>setEpoch(n=>n+1)} disabled={saving}>بازخوانی پیش‌نمایش</button></header>
  <p>الگوی پیشنهادی RHF برای معاونت و سازمان‌های تابعه. این اقدام برای شهرداری مستقلِ آزمایشی و فقط با تأیید مدیر سامانه مجاز است.</p>
  {state.key===key&&state.loading&&<p role="status">در حال بررسی پیش‌شرط‌های واقعی…</p>}
  {state.key===key&&state.error&&<p role="alert">پیش‌نمایش در دسترس نیست: {state.error}</p>}
  {preview&&<>
   <div className="rhf-dv21__stats"><span>شهرداری‌های این Tenant: <b>{preview.tenantCityCount}</b></span><span>واحدهای ثبت‌شده: <b>{preview.existingOrgCount}</b></span><span>واحدهای قالب: <b>{preview.template.length}</b></span></div>
   {!preview.canProvision?<p role="status" className="rhf-dv21__blocked">راه‌اندازی خودکار مسدود است: {(preview.blockers||[]).join(' · ')}. اطلاعات موجود تغییر نمی‌کنند.</p>:
    <div className="rhf-dv21__form"><details><summary>مشاهده ساختار پیشنهادی</summary><ol>{preview.template.map(x=><li key={x.code}>{x.nameFa} <small>({x.code})</small></li>)}</ol></details>
     <label>برای تأیید، نام دقیق شهرداری را وارد کنید<input value={confirmName} onChange={e=>setConfirmName(e.target.value)} placeholder={preview.cityName}/></label>
     <label className="rhf-dv21__agree"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> تأیید می‌کنم فقط چارت پیشنهادی ساخته شود؛ انتصاب، عملیات و فعال‌سازی انجام نشود.</label>
     <button type="button" disabled={!allowed} onClick={submit}>{saving?'در حال ثبت…':'ایجاد کنترل‌شده ساختار در Tenant مستقل'}</button>
    </div>}
  </>}
  {result&&<p role="status" className="rhf-dv21__notice">{result}</p>}
  <small>این ساختار جایگزین چارت رسمی شهرداری نیست؛ مأموریت‌های ۱۷گانه نیز تا تعیین مالک، داده و سنجه عملیاتی تلقی نمی‌شوند.</small>
 </section>;
}
