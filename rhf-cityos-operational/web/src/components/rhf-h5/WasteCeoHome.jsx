import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Activity,ArrowLeft,AlertTriangle,BrainCircuit,CheckCircle2,ClipboardList,FileCheck2,FlaskConical,GitBranch,LockKeyhole,RefreshCw,Scale,ShieldCheck,Target,Truck,Users,Wrench} from 'lucide-react';
import {CEO_VERSION,BOARD_DOMAINS,SCENARIO,readExecutiveRows,executiveBoard,instructionalOverview,describeSource,kpiValue,openTargetForScenario,executiveReportCsv} from './waste-ceo-core.mjs';
import {AGENTS,FLOWS} from './waste-lab-ui-core.mjs';
import './waste-ceo.css';
const E=s=>encodeURIComponent(String(s||''));
const f=n=>typeof n==='number'&&Number.isFinite(n)?new Intl.NumberFormat('fa-IR',{maximumFractionDigits:1}).format(n):'ثبت نشده';
const DOMAIN_ICON={COLLECTION:Scale,FLEET:Truck,MAINTENANCE:Wrench,CONTRACTOR:FileCheck2,CONTRACT_EVAL:Activity,SHIFT:Users,QUALITY:CheckCircle2,FACILITY:FileCheck2,EDUCATION:Users,VIOLATION:LockKeyhole,LEGAL:LockKeyhole};
const sourceTag=x=>x==='SERVER_SYNTHETIC'?'داده نمونه ذخیره‌شده':x==='UNPERSISTED_EXAMPLE'?'نمونه آموزشیِ ذخیره‌نشده':'نامشخص';
export default function WasteCeoHome({city,api,assignment=null,isSystemAdmin=false,onOpen=()=>{},onCity=()=>{}}){
 const assignmentId=assignment?.assignmentId||'';
 const [snapshot,setSnapshot]=useState(null),[status,setStatus]=useState('loading'),[error,setError]=useState(''),[loading,setLoading]=useState(false),[revision,setRevision]=useState(0);
 const seq=useRef(0);
 useEffect(()=>{let active=true;const curr=++seq.current;setSnapshot(null);setStatus('loading');setError('');
  const url=`/cities/${E(city)}/org-waste-lab${assignmentId?`?assignmentId=${E(assignmentId)}`:''}`;
  api(url).then(x=>{if(!active||curr!==seq.current)return;setSnapshot(readExecutiveRows(x,city));setStatus('ready')}).catch(e=>{if(!active||curr!==seq.current)return;setStatus('error');setError(e.message||'سرور آزمایشگاه در دسترس نیست')});
  return()=>{active=false};
 },[city,assignmentId,revision,api]);
 const board=useMemo(()=>snapshot?.phase==='LOADED'&&snapshot.rows.length?executiveBoard(snapshot):snapshot?.phase==='LOADED'?instructionalOverview():null,[snapshot]);
 const loaded=board?.source==='SERVER_SYNTHETIC';
 const pending=loaded?kpiValue(board,'pending'):null;
 const recordCount=loaded?kpiValue(board,'records'):null;
 const findings=loaded?board.findings:SCENARIO;
 async function seed(){if(!isSystemAdmin||!snapshot?.canSeed||loading)return;
  if(!window.confirm('۱۶ سناریوی کاملاً ساختگی به آزمایشگاه شیراز اضافه شود؟ این داده‌ها هرگز ارزش شهری واقعی یا عملیات میدانی محسوب نمی‌شوند.'))return;
  setLoading(true);setError('');try{const r=await api(`/cities/${E(city)}/org-waste-lab`,'POST',{action:'SEED'});if(r?.mode!=='RHF-WASTE-LAB-V7.5'||r?.synthetic!==true)throw Error('رسید بارگذاری آزمایشگاه معتبر نیست');setRevision(x=>x+1)}catch(e){setError(e.message||'بارگذاری داده نمونه ناموفق بود')}finally{setLoading(false)}
 }
 function downloadReport(){if(!loaded)return;const csv=executiveReportCsv(board);const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='RHF-Waste-CEO-V76-SYNTHETIC.csv';document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}
 const go=(tab,domain=null,kind=null,agent=null)=>onOpen({tab,domain,kind,agent});
 return <section className="rh76" dir="rtl" data-rhf-ceo-home={CEO_VERSION}>
  <div className="rh76-intro"><div><span className="rh76-overline">میزکار اجرایی مدیرعامل · شهرداری شیراز / پایلوت</span><h3>امروز چه کاری باید انجام دهم؟</h3><p>از یک صفحه، وضعیت سازمان را ببینید؛ پرونده هر حوزه، تحلیل عامل، درخواست BPMS و فرصت ارزش را باز کنید. هیچ عددی در این صفحه عملکرد واقعی نیست.</p></div><div className="rh76-actions">{loaded&&<button type="button" onClick={downloadReport}><FileCheck2 size={16}/> گزارش آموزشی CSV</button>}<button type="button" onClick={()=>setRevision(x=>x+1)} disabled={loading}><RefreshCw size={17}/> بازخوانی</button>{isSystemAdmin&&<button type="button" className="rh76-primary" onClick={seed} disabled={loading||!snapshot?.canSeed}><FlaskConical size={17}/> {loading?'در حال بارگذاری':'بارگذاری ۱۶ سناریوی نمونه'}</button>}</div></div>
  <div className={'rh76-source '+(loaded?'rh76-source-loaded':'')}><ShieldCheck size={18}/><span>{board?describeSource(board):'در حال دریافت داده آزمایشگاهی از سرور'}</span><strong>{board?sourceTag(board.source):'در انتظار'}</strong></div>
  {status==='error'&&<div role="alert" className="rh76-error">خطای خواندن از API: {error}. اعداد آموزشی جایگزین پاسخ نامعتبر سرور نشده‌اند؛ پس از بررسی اتصال، بازخوانی کنید.</div>}
  {status!=='error'&&error&&<div role="alert" className="rh76-error">{error}</div>}
  {board&&<>
  <div className="rh76-kpis">
   {[['سوابق نمونه',recordCount,'domains'],['درخواست در انتظار',pending,'flows'],['یافته‌های عامل',loaded?kpiValue(board,'agents'):null,'agents'],['ارزش شهری محقق‌شده',null,'value']].map(([label,value,target],i)=>
    <button type="button" key={label} onClick={()=>go(target)} className="rh76-kpi"><small>{label}</small><strong>{i===3?'تأیید نشده':value===null?'هنوز ثبت نشده':f(value)}</strong><span>{loaded?'آزمایشگاه ذخیره‌شده':'در صورت بارگذاری نمونه، قابل مشاهده'} <ArrowLeft size={14}/></span></button>)}
  </div>
  <div className="rh76-grid-two">
   <section className="rh76-panel"><div className="rh76-heading"><div><h4>اولویت‌های قابل پیگیری</h4><p>هشدارهای نمونه یا یافته‌های محاسبه‌شده از رکوردهای ساختگی</p></div><button type="button" onClick={()=>go('agents')}>همه عامل‌ها <ArrowLeft size={14}/></button></div>
    <div className="rh76-task-list">{findings.slice(0,5).map((item,i)=>{const x=loaded?{id:item.id,title:item.title,detail:item.reason,domain:item.domain}:item;return <article key={x.id}><span className="rh76-num">{f(i+1)}</span><div><strong>{x.title}</strong><p>{x.detail}</p><small>{loaded?'استخراج‌شده از داده نمونه سرور':'سناریوی توضیحی؛ بدون رکورد ذخیره‌شده'}</small></div><button type="button" onClick={()=>{const target=openTargetForScenario(x);go(target.tab,target.domain)}}>بررسی <ArrowLeft size={14}/></button></article>})}{findings.length===0&&<div className="rh76-empty">برای داده‌های دریافتی یافته‌ای ثبت نشده است؛ این نتیجه نبود مسئله واقعی را ثابت نمی‌کند.</div>}</div>
   </section>
   <section className="rh76-panel"><div className="rh76-heading"><div><h4>سنجش عملکرد فرضی</h4><p>تحلیل داده آزمایشگاهی، نه گزارش عملیات واقعی</p></div><button type="button" onClick={()=>go('value')}>خلق ارزش <ArrowLeft size={14}/></button></div>
     <div className="rh76-illustration"><span>نمونه مطالعه: کاهش توقف ناوگان</span><div><strong>۱۲ ساعت</strong><ArrowLeft size={20}/><strong>۸ ساعت</strong></div><p>هدف فرضی: کاهش ۴ ساعت توقف، معادل ۳۳٫۳٪. قبل از تصمیم، باید خط مبنا، ظرفیت قابل استفاده و شواهد مستقل تأیید شوند.</p></div>
     <div className="rh76-mini-metrics">{(loaded?board.kpis||[]:[{domain:'COLLECTION',label:'وزن نمونه توزین',value:500,unit:'کیلوگرم'},{domain:'CONTRACT_EVAL',label:'تحقق فرضی خدمات',value:78,unit:'درصد'},{domain:'QUALITY',label:'قبولی فرضی بازرسی',value:76.7,unit:'درصد'}]).slice(0,4).map(k=><button type="button" key={k.domain} onClick={()=>go('domains',k.domain)}><small>{k.label}</small><strong>{k.value===null?'نامشخص':f(k.value)} <em>{k.unit}</em></strong></button>)}</div>
   </section>
  </div>
  <section className="rh76-panel"><div className="rh76-heading"><div><h4>واحدها، فرم‌ها و ابزارهای تخصصی</h4><p>هر کارت به فرم، سوابق و ابزار محاسبه همان حوزه متصل است؛ موارد محرمانه تابع مجوز سرور هستند.</p></div><button type="button" onClick={()=>go('domains')}>نمایش همه <ArrowLeft size={14}/></button></div>
   <div className="rh76-domain-grid">{BOARD_DOMAINS.map(d=>{const Icon=DOMAIN_ICON[d.id]||Activity;const a=board.areas.find(x=>x.id===d.id);const locked=a?.locked===true;return <button type="button" key={d.id} onClick={()=>go('domains',d.id)} className={locked?'rh76-domain-locked':''}><Icon size={21}/><b>{d.label}</b><small>{locked?'نیازمند مجوز تخصصی':loaded?`${f(a?.count??0)} رکورد نمونه`:'فرم و ابزار آموزشی'}</small><ArrowLeft size={14}/></button>})}</div>
  </section>
  <div className="rh76-grid-two">
   <section className="rh76-panel"><div className="rh76-heading"><div><h4>عامل‌های تخصصی سازمان</h4><p>تحلیل شفاف و قابل توضیح؛ اجرای خودکار وجود ندارد</p></div><button type="button" onClick={()=>go('agents')}>گزارش کامل <ArrowLeft size={14}/></button></div><div className="rh76-agent-grid">{AGENTS.map(([id,name,domain])=><button type="button" key={id} onClick={()=>go('agents',null,null,id)}><BrainCircuit size={17}/><span>{name}</span><small>مشاهده تحلیل <ArrowLeft size={12}/></small></button>)}</div></section>
   <section className="rh76-panel"><div className="rh76-heading"><div><h4>فرایندها و تصمیم‌های انسانی</h4><p>{loaded?`${f(board.counts.flows)} فرایند نمونه · ${f(board.counts.pending)} مورد در انتظار بازبینی`:'۸ الگوی آماده ثبت گردش‌کار آزمایشی'}</p></div><span className="rh76-heading-links"><button type="button" onClick={()=>go('flows')}>ورود به BPMS <ArrowLeft size={14}/></button><button type="button" onClick={()=>go('review')}>صف بررسی <ArrowLeft size={14}/></button></span></div><div className="rh76-flow-grid">{FLOWS.slice(0,7).map(([id,name])=><button type="button" key={id} onClick={()=>go('flows',null,id)}><GitBranch size={16}/>{name}<ArrowLeft size={13}/></button>)}</div></section>
  </div>
  <section className="rh76-panel rh76-bottom"><div><h4>گزارش منتخب برای معاون خدمات شهری و شهردار</h4><p>در این مرحله صرفاً داده سازمانی آزمایشی قابل گزارش‌گیری است. خلاصه مدیریتی قابل انتشار به معاون و شهردار نیازمند API تجمیعی مجاز و تأیید کیفیت داده است.</p></div>{isSystemAdmin?<button type="button" onClick={()=>onCity()}>بازگشت به فرماندهی شهرداری <ArrowLeft size={16}/></button>:<small className="rh76-scope-note">نمای شهردار و معاونت فقط از مسیر گزارش تجمیعیِ دارای مجوز قابل ارائه است.</small>}</section>
  </>}
 </section>;
}
