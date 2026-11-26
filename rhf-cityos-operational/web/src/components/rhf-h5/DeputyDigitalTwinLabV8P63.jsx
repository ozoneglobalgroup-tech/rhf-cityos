import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,BarChart3,BookOpenCheck,CheckCircle2,ChevronDown,ClipboardCopy,Database,Layers3,MapPin,RefreshCw,ShieldAlert,ShieldCheck,SlidersHorizontal,Target,Workflow,X} from 'lucide-react';
import {TWIN_LAB_VERSION,EXPERIMENT_SOURCE,TWIN_SOURCE,STARTER_CASES,PRESETS,LIMITS,analyzeWhatIf,validateTwinRead,twinReadiness,decisionMemo} from './deputy-twin-lab-v8p63-core.mjs';
import './deputy-twin-lab-v8p63.css';
const e=x=>encodeURIComponent(String(x??''));
const fa=x=>new Intl.NumberFormat('fa-IR').format(x);
const labels={demand:'شدت تقاضای خدمت',capacity:'ظرفیت قابل استفاده',efficiency:'کارایی فرایند'};
const variants=[{id:'BASE',label:'وضع فرضی پایه',color:'#226DB4'},{id:'OPT',label:'بهبود فرایند',color:'#089949'},{id:'CAP',label:'تقویت ظرفیت',color:'#F9B21D'},{id:'CUSTOM',label:'انتخاب مدیر',color:'#E42527'}];
export default function DeputyDigitalTwinLabV8P63({city,cityName,api,onDecisions=()=>{},onValues=()=>{},onPortfolio=()=>{},onAgents=()=>{},onClose=()=>{}}){
 const [domainKey,setDomainKey]=useState('WASTE'),[region,setRegion]=useState('کل شهر'),[drivers,setDrivers]=useState({demand:140,capacity:100,efficiency:100}),[refreshing,setRefreshing]=useState(false),[status,setStatus]=useState('IDLE'),[snapshot,setSnapshot]=useState(null),[twinId,setTwinId]=useState(''),[error,setError]=useState(''),[copyStatus,setCopyStatus]=useState('');
 const seq=useRef(0);
 useEffect(()=>{seq.current++;setSnapshot(null);setTwinId('');setStatus('IDLE');setError('')},[city]);
 const scope=useMemo(()=>cityName?.includes('شیراز')?['کل شهر',...Array.from({length:11},(_,i)=>`منطقه ${fa(i+1)}`),'ناحیه ویژه باغات']:['کل شهر'],[cityName]);
 const domain=STARTER_CASES.find(x=>x.key===domainKey)||STARTER_CASES[0];
 const rows=useMemo(()=>variants.map((v,i)=>{const config=i===3?drivers:PRESETS[i];return {...v,config,metrics:analyzeWhatIf(config)}}),[drivers]);
 const readiness=twinReadiness(snapshot);
 const activeTwin=snapshot?.twins.find(t=>t.id===twinId)||snapshot?.twins[0]||null;
 const latest=activeTwin?snapshot.acceptedObservations.filter(x=>x.twinId===activeTwin.id).slice(0,3):[];
 async function loadTwin(){
  if(!city||typeof api!=='function'){setStatus('ERROR');setError('نشست و شهرداری معتبر برای دریافت داده وجود ندارد');return;}
  const current=++seq.current;setRefreshing(true);setStatus('LOADING');setSnapshot(null);setError('');setTwinId('');
  try{const root=`/cities/${e(city)}`;const [twins,obs,sources,samples]=await Promise.all([
   api(`${root}/digital-twins`),api(`${root}/twin-observations`),api(`${root}/twin-data-sources`),api(`${root}/twin-source-samples`)
  ]);
   if(current!==seq.current)return;
   const data=validateTwinRead(city,twins,obs,sources,samples);
   if(!data)throw Error('INVALID_SCOPE_OR_RESPONSE');
   setSnapshot(data);setStatus('READY');setTwinId(data.twins[0]?.id||'');
  }catch{if(current===seq.current){setStatus('ERROR');setError('پاسخ دوقلو یا شواهد، با دامنه شهرداری و قرارداد داده سازگار نیست؛ داده آموزشی جایگزین نشده است.')}}
  finally{if(current===seq.current)setRefreshing(false)}
 }
 async function copyMemo(){
  const cfg={...drivers,name:'انتخاب مدیر'},memo=decisionMemo({cityName,domain,region,preset:cfg,result:analyzeWhatIf(cfg),reference:latest.length?`${latest[0].metric} / ${latest[0].at} / ${latest[0].sourceRef}`:''});
  try{if(!navigator?.clipboard?.writeText)throw Error('NO_CLIPBOARD');await navigator.clipboard.writeText(memo);setCopyStatus('برگه آزمایشی کپی شد؛ هیچ تصمیمی ثبت نشده است.')}catch{setCopyStatus('کپی خودکار مجاز نیست؛ از مسیر امن مرورگر استفاده کنید.')} }
 return <section className="dt63" dir="rtl" data-rhf-twin-lab={TWIN_LAB_VERSION} data-experiment-source={EXPERIMENT_SOURCE} aria-label="آزمایشگاه سناریو و دوقلوی دیجیتال">
 <header className="dt63-head"><div className="dt63-heading"><span><Layers3 size={17}/> DIGITAL TWIN / WHAT-IF DECISION LAB</span><h3>قبل از تصمیم، آینده‌های ممکن را مقایسه کنید</h3><p>آزمایش اثر تغییر تقاضا، ظرفیت و کارایی در ۱۲ حوزه معاونت؛ بدون ادعای پیش‌بینی قطعی.</p></div><button type="button" aria-label="بستن آزمایشگاه" className="dt63-close" onClick={onClose}><X size={19}/></button></header>
 <div className="dt63-proof"><ShieldCheck size={17}/><span>دو لایه مستقل: <b>شبیه‌سازی نسبی آموزشی</b> و <b>شواهد ثبت‌شده دوقلوی واقعی</b>. داده واقعی فقط پس از درخواست صریح شما خوانده می‌شود و مدل هنوز کالیبره نیست.</span><span className="dt63-not-real">{EXPERIMENT_SOURCE}</span></div>
 <div className="dt63-controls"><label>حوزه مدیریت<select value={domainKey} onChange={ev=>setDomainKey(ev.target.value)}>{STARTER_CASES.map(x=><option key={x.key} value={x.key}>{x.name}</option>)}</select></label><label>محدوده فرضی<select value={region} onChange={ev=>setRegion(ev.target.value)}>{scope.map(x=><option key={x}>{x}</option>)}</select></label><div className="dt63-scope"><MapPin size={17}/><span>{cityName||'شهرداری جاری'}<small>محدوده انتخابی فرض شبیه‌سازی است؛ انتساب GIS معتبر نیست.</small></span></div></div>
 <div className="dt63-topline"><span>سؤال مدیریتی این حوزه</span><strong>{domain.question}</strong><small>شاخص خروجی: {domain.measure} · فقط نسبت عددی بدون کالیبراسیون</small></div>
 <div className="dt63-workbench"><div className="dt63-param-panel"><div className="dt63-section-head"><SlidersHorizontal size={18}/><h4>فرضیات قابل تغییر</h4></div><p>۱۰۰٪ نقطه مرجع آموزشی است؛ هیچ‌کدام به‌طور خودکار از داده زنده برداشت نشده‌اند.</p>
 {Object.entries(labels).map(([key,label])=><label className="dt63-driver" key={key}><span><b>{label}</b><strong>{fa(drivers[key])}٪</strong></span><input type="range" min={LIMITS[key][0]} max={LIMITS[key][1]} step="5" value={drivers[key]} onChange={v=>setDrivers(p=>({...p,[key]:Number(v.target.value)}))}/><small>{fa(LIMITS[key][0])}٪ تا {fa(LIMITS[key][1])}٪</small></label>)}
 <div className="dt63-presets">{[...PRESETS.slice(1),{id:'RESET',name:'بازنشانی',demand:100,capacity:100,efficiency:100}].map(p=><button type="button" key={p.id} onClick={()=>setDrivers({demand:p.demand,capacity:p.capacity,efficiency:p.efficiency})}>{p.name}</button>)}</div>
 </div><section className="dt63-results" aria-label="مقایسه سناریوها"><div className="dt63-section-head"><BarChart3 size={18}/><h4>مقایسه چهار مسیر احتمالی</h4></div><p>نمودارها شاخص‌های نسبیِ حاصل از فرمول ساده‌اند؛ هزینه و صرفه‌جویی واقعی برآورد نشده و پیش‌بینی معتبر کیفیت خدمت نیستند.</p><div className="dt63-result-table"><div className="dt63-result-heading"><span>سناریو</span><span>پوشش</span><span>فشار</span><span>ریسک نسبی</span></div>{rows.map(r=><div className={`dt63-result-row ${r.id==='CUSTOM'?'dt63-selected':''}`} key={r.id}><b><i style={{background:r.color}}/>{r.label}</b><span title="شاخص نسبی پوشش">{fa(r.metrics.coverage)}</span><span>{fa(r.metrics.pressure)}</span><span>{fa(r.metrics.riskIndex)}</span></div>)}</div><div className="dt63-bars"><small>مقایسه شاخص نسبی پوشش</small>{rows.map(r=><div className="dt63-bar" key={r.id}><span>{r.label}</span><div><i style={{width:`${Math.min(100,r.metrics.coverage/2)}%`,background:r.color}}/></div><b>{fa(r.metrics.coverage)}</b></div>)}</div><div className="dt63-footnote"><ShieldAlert size={16}/> بالا بودن شاخص پوشش به‌تنهایی به معنی بهترین تصمیم نیست؛ هزینه، دسترسی قانونی، کیفیت داده، ریسک و عدالت مکانی باید جداگانه بررسی شوند.</div></section></div>
 <div className="dt63-data"><div className="dt63-data-head"><div><span><Database size={18}/> RUVOS / DIGITAL TWIN SOURCE</span><h4>آیا داده واقعی برای تصمیم کافی است؟</h4><p>دوقلوها، مشاهده‌های پذیرفته‌شده و منابع GIS/IoT ثبت‌شده همین شهرداری</p></div><button type="button" disabled={refreshing} onClick={loadTwin}><RefreshCw size={16}/>{refreshing?'در حال دریافت':'خواندن منابع مجاز'}</button></div>
 {status==='IDLE'&&<div role="status" className="dt63-empty">داده‌ای هنوز دریافت نشده است. این بخش هیچ اتصال زنده‌ای را فرض نمی‌کند.</div>}
 {status==='LOADING'&&<div role="status" className="dt63-empty">در حال اعتبارسنجی دامنه و دریافت تصویر لحظه‌ای ثبت‌شده…</div>}
 {status==='ERROR'&&<div role="alert" className="dt63-error">{error}</div>}
 {status==='READY'&&snapshot&&<><div className="dt63-readiness"><b>{readiness.detail}</b><small>{TWIN_SOURCE} · LIVE IOT: {snapshot.liveConnected ? 'YES' : 'NO'} · MODEL CALIBRATED: NO</small>{snapshot.limited&&<em>فهرست‌ها سقف ۱۰۰ رکورد دارند؛ پوشش کامل شهر نتیجه نمی‌شود.</em>}</div><div className="dt63-kpis"><div><b>{fa(snapshot.twins.length)}</b><span>دوقلوی ثبت‌شده</span></div><div><b>{fa(snapshot.approvedSources)}</b><span>منبع تأییدشده</span></div><div><b>{fa(snapshot.acceptedObservations.length+snapshot.acceptedSourceSamples)}</b><span>مشاهده پذیرفته‌شده در پاسخ</span></div></div>{snapshot.twins.length>0&&<><label className="dt63-twin-select">دوقلوی مرتبط<select value={activeTwin?.id||''} onChange={ev=>setTwinId(ev.target.value)}>{snapshot.twins.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>{activeTwin&&<div className="dt63-twin-meta"><MapPin size={16}/><span>مرجع جغرافیایی ثبت‌شده: {activeTwin.geographicReference||'تعیین نشده'}</span></div>}{latest.length?<div className="dt63-observations">{latest.map((o,i)=><article key={`${o.twinId}-${o.at}-${i}`}><span>{o.metric}</span><b>{o.value} {o.unit}</b><small>{o.at.slice(0,10)} · {o.sourceRef||'بدون مرجع نمایشی'} · مرور منشأ، نه کالیبراسیون</small></article>)}</div>:<div className="dt63-empty">مشاهده پذیرفته‌شده برای دوقلوی انتخابی در پاسخ وجود ندارد.</div>}</>}</>}
 <div className="dt63-data-guard"><ShieldAlert size={16}/> تأیید مشاهده یعنی بررسی منشأ داده؛ نه اتصال زنده، صحت مدل پیش‌بینی یا اثبات منفعت عمومی.</div></div>
 <div className="dt63-actions"><button className="dt63-primary" type="button" onClick={copyMemo}><ClipboardCopy size={16}/> کپی برگه مقایسه برای مدیر</button><button type="button" onClick={onDecisions}><Workflow size={16}/> مسیر تصمیم و مجوز</button><button type="button" onClick={onPortfolio}><Database size={16}/> پرونده‌های مرتبط</button><button type="button" onClick={onValues}><Target size={16}/> شواهد ارزش شهری</button><button type="button" onClick={onAgents}><BookOpenCheck size={16}/> مرکز ایجنت‌ها</button></div>{copyStatus&&<p role="status" className="dt63-copied">{copyStatus}</p>}
 <footer>این نسخه «Sandbox تصمیم» است؛ بدون ذخیره سناریو در پایگاه داده، تغییر مأموریت، اجرای Temporal، دستور به ایجنت یا خلق ارزش شهریِ تأییدشده.</footer>
 </section>;
}
