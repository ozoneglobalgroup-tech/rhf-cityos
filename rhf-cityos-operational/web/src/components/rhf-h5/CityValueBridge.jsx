import React,{useEffect,useMemo,useState} from 'react';
import {Activity,AlertTriangle,ArrowLeft,BrainCircuit,CheckCircle2,ClipboardCheck,LockKeyhole,RefreshCw,Target} from 'lucide-react';
import './city-value-bridge.css';
const money=n=>typeof n==='number'&&Number.isFinite(n)?new Intl.NumberFormat('fa-IR',{maximumFractionDigits:2}).format(n):'نامشخص';
const STAGES=['نیاز و ظرفیت','شواهد قابل انتساب','پیشنهاد عامل','تأیید انسانی','اجرای مجاز','سنجش مستقل ارزش'];
const text=x=>typeof x==='string'?x:'—';
function validate(data,city,actor,surface){
 if(data?.schema!=='RHF-DUAL-VALUE-BRIDGE-V1'||data.cityId!==city||data.viewerId!==actor||data.surface!==surface||!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(data.tenantId||'')||!Array.isArray(data.candidates)||data.candidates.length>40)throw Error('VALUE_BRIDGE_SCOPE_OR_SCHEMA_INVALID');
 if(data.governance?.readOnly!==true||data.governance?.decisionApproval!=='HUMAN_REQUIRED'||data.governance?.execution!=='NOT_CONNECTED'||data.governance?.valueVerification!=='NOT_ATTESTED')throw Error('VALUE_BRIDGE_GOVERNANCE_CONTRACT_INVALID');
 if(data.candidates.some(x=>x.canAutoExecute!==false||x.verifiedPublicValue!==false))throw Error('UNTRUSTED_VALUE_CERTIFICATION');
 return data;
}
export default function CityValueBridge({city,actorId,api,surface='deputy',compact=false,onOpenGovernance}){
 const [state,setState]=useState({key:'',data:null,error:'',loading:false});
 const [tick,refresh]=useState(0);
 const [selected,setSelected]=useState(null);
 const key=`${city}:${actorId}:${surface}`;
 useEffect(()=>{
  let active=true;
  setState({key,data:null,error:'',loading:true});setSelected(null);
  if(!city||!actorId||typeof api!=='function'){
   setState({key,data:null,error:'محدوده شهر یا هویت کاربر معتبر نیست',loading:false});return()=>{active=false};
  }
  api(`/cities/${encodeURIComponent(city)}/value-bridge?surface=${encodeURIComponent(surface)}`)
   .then(x=>validate(x,city,actorId,surface))
   .then(data=>{if(active)setState({key,data,error:'',loading:false})})
   .catch(e=>{if(active)setState({key,data:null,error:text(e?.message),loading:false})});
  return()=>{active=false};
 },[city,actorId,api,surface,tick]);
 const data=state.key===key?state.data:null;
 const candidates=useMemo(()=>data?.candidates||[],[data]);
 const detail=candidates.find(x=>x.id===selected)||null;
 return <section className={'rhf-cvb '+(compact?'rhf-cvb--compact':'')} dir="rtl" aria-label="پل کشف و حکمرانی فرصت‌های ارزش شهری" data-rhf-agentic-value="v1">
  <header className="rhf-cvb__head"><div><span className="rhf-cvb__eyebrow"><BrainCircuit size={16}/> RHF FUTURE CITIES · EVIDENCE-FIRST</span>
   <h2>پل مشترک کشف و خلق ارزش شهری</h2>
   <p>{surface==='deputy'?'نمای حکمرانی معاونت خدمات شهری و محیط‌زیست':'نمای سازمان مدیریت پسماند'} · فرصت‌سازی مبتنی بر شاهد، نه اجرای خودکار</p></div>
   <button type="button" disabled={state.loading} onClick={()=>refresh(t=>t+1)}><RefreshCw size={15}/> بازخوانی</button></header>
  <div className="rhf-cvb__steps" aria-label="زنجیره حکمرانی خلق ارزش">{STAGES.map((s,i)=><span key={s}><b>{i+1}</b>{s}</span>)}</div>
  {state.key===key&&state.loading&&<p role="status" className="rhf-cvb__notice">در حال دریافت داده مجاز همین شهرداری و سازمان…</p>}
  {state.key===key&&state.error&&<p role="alert" className="rhf-cvb__error"><LockKeyhole size={16}/> دسترسی یا منبع شواهد هنوز آماده نیست: {state.error}</p>}
  {data&&<><div className="rhf-cvb__status-gates" role="status" aria-label="وضعیت تأیید مقدماتی پل خلق ارزش">
    <span><CheckCircle2 size={16}/> API شهر فعال: دریافت شد</span>
    <span><CheckCircle2 size={16}/> هویت کاربر و محدوده شهر در پاسخ: مطابق</span>
    <span><CheckCircle2 size={16}/> فقط‌خواندنی و اجرای خودکار: غیرفعال</span>
    <span className="rhf-cvb__gate-pending"><AlertTriangle size={16}/> استقلال دو Tenant و اجرای Temporal/LangGraph: آزمون‌نشده</span>
   </div><div className="rhf-cvb__metrics"><div><span>نامزدهای اقدام مستند</span><strong>{money(candidates.length)}</strong><small>پیشنهاد؛ نه مأموریت صادرشده</small></div>
    <div><span>سوابق پسماند بررسی‌شده</span><strong>{data.sourceStatus?.wastePilot==='DEMO_ONLY'?money(data.coverage?.verifiedWasteRecords):'—'}</strong><small>{data.sourceStatus?.wastePilot==='DEMO_ONLY'?'فقط پایلوت آزمایشی':'سرویس شهر فعال نشده'}</small></div>
    <div><span>فرضیه‌های ثبت‌شده</span><strong>{money(data.coverage?.registeredValueHypotheses)}</strong><small>بدون ادعای تحقق ارزش</small></div>
    <div><span>ارزش عمومی راستی‌آزمایی‌شده</span><strong>تأیید نشده</strong><small>ارزیابی مستقل لازم است</small></div></div>
    <div className="rhf-cvb__notice"><CheckCircle2 size={17}/> دسترسی فقط‌خواندنی؛ اجرا، تأیید و انتشار نتیجه تنها از گردش‌کارهای مجاز پس از آزمون مستقل امکان‌پذیر است.</div>
    {data.governance?.temporal!=='NOT_ATTESTED'||data.governance?.langGraph!=='NOT_ATTESTED'||data.governance?.valueVerification!=='NOT_ATTESTED'?<p role="alert" className="rhf-cvb__error">پاسخ وضعیت ارکستراسیون با قرارداد ایمنی سازگار نیست.</p>:null}
    {!candidates.length?<div className="rhf-cvb__empty"><Target size={22}/> نامزد مستند در منابع محدود فعلی پیدا نشد. این نتیجه به معنی نبود فرصت در شهر نیست؛ لازم است منابع، ظرفیت‌ها و سنجه‌ها متصل شوند.</div>
    :<div className="rhf-cvb__grid"><div className="rhf-cvb__list" aria-label="نامزدهای خلق ارزش">{candidates.slice(0,compact?5:15).map(c=><button key={c.id} type="button" className={selected===c.id?'active':''} onClick={()=>setSelected(c.id)}>
      <span>{c.source==='WASTE_OPS'?'پسماند / منبع عملیاتی':'معاونت / فرضیه ثبت‌شده'}</span><strong>{text(c.title)}</strong><small>{text(c.explanation)}</small><em>{c.evidence?.length||0} سند قابل ارجاع · نیازمند تأیید انسانی</em></button>)}</div>
    <aside className="rhf-cvb__detail"><h3>{detail?'مبنای پیشنهاد انتخاب‌شده':'حکمرانی فرصت ارزش'}</h3>{detail?<><b>{text(detail.title)}</b><p>{text(detail.explanation)}</p><p>اقدام پیشنهادی: {text(detail.nextStep)}</p><p>خط مبنا: {money(detail.baseline)} · هدف: {money(detail.target)} {text(detail.unit)}</p>
     <ul>{(detail.evidence||[]).map(e=><li key={e.id}><code>{e.type}: {e.id}</code></li>)}</ul></>:<p>یک فرصت را انتخاب کنید تا شواهد قابل انتساب، مسیر تصمیم و وضعیت راستی‌آزمایی آن دیده شود.</p>}
     <div className="rhf-cvb__guards"><span><ClipboardCheck size={15}/> تصمیم انسانی الزامی</span><span><AlertTriangle size={15}/> ارزش نهایی احرازنشده</span><span><Activity size={15}/> Temporal و LangGraph: آزمون نشده</span></div>
     {typeof onOpenGovernance==='function'&&<button type="button" onClick={onOpenGovernance}>ورود به فرایندهای موجود <ArrowLeft size={15}/></button>}</aside></div>}
   </>}
  <footer>RUVOS · شناسایی ظرفیت ← دسترسی مشروع ← اقدام قابل تأیید ← راستی‌آزمایی ← تسهیم ارزش · هیچ ادعای خودکار درباره خروجی واقعی شهر وجود ندارد.</footer>
 </section>;
}
