import React,{useEffect,useMemo,useState} from 'react';
import './dv25-mission-matrix.css';
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const enc=x=>encodeURIComponent(String(x||''));
const fa=n=>new Intl.NumberFormat('fa-IR').format(n);
function verify(d,{city,actorId,surface,expectedTenantId}){
 if(d?.schema!=='RHF-DV25-MISSION-RESPONSIBILITY-v1'||d.cityId!==city||d.viewerId!==actorId||d.tenantId!==expectedTenantId||d.surface!==surface||!Array.isArray(d.missions)||d.totalMissions!==d.missions.length)throw Error('DV25_SCOPE_OR_SCHEMA_MISMATCH');
 if(d.governance?.readOnly!==true||d.governance?.noAutoExecution!==true||d.governance?.valueVerification!=='NOT_ATTESTED'||d.governance?.missionActivation!==false||d.governance?.operationalReadiness!=='NOT_ATTESTED'||d.evidenceMeasure!=='REVIEWED_DOCUMENT_COUNT_NOT_REALIZED_VALUE')throw Error('DV25_GOVERNANCE_MISMATCH');
 if(d.missions.length>17||d.missions.some(m=>m.valueVerified!==false||m.executionAuthorized!==false||m.operationalState!=='NOT_ATTESTED'||m.legalMandate!=='NOT_ATTESTED'||!Array.isArray(m.units)))throw Error('DV25_MISSION_DATA_INVALID');
 return d;
}
export default function Dv25MissionMatrix({city,actorId,api,surface='deputy',expectedTenantId}){
 const [state,setState]=useState({key:'',loading:false,data:null,error:''});
 const [reload,setReload]=useState(0),[axis,setAxis]=useState('all');
 const key=[city,actorId,expectedTenantId,surface].join(':');
 useEffect(()=>{
  let current=true;setAxis('all');setState({key,loading:true,data:null,error:''});
  if(!UUID.test(city||'')||!UUID.test(actorId||'')||!UUID.test(expectedTenantId||'')||!['deputy','waste'].includes(surface)||typeof api!=='function'){
   setState({key,loading:false,data:null,error:'شناسه شهر، Tenant یا کاربر معتبر نیست.'});return()=>{current=false};
  }
  api(`/cities/${enc(city)}/dv25-mission-matrix?surface=${surface}`)
   .then(x=>verify(x,{city,actorId,surface,expectedTenantId}))
   .then(x=>{if(current)setState({key,loading:false,data:x,error:''})})
   .catch(e=>{if(current)setState({key,loading:false,data:null,error:String(e?.message||e)})});
  return()=>{current=false};
 },[key,city,actorId,api,surface,expectedTenantId,reload]);
 const data=state.key===key?state.data:null;
 const axes=useMemo(()=>[...new Map((data?.missions||[]).map(x=>[x.axisCode,x.axisTitle])).entries()], [data]);
 const missions=useMemo(()=>data?.missions?.filter(x=>axis==='all'||x.axisCode===axis)||[],[data,axis]);
 return <section className="rhf-dv25" dir="rtl" data-rhf-dv25="mission-matrix-v1" aria-label="ماتریس مأموریت‌ها و مسئولیت‌ها">
  <header className="rhf-dv25__header"><div><small>RHF FUTURE CITIES · DV2.5</small><h3>ماتریس مسئولیت و آمادگی ۱۷ مأموریت شهری</h3>
  <p>{surface==='deputy'?'نمای تمام حوزه‌های معاونت':'سهم مشارکتی سازمان پسماند در مأموریت‌ها'} · وضعیت بر پایه چارت واقعی همین شهرداری</p></div>
  <button type="button" disabled={state.loading} onClick={()=>setReload(v=>v+1)}>بازخوانی</button></header>
  {state.key===key&&state.loading&&<p role="status">در حال دریافت وضعیت مأموریت‌ها…</p>}
  {state.key===key&&state.error&&<p role="alert" className="rhf-dv25__warning">اطلاعات مأموریت‌ها برای این نشست مجاز یا آماده نیست: {state.error}</p>}
  {data&&<>
   <div className="rhf-dv25__stats"><div><span>مأموریت‌های قابل مشاهده</span><strong>{fa(data.totalMissions)}</strong></div>
   <div><span>دارای واحد مسئول ساختاری</span><strong>{fa(data.structuralCoverageCount)}</strong></div>
   <div><span>مأموریت‌های فاقد پوشش ساختاری</span><strong>{fa(data.totalMissions-data.structuralCoverageCount)}</strong></div></div>
   {!data.readiness?.tenantExclusive&&<p className="rhf-dv25__warning">این شهر Tenant مشترک دارد. گزارش برای برنامه‌ریزی است؛ استقلال داده در دو Tenant واقعی هنوز آزموده نشده است.</p>}
   <div className="rhf-dv25__filter"><label htmlFor="rhf-dv25-axis">محور راهبردی</label><select id="rhf-dv25-axis" value={axis} onChange={e=>setAxis(e.target.value)}>
    <option value="all">تمام محورهای قابل مشاهده</option>{axes.map(([id,title])=><option key={id} value={id}>{title}</option>)}
   </select></div>
   <div className="rhf-dv25__cards">{missions.map(m=><article key={m.code}>
    <div className="rhf-dv25__mission-head"><small>{m.code} · {m.axisTitle}</small><strong>{m.title}</strong>
    <span className={m.ownerStructurePresent?'rhf-dv25__state rhf-dv25__state--present':'rhf-dv25__state'}>{m.ownerStructurePresent?'واحد مسئول در ساختار موجود است':'واحد مسئول ساختاری ثبت نشده'}</span></div>
    <div className="rhf-dv25__units">{m.units.map(u=><span key={u.code} title={u.code}>{u.nameFa} · {u.registered?'ثبت‌شده':'ثبت‌نشده'}</span>)}</div>
    <div className="rhf-dv25__signals"><span>اسناد بررسی‌شده نیاز: {fa(m.reviewedDocumentSignals.needs)}</span>
    <span>اسناد بررسی‌شده ظرفیت: {fa(m.reviewedDocumentSignals.capacities)}</span></div>
    <small className="rhf-dv25__note">وجود چارت و سند، اثبات اجرای مأموریت، انتساب قانونی مسئولیت یا تحقق ارزش شهری نیست.</small>
   </article>)}</div>
   <footer>این فهرست، الگوی طراحی RHF است، نه چارت یا شرح وظایف رسمی شهرداری. داده عملیاتی، اختیار اجرای مأموریت و ارزش تحقق‌یافته هنوز نیازمند مستندات و راستی‌آزمایی مستقل هستند. در این پنل هیچ تغییری ثبت نمی‌شود.</footer>
  </>}
 </section>;
}
