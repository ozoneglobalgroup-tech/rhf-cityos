import React,{useEffect,useState} from 'react';
import {GitMerge,LockKeyhole,RefreshCw,ShieldAlert} from 'lucide-react';
import './dv23-opportunities.css';
const ID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const e=encodeURIComponent;
function validate(payload,city,user,surface,tenant){
 if(payload?.schema!=='RHF-DV23A-EVIDENCE-DISCOVERY-v1'||payload.cityId!==city||payload.viewerId!==user
  ||payload.surface!==surface||!ID.test(payload.tenantId||'')||payload.tenantId!==tenant)throw Error('DV23_SCOPE_MISMATCH');
 if(payload.engine!=='DETERMINISTIC_RULES_NOT_LANGGRAPH'||!Array.isArray(payload.candidates)
  ||payload.candidates.length>20||payload.governance?.readOnly!==true
  ||payload.governance?.autoExecution!==false||payload.governance?.valueVerification!=='NOT_ATTESTED'
  ||payload.governance?.langGraphExecution!=='NOT_CONNECTED'||payload.governance?.temporalExecution!=='NOT_CONNECTED'
  ||payload.candidates.some(x=>x.canAutoExecute!==false||x.verifiedPublicValue!==false||x.humanApproval!=='NOT_REQUESTED'
    ||!ID.test(x.need?.id||'')||!ID.test(x.capacity?.id||'')))throw Error('DV23_UNSAFE_GOVERNANCE_RESPONSE');
 return payload;
}
export default function Dv23OpportunityDiscovery({city,actorId,api,surface='deputy',expectedTenantId}){
 const key=`${city||''}:${actorId||''}:${surface}:${expectedTenantId||''}`;
 const [state,setState]=useState({key:'',loading:false,payload:null,error:''});
 const [reload,refresh]=useState(0);
 useEffect(()=>{
  let active=true;setState({key,loading:true,payload:null,error:''});
  if(!ID.test(city||'')||!ID.test(actorId||'')||!ID.test(expectedTenantId||'')||typeof api!=='function'){
   setState({key,loading:false,payload:null,error:'نشست یا شهرداری انتخابی معتبر نیست.'});return()=>{active=false};
  }
  api(`/cities/${e(city)}/dv23-opportunities?surface=${e(surface)}`)
   .then(x=>validate(x,city,actorId,surface,expectedTenantId))
   .then(payload=>{if(active)setState({key,loading:false,payload,error:''})})
   .catch(error=>{if(active)setState({key,loading:false,payload:null,error:String(error?.message||error)})});
  return()=>{active=false};
 },[key,city,actorId,api,surface,expectedTenantId,reload]);
 const data=state.key===key?state.payload:null;
 return <section className="rhf-dv23" data-rhf-dv23="evidence-discovery-v1" dir="rtl">
  <header><div><small>RHF FUTURE CITIES · DV2.3A</small><h3><GitMerge size={18}/> کشف فرصت‌های نیاز و ظرفیت</h3>
   <p>پیشنهادهای مبتنی بر قواعد و اسناد بررسی‌شده؛ نه اجرای ایجنت LangGraph و نه ایجاد مأموریت</p></div>
   <button type="button" onClick={()=>refresh(x=>x+1)} disabled={state.loading}><RefreshCw size={16}/> بازتحلیل</button></header>
  {state.key===key&&state.loading&&<p role="status">در حال تطبیق رکوردهای مستند همین شهر…</p>}
  {state.key===key&&state.error&&<p className="rhf-dv23__error" role="alert"><LockKeyhole size={17}/> {state.error}</p>}
  {data&&<>
   <div className="rhf-dv23__stats"><span>نیاز بررسی‌شده: <b>{data.coverage.reviewedNeeds}</b></span><span>ظرفیت بررسی‌شده: <b>{data.coverage.reviewedCapacities}</b></span><span>فرصت اولیه: <b>{data.candidates.length}</b></span></div>
   <p className="rhf-dv23__warning"><ShieldAlert size={17}/> هیچ پیشنهاد به معنی تأیید ظرفیت قابل استفاده، بودجه، مجوز، ایمنی یا ارزش شهری محقق‌شده نیست. اجرای خودکار غیرفعال است.</p>
   {(data.coverage.hasMoreSourceRows||data.coverage.hasMoreCandidatePairs)&&<p className="rhf-dv23__warning">نتایج محدود به ۲۰۰ سند و ۲۰ پیشنهاد نخست است؛ فهرست جامع نیست.</p>}
   {!data.candidates.length&&<p>جفت نیاز/ظرفیت بررسی‌شده و هم‌حوزه‌ای در محدوده دسترسی جاری یافت نشد. پس از بررسی مستقل اسناد در دفتر DV2.2، «بازتحلیل» را انتخاب کنید.</p>}
   <div className="rhf-dv23__cards">{data.candidates.map(c=><article key={c.key}>
    <strong>{c.sector} · فرصت نیاز/ظرفیت برای بررسی امکان‌سنجی</strong>
    <div><b>نیاز:</b> {c.need.title} <small>سند: {c.need.evidenceRef}</small></div>
    <div><b>ظرفیت گزارش‌شده:</b> {c.capacity.title} <small>سند: {c.capacity.evidenceRef}</small></div>
    <p>{c.rationale}</p><small>وضعیت مقدار: {c.quantityAssessment==='REPORTED_SUFFICIENCY_ONLY'?'کفایت فقط در مقدار گزارش‌شده؛ تأیید نشده':'نامشخص؛ نیازمند اعتبارسنجی'} · اقدام پیشنهادی: بررسی انسانی</small>
   </article>)}</div>
   <footer>داده‌ها مربوط به Tenant و شهر فعال هستند؛ امکان‌سنجی حقوقی، مکان، زمان، قرارداد، HSE، هزینه و خط مبنا انجام نشده است. تأیید انسانی و سنجش مستقل ارزش الزامی‌اند.</footer>
  </>}
 </section>;
}
