import React from 'react';
import {ArrowLeft,Building2,Landmark,LogOut,Recycle,ShieldCheck} from 'lucide-react';
import './deputy-presentation.css';
export default function PresentationHubWorkspace({cityName='شهرداری شیراز — دمو آزمایشی',onWaste,onDeputy,onLogout}){
 return <div className="rh79-hub" dir="rtl" data-rhf-presentation-hub="V7.9">
  <header className="rh79-hub-hero"><small>RHF CITY OS · INDEPENDENT PRESENTATION ENVIRONMENTS</small><h1>دو سیستم‌عامل سازمانی، دو تجربه مستقل</h1><p>{cityName} · اطلاعات آزمایشی و کنترل دسترسی در هسته مشترک RUVOS</p></header>
  <main className="rh79-hub-main"><div className="rh79-hub-choices">
   <button type="button" onClick={onWaste} className="rh79-hub-choice"><Recycle size={36}/><b>سیستم‌عامل سازمان مدیریت پسماند</b><span>مدیرعامل · ۱۱ حوزه · فرم‌ها و ابزارها · عامل‌ها · BPMS · ارزش شهری</span><span>ورود به محیط پسماند <ArrowLeft size={16}/></span></button>
   <button type="button" onClick={onDeputy} className="rh79-hub-choice"><Building2 size={36}/><b>سیستم‌عامل معاونت خدمات شهری و محیط‌زیست</b><span>معاون · نظارت زیرمجموعه · عملیات · تصمیم‌ها · شاخص‌ها · گزارش‌های تجمیعی</span><span>ورود به محیط معاونت <ArrowLeft size={16}/></span></button>
  </div><div className="rh79-hub-foot"><ShieldCheck size={20}/><p>این انتخاب برای مدیر سامانه فقط «پیش‌نمایش» است و انتصاب سازمانی صادر نمی‌کند. حساب‌های مدیرعامل و معاون فقط از انتصاب تأییدشده سرور دسترسی خواهند گرفت.</p><button onClick={onLogout} type="button"><LogOut size={15}/> خروج</button></div></main>
 </div>
}
