import React from 'react';
import {Recycle,ArrowLeft,ShieldCheck} from 'lucide-react';
import {isWasteDemoOrganization,isWasteDemoCity} from './waste-pilot-ui-core.mjs';
import './waste-pilot.css';
/** Links only to an existing org in an existing synthetic city; never invents entities. */
export default function WastePilotLaunch({cityName,units,navigate}){
 const org=(Array.isArray(units)?units:[]).find(isWasteDemoOrganization);
 if(!org||!isWasteDemoCity(cityName))return null;
 return <section dir="rtl" className="rhw-launch" data-rhf-waste-launch="v1">
  <div className="rhw-launch__icon"><Recycle size={23}/></div>
  <div className="rhw-launch__copy"><span>پایلوت متصل به معاونت · W01–W04</span><h3>{org.name_fa}</h3>
   <p>پرونده‌ها، مأموریت‌ها، عامل A01، فرصت‌های ارزش، منابع و گردش تأیید مستقل — اطلاعات آزمایشی و قابل ردیابی.</p>
  </div>
  <div className="rhw-launch__actions"><span><ShieldCheck size={15}/> اجرای خودکار غیرفعال</span>
   <button type="button" onClick={()=>navigate?.('waste-pilot')}>ورود به میزکار سازمان <ArrowLeft size={16}/></button></div>
 </section>;
}
