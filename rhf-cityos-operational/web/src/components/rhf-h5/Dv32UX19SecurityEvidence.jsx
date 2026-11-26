import React,{useEffect,useState} from 'react';
import {createMatrixUrl,parseMatrix} from './Dv32UX3GatewayCore.mjs';
import {UUID,checkedAccess} from './Dv32UX4RouterCore.mjs';
import './Dv32UX18_19Design.css';
export default function Dv32UX19SecurityEvidence({desk,cityId,tenantId,orgId,currentRole}){
 const [state,setState]=useState({busy:true,error:'',matrix:null});const [refresh,setRefresh]=useState(0);
 useEffect(()=>{const ctrl=new AbortController();if(!UUID.test(cityId)||!UUID.test(tenantId)){setState({busy:false,error:'محدوده شهرداری نامعتبر است.',matrix:null});return;}
  setState({busy:true,error:'',matrix:null});(async()=>{try{
   const r=await fetch(createMatrixUrl(cityId,desk==='waste'?orgId:''),{credentials:'same-origin',cache:'no-store',signal:ctrl.signal});
   if(!r.ok)throw Error('ماتریس مجوز قابل دریافت نیست ('+r.status+')');const m=parseMatrix(await r.json(),cityId);
   if(m.scope.tenantId!==tenantId||!checkedAccess(m,cityId,desk,desk==='waste'?orgId:''))throw Error('تطبیق محدوده و نقش رد شد');
   if(!ctrl.signal.aborted)setState({busy:false,error:'',matrix:m});
  }catch(e){if(!ctrl.signal.aborted)setState({busy:false,error:e.message,matrix:null});}})();return()=>ctrl.abort();
 },[desk,cityId,tenantId,orgId,refresh]);
 const verified=!!state.matrix;
 return <section className="rhfux1819" dir="rtl" aria-label="گزارش امنیت و کیفیت UX19">
  <header className="rhfux1819__hero"><div className="rhfux1819__eyebrow">RHF CITY OS / UX19 · SECURITY & QUALITY</div>
   <h2>میز کنترل امنیت و کیفیت</h2><p>نمای شواهد امنیت حساب جاری؛ بدون تبدیل سلامت نصب به گواهی آمادگی انتشار</p>
   <div className="rhfux1819__chips"><span>Least privilege</span><span>Tenant RLS</span><span>WCAG / RTL در ارزیابی</span><span>NO_GO</span></div></header>
  <div className="rhfux1819__toolbar"><h3>نتایج قابل اتکا</h3><button type="button" onClick={()=>setRefresh(n=>n+1)} disabled={state.busy}>↻ ارزیابی مجدد نقش</button></div>
  {state.busy&&<p role="status">در حال بررسی ماتریس دسترسی حساب جاری…</p>}
  {state.error&&<p role="alert" className="rhfux1819__error">{state.error}</p>}
  <div className="rhfux1819__gategrid">
   <article><strong>نقش و محدوده فعلی</strong><b className={verified?'positive':'unverified'}>{verified?'OBSERVED':'NOT_VERIFIED'}</b><p>{verified?'ماتریس دسترسی برای این نقش و محدوده پاسخ معتبر داده است.':'بدون پاسخ معتبر، هیچ دسترسی احراز شده تلقی نمی‌شود.'}</p></article>
   <article><strong>جداسازی داده بین‌شهرداری</strong><b className="unverified">NOT_RUN</b><p>این صفحه جایگزین آزمون منفی خودکار و مرورگری چند شهر نیست.</p></article>
   <article><strong>پذیرش Temporal</strong><b className="unverified">NOT_RUN</b><p>ثبت اثبات غیرعملیاتی UX18، پذیرش گردش‌کار عملیاتی محسوب نمی‌شود.</p></article>
   <article><strong>عملکرد و دسترس‌پذیری</strong><b className="unverified">NOT_RUN</b><p>نمره Lighthouse، آزمون WCAG و آزمون بار هنوز به شواهد مستقل نیاز دارند.</p></article>
  </div>
  <div className="rhfux1819__detail"><h3>محدوده داده</h3><p>شهرداری: <code dir="ltr">{cityId}</code></p><p>نقش گزارش‌شده: <b>{state.matrix?.role||currentRole||'تأییدنشده'}</b></p>
   <p>{desk==='waste'?'گزارش صرفاً در محدوده سازمان منتسب و احرازشده':'گزارش نقش‌محور در محدوده شهرداری جاری'}</p></div>
  <footer className="rhfux1819__footer">این مرکز ابزار تفکیک شواهد است، نه تأییدیه نهایی امنیت، عملکرد یا ارزش شهری.</footer>
 </section>;
}
