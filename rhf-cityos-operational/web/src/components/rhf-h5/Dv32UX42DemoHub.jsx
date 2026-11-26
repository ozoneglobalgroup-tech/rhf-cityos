import React,{useState} from 'react';
import {DEMO_SEQUENCE,DEMO_ACCOUNTS,deskInfo,presentationStatus,canEnterDesk} from './Dv32UX42DemoPolicy.mjs';
import './Dv32UX42DemoHub.css';

const statusLabel={SELECT_CITY:'ابتدا شهرداری را انتخاب کنید',UNVERIFIED:'مجوز هنوز بررسی نشده',AUTHORIZED:'دسترسی با API تأیید شد',DENIED:'نمای معرفی؛ دسترسی عملیاتی مجاز نیست'};
export default function Dv32UX42DemoHub({desks=[],citySelected=false,cityLabel='',loading=false,evaluated=false,onInspect,onEnter}){
 const [selected,setSelected]=useState('mayor');
 const [accountsOpen,setAccountsOpen]=useState(false);
 const chosen=desks.find(x=>x.key===selected)||desks[0]||null;
 const data=deskInfo(chosen?.key);
 return <section className="rhf-d42" aria-label="مرکز معرفی سه سیستم‌عامل RHF City OS" dir="rtl">
  <div className="rhf-d42__lead">
   <div className="rhf-d42__lead-copy"><span className="rhf-d42__eyebrow">RHF CITY OS / MISSION-FIRST DEMO</span>
    <h2>یک شهر، سه میزکار، یک زنجیره خلق ارزش</h2>
    <p>در چهار گام ببینید تصمیم شهردار، فرماندهی معاونت و عملیات پسماند چگونه به نتیجه قابل‌سنجش وصل می‌شوند.</p>
    <div className="rhf-d42__tagline"><span>نمای معرفی آموزشی</span><span>بدون تغییر نقش</span><span>داده واقعی فقط با مجوز API</span></div>
   </div>
   <div className="rhf-d42__health"><span className="rhf-d42__spark" aria-hidden="true">✦</span><strong>شهر انتخاب‌شده</strong><span>{citySelected?cityLabel:'انتخاب نشده'}</span>
    <button type="button" onClick={onInspect} disabled={!citySelected||loading}>{loading?'در حال بررسی مجوز…':'بازخوانی مجوز حساب جاری'}</button>
   </div>
  </div>
  <div className="rhf-d42__cards" aria-label="انتخاب مسیر معرفی">
   {desks.map((desk,index)=>{const x=deskInfo(desk.key);const status=presentationStatus({citySelected,evaluated,authorized:desk.authorized});const canOpen=canEnterDesk({citySelected,evaluated,authorized:desk.authorized,loading});
    return <article className={'rhf-d42__card '+(chosen?.key===desk.key?'rhf-d42__card--selected':'')} key={desk.key}>
     <div className="rhf-d42__card-top"><span className="rhf-d42__card-icon" aria-hidden="true">{x.icon}</span><span className="rhf-d42__step">میزکار {index+1}</span></div>
     <span className="rhf-d42__card-caption">{x.caption}</span>
     <h3>{desk.title}</h3>
     <p>{x.mission}</p>
     <div className={'rhf-d42__status '+(canOpen?'rhf-d42__status--allowed':'')} role="status">{canOpen?'●':'○'} {statusLabel[status]}</div>
     <div className="rhf-d42__card-actions">
      <button type="button" className="rhf-d42__learn" aria-pressed={chosen?.key===desk.key} onClick={()=>setSelected(desk.key)}>معرفی مأموریت</button>
      <button type="button" className="rhf-d42__enter" disabled={!canOpen} onClick={()=>onEnter?.(desk.key)}>ورود مجاز</button>
     </div>
    </article>;
   })}
  </div>
  {chosen&&<div className="rhf-d42__mission" aria-live="polite">
   <div className="rhf-d42__mission-intro"><span>مأموریت انتخاب‌شده</span><h3>{data.mission}</h3><p>{data.story}</p><small>حساب مرتبط: {data.account} — این انتخاب صرفاً روایت معرفی را تغییر می‌دهد، نه هویت کاربر جاری را.</small></div>
   <div className="rhf-d42__mission-actions"><strong>سه کار اصلی این میزکار</strong><ul>{data.actions.map(x=><li key={x}>{x}</li>)}</ul></div>
  </div>}
  <div className="rhf-d42__flow"><div className="rhf-d42__section-title"><h3>داستان مشترک خدمت تا ارزش شهری</h3><span>چهار گام قابل توضیح در معرفی</span></div>
   <ol>{DEMO_SEQUENCE.map(x=><li key={x.number}><span>{x.number}</span><div><strong>{x.title}</strong><small>{x.description}</small></div></li>)}</ol>
  </div>
  <div className="rhf-d42__accounts">
   <button type="button" aria-expanded={accountsOpen} onClick={()=>setAccountsOpen(v=>!v)}> {accountsOpen?'بستن راهنمای حساب‌ها':'نمایش راهنمای پنج حساب معرفی'} <span aria-hidden="true">{accountsOpen?'−':'+'}</span></button>
   {accountsOpen&&<div className="rhf-d42__roster"><div className="rhf-d42__roster-head"><strong>جدول مسئولیت حساب‌های معرفی</strong><span>این اطلاعات راهنماست، مجوز از سرور تعیین می‌شود.</span></div>
    {DEMO_ACCOUNTS.map(a=><div className="rhf-d42__roster-row" key={a.username}><code>{a.username}</code><span>{a.purpose}</span><small>{a.status}</small></div>)}
   </div>}
  </div>
  <p className="rhf-d42__footer">مدیر سامانه راهبر معرفی است؛ عملیات شهردار، معاون یا مدیرعامل با حساب مستقل، انتصاب معتبر، RBAC و RLS انجام می‌شود. هیچ ارزش تحقق‌یافته‌ای از داده نمایشی ادعا نمی‌شود.</p>
 </section>;
}
