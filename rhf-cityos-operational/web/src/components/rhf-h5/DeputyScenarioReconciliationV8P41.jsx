import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,CheckCircle2,ClipboardCheck,Database,Download,FileWarning,RefreshCw,ShieldAlert,ShieldCheck} from 'lucide-react';
import {RECONCILIATION_VERSION,reconcileScenarioDossiers,reconciliationReport,EXPECTED_RECONCILIATION_RECORDS} from './scenario-reconciliation-v8p41-core.mjs';
import './scenario-reconciliation-v8p41.css';
const n=x=>new Intl.NumberFormat('fa-IR').format(x);
export default function DeputyScenarioReconciliationV8P41({city,board,onScenario=()=>{},onOpenRecord=()=>{}}){
 const [open,setOpen]=useState(false),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[active,setActive]=useState('ALL');
 const token=useRef(0);
 useEffect(()=>{token.current++;setResult(null);setError('');setOpen(false);setActive('ALL');return()=>{token.current++}},[city]);
 useEffect(()=>{token.current++;setResult(null);setError('');},[board]);
 async function inspect(){const id=++token.current;setBusy(true);setError('');setResult(null);
  try{const r=await reconcileScenarioDossiers(board,city);if(id!==token.current)return;
   if(r.mode==='UNAVAILABLE')throw Error(`قرارداد یا دامنه داده معتبر نیست (${r.reason})`);
   setResult(r);
  }catch(e){if(id===token.current)setError(e?.message||'بررسی تطبیق داده انجام نشد');}
  finally{if(id===token.current)setBusy(false)}
 }
 function toggle(){if(open){token.current++;setBusy(false);setResult(null);setError('')}setOpen(x=>!x)}
 function exportEvidence(){if(!result)return;const json=JSON.stringify(reconciliationReport(result,new Date().toISOString()),null,2);
  const blob=new Blob([json],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`RHF-V8P41-DATA-RECONCILIATION-${String(city).slice(0,36)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 const activeScenarios=result?.scenarios.filter(s=>active==='ALL'||s.id===active)||[];
 return <section className="sr41" dir="rtl" data-rhf-scenario-reconciliation={RECONCILIATION_VERSION} aria-label="تطبیق مستقل هویت پرونده‌های سناریویی">
  <header className="sr41-head"><div><small>DATA INTEGRITY / V8P4.1 · CITY-SCOPED · READ ONLY</small><h3>ممیزی ۲۸ پرونده سناریویی و منشأ داده</h3><p>کنترل هم‌زمان شناسه قطعی، کد پرونده، حوزه، عنوان، فیلدهای اصلی و ارجاع هر سناریو. این بررسی، تأیید مستقل ارزش شهری نیست.</p></div><button type="button" aria-expanded={open} onClick={toggle}>{open?'بستن ممیزی':'بازکردن ممیزی دقیق'} <ArrowLeft size={16}/></button></header>
  <div className="sr41-boundary"><ShieldCheck size={16}/> فقط رکوردهای مجاز دریافت‌شده از PostgreSQL؛ هیچ درخواست POST/PATCH، تخصیص ناوگان، تصمیم خودکار یا ادعای ارزش عمومی انجام نمی‌شود.</div>
  {open&&<div className="sr41-body">
   <div className="sr41-actions"><button type="button" onClick={inspect} disabled={busy||!city}><RefreshCw size={16}/> {busy?'در حال تطبیق...':'اجرای تطبیق دقیق ۲۸ رکورد'}</button><button type="button" onClick={onScenario}><Database size={16}/> آزمایشگاه سناریوها</button>{result&&<button type="button" onClick={exportEvidence}><Download size={16}/> خروجی JSON بدون داده پرونده</button>}</div>
   {error&&<p className="sr41-error" role="alert"><ShieldAlert size={16}/>{error}</p>}
   {result&&<>
     {result.partial&&<p role="alert" className="sr41-error">API فقط ۲۰۰ پرونده برمی‌گرداند؛ حتی تطبیق همه رکوردهای قابل مشاهده به‌معنای کامل‌بودن داده‌های شهرداری نیست.</p>}
     <div className="sr41-metrics"><div><b>{n(result.matched)} / {n(EXPECTED_RECONCILIATION_RECORDS)}</b><span>رکورد با تطبیق کامل</span></div><div><b>{n(result.missing)}</b><span>غایب از داده دریافتی</span></div><div><b>{n(result.conflicts+result.unexpectedRefs)}</b><span>مغایرت یا ارجاع ناشناس</span></div><div><b>{n(result.scenariosPassed)} / ۹</b><span>سناریوهای تطبیق‌شده</span></div></div>
     <p className={result.complete?'sr41-good':'sr41-warning'} role="status">{result.complete?<><CheckCircle2 size={16}/> مجموعه ۲۸ پرونده آموزشیِ دریافت‌شده با کتابخانه سناریویی تطبیق دارد؛ پذیرش عملیاتی مستقل هنوز لازم است.</>:<><FileWarning size={16}/> داده‌های آموزشی ناقص یا مغایرند. تعداد ارجاع‌های موجود به‌تنهایی برای اعلام تکمیل کفایت نمی‌کند.</>}</p>
     <div className="sr41-scene-filter"><button type="button" aria-pressed={active==='ALL'} onClick={()=>setActive('ALL')}>همه سناریوها</button>{result.scenarios.map(s=><button type="button" key={s.id} aria-pressed={active===s.id} onClick={()=>setActive(s.id)}>{s.id} · {s.matched}/{s.expected}</button>)}</div>
     <div className="sr41-scenarios">{activeScenarios.map(s=><article key={s.id}><div className="sr41-scenario-head"><div><b>{s.id} · {s.title}</b><small>{n(s.matched)} / {n(s.expected)} پرونده تطبیق‌شده</small></div><span className={s.complete?'sr41-state-ok':'sr41-state-wait'}>{s.complete?'MATCHED':'REVIEW REQUIRED'}</span></div><div className="sr41-records">{s.records.map(r=><div key={r.recordId}><div><b>{r.title}</b><small>{r.orgKey} · {r.recordId}</small></div><span className={r.status==='MATCH'?'sr41-green':'sr41-amber'}>{r.status==='MATCH'?'تطبیق معتبر':r.reason}</span>{r.storedId&&<button type="button" onClick={()=>onOpenRecord(r.orgKey,r.storedId)}><ArrowLeft size={15}/> پرونده</button>}</div>)}</div></article>)}</div>
     <p className="sr41-foot"><ClipboardCheck size={15}/> این ممیزی، فقط انطباق داده مصنوعی در پاسخ فعلی API را نشان می‌دهد؛ کنترل چندمستاجری، خودتأییدی، امنیت واقعی و نتیجه عملیات نیازمند آزمون مستقل است.</p>
    </>}
  </div>}
 </section>;
}
