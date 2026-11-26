import React,{useEffect,useState} from 'react';
import {BarChart3,Download,RefreshCw,ShieldCheck} from 'lucide-react';
import {validatedRollup,reportCsv,ROLLUP_DOMAINS} from './waste-rollup-core.mjs';
import './waste-role-demo.css';
const enc=v=>encodeURIComponent(String(v||''));
export default function WasteRollupPanel({city,assignment,api}){
 const [data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[rev,setRev]=useState(0);
 useEffect(()=>{let live=true;setData(null);setError('');setLoading(true);
  api(`/cities/${enc(city)}/org-waste-rollup?assignmentId=${enc(assignment.assignmentId)}`).then(d=>{if(live)setData(validatedRollup(d,assignment,city))}).catch(e=>{if(live)setError(e.message||'خطای دریافت گزارش مجاز')}).finally(()=>{if(live)setLoading(false)});
  return()=>{live=false};
 },[city,assignment.assignmentId,rev,api]);
 function download(){if(!data)return;const blob=new Blob([reportCsv(data)],{type:'text/csv;charset=utf-8'});const href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download=`RHF-Executive-${data.scope.positionCode}-SYNTHETIC.csv`;document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(href),1000)}
 return <section className="rh77-rollup" dir="rtl" data-rhf-rollup="V7.7"><div className="rh77-rollup-head"><div><h3><BarChart3 size={19}/> خلاصه منتخب سازمان پسماند</h3><p>محدود به سمت تأییدشده شما؛ فقط رکوردهای ساختگی آزمایشگاه و بدون پرونده‌های محرمانه</p></div><div><button type="button" onClick={()=>setRev(x=>x+1)}><RefreshCw size={15}/> بازخوانی</button><button type="button" disabled={!data} onClick={download}><Download size={15}/> خروجی CSV</button></div></div>
 {loading&&<p className="rh77-help">در حال دریافت گزارش از سرور با کنترل انتصاب ...</p>}
 {error&&<div className="rh77-error" role="alert">{error} — هیچ عدد آموزشی جایگزین پاسخ نامعتبر سرور نشده است.</div>}
 {data&&<><div className="rh77-reports"><article><small>سوابق آزمایشگاهی</small><strong>{data.counts.records.toLocaleString('fa-IR')}</strong></article><article><small>فرایندهای نمونه</small><strong>{data.counts.flows.toLocaleString('fa-IR')}</strong></article><article><small>در انتظار بازبینی</small><strong>{data.counts.pending.toLocaleString('fa-IR')}</strong></article><article><small>ارزش عمومیِ مستقلاً تأییدشده</small><strong>تأیید نشده</strong></article></div><div className="rh77-domain-report">{ROLLUP_DOMAINS.map(([id,label])=><div key={id}><span>{label}</span><b>{data.counts.domains[id].toLocaleString('fa-IR')}</b></div>)}</div><p className="rh77-help"><ShieldCheck size={15}/> این آمار برای آموزش و نمایش ساختار تجمیع است. حقوقی، تخلفات، داده‌های فردی، تصمیم‌های اجرایی و شواهد میدانی در این خروجی وجود ندارند.</p></>}
 </section>
}
