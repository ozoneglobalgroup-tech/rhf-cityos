import React,{useEffect,useMemo,useState} from 'react';
import {ArrowLeft,BarChart3,BookOpenCheck,CheckCircle2,Database,FileText,Layers,RefreshCw,ShieldAlert,ShieldCheck,Truck} from 'lucide-react';
import {DEMO_SCENARIOS,SCENARIO_VERSION,scenarioMetrics,scenarioPayload,scenarioRequestKey,validateServerDossiers,allowedScenarioImport,findStoredScenarioRow} from './deputy-scenario-v8p35-core.mjs';
import {DOSSIER_SCHEMAS} from './deputy-dossier-schema.mjs';
import './deputy-scenario-v8p35.css';
const E=x=>encodeURIComponent(String(x||''));
const N=x=>new Intl.NumberFormat('fa-IR').format(x);
export default function DeputyScenarioStudioV8P35({city,api,assignmentId=null,isSystemAdmin=false,onOpenRecord=()=>{},onRefresh=()=>{}}){
 const [chosen,setChosen]=useState('S01'),[stored,setStored]=useState(null),[keys,setKeys]=useState({}),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[fetching,setFetching]=useState(false),[epoch,setEpoch]=useState(0),[details,setDetails]=useState(true);
 const s=DEMO_SCENARIOS.find(x=>x.id===chosen)||DEMO_SCENARIOS[0];
 const metrics=useMemo(()=>scenarioMetrics(s),[s]);
 const auth=assignmentId&&!isSystemAdmin?`?assignmentId=${E(assignmentId)}`:'';
 const path=`/cities/${E(city)}/org-deputy-dossiers${auth}`;
 useEffect(()=>{if(!city)return;let active=true;setFetching(true);setError('');setStored(null);
  api(path).then(v=>{if(!active)return;const x=validateServerDossiers(v,city);if(!x)throw Error('پاسخ پرونده‌ها با محدوده شهری و قرارداد امنیتی سازگار نیست');setStored(x)}).catch(e=>{if(active){setError(e?.message||'دریافت پرونده‌های مجاز ممکن نیست');setStored(null)}}).finally(()=>{if(active)setFetching(false)});
  return()=>{active=false};
 },[city,path,api,epoch]);
 useEffect(()=>{let active=true;setKeys({});if(!city)return;
  Promise.all(s.records.map(async r=>[r.id,await scenarioRequestKey(city,s.id,r.id)])).then(k=>{if(active)setKeys(Object.fromEntries(k))}).catch(()=>{if(active)setKeys({})});return()=>{active=false};
 },[city,s]);
 const canImport=!!stored&&allowedScenarioImport(stored,city)&&!busy&&!fetching;
 const canPreview=!!s; // Always local synthetic only, never substitute for authenticated API rows.
 async function add(packs){
  if(!canImport||!window.confirm(`آیا ${packs.length} سناریوی کاملاً ساختگی در پایگاه داده همین شهرداری ثبت شوند؟\nداده‌ها عملیات میدانی، تخصیص یا ارزش اثبات‌شده ایجاد نمی‌کنند.`))return;
  setBusy(true);setError('');setNotice('');let created=0,existing=0;
  try{
   const latest=await api(path);if(!allowedScenarioImport(latest,city))throw Error('اختیار ثبت یا دامنه کامل داده در سرور تأیید نشد');
   const records=[...latest.rows];
   for(const pack of packs){for(const r of pack.records){
    const requestKey=await scenarioRequestKey(city,pack.id,r.id);
    if(findStoredScenarioRow(records,requestKey)){existing++;continue}
    const payload={...scenarioPayload(pack,r),requestKey};
    const reply=await api(path,'POST',payload);
    if(!validateServerDossiers(reply,city)||reply.rows.length!==1||reply.rows[0].code!==`RHF8P2-${requestKey}`)throw Error(`تأیید ذخیره پرونده ${pack.id}/${r.id} با قرارداد معتبر نبود`);
    records.push(reply.rows[0]);if(reply.idempotent===true)existing++;else created++;
   }}
   setNotice(`${N(created)} پرونده مصنوعی در PostgreSQL ثبت شد؛ ${N(existing)} پرونده قبلاً موجود بود. هیچ اقدام اجرایی انجام نشد.`);
   setStored({...latest,rows:records});onRefresh();setEpoch(v=>v+1);
  }catch(e){setError(`ثبت دسته‌ای متوقف شد: ${e?.message||'خطا'}؛ ممکن است تعدادی پرونده ایجاد شده باشد. قبل از تلاش دوباره بازخوانی کنید.`);setEpoch(v=>v+1)}finally{setBusy(false)}
 }
 const count=DEMO_SCENARIOS.reduce((sum,x)=>sum+x.records.length,0);
 const domains=new Set(DEMO_SCENARIOS.flatMap(x=>x.records.map(r=>r.orgKey))).size;
 const match=r=>keys[r.id]?findStoredScenarioRow(stored?.rows||[],keys[r.id]):null;
 return <section className="ss35" dir="rtl" data-rhf-scenario-studio={SCENARIO_VERSION}>
  <header className="ss35-top"><div><small>V8P3.5 · SYNTHETIC SCENARIO STUDIO · NO AUTO-DISPATCH</small><h3><Layers size={21}/> آزمایشگاه سناریوهای مدیریت شهری</h3><p>نمونه‌های متفاوت برای نمایش فرصت‌های بین‌سازمانی، انحراف خدمت، آموزش، نظارت و کنترل خطای مثبت؛ همگی مصنوعی و مستقل از آمار واقعی.</p></div><button type="button" onClick={()=>setEpoch(x=>x+1)} disabled={busy||fetching}><RefreshCw size={15}/> بازخوانی ثبت‌شده‌ها</button></header>
  <div className="ss35-badges"><span><BookOpenCheck size={15}/> {N(DEMO_SCENARIOS.length)} سناریوی آموزشی</span><span><FileText size={15}/> {N(count)} پرونده قابل ثبت</span><span><Layers size={15}/> {N(domains)} حوزه تخصصی</span><span><ShieldCheck size={15}/> ارزش تأییدشده: صفر</span></div>
  <div className="ss35-provenance"><ShieldAlert size={17}/><span><b>دو منبع داده کاملاً جدا:</b> پیش‌نمایش سناریو از Fixture داخل برنامه است؛ «ثبت‌شده» فقط پس از پاسخ معتبر API همان شهرداری نمایش داده می‌شود. هیچ خودرو غیرمتوقف، ظرفیت آزاد فرض نمی‌شود.</span></div>
  {error&&<p className="ss35-error" role="alert">{error}</p>}{notice&&<p className="ss35-ok" role="status">{notice}</p>}
  <div className="ss35-actions"><span>{fetching?'در حال بررسی مجوز واقعی...':stored?`پرونده‌های برگشتی از PostgreSQL: ${N(stored.rows.length)}${stored.partial?' (ناقص)':''}`:'API قابل اعتبارسنجی نیست؛ فقط پیش‌نمایش محلی'}</span><div><button type="button" disabled={!canImport} onClick={()=>add([s])}><Database size={15}/> ثبت سناریوی انتخاب‌شده</button><button type="button" className="ss35-primary" disabled={!canImport} onClick={()=>add(DEMO_SCENARIOS)}>ثبت تمام سناریوها در PostgreSQL</button></div></div>
  {!stored?.canCreate&&<p className="ss35-help">ثبت فقط برای حساب دارای مجوز ایجاد پرونده مجاز است؛ سایر کاربران می‌توانند نمونه‌ها را به‌صورت جداگانه مشاهده کنند.</p>}
  {stored?.partial&&<p className="ss35-error">به دلیل محدودیت ۲۰۰ پرونده، ورود دسته‌ای غیرفعال شده است تا ثبت تکراری رخ ندهد.</p>}
  <div className="ss35-layout"><nav className="ss35-list" aria-label="انتخاب سناریوی آموزشی">{DEMO_SCENARIOS.map(x=><button type="button" aria-current={chosen===x.id?'true':undefined} key={x.id} onClick={()=>{setChosen(x.id);setNotice('')}}><small>{x.id} · {x.category}</small><strong>{x.title}</strong><span>{N(x.records.length)} پرونده · شبیه‌سازی</span></button>)}</nav>
   {canPreview&&<div className="ss35-detail"><div className="ss35-title"><div><small>پیش‌نمایش محلی · {s.id}</small><h4>{s.title}</h4><p>{s.description}</p></div><span className="ss35-tag">SYNTHETIC</span></div>
    <div className="ss35-metrics"><div><b>{N(s.records.length)}</b><span>رکورد نمونه</span></div><div><b>{N(metrics.needs)}</b><span>نشانه نیاز فرضی</span></div><div><b>{N(metrics.leads)}</b><span>سرنخ ناوگان، نه ظرفیت آزاد</span></div><div><b>{N(metrics.unverifiedPairings)}</b><span>ترکیب احتمالی تأییدنشده</span></div></div>
    <p className="ss35-question"><ShieldAlert size={16}/><strong>پرسش تصمیم‌یار:</strong> {s.question}</p>
    <div className="ss35-chart-title"><h5><BarChart3 size={17}/> شاخص هر پرونده در برابر مخرج همان فرم</h5><button type="button" onClick={()=>setDetails(v=>!v)} aria-expanded={details}>{details?'بستن جزئیات':'نمایش جزئیات'}</button></div>
    {details&&<div className="ss35-records">{s.records.map(r=>{const m=metrics.metrics.find(x=>x.id===r.id);const saved=match(r);return <article key={r.id}><div className="ss35-row-head"><div><strong>{r.title}</strong><small>{DOSSIER_SCHEMAS[r.orgKey].label} · {r.status==='SUBMITTED'?'در انتظار بازبینی مستقل پس از ثبت':'پیش‌نویس پس از ثبت'}</small></div><span className={saved?'ss35-saved':'ss35-preview'}>{saved?'ذخیره‌شده در RUVOS':'فقط پیش‌نمایش'}</span></div>
      <div className="ss35-figure"><span>{m.label}: {N(m.number)}{m.denominator!==null?` از ${N(m.denominator)}`:''}</span><span>{m.percent===null?'بدون درصد قابل محاسبه':`${N(m.percent)}٪ از مخرج فرم`}</span></div>
      {m.percent!==null&&<div className="ss35-track" aria-label={`نسبت شاخص نمونه ${m.percent} درصد`}><span style={{width:`${Math.min(100,Math.max(0,m.percent))}%`}}/></div>}
      <div className="ss35-fields">{Object.entries(r.fields).map(([k,v])=><span key={k}><b>{k}</b>: {Number.isInteger(v)?N(v):String(v)}</span>)}</div>
      {saved&&<button className="ss35-open" type="button" onClick={()=>onOpenRecord(r.orgKey,saved.id)}>پرونده ذخیره‌شده <ArrowLeft size={14}/></button>}
     </article>})}</div>}
    <div className="ss35-summary"><Truck size={17}/><span>هیچ تطبیق واقعی منابع، مجوز تخصیص، صرفه‌جویی مالی یا ارزش شهری تأییدشده از این نمونه‌ها نتیجه نمی‌شود. نمایش درصدها فقط نسبت داخلی هر فرم است، نه رتبه‌بندی خطر بین سازمان‌ها.</span></div>
   </div>}
  </div>
  <footer><CheckCircle2 size={16}/> ثبت داده با API موجود V8P2، کنترل سرور، RLS و رویداد حسابرسی انجام می‌شود؛ بدون Migration جدید، دستور اعزام یا تغییر مجوز سازمانی.</footer>
 </section>;
}
