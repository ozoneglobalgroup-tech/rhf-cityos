/** Minimal manual-entry forms mapped to server-side waste-suite-defs.
 * The API remains the source of truth; this is presentation validation only.
 */
const fld=(id,label,type='text',options)=>({id,label,type,options});
const E=(id,label,values)=>fld(id,label,'select',values.map(x=>typeof x==='string'?{value:x,label:x}:x));
export const WASTE_FORMS=Object.freeze({
 COLLECTION:{title:'وزن و جمع‌آوری',fields:[
  E('stream','جریان پسماند',['WET','DRY','MIXED','GREEN','BULKY','CONSTRUCTION','HAZARDOUS','MEDICAL','OTHER']),
  E('material','نوع ماده',['ORGANIC','PAPER','PLASTIC','GLASS','METAL','TEXTILE','E_WASTE','WOOD','GREEN','MIXED','OTHER']),
  E('sourceMethod','روش ثبت وزن',[{value:'ESTIMATE',label:'برآورد — فاقد سند باسکول'},{value:'WEIGHBRIDGE',label:'باسکول'}]),
  fld('netKg','وزن خالص (کیلوگرم)','number'),fld('grossKg','وزن ناخالص در باسکول (کیلوگرم)','number'),fld('tareKg','وزن خالی در باسکول (کیلوگرم)','number'),fld('weighedAt','تاریخ وزن‌کشی','date'),fld('scaleTicket','کد سند وزن')]},
 FLEET:{title:'ناوگان',fields:[fld('assetCode','شناسه ماشین'),fld('assetType','نوع ماشین'),fld('condition','وضعیت ماشین')]},
 MAINTENANCE:{title:'تعمیر و نگهداری',fields:[fld('assetCode','شناسه ماشین'),fld('maintenanceType','نوع تعمیر'),fld('openedAt','تاریخ شروع','date')]},
 CONTRACTOR:{title:'پیمانکار',fields:[fld('contractorCode','کد پیمانکار'),fld('name','نام پیمانکار'),fld('contractRef','شناسه قرارداد'),E('serviceType','خدمت',['STREET_CLEANING','WET_COLLECTION','DRY_COLLECTION','SORTING','TRANSFER','OTHER'])]},
 CONTRACT_EVAL:{title:'ارزیابی پیمانکار',fields:[fld('contractorCode','کد پیمانکار'),fld('periodStart','شروع دوره','date'),fld('periodEnd','پایان دوره','date'),fld('plannedServices','خدمات برنامه‌ریزی‌شده','integer'),fld('completedServices','خدمات انجام‌شده','integer')]},
 SHIFT:{title:'شیفت و نیروی انسانی',fields:[fld('serviceDate','تاریخ شیفت','date'),E('serviceType','خدمت',['STREET_CLEANING','WET_COLLECTION','DRY_COLLECTION','TRANSFER','OTHER']),fld('routeCode','کد مسیر'),fld('requiredStaff','نیروی موردنیاز','integer'),fld('presentStaff','نیروی حاضر','integer'),fld('absentStaff','نیروی غایب','integer')]},
 EDUCATION:{title:'آموزش و مشارکت',fields:[fld('heldAt','تاریخ اجرا','date'),fld('topic','موضوع آموزش'),E('channel','روش آموزش',['IN_PERSON','SCHOOL','ONLINE','MEDIA','OTHER']),fld('participants','شرکت‌کنندگان','integer')]},
 FACILITY:{title:'مراکز و تأسیسات',fields:[fld('facilityCode','کد مرکز'),E('facilityType','نوع مرکز',['TRANSFER','SORTING','RECYCLING','COMPOST','LANDFILL','OTHER']),fld('controlStatus','وضعیت نظارت')]},
 QUALITY:{title:'کنترل کیفیت',fields:[fld('inspectedAt','تاریخ بازرسی','date'),fld('routeCode','کد مسیر'),fld('inspectedCount','تعداد بررسی‌شده','integer'),fld('passedCount','تعداد قبول‌شده','integer')]},
 VIOLATION:{title:'تخلفات (مجوز ویژه)',fields:[fld('detectedAt','تاریخ کشف','date'),fld('violationType','نوع تخلف'),fld('district','منطقه'),fld('caseStatus','وضعیت پرونده')]},
 LEGAL:{title:'پرونده حقوقی (مجوز ویژه)',fields:[fld('legalRef','شناسه پرونده'),fld('stage','مرحله رسیدگی'),fld('caseStatus','وضعیت پرونده')]}
});
export function formToRecord(domain,draft){
 const spec=WASTE_FORMS[domain];if(!spec)throw Error('UNKNOWN_OPERATIONAL_DOMAIN');
 const data={};
 for(const f of spec.fields){
  if(domain==='COLLECTION'&&['grossKg','tareKg'].includes(f.id)&&draft.sourceMethod!=='WEIGHBRIDGE')continue;
  const raw=draft[f.id];if(raw===undefined||raw===null||raw==='')continue;
  const value=f.type==='number'||f.type==='integer'?Number(raw):String(raw).trim();
  if(typeof value==='number'&&!Number.isFinite(value))throw Error('INVALID_NUMBER_'+f.id);
  if(f.options&&!f.options.some(x=>x.value===value))throw Error('INVALID_ENUM_'+f.id);
  data[f.id]=value;
 }
 if(domain==='COLLECTION'&&draft.sourceMethod==='WEIGHBRIDGE'&&!(Math.abs((data.grossKg||0)-(data.tareKg||0)-(data.netKg||0))<=0.01))throw Error('WEIGHBRIDGE_MASS_BALANCE_INVALID');
 return data;
}
