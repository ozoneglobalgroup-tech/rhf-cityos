import React,{useEffect,useState} from 'react';
import {Building2,GitBranch,LockKeyhole,RefreshCw,ShieldAlert} from 'lucide-react';
import './deputy-authority-graph-v8p33.css';
const VERSION='RHF-URBAN-AUTHORITY-GRAPH-V8P3.3';
const E=x=>encodeURIComponent(String(x||''));
export function validAuthorityGraph(g,city){
 return Boolean(g&&g.mode===VERSION&&g.cityId===city&&g.synthetic===true&&
  g.legalAuthorityVerified===false&&g.autonomousDispatch===false&&g.verifiedPublicValue===false&&
  g.permissions?.autoDispatch===false&&g.permissions?.allocateResources===false&&g.permissions?.approvePublicValue===false&&
  ['ADMIN','INDEPENDENT_REVIEWER','DEPUTY'].includes(g.seat)&&Array.isArray(g.nodes)&&g.nodes.length<=112&&
  g.nodes.every(n=>typeof n.id==='string'&&['REGISTERED_ORG_UNIT','SYNTHETIC_LOGICAL_DOMAIN'].includes(n.kind))&&
  Array.isArray(g.edges)&&g.edges.length<=220&&g.edges.every(e=>typeof e.from==='string'&&typeof e.to==='string'));
}
export default function DeputyAuthorityGraphV8P33({city,api,assignmentId=null,isSystemAdmin=false}){
 const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[tick,setTick]=useState(0);
 const assignment=assignmentId&&!isSystemAdmin?`?assignmentId=${E(assignmentId)}`:'';
 useEffect(()=>{if(!city)return;let active=true;setBusy(true);setError('');setData(null);
  api(`/cities/${E(city)}/org-authority-graph${assignment}`).then(x=>{
   if(!active)return;
   if(!validAuthorityGraph(x,city))throw Error('پاسخ گراف اختیار فاقد اعتبار دامنه یا قرارداد امنیتی است');
   setData(x);
  }).catch(ex=>{if(active){setData(null);setError(ex?.message||'گراف اختیار قابل دریافت نیست')}})
   .finally(()=>{if(active)setBusy(false)});
  return()=>{active=false};
 },[city,assignment,api,tick]);
 const units=data?.nodes.filter(n=>n.kind==='REGISTERED_ORG_UNIT')||[];
 const domains=data?.nodes.filter(n=>n.kind==='SYNTHETIC_LOGICAL_DOMAIN')||[];
 return <section className="ag33" dir="rtl" data-rhf-authority-graph={VERSION}>
  <header className="ag33-head"><div><small>V8P3.3 · SERVER-SCOPED · READ ONLY</small><h3><GitBranch size={19}/> گراف اختیار و ساختار شهری</h3><p>نمای تفکیک‌شده واحدهای ثبت‌شده در پایگاه داده و حوزه‌های منطقی آزمایشی؛ نه سند صلاحیت قانونی سازمان‌ها</p></div><button type="button" disabled={busy} onClick={()=>setTick(v=>v+1)}><RefreshCw size={15}/> بازخوانی اختیار</button></header>
  {busy&&<p role="status">در حال بررسی سمت و محدوده دسترسی از سرور...</p>}
  {error&&<p className="ag33-error" role="alert"><ShieldAlert size={16}/>{error}؛ داده جایگزین غیرمعتبر نمایش داده نمی‌شود.</p>}
  {data&&<><div className="ag33-stats"><div><strong>{units.length.toLocaleString('fa-IR')}</strong><span>واحد ثبت‌شده در دامنه پاسخ</span></div><div><strong>{domains.length.toLocaleString('fa-IR')}</strong><span>حوزه منطقی، نه سازمان حقوقی</span></div><div><strong>{data.seat}</strong><span>جایگاه مجاز در API</span></div></div>
   {data.partial&&<p className="ag33-warn">فهرست واحدهای سازمانی محدود شده است؛ گراف کامل شهر نیست.</p>}
   <div className="ag33-columns"><div><h4><Building2 size={16}/> واحدهای واقعی ثبت‌شده در سامانه</h4>{units.map(n=><div key={n.id} className="ag33-unit"><b>{n.label}</b><small>{n.unitKind} · {n.code}</small></div>)}{units.length===0&&<p>واحد معتبری در پاسخ مجاز یافت نشد.</p>}</div>
    <div><h4><GitBranch size={16}/> دفاتر تخصصی آزمایشی</h4><div className="ag33-domain-list">{domains.map(n=><span key={n.id}>{n.label}</span>)}</div><p className="ag33-caption">این ۱۱ حوزه از قرارداد فرم‌های V8P2 آمده‌اند و به معنای وجود ۱۱ سازمان ثبت‌شده نیستند.</p></div></div>
   <div className="ag33-rights"><LockKeyhole size={17}/><div><b>مجوزهای پرونده آزمایشی در سرور</b><p>مشاهده: مجاز · ایجاد پیش‌نویس: {data.permissions.createSyntheticDraft?'مجاز':'غیرمجاز'} · بررسی پرونده شخص دیگر پس از ارسال: {data.permissions.reviewOtherCreatorsSubmitted?'مشروط به کنترل سرور':'غیرمجاز'} · تخصیص منابع و اجرا: ممنوع</p><small>{data.caveat}</small></div></div>
  </>}
 </section>;
}
