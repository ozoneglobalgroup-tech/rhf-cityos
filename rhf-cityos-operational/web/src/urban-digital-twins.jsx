import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {Layers3,RefreshCcw,ShieldCheck,Activity,FileText,MapPinned} from 'lucide-react';
import './urban-digital-twins.css';
import TwinSourcedEvidence from './twin-sourced-evidence.jsx';
const TYPES=[['GREEN_SPACE','فضای سبز'],['FLEET','ناوگان'],['WASTE','پسماند'],['PROCESS','فرایند شهری'],['INFRASTRUCTURE','زیرساخت'],['SERVICE','خدمت عمومی']];
const REVIEW={SUBMITTED:'در انتظار بررسی',ACCEPTED:'منبع و مشاهده بررسی‌شده',REJECTED:'ردشده'};
function extractTime(v){const t=Date.parse(v);return Number.isFinite(t)?new Date(t).toLocaleString('fa-IR'):'—';}
export default function UrbanDigitalTwins({city,cityName,cases=[],api,access}){
 const [twins,setTwins]=useState([]),[observations,setObservations]=useState([]),[summary,setSummary]=useState(null);
 const [selected,setSelected]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [draft,setDraft]=useState({caseId:'',twinType:'GREEN_SPACE',name:'',sourceReference:'',geographicReference:''});
 const [ob,setOb]=useState({metricCode:'',metricLabel:'',unit:'',value:'',sourceReference:'',note:''});
 const role=access?.role||'';const canWrite=['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR','OPERATOR'].includes(role);const canReview=['MUNICIPAL_ADMIN','DEPUTY'].includes(role);
 const load=useCallback(async()=>{
  if(!city)return;setError('');setBusy(true);
  try{const [ts,sm,os]=await Promise.all([api(`/cities/${city}/digital-twins`),api(`/cities/${city}/twin-summary`),api(`/cities/${city}/twin-observations`)]);
   setTwins(ts.rows||[]);setSummary(sm);setObservations(os.rows||[]);
  }catch(e){setError(e.message);}finally{setBusy(false);}
 },[city,api]);
 useEffect(()=>{setSelected('');setTwins([]);setObservations([]);setSummary(null);setMessage('');load();},[load]);
 const selectedTwin=useMemo(()=>twins.find(x=>x.id===selected),[twins,selected]);
 const shown=useMemo(()=>observations.filter(x=>!selected||x.twin_id===selected),[observations,selected]);
 async function register(e){e.preventDefault();setBusy(true);setError('');setMessage('');try{
  await api(`/cities/${city}/digital-twins`,'POST',draft);
  setDraft({caseId:'',twinType:'GREEN_SPACE',name:'',sourceReference:'',geographicReference:''});setMessage('دوقلو به‌عنوان مدل ثبت دستی ایجاد شد؛ داده زنده متصل نیست.');await load();
 }catch(e){setError(e.message);}finally{setBusy(false);}}
 async function record(e){e.preventDefault();if(!selected)return;setBusy(true);setError('');setMessage('');try{
  const n=Number(ob.value);if(!Number.isFinite(n)||ob.value.trim()==='')throw Error('مقدار شاخص معتبر نیست');
  await api(`/cities/${city}/twin-observations`,'POST',{...ob,twinId:selected,value:n,observedAt:new Date().toISOString()});
  setOb({metricCode:'',metricLabel:'',unit:'',value:'',sourceReference:'',note:''});setMessage('مشاهده ثبت شد؛ نیازمند بررسی مستقل و فاقد ادعای ارزش محقق‌شده است.');await load();
 }catch(e){setError(e.message);}finally{setBusy(false);}}
 async function review(x,decision){const note=window.prompt('مستند بررسی مستقل (حداقل ۱۲ کاراکتر):','');if(note===null)return;setError('');setMessage('');setBusy(true);try{
  await api(`/cities/${city}/twin-observations/${x.id}`,'PATCH',{decision,note});setMessage('نتیجه بررسی داده ثبت شد؛ این کار به معنی اثبات منفعت اقتصادی نیست.');await load();
 }catch(e){setError(e.message);}finally{setBusy(false);}}
 return <section className="udt" dir="rtl">
  <header className="udt-head"><div><span className="udt-kicker"><Layers3 size={16}/> URBAN DIGITAL TWIN · 1.3.5</span><h2>دوقلوهای دیجیتال شهری</h2><p>مدل دارایی و خدمت، تاریخچه مشاهده واقعی و کنترل کیفیت داده — {cityName||'شهرداری جاری'}</p></div><button type="button" className="udt-outline" onClick={load} disabled={busy}><RefreshCcw size={16}/> بازخوانی</button></header>
  <div className="udt-alert"><ShieldCheck size={19}/><span>این مرحله رجیستری و شواهد ثبت دستی است؛ اتصال IoT، مدل پیش‌بینی کالیبره، نقشه سه‌بعدی و اجرای خودکار هنوز فعال نیست. «مشاهده پذیرفته‌شده» معادل «ارزش محقق‌شده» نیست.</span></div>
  {error&&<div className="udt-error" role="alert">{error}</div>}{message&&<div className="udt-success" role="status">{message}</div>}
  <div className="udt-stats"><div><small>دوقلوهای ثبت‌شده</small><b>{summary?.twins??'—'}</b></div><div><small>مشاهدات ثبت‌شده</small><b>{summary?.observations??'—'}</b></div><div><small>مشاهدات بررسی‌شده</small><b>{summary?.accepted??'—'}</b></div><div><small>اتصال زنده</small><b>غیرفعال</b></div></div>
  <div className="udt-grid"><div className="udt-panel"><h3><MapPinned size={17}/> رجیستری دوقلو</h3><p className="udt-muted">هر دوقلو به یک پرونده معتبر همین شهرداری مرتبط است؛ ثبت مدل، همگام‌سازی لحظه‌ای ایجاد نمی‌کند.</p>
   {canWrite&&<form onSubmit={register} className="udt-form">
    <label>پرونده مرتبط<select value={draft.caseId} required onChange={e=>setDraft({...draft,caseId:e.target.value})}><option value="">انتخاب پرونده</option>{cases.map(c=><option value={c.id} key={c.id}>{c.summary}</option>)}</select></label>
    <label>نوع دوقلو<select value={draft.twinType} onChange={e=>setDraft({...draft,twinType:e.target.value})}>{TYPES.map(([k,v])=><option value={k} key={k}>{v}</option>)}</select></label>
    <label>عنوان دوقلو<input required minLength={5} maxLength={180} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder="برای مثال: بوستان مرتبط با پرونده DEMO-03"/></label>
    <label>مرجع معرفی دارایی / خدمت<input required minLength={5} maxLength={400} value={draft.sourceReference} onChange={e=>setDraft({...draft,sourceReference:e.target.value})} placeholder="شناسه دارایی، نامه یا شناسنامه منبع"/></label>
    <label>ارجاع مکانی (اختیاری، بدون نقشه زنده)<input maxLength={400} value={draft.geographicReference} onChange={e=>setDraft({...draft,geographicReference:e.target.value})}/></label>
    <button disabled={busy}>ثبت دوقلوی پایه</button></form>}
   <div className="udt-list">{twins.length?twins.map(t=><button type="button" key={t.id} className={selected===t.id?'selected':''} onClick={()=>setSelected(t.id)}><strong>{t.name}</strong><small>{TYPES.find(x=>x[0]===t.twin_type)?.[1]||t.twin_type} · {t.case_summary}</small><span>{t.observation_count} مشاهده · {t.accepted_count} بررسی‌شده</span></button>):<p className="udt-muted">برای این شهرداری هنوز دوقلویی ثبت نشده است.</p>}</div>
  </div><div className="udt-panel"><h3><Activity size={17}/> مشاهدات و کیفیت داده</h3>{selectedTwin?<p className="udt-muted">دوقلوی انتخابی: <strong>{selectedTwin.name}</strong> — منبع: {selectedTwin.source_reference}</p>:<p className="udt-muted">برای ثبت مشاهده، ابتدا یک دوقلو را انتخاب کنید.</p>}
   {selectedTwin&&canWrite&&<form onSubmit={record} className="udt-form">
    <label>کد شاخص (لاتین)<input required pattern="[a-z][a-z0-9_]{2,49}" value={ob.metricCode} onChange={e=>setOb({...ob,metricCode:e.target.value})} placeholder="response_hours"/></label>
    <label>نام شاخص<input required minLength={2} maxLength={150} value={ob.metricLabel} onChange={e=>setOb({...ob,metricLabel:e.target.value})} placeholder="زمان پاسخ"/></label>
    <div className="udt-inline"><label>مقدار مشاهده<input required type="number" step="0.0001" value={ob.value} onChange={e=>setOb({...ob,value:e.target.value})}/></label><label>واحد<input required maxLength={60} value={ob.unit} onChange={e=>setOb({...ob,unit:e.target.value})} placeholder="ساعت"/></label></div>
    <label>مرجع اندازه‌گیری و شواهد<input required minLength={8} maxLength={600} value={ob.sourceReference} onChange={e=>setOb({...ob,sourceReference:e.target.value})}/></label>
    <label>توضیح تکمیلی<input maxLength={1000} value={ob.note} onChange={e=>setOb({...ob,note:e.target.value})}/></label>
    <button disabled={busy}>ثبت مشاهده با زمان فعلی</button></form>}
   <div className="udt-list udt-observations">{shown.length?shown.map(o=><article key={o.id}><div><strong>{o.metric_label}: {Number(o.measured_value).toLocaleString('fa-IR')} {o.unit}</strong><small>{extractTime(o.observed_at)} · {REVIEW[o.review_status]||o.review_status}</small></div><p><FileText size={14}/> {o.source_reference}</p>{o.review_note&&<small>یادداشت بازبین: {o.review_note}</small>}{o.review_status==='SUBMITTED'&&canReview&&<div className="udt-actions"><button type="button" disabled={busy} onClick={()=>review(o,'ACCEPT')}>پذیرش اصالت مشاهده</button><button type="button" disabled={busy} className="udt-outline" onClick={()=>review(o,'REJECT')}>رد مستند</button></div>}</article>):<p className="udt-muted">مشاهده‌ای در ۱۰۰ رکورد اخیر نمایش داده نمی‌شود.</p>}</div>
  </div></div><TwinSourcedEvidence city={city} twins={twins} api={api} access={access}/><p className="udt-foot">سقف نمایش: ۱۰۰ دوقلو و ۱۰۰ مشاهده اخیر هر شهرداری. بررسی داده، تأیید علیت، صرفه‌جویی، وضعیت ایمنی یا تأیید مالی نیست. داده خارجی ارسال نمی‌شود.</p>
 </section>;
}
