import React,{useEffect,useMemo,useState} from 'react';
import {AlertTriangle,Building2,CheckCircle2,ClipboardList,LockKeyhole,RefreshCw,ShieldCheck} from 'lucide-react';
import './dv2-readiness.css';
import Dv21OrgBootstrap from './Dv21OrgBootstrap.jsx';
import Dv24OrgCoverage from './Dv24OrgCoverage.jsx';
import Dv25MissionMatrix from './Dv25MissionMatrix.jsx';
import Dv31OperationalIntake from './Dv31OperationalIntake.jsx';
import Dv32GovernedDispatch from './Dv32GovernedDispatch.jsx';
import Dv32BMissionPlanning from './Dv32BMissionPlanning.jsx';
import Dv32CResourcePlanning from './Dv32CResourcePlanning.jsx';
import Dv32DCapacityReservations from './Dv32DCapacityReservations.jsx';
import Dv22NeedCapacity from './Dv22NeedCapacity.jsx';
import Dv23OpportunityDiscovery from './Dv23OpportunityDiscovery.jsx';
import Dv23HumanFeasibility from './Dv23HumanFeasibility.jsx';
import Dv23B2AgentHandoff from './Dv23B2AgentHandoff.jsx';
import Dv23B2LiveSpecialists from './Dv23B2LiveSpecialists.jsx';
const fmt=n=>Number.isInteger(n)?new Intl.NumberFormat('fa-IR').format(n):'—';
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export function validateDv2(data,city,viewer,surface){
 if(data?.schema!=='RHF-DV2-ORG-READINESS-v1'||data.cityId!==city||data.viewerId!==viewer||data.surface!==surface||!uuid.test(data.tenantId||''))throw Error('DV2_SCOPE_MISMATCH');
 if(data.governance?.readOnly!==true||data.governance?.autoProvision!==false||data.governance?.autoAppointment!==false||data.governance?.autoActivation!==false||data.governance?.productionReady!==false||data.governance?.valueVerification!=='NOT_ATTESTED')throw Error('DV2_GOVERNANCE_INVALID');
 if(data.catalog?.axes?.length!==5||data.catalog?.missionCount!==17||data.catalog.axes.reduce((n,a)=>n+(Array.isArray(a.missions)?a.missions.length:0),0)!==17||!Array.isArray(data.issues))throw Error('DV2_CATALOG_INVALID');
 if(data.catalog.axes.some(a=>!Array.isArray(a.missions)||a.missions.some(m=>m.operationalState!=='NOT_ASSESSED')))throw Error('DV2_MISSION_STATUS_INVALID');
 return data;
}
export default function Dv2Readiness({city,actorId,api,surface='deputy',onOpenIam}){
 const [state,setState]=useState({key:'',loading:false,data:null,error:''});
 const [reload,refresh]=useState(0);
 const [expanded,setExpanded]=useState(false);
 const key=`${city||''}:${actorId||''}:${surface}`;
 useEffect(()=>{
  let mounted=true;
  setState({key,loading:true,data:null,error:''});setExpanded(false);
  if(!city||!actorId||typeof api!=='function'){
   setState({key,loading:false,data:null,error:'ابتدا شهرداری و حساب معتبر را انتخاب کنید.'});return()=>{mounted=false};
  }
  api(`/cities/${encodeURIComponent(city)}/dv2-readiness?surface=${encodeURIComponent(surface)}`)
   .then(data=>validateDv2(data,city,actorId,surface))
   .then(data=>{if(mounted)setState({key,loading:false,data,error:''})})
   .catch(e=>{if(mounted)setState({key,loading:false,data:null,error:String(e?.message||'دسترسی مجاز نیست')})});
  return()=>{mounted=false};
 },[key,city,actorId,surface,api,reload]);
 const data=state.key===key?state.data:null;
 const issueItems=useMemo(()=>data?.issues||[],[data]);
 return <section className="rhf-dv2" dir="rtl" aria-label="آمادگی ساختار معاونت و پسماند" data-rhf-dv2="org-readiness-v1">
  <header className="rhf-dv2__head"><div><small>RHF FUTURE CITIES · DV2 FOUNDATION</small><h2>مرکز آمادگی ساختار سازمانی و مأموریت‌های شهری</h2>
   <p>{surface==='deputy'?'نمای معاونت خدمات شهری و محیط‌زیست':'نمای سازمان مدیریت پسماند'} · داده شهر فعال و کاتالوگ طراحی ۵ محور / ۱۷ مأموریت</p></div>
   <button type="button" onClick={()=>refresh(x=>x+1)} disabled={state.loading}><RefreshCw size={16}/> بازخوانی</button></header>
  {state.key===key&&state.loading&&<div role="status" className="rhf-dv2__notice">در حال بررسی ساختار ثبت‌شده همین شهر و مجوز جاری…</div>}
  {state.key===key&&state.error&&<div role="alert" className="rhf-dv2__blocked"><LockKeyhole size={18}/> گزارش آمادگی برای این نشست قابل دسترسی نیست: {state.error}</div>}
  {data&&<>
   <div className="rhf-dv2__metrics">
    <div><span>جداسازی اختصاصی Tenant</span><strong>{data.readiness?.tenantExclusive?'شهرداری مستقل':'نیازمند اقدام'}</strong><small>استقلال در ساختار؛ آزمون RLS دو Tenant هنوز باز است</small></div>
    <div><span>ریشه معاونت</span><strong>{data.readiness?.deputyRootPresent?'ثبت شده':'ثبت نشده / نامعتبر'}</strong><small>بدون اعطای سمت خودکار</small></div>
    <div><span>سازمان پسماند</span><strong>{data.readiness?.wasteOrganizationPresent?'ساختار معتبر':'ساختار ناقص'}</strong><small>با والد فعال معاونت</small></div>
    <div><span>منوهای دارای ماژول فعال</span><strong>{fmt(data.readiness?.activeModuleCount)}</strong><small>فعال بودن ماژول به معنی عملیاتی‌بودن نیست</small></div>
   </div>
   <div className="rhf-dv2__trust"><ShieldCheck size={18}/> پاسخ شهر و حساب جاری تطبیق شد؛ تنها گزارش آمادگی است. انتصاب، فعال‌سازی، اجرای ایجنت و تأیید ارزش شهری به‌طور خودکار انجام نمی‌شود.</div>
   {issueItems.length>0?<div className="rhf-dv2__issues"><h3><AlertTriangle size={17}/> موانع واقعی شناسایی‌شده ({fmt(issueItems.length)})</h3><ul>{issueItems.map(x=><li key={x.key}><strong>{x.level==='CRITICAL'?'بحرانی':x.level==='BLOCKED'?'مسدود':'نیازمند تأیید'}</strong> {x.message}</li>)}</ul></div>:
    <div className="rhf-dv2__notice"><CheckCircle2 size={17}/> در بررسی اولیه مانع ساختاری ثبت نشد؛ بهره‌برداری تولیدی هنوز نیازمند آزمون مستقل است.</div>}
   <div className="rhf-dv2__actions"><button type="button" onClick={()=>setExpanded(x=>!x)}><ClipboardList size={16}/>{expanded?'بستن کاتالوگ مأموریت‌ها':'نمایش کاتالوگ ۵ محور و ۱۷ مأموریت'}</button>
    {typeof onOpenIam==='function'&&<button type="button" onClick={onOpenIam}><Building2 size={16}/> مدیریت ساختار و انتصاب از مسیر مجاز</button>}</div>
   {expanded&&<div className="rhf-dv2__axes">{data.catalog.axes.map(axis=><article key={axis.id}><h3>{axis.title}</h3><ol>{axis.missions.map(m=><li key={m.code}><span>{m.code}</span>{m.title}<small>وضعیت عملیاتی: ارزیابی نشده</small></li>)}</ol></article>)}</div>}
   <Dv21OrgBootstrap city={city} actorId={actorId} api={api} onProvisioned={()=>refresh(x=>x+1)}/>
   <Dv24OrgCoverage city={city} actorId={actorId} api={api} surface={surface} expectedTenantId={data.tenantId} onExtended={()=>refresh(x=>x+1)}/>
   <Dv25MissionMatrix city={city} actorId={actorId} api={api} surface={surface} expectedTenantId={data.tenantId}/>
   <Dv31OperationalIntake city={city} actorId={actorId} api={api} surface={surface} expectedTenantId={data.tenantId}/>
   <Dv32GovernedDispatch city={city} actorId={actorId} api={api} surface={surface} expectedTenantId={data.tenantId}/>
   <Dv32BMissionPlanning city={city} actorId={actorId} api={api} surface={surface} expectedTenantId={data.tenantId}/>
   <Dv32CResourcePlanning city={city} actorId={actorId} api={api} surface={surface} expectedTenantId={data.tenantId}/>
   <Dv32DCapacityReservations city={city} actorId={actorId} api={api} surface={surface} expectedTenantId={data.tenantId}/>
   <Dv22NeedCapacity city={city} actorId={actorId} api={api} surface={surface}/>
   <Dv23OpportunityDiscovery city={city} actorId={actorId} api={api} surface={surface} expectedTenantId={data.tenantId}/>
   <Dv23HumanFeasibility city={city} actorId={actorId} api={api} surface={surface} expectedTenantId={data.tenantId}/>
   <Dv23B2AgentHandoff city={city} actorId={actorId} api={api} surface={surface} expectedTenantId={data.tenantId}/>
   <Dv23B2LiveSpecialists city={city} actorId={actorId} api={api} surface={surface} expectedTenantId={data.tenantId}/>
   <footer>این ۱۷ مأموریت، کاتالوگ پیشنهادی RHF است و نقل رسمی فهرست شهرداری تهران نیست. داده، عملکرد یا خلق ارزش هر مأموریت هنوز مستقل احراز نشده است.</footer>
  </>}
 </section>;
}
