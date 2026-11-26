import React,{useEffect,useState} from 'react';
import {ArrowLeft,GitMerge,RefreshCw,ShieldAlert,Truck,ClipboardList} from 'lucide-react';
import './deputy-opportunity-exchange-v8p34.css';
const V='RHF-URBAN-OPPORTUNITY-EXCHANGE-V8P3.4';
const E=x=>encodeURIComponent(String(x||''));
export function validateExchange(x,city){
 if(!x||x.mode!==V||x.cityId!==city||x.synthetic!==true||x.verifiedPublicValue!==false||x.legalAuthorityVerified!==false||x.allocationAllowed!==false||x.autonomousDispatch!==false||
 x.confirmedCapacityMatches!==0||x.confirmedAvailableResources!==0||!Array.isArray(x.needs)||x.needs.length>50||!Array.isArray(x.capacityLeads)||x.capacityLeads.length>25||!Array.isArray(x.candidates)||x.candidates.length>25||
 !x.candidates.every(c=>c.confirmedMatch===false&&c.allocationAllowed===false&&c.verifiedValue===false&&c.estimateOfBenefit===null&&typeof c.needSourceId==='string'&&typeof c.capacitySourceId==='string'))return null;
 const needs=new Set(x.needs.map(n=>n.sourceId)),leads=new Set(x.capacityLeads.map(c=>c.sourceId));
 if(x.candidates.some(c=>!needs.has(c.needSourceId)||!leads.has(c.capacitySourceId))||x.capacityLeads.some(c=>c.availableVehicles!==null||c.availabilityVerified!==false))return null;
 return x;
}
export default function DeputyOpportunityExchangeV8P34({city,api,assignmentId=null,isSystemAdmin=false,onOpenRecord=()=>{}}){
 const [data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[epoch,setEpoch]=useState(0);
 const auth=assignmentId&&!isSystemAdmin?`?assignmentId=${E(assignmentId)}`:'';
 useEffect(()=>{if(!city)return;let active=true;setLoading(true);setError('');setData(null);
  api(`/cities/${E(city)}/org-opportunity-exchange${auth}`).then(result=>{
    if(!active)return;const valid=validateExchange(result,city);if(!valid)throw Error('پاسخ بازار فرصت با قرارداد داده و محدودیت اختیار سازگار نیست');setData(valid);
  }).catch(e=>{if(active){setData(null);setError(e?.message||'بازیابی سرنخ‌های ظرفیت ممکن نیست')}})
   .finally(()=>{if(active)setLoading(false)});return()=>{active=false};
 },[city,auth,api,epoch]);
 const needs=new Map(data?.needs.map(n=>[n.sourceId,n])||[]);
 const leads=new Map(data?.capacityLeads.map(n=>[n.sourceId,n])||[]);
 const f=n=>Number(n||0).toLocaleString('fa-IR');
 return <section className="oe34" dir="rtl" data-rhf-opportunity-exchange={V}>
  <header><div><small>V8P3.4 · RULE-BASED · READ ONLY</small><h3><GitMerge size={19}/> تبادل فرصت‌های بین‌سازمانی</h3><p>شناسایی سرنخ نیاز و ظرفیت از فرم‌های مجاز و ذخیره‌شده؛ «غیرمتوقف» به معنی آزاد یا قابل تخصیص نیست.</p></div><button type="button" disabled={loading} onClick={()=>setEpoch(v=>v+1)}><RefreshCw size={15}/> بازخوانی شواهد</button></header>
  {loading&&<p role="status">در حال دریافت شواهد محدود به حوزه مجاز...</p>}
  {error&&<p role="alert" className="oe34-error"><ShieldAlert size={17}/>{error}؛ داده ساختگی یا جایگزین نمایش داده نمی‌شود.</p>}
  {data&&<><div className="oe34-stats"><div><strong>{f(data.counts.needSignals)}</strong><span>سیگنال نیاز نمونه</span></div><div><strong>{f(data.counts.capacityLeads)}</strong><span>سرنخ ناوگان؛ تأییدنشده</span></div><div><strong>{f(data.counts.unverifiedPairings)}</strong><span>ارتباط احتمالی برای بررسی</span></div><div><strong>۰</strong><span>تخصیص و تطبیق تأییدشده</span></div></div>
    {data.partial&&<p className="oe34-warning">فقط ۲۰۰ رکورد نخست بررسی شده است؛ این آمار کل شهرداری نیست.</p>}
    <div className="oe34-grid"><div><h4><ClipboardList size={16}/> نیازهای استخراج‌شده از فرم‌های نمونه</h4>{data.needs.slice(0,20).map(n=><article key={n.sourceId}><b>{n.title}</b><small>{n.metric}: {f(n.observedSyntheticNeed)} · {n.sourceCode}</small><button type="button" onClick={()=>onOpenRecord(n.orgKey,n.sourceId)}>باز کردن پرونده <ArrowLeft size={14}/></button></article>)}{data.needs.length===0&&<p>در پرونده‌های مجاز، نیاز نمونه با قواعد تعیین‌شده یافت نشد.</p>}</div><div><h4><Truck size={16}/> سرنخ ظرفیت، نه ظرفیت آزاد</h4>{data.capacityLeads.map(c=><article key={c.sourceId}><b>{c.title}</b><small>خودرو غیرمتوقف در فرم: {f(c.recordedNonStopped)}؛ ظرفیت قابل تخصیص: نامعلوم</small><button type="button" onClick={()=>onOpenRecord(c.orgKey,c.sourceId)}>باز کردن پرونده <ArrowLeft size={14}/></button></article>)}{data.capacityLeads.length===0&&<p>رکورد ناوگان دارای سرنخ مثبت یافت نشد؛ ظرفیت آزاد استنتاج نمی‌شود.</p>}</div></div>
    <div className="oe34-pairs"><h4><GitMerge size={16}/> ارتباط‌های پیشنهادی برای راستی‌آزمایی</h4>{data.candidates.map(c=>{const a=needs.get(c.needSourceId),b=leads.get(c.capacitySourceId);return <article key={c.id}><div><strong>{a?.title} ← {b?.title}</strong><p>تطبیق نوع ناوگان، زمان، محدوده مکانی، مالکیت و مجوز قانونی هنوز بررسی نشده است.</p><small>وضعیت: REQUIRES_CAPACITY_VALIDATION · هیچ ارزش یا صرفه‌جویی تأیید نشده</small></div><div><button type="button" onClick={()=>onOpenRecord(c.needOrgKey,c.needSourceId)}>پرونده نیاز</button><button type="button" onClick={()=>onOpenRecord(c.capacityOrgKey,c.capacitySourceId)}>پرونده ناوگان</button></div></article>})}{data.candidates.length===0&&<p>هنوز زوج قابل بررسی از داده‌های آزمایشی موجود شکل نگرفته است.</p>}</div>
    <footer><ShieldAlert size={16}/> {data.caveat} هیچ دستور اعزام، انتقال ظرفیت، پرداخت، ثبت تصمیم یا تأیید ارزش از این صفحه صادر نمی‌شود.</footer>
   </>}
 </section>;
}
