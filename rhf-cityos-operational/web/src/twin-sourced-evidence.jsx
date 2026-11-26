import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {Database,Globe2,Activity,ShieldCheck,RefreshCcw} from 'lucide-react';
import './twin-sourced-evidence.css';
const CAT={GIS_SNAPSHOT:'خروجی GIS با مختصات',IOT_SNAPSHOT:'خروجی IoT با اندازه‌گیری'};
const STATE={REGISTERED:'ثبت‌شده؛ بررسی‌نشده',APPROVED:'منبع تأییدشده',REJECTED:'منبع ردشده',SUBMITTED:'مشاهده در انتظار بررسی',ACCEPTED:'اصالت مشاهده پذیرفته‌شده'};
const FRESH={UNVERIFIED:'بدون بررسی مستقل',STALE:'قدیمی‌تر از بازه تعریف‌شده',WITHIN_DEFINED_INTERVAL:'در بازه تازگی تعیین‌شده',INVALID_TIME:'زمان نامعتبر'};
const initialSource={twinId:'',category:'GIS_SNAPSHOT',providerLabel:'',externalResourceRef:'',metricCode:'',unit:'',expectedIntervalMinutes:'1440'};
const initialSample={sourceId:'',externalEventId:'',value:'',observedAt:'',sourceReference:'',latitude:'',longitude:''};
function inputDateISO(){return new Date().toISOString().slice(0,19)+'Z';}
export default function TwinSourcedEvidence({city,twins=[],api,access}){
 const [sources,setSources]=useState([]),[samples,setSamples]=useState([]),[stats,setStats]=useState(null);
 const [s,setS]=useState(initialSource),[o,setO]=useState(initialSample),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[pullStatus,setPullStatus]=useState(null);
 const role=access?.role||'',canWrite=['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR','OPERATOR'].includes(role),canReview=['MUNICIPAL_ADMIN','DEPUTY'].includes(role);
 const load=useCallback(async()=>{if(!city)return;setBusy(true);setError('');try{
  const [a,b,c]=await Promise.all([api(`/cities/${city}/twin-data-sources`),api(`/cities/${city}/twin-source-samples`),api(`/cities/${city}/twin-source-summary`)]);
  setSources(a.rows||[]);setSamples(b.rows||[]);setStats(c);
 }catch(e){setError(e.message);}finally{setBusy(false);}},[city,api]);
 useEffect(()=>{setSources([]);setSamples([]);setStats(null);setS(initialSource);setO(initialSample);load();},[load]);
 const selected=useMemo(()=>sources.find(x=>x.id===o.sourceId),[sources,o.sourceId]);
 const approved=sources.filter(x=>x.review_status==='APPROVED');
 const canPull=['MUNICIPAL_ADMIN','DEPUTY'].includes(role);
 useEffect(()=>{setPullStatus(null);if(!city||!o.sourceId||!canPull)return;let active=true;api(`/cities/${city}/twin-pull/${o.sourceId}`).then(r=>{if(active)setPullStatus(r);}).catch(()=>{if(active)setPullStatus(null);});return ()=>{active=false;};},[city,o.sourceId,canPull,api]);
 const pull=()=>send(async()=>{if(!selected||selected.review_status!=='APPROVED'||!pullStatus?.enabled)throw Error('اتصال برای منبع انتخاب‌شده آماده نیست');await api(`/cities/${city}/twin-pull/${selected.id}`,'POST',{});},'یک مشاهده از Endpoint HTTPS دریافت شد؛ برای پذیرش منشأ، بررسی مستقل لازم است.');
 const displayTime=x=>{const n=Date.parse(x);return Number.isFinite(n)?new Date(n).toLocaleString('fa-IR'):'—';};
 const send=async(fn,success)=>{setBusy(true);setError('');setNotice('');try{await fn();setNotice(success);await load();}catch(e){setError(e.message);}finally{setBusy(false);}};
 async function register(e){e.preventDefault();await send(async()=>{await api(`/cities/${city}/twin-data-sources`,'POST',{...s,expectedIntervalMinutes:Number(s.expectedIntervalMinutes)});setS(initialSource);},'منبع ثبت شد. تأیید مستقل منبع برای ورود مشاهده لازم است.');}
 async function addSample(e){e.preventDefault();await send(async()=>{
  if(o.value.trim()==='')throw Error('مقدار شاخص را وارد کنید');
  const p={sourceId:o.sourceId,externalEventId:o.externalEventId,value:Number(o.value),observedAt:o.observedAt,sourceReference:o.sourceReference,latitude:o.latitude===''?null:Number(o.latitude),longitude:o.longitude===''?null:Number(o.longitude)};
  await api(`/cities/${city}/twin-source-samples`,'POST',p);setO(initialSample);
 },'مشاهده با شناسه یکتا ثبت شد؛ در انتظار بررسی مستقل و فاقد ادعای اتصال زنده است.');}
 function review(part,x,decision){const note=window.prompt('مبنای بررسی مستقل (حداقل ۱۲ کاراکتر):','');if(note===null)return;
  send(()=>api(`/cities/${city}/${part}/${x.id}`,'PATCH',{decision,note}),'بررسی منبع/داده ثبت شد. این کار به معنای اثبات سود یا ارزش عمومی نیست.');}
 return <div className="tse" dir="rtl">
  <div className="tse-head"><div><strong><Globe2 size={17}/> درگاه شواهد مکانی و حسگری (GIS / IoT)</strong><p>ورود داده مستند از خروجی سیستم‌های مرجع؛ بدون اتصال خودکار یا ادعای همگام‌سازی زنده</p></div><button type="button" disabled={busy} onClick={load}><RefreshCcw size={16}/> بازخوانی</button></div>
  <div className="tse-warning"><ShieldCheck size={17}/> <span>فقط خروجی‌های مستند با شناسه رویداد، زمان UTC و منبع قابل بررسی ثبت می‌شوند. تأیید منبع و مشاهده مستقل است؛ «تازه‌بودن زمانی» به معنای صحت اندازه‌گیری یا تحقق ارزش شهری نیست.</span></div>
  {error&&<div className="tse-error" role="alert">{error}</div>}{notice&&<div className="tse-ok" role="status">{notice}</div>}
  <div className="tse-counters"><span>منابع ثبت‌شده <b>{stats?.sources??'—'}</b></span><span>منابع بررسی‌شده <b>{stats?.approved_sources??'—'}</b></span><span>مشاهدات واردشده <b>{stats?.samples??'—'}</b></span><span>مشاهدات پذیرفته‌شده <b>{stats?.reviewed_samples??'—'}</b></span><span>اتصال خودکار <b>غیرفعال</b></span></div>
  <div className="tse-columns"><div className="tse-panel"><h3><Database size={18}/> منابع ورودی</h3>
   {canWrite&&<form className="tse-form" onSubmit={register}>
    <label>دوقلوی مرتبط<select required value={s.twinId} onChange={e=>setS({...s,twinId:e.target.value})}><option value="">انتخاب کنید</option>{twins.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
    <label>نوع خروجی<select value={s.category} onChange={e=>setS({...s,category:e.target.value})}>{Object.entries(CAT).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
    <label>نام سامانه مرجع<input required minLength={4} maxLength={150} value={s.providerLabel} onChange={e=>setS({...s,providerLabel:e.target.value})} placeholder="برای مثال: سامانه GIS شهرداری"/></label>
    <label>شناسه مستند لایه یا دستگاه (بدون رمز/توکن)<input required minLength={5} maxLength={250} value={s.externalResourceRef} onChange={e=>setS({...s,externalResourceRef:e.target.value})}/></label>
    <div className="tse-pair"><label>کد شاخص<input required pattern="[a-z][a-z0-9_]{2,49}" value={s.metricCode} onChange={e=>setS({...s,metricCode:e.target.value})} placeholder="tree_condition"/></label><label>واحد<input required maxLength={50} value={s.unit} onChange={e=>setS({...s,unit:e.target.value})} placeholder="score"/></label></div>
    <label>بازه مجاز تازگی (دقیقه)<input type="number" required min="1" max="43200" step="1" value={s.expectedIntervalMinutes} onChange={e=>setS({...s,expectedIntervalMinutes:e.target.value})}/></label>
    <button disabled={busy}>ثبت منبع برای بررسی مستقل</button>
   </form>}
   <div className="tse-list">{sources.length?sources.map(x=><article key={x.id}><strong>{x.provider_label} · {CAT[x.category]}</strong><small>{x.twin_name} · {x.metric_code} ({x.unit})</small><span>{STATE[x.review_status]||x.review_status}</span>{x.review_note&&<small>بازبین: {x.review_note}</small>}{canReview&&x.review_status==='REGISTERED'&&<div className="tse-actions"><button disabled={busy} type="button" onClick={()=>review('twin-data-sources',x,'ACCEPT')}>تأیید منبع</button><button disabled={busy} type="button" className="secondary" onClick={()=>review('twin-data-sources',x,'REJECT')}>رد منبع</button></div>}</article>):<p>منبع GIS/IoT ثبت نشده است.</p>}</div>
  </div><div className="tse-panel"><h3><Activity size={18}/> ورود و بررسی مشاهدات</h3>
   {canWrite&&<form className="tse-form" onSubmit={addSample}>
    <label>منبع تصویب‌شده<select required value={o.sourceId} onChange={e=>setO({...o,sourceId:e.target.value})}><option value="">انتخاب منبع</option>{approved.map(x=><option key={x.id} value={x.id}>{x.provider_label} · {x.metric_code}</option>)}</select></label>
    <label>شناسه یکتای رویداد در منبع<input required minLength={6} maxLength={120} value={o.externalEventId} onChange={e=>setO({...o,externalEventId:e.target.value})} placeholder="device001:20261031T090000"/></label>
    <div className="tse-pair"><label>مقدار شاخص<input type="number" step="0.0001" required value={o.value} onChange={e=>setO({...o,value:e.target.value})}/></label><label>زمان ثبت در سامانه مرجع (UTC)<input required value={o.observedAt} onChange={e=>setO({...o,observedAt:e.target.value})} placeholder="2026-10-31T09:00:00Z"/><button type="button" className="secondary" onClick={()=>setO({...o,observedAt:inputDateISO()})}>زمان کنونی UTC</button></label></div>
    {selected?.category==='GIS_SNAPSHOT'&&<div className="tse-pair"><label>عرض WGS84<input required type="number" step="0.000001" min="-90" max="90" value={o.latitude} onChange={e=>setO({...o,latitude:e.target.value})}/></label><label>طول WGS84<input required type="number" step="0.000001" min="-180" max="180" value={o.longitude} onChange={e=>setO({...o,longitude:e.target.value})}/></label></div>}
    <label>مرجع سند یا فایل واقعی<input required minLength={8} maxLength={500} value={o.sourceReference} onChange={e=>setO({...o,sourceReference:e.target.value})}/></label>
    <button disabled={busy||!selected}>ثبت مشاهده مستند</button>
   </form>}
   {canPull&&selected&&<div className="tse-warning"><ShieldCheck size={16}/><span>اتصال HTTPS دستی: {pullStatus?.enabled?'آماده دریافت از منبع مشخص‌شده در سرور':'غیرفعال یا پیکربندی‌نشده'}؛ هیچ جریان زنده یا تأیید خودکار وجود ندارد.</span><button type="button" disabled={busy||!pullStatus?.enabled||selected.review_status!=='APPROVED'} onClick={pull}>دریافت کنترل‌شده از منبع</button></div>}
   <div className="tse-list">{samples.length?samples.map(x=><article key={x.id}><strong>{x.provider_label} · {x.metric_code}: {Number(x.measured_value).toLocaleString('fa-IR')} {x.unit}</strong><small>{displayTime(x.observed_at)} · {STATE[x.review_status]||x.review_status}</small><span>تازگی زمانی: {FRESH[x.freshness]||x.freshness}</span>{x.latitude!==null&&<small>WGS84: {x.latitude} , {x.longitude}</small>}<small>شناسه منبع: {x.external_event_id}</small><small>مستند: {x.source_reference}</small>{canReview&&x.review_status==='SUBMITTED'&&<div className="tse-actions"><button type="button" disabled={busy} onClick={()=>review('twin-source-samples',x,'ACCEPT')}>پذیرش منشأ</button><button type="button" className="secondary" disabled={busy} onClick={()=>review('twin-source-samples',x,'REJECT')}>رد مستند</button></div>}</article>):<p>مشاهده‌ای ثبت نشده است.</p>}</div>
  </div></div><p className="tse-foot">حداکثر ۱۰۰ رکورد آخر در هر فهرست نمایش داده می‌شود. در صورت پیکربندی، دریافت HTTPS فقط با درخواست کاربر مجاز انجام می‌شود؛ polling خودکار و ارسال داده به LLM وجود ندارد. داده‌های ثبت‌شده فقط شواهد منشأدار هستند.</p>
 </div>;
}
