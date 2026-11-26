import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,RefreshCcw,ShieldCheck,ClipboardList,Clock3,AlertTriangle,UserRound} from 'lucide-react';
import './h8-my-work.css';
const KNOWN=new Set(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR','AUDITOR']);
const labels={PROPOSED:'منتظر بررسی',AUTHORIZED:'تأییدشده',EXECUTED:'پیگیری داخلی ثبت‌شده',REJECTED:'ردشده',CANCELLED:'لغوشده'};
const safeText=(x,empty='—')=>typeof x==='string'&&x.trim()?x.slice(0,220):empty;
const ftime=s=>{const d=new Date(s);return Number.isFinite(d.valueOf())?new Intl.DateTimeFormat('fa-IR',{dateStyle:'short'}).format(d):'—'};
export default function H8MyWork({city,api,navigate}){
 const apiRef=useRef(api);apiRef.current=api;
 const request=useRef(0);
 const [revision,refresh]=useState(0),[tab,setTab]=useState('review');
 const [state,setState]=useState({loading:false,data:null,error:''});
 useEffect(()=>{
  const current=++request.current;
  if(!city||typeof apiRef.current!=='function'){
    setState({loading:false,data:null,error:'شهرداری انتخاب نشده یا اتصال احرازشده API در دسترس نیست.'});
    return()=>{request.current++};
  }
  setState({loading:true,data:null,error:''});
  Promise.resolve().then(()=>apiRef.current(`/cities/${encodeURIComponent(city)}/my-work`))
   .then(data=>{
     if(current!==request.current)return;
     if(!data||data.mode!=='READ_ONLY'||data.scope!==city||!KNOWN.has(data.role)||
       !Array.isArray(data.myProposals?.rows)||!Array.isArray(data.eligibleReviewQueue?.rows)||
       data.executionEnabled!==false||data.autoWrites!==0){
       setState({loading:false,data:null,error:'پاسخ API صندوق کار معتبر نیست.'});return;
     }
     setState({loading:false,data,error:''});
   }).catch(e=>{if(current===request.current)setState({loading:false,data:null,error:safeText(e?.message,'خطا در دریافت صندوق کار')})});
  return()=>{request.current++};
 },[city,revision]);
 const approval=state.data?.eligibleReviewQueue?.rows||[];
 const mine=state.data?.myProposals?.rows||[];
 const visible=tab==='review'?approval:mine;
 const partial=tab==='review'?state.data?.eligibleReviewQueue?.isPartial:state.data?.myProposals?.isPartial;
 const admin=state.data?.role==='MUNICIPAL_ADMIN';
 const navigateAgent=()=>{if(typeof navigate==='function')navigate('urban-agent')};
 return <section className="rhf-h8" data-rhf-h8="my-work-readonly-v1" dir="rtl" aria-label="صندوق کار مبتنی بر مجوز">
  <div className="rhf-h8__heading"><div><span className="rhf-h8__eyebrow"><ShieldCheck size={14}/> H8 · GOVERNED INBOX</span><h2>کار من و تصمیم‌های منتظر بررسی</h2><p>هویت و اختیار از API گرفته می‌شوند؛ کارهای عمومی به‌عنوان انتساب شخصی معرفی نمی‌شوند.</p></div>
   <button className="rhf-h8__refresh" type="button" onClick={()=>refresh(x=>x+1)} disabled={state.loading}><RefreshCcw size={16}/> به‌روزرسانی</button></div>
  <div className="rhf-h8__tabs" role="group" aria-label="نمای صندوق کار">
   <button type="button" aria-pressed={tab==='review'} onClick={()=>setTab('review')}><Clock3 size={16}/> در حوزه اختیار بررسی {state.data&&<b>{admin?approval.length:'—'}</b>}</button>
   <button type="button" aria-pressed={tab==='mine'} onClick={()=>setTab('mine')}><ClipboardList size={16}/> پیشنهادهای ثبت‌شده من {state.data&&<b>{mine.length}</b>}</button>
  </div>
  {state.loading?<div className="rhf-h8__notice" role="status">در حال دریافت داده‌های معتبر از RUVOS...</div>:
   state.error?<div className="rhf-h8__notice rhf-h8__notice--error" role="alert"><AlertTriangle size={17}/>{state.error}</div>:
   !state.data?<div className="rhf-h8__notice">اطلاعات بارگذاری نشده است.</div>:
   tab==='review'&&!admin?<div className="rhf-h8__notice"><ShieldCheck size={17}/> بررسی مستقل پیگیری‌های عامل فقط در حوزه اختیار مدیر شهرداری است؛ موردی برای این نقش قابل نمایش نیست.</div>:
   visible.length===0?<div className="rhf-h8__notice">در آخرین ردیف‌های مجاز این بخش، موردی یافت نشد؛ این به معنی نبود کار در کل شهرداری نیست.</div>:
   <div className="rhf-h8__items">{visible.slice(0,8).map(x=><article className="rhf-h8__item" key={x.id}>
     <div className="rhf-h8__item-body"><strong>{safeText(x.caseSummary,'پیگیری پرونده')}</strong><p>{safeText(x.note)}</p><small>{safeText(labels[x.status]||x.status)} · {ftime(x.createdAt)}</small></div>
     <button type="button" onClick={navigateAgent} disabled={typeof navigate!=='function'} title="ورود به ابزار اصلی بررسی و پیگیری">بازکردن میزکار عامل <ArrowLeft size={14}/></button>
   </article>)}</div>}
  {state.data&&<p className="rhf-h8__disclaimer">حداکثر ۸ مورد از آخرین ۵۰ ردیف مجاز نمایش داده می‌شود.{partial?' ردیف‌های بیشتری خارج از این بازه وجود دارند.':''}</p>}
  <div className="rhf-h8__bottom"><span><UserRound size={16}/> مأموریت شخصی من: <strong>انتساب معتبر هنوز برقرار نیست</strong></span><span>اجرای عامل و ثبت مأموریت خودکار غیرفعال است.</span></div>
 </section>;
}
