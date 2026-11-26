import React,{useEffect,useState} from 'react';
import {BrainCircuit,LockKeyhole,RefreshCw,ShieldCheck} from 'lucide-react';
import './dv23b2-agent-handoff.css';
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const roles=['NEED_ANALYST','CAPACITY_ANALYST','LEGAL_HSE','VALUE_GOVERNANCE'];
function validate(data,city,actor,tenant,surface){
 if(data?.schema!=='RHF-DV23B2A-AGENT-HANDOFF-v1'||data.cityId!==city||data.viewerId!==actor||data.tenantId!==tenant||data.surface!==surface)throw Error('DV23B2A_SCOPE_MISMATCH');
 const g=data.governance;
 if(g?.readOnly!==true||g.autoDispatch!==false||g.canExecute!==false||g.agentExecution!=='NOT_CONNECTED'||g.langGraphRuntime!=='NOT_CONNECTED'||g.temporalWorkflow!=='NOT_CONNECTED'||g.valueVerification!=='NOT_ATTESTED'||!Array.isArray(data.packets)||data.packets.length>20||data.packets.some(p=>!uuid.test(p.decisionId||'')||!uuid.test(p.ownerOrgId||'')||!Array.isArray(p.tasks)||p.tasks.length!==4||p.tasks.some((t,i)=>t.key!==roles[i]||t.status!=='NOT_STARTED'||t.executedByAgent!==false)||p.canExecute!==false||p.verifiedPublicValue!==false||!/^[a-f0-9]{64}$/.test(p.sourceDigest||'')||!/^[a-f0-9]{64}$/.test(p.handoffFingerprint||'')))throw Error('DV23B2A_UNSAFE_CONTRACT');
 return data;
}
export default function Dv23B2AgentHandoff({city,actorId,api,surface='deputy',expectedTenantId}){
 const [reload,setReload]=useState(0),[state,setState]=useState({key:'',loading:false,data:null,error:''});
 const key=`${city||''}:${actorId||''}:${surface}:${expectedTenantId||''}`;
 useEffect(()=>{
  let live=true;setState({key,loading:true,data:null,error:''});
  if(!uuid.test(city||'')||!uuid.test(actorId||'')||!uuid.test(expectedTenantId||'')||typeof api!=='function'){
   setState({key,loading:false,data:null,error:'نشست یا محدوده شهر معتبر نیست.'});return()=>{live=false};
  }
  api(`/cities/${encodeURIComponent(city)}/dv23-agent-handoffs?surface=${encodeURIComponent(surface)}`)
    .then(v=>validate(v,city,actorId,expectedTenantId,surface))
    .then(data=>{if(live)setState({key,loading:false,data,error:''})})
    .catch(e=>{if(live)setState({key,loading:false,data:null,error:String(e?.message||e)})});
  return()=>{live=false};
 },[key,city,actorId,surface,expectedTenantId,api,reload]);
 const data=state.key===key?state.data:null;
 return <section className="rhf-dv23b2a" dir="rtl" data-rhf-dv23b2a="agent-handoff-v1">
  <header><div><small>RHF FUTURE CITIES · DV2.3B2A</small><h3>آماده‌سازی شواهد برای عامل‌های تخصصی</h3><p>نیاز، ظرفیت، حقوقی/HSE و حکمرانی ارزش · بدون اجرای مدل یا مأموریت</p></div><button type="button" disabled={state.loading} onClick={()=>setReload(x=>x+1)}><RefreshCw size={16}/> بازخوانی</button></header>
  <div className="rhf-dv23b2a__notice"><ShieldCheck size={18}/> این پنل صرفاً بسته تحویل شواهد را آماده می‌کند؛ شروع تحلیل واقعی LangGraph و Temporal فقط با مجوز و تأیید انسانی در پنل DV2.3B2B پایین انجام می‌شود.</div>
  {state.loading&&<p role="status">در حال بررسی شناسه شهر، انتصاب و اثرانگشت اسناد…</p>}
  {state.error&&<p role="alert"><LockKeyhole size={16}/> دسترسی فراهم نیست یا پاسخ نامعتبر است: {state.error}</p>}
  {data&&<><p>پرونده‌های آماده بررسی: <b>{data.packets.length}</b> · اسناد نامعتبر یا تغییرکرده: <b>{data.coverage?.blockedOrInvalid||0}</b></p>
   {data.packets.map(p=><article key={p.decisionId}><strong><BrainCircuit size={16}/> حوزه {p.sector} · پرونده {p.decisionId.slice(0,8)}</strong>
    <p>شناسه سند نیاز: {p.evidence?.need?.id?.slice(0,8)} · شناسه ظرفیت: {p.evidence?.capacity?.id?.slice(0,8)}</p>
    <p>اثر انگشت شواهد: <code>{p.sourceDigest.slice(0,16)}…</code></p>
    <ul>{p.tasks.map(t=><li key={t.key}><b>{t.title}</b> — انجام نشده</li>)}</ul>
    <small>تصویب امکان‌سنجی فقط ورود به مطالعه است · اجرای ایجنت: خیر · مجوز عملیات: خیر · ارزش راستی‌آزمایی‌شده: خیر</small>
   </article>)}
   {!data.packets.length&&<p>پرونده دارای FEASIBILITY_APPROVED با شواهد معتبر در حوزه دسترسی فعلی پیدا نشد. این وضعیت به‌معنای اجرای ایجنت یا تأیید ارزش نیست.</p>}
  </>}
  <footer>این پنل خود ایجنتی اجرا نمی‌کند؛ پنل DV2.3B2B پایین برای درخواست صریح تحلیل Worker و پیگیری نتیجه قابل حسابرسی است.</footer>
 </section>;
}
