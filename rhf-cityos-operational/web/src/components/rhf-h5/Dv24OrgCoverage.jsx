import React,{useEffect,useMemo,useState} from 'react';
import './dv24-org-coverage.css';
const E=x=>encodeURIComponent(String(x||''));
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export default function Dv24OrgCoverage({city,actorId,api,surface='deputy',expectedTenantId,onExtended}){
 const [state,setState]=useState({key:'',loading:false,data:null,error:''});
 const [epoch,setEpoch]=useState(0),[name,setName]=useState(''),[agree,setAgree]=useState(false),[saving,setSaving]=useState(false),[result,setResult]=useState('');
 const key=`${city}:${actorId}:${surface}:${expectedTenantId}`;
 useEffect(()=>{let live=true;setState({key,loading:true,data:null,error:''});setName('');setAgree(false);setResult('');
  if(!UUID.test(city||'')||!UUID.test(actorId||'')||!UUID.test(expectedTenantId||'')||!['deputy','waste'].includes(surface)||typeof api!=='function'){
   setState({key,loading:false,data:null,error:'شهر یا حساب معتبر انتخاب نشده است.'});return()=>{live=false};}
  api(`/cities/${E(city)}/dv24-org-coverage?surface=${surface}`).then(d=>{
   if(d?.schema!=='RHF-DV24-MULTI-ORG-COVERAGE-v1'||d.cityId!==city||d.tenantId!==expectedTenantId||d.viewerId!==actorId||d.surface!==surface||
    !Array.isArray(d.proposed)||d.governance?.municipalExecution!==false||d.governance?.autoModuleActivation!==false||d.governance?.verifiedPublicValue!==false)throw Error('DV24_SCOPE_OR_GOVERNANCE_MISMATCH');
   if(live)setState({key,loading:false,data:d,error:''});
  }).catch(err=>{if(live)setState({key,loading:false,data:null,error:String(err?.message||err)})});
  return()=>{live=false};
 },[key,city,actorId,surface,api,expectedTenantId,epoch]);
 const data=state.key===key?state.data:null;
 const missing=useMemo(()=>data?.proposed?.filter(x=>x.missing)||[],[data]);
 const canCommit=surface==='deputy'&&data?.canExtend===true&&agree&&name===data.cityName&&!saving;
 async function commit(){
  if(!canCommit||!window.confirm(`تکمیل چارت پیشنهادی «${data.cityName}» با ${missing.length} واحد جدید؟ هیچ انتصاب، ماژول یا عملیات شهری فعال نمی‌شود.`))return;
  setSaving(true);try{
   const response=await api(`/cities/${E(city)}/dv24-org-coverage?surface=deputy`,'POST',{
    confirmedCityId:city,confirmedCityName:data.cityName,confirmation:data.confirmationText,requestKey:crypto.randomUUID()});
   if(response?.schema!=='RHF-DV24-MULTI-ORG-COVERAGE-v1'||response.cityId!==city||response.tenantId!==expectedTenantId||response.status!=='STRUCTURE_EXTENDED_PENDING_REVIEW'||response.appointmentsCreated!==0||response.modulesActivated!==0)throw Error('DV24_UNEXPECTED_RECEIPT');
   setResult(`ساختار پیشنهادی تکمیل شد: ${response.createdCount} واحد جدید. انتصاب و عملیات تغییری نکرد.`);setAgree(false);setName('');setEpoch(n=>n+1);onExtended?.();
  }catch(e){setResult('توسعه چارت متوقف شد: '+String(e?.message||e))}finally{setSaving(false)}
 }
 return <section className="rhf-dv24" dir="rtl" data-rhf-dv24="org-coverage-v1">
  <header><div><small>RHF FUTURE CITIES · DV2.4</small><h3>پوشش ساختار تخصصی سازمان‌های خدمات شهری</h3>
   <p>تکمیل چارت پیشنهادی معاونت و پسماند؛ تنها داده شهرداری و Tenant جاری</p></div>
   <button type="button" onClick={()=>setEpoch(n=>n+1)} disabled={saving||state.loading}>بازخوانی</button></header>
  {state.key===key&&state.loading&&<p role="status">در حال بررسی چارت سازمانی…</p>}
  {state.key===key&&state.error&&<p role="alert">گزارش سازمانی در دسترس نیست: {state.error}</p>}
  {data&&<>
   <div className="rhf-dv24__numbers"><span>واحدهای تخصصی پیشنهادی <strong>{data.totalProposed}</strong></span><span>موجود و منطبق <strong>{data.presentCount}</strong></span><span>ثبت‌نشده <strong>{data.missingCount}</strong></span></div>
   {data.blockers?.length>0&&<p className="rhf-dv24__warning" role="status">موانع ساختاری: {data.blockers.join(' · ')}</p>}
   <details><summary>مشاهده وضعیت واحدهای تخصصی</summary><div className="rhf-dv24__units">{data.proposed.map(n=><div key={n.code}><b>{n.nameFa}</b><small>{n.code} · {n.present?'موجود':'پیشنهادی، ثبت‌نشده'}</small></div>)}</div></details>
   {canCommit||data.canExtend?<div className="rhf-dv24__confirm"><label>نام کامل شهرداری برای تأیید<input value={name} onChange={e=>setName(e.target.value)} placeholder={data.cityName}/></label>
     <label><input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)}/> فقط چارت پیشنهادی همان Tenant تکمیل شود؛ مجوز و اجرای خودکار فعال نشود.</label>
     <button type="button" onClick={commit} disabled={!canCommit}>{saving?'در حال ثبت…':'ثبت واحدهای تخصصی با تأیید مدیر'}</button></div>:null}
   {result&&<p role="status">{result}</p>}
   <p className="rhf-dv24__foot">فهرست، الگوی پیشنهادی RHF است؛ لزوماً چارت مصوب شهرداری نیست. تأیید نهایی انطباق سازمانی، امنیت دو Tenant و عملیات واقعی در UAT جامع انجام می‌شود.</p>
  </>}
 </section>;
}
