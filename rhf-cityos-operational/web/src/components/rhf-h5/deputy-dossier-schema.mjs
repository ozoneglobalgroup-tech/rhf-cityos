// V8 Phase 2 — self-contained synthetic domain form contract. No real organization registry.
export const DOSSIER_VERSION='RHF-DEPUTY-DOSSIERS-V8-P2';
export const DOSSIER_MODE='DEPUTY_DOSSIERS_SYNTHETIC_V8P2';
const T=(id,label,min=2,max=90)=>Object.freeze({id,label,type:'text',min,max});
const N=(id,label,max=1000000)=>Object.freeze({id,label,type:'integer',min:0,max});
export const DOSSIER_SCHEMAS=Object.freeze({
 GREEN:{label:'فضای سبز و باغات',fields:[T('siteCode','شناسه آزمایشی بوستان'),T('zone','منطقه یا حوزه'),N('treesChecked','تعداد درخت بررسی‌شده'),N('irrigationIssues','موارد فرضی آبیاری')]},
 CEMETERY:{label:'آرامستان‌ها',fields:[T('siteCode','شناسه آرامستان آزمایشی'),T('serviceType','نوع خدمت'),N('requests','درخواست‌های نمونه'),N('pending','درخواست‌های در انتظار')]},
 MARKETS:{label:'میادین و ساماندهی مشاغل',fields:[T('siteCode','شناسه بازار نمونه'),T('visitType','نوع بازدید'),N('boothsChecked','غرف بررسی‌شده'),N('findings','یافته‌های فرضی')]},
 BEAUTIFICATION:{label:'زیباسازی و منظر شهری',fields:[T('zone','حوزه شهری'),T('assetType','نوع مبلمان یا تأسیسات'),N('assetsChecked','اقلام بررسی‌شده'),N('damaged','نقص‌های فرضی')]},
 PUBLIC:{label:'خدمات عمومی و نظافت',fields:[T('zone','منطقه خدماتی'),T('serviceType','نوع خدمت'),N('requests','درخواست‌های نمونه'),N('overdue','موارد معوق فرضی')]},
 ENV:{label:'محیط‌زیست شهری',fields:[T('station','شناسه ایستگاه نمونه'),T('parameter','شاخص پایش'),N('samples','نمونه‌های فرضی'),N('abnormal','مقادیر نیازمند بررسی')]},
 FIRE:{label:'ایمنی و آتش‌نشانی (مشروط)',fields:[T('facility','شناسه محل آزمایشی'),T('inspectionType','نوع بررسی ایمنی'),N('checks','کنترل‌های نمونه'),N('issues','عدم انطباق فرضی')]},
 FLEET:{label:'ناوگان و ماشین‌آلات',fields:[T('fleetGroup','گروه ناوگان'),N('vehicles','تعداد خودرو نمونه'),N('stopped','تعداد خودرو متوقف'),N('downtimeHours','ساعت توقف فرضی',100000)]},
 CONTRACT:{label:'نظارت پیمانکاران',fields:[T('contractCode','کد قرارداد آزمایشی'),T('service','عنوان تعهد'),N('planned','خدمت برنامه‌ریزی‌شده'),N('performed','خدمت ثبت‌شده')]},
 CITIZEN:{label:'آموزش و مشارکت شهروندی',fields:[T('zone','حوزه برگزاری'),T('topic','موضوع آموزش'),N('sessions','جلسه‌های فرضی'),N('participants','شرکت‌کنندگان فرضی')]},
 STAFF:{label:'برنامه‌ریزی و پشتیبانی ستادی',fields:[T('department','کد واحد نمونه'),T('process','موضوع پشتیبانی'),N('requests','درخواست‌ها'),N('pending','در انتظار')]}
});
for(const s of Object.values(DOSSIER_SCHEMAS)){Object.freeze(s.fields);Object.freeze(s)}
export const DOSSIER_KEYS=Object.freeze(Object.keys(DOSSIER_SCHEMAS));
export function validateFields(orgKey,fields){
 const spec=DOSSIER_SCHEMAS[orgKey];if(!spec||!fields||typeof fields!=='object'||Array.isArray(fields)||Object.getPrototypeOf(fields)!==Object.prototype)throw Error('ساختار فرم تخصصی معتبر نیست');
 if(Object.keys(fields).length!==spec.fields.length||Object.keys(fields).some(k=>!spec.fields.some(f=>f.id===k)))throw Error('فیلد اضافی یا مفقود در فرم تخصصی');
 const output={};for(const f of spec.fields){const v=fields[f.id];if(f.type==='integer'){
 if(!Number.isSafeInteger(v)||v<f.min||v>f.max)throw Error(`مقدار ${f.label} نامعتبر است`);output[f.id]=v;
 }else{if(typeof v!=='string'||v.trim().length<f.min||v.trim().length>f.max||/[\x00-\x1f<>]/.test(v))throw Error(`متن ${f.label} نامعتبر است`);output[f.id]=v.trim();}}
 const a=output;if(orgKey==='CEMETERY'&&a.pending>a.requests)throw Error('درخواست معوق بیشتر از کل درخواست است');
 if(orgKey==='BEAUTIFICATION'&&a.damaged>a.assetsChecked)throw Error('نقص بیشتر از اقلام بررسی‌شده است');
 if(orgKey==='FLEET'&&a.stopped>a.vehicles)throw Error('توقف بیشتر از کل خودروها است');
 if(orgKey==='CONTRACT'&&a.performed>a.planned)throw Error('انجام‌شده بیشتر از برنامه است');
 if(orgKey==='PUBLIC'&&a.overdue>a.requests)throw Error('معوق بیشتر از درخواست‌ها است');
 if(orgKey==='ENV'&&a.abnormal>a.samples)throw Error('مورد غیرعادی بیشتر از نمونه‌ها است');
 if(orgKey==='FIRE'&&a.issues>a.checks)throw Error('عدم انطباق بیشتر از بررسی‌ها است');
 if(orgKey==='MARKETS'&&a.findings>a.boothsChecked)throw Error('یافته بیشتر از غرف بررسی‌شده است');
 if(orgKey==='GREEN'&&a.irrigationIssues>a.treesChecked)throw Error('موارد آبیاری بیشتر از درختان بررسی‌شده است');
 if(orgKey==='STAFF'&&a.pending>a.requests)throw Error('در انتظار بیشتر از درخواست‌ها است');
 return output;
}
export function validateEvidenceRefs(value){
 if(!Array.isArray(value)||value.length>4)throw Error('حداکثر چهار ارجاع سند آزمایشی مجاز است');
 const refs=value.map(x=>{if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).sort().join(',')!=='label,referenceCode'||typeof x.label!=='string'||x.label.trim().length<4||x.label.length>100||/[\x00-\x1f<>]/.test(x.label)||typeof x.referenceCode!=='string'||!/^DEMO-[A-Z0-9_-]{4,40}$/.test(x.referenceCode))throw Error('ارجاع سند باید با DEMO- و بدون URL یا فایل واقعی باشد');return {label:x.label.trim(),referenceCode:x.referenceCode};});
 if(new Set(refs.map(r=>r.referenceCode)).size!==refs.length)throw Error('ارجاع سند تکراری است');return refs;
}
export function safeDossierResponse(x,cityId){
 if(!x||x.mode!==DOSSIER_MODE||x.cityId!==cityId||x.synthetic!==true||x.isolated!==true||x.verifiedPublicValue!==false||x.autonomousDispatch!==false||!Array.isArray(x.rows)||x.rows.length>200)return null;
 for(const r of x.rows){if(!DOSSIER_SCHEMAS[r.orgKey]||!['DRAFT','SUBMITTED','REVIEWED','REJECTED','FIXTURE'].includes(r.status)||typeof r.id!=='string'||typeof r.title!=='string'||r.synthetic!==true||r.verifiedPublicValue!==false||!Array.isArray(r.evidenceRefs))return null;
 try{validateFields(r.orgKey,r.fields);validateEvidenceRefs(r.evidenceRefs)}catch{return null}}
 return x;
}
export function sampleFields(orgKey){const s=DOSSIER_SCHEMAS[orgKey];if(!s)throw Error('حوزه نامعتبر');const out={};for(const [i,f] of s.fields.entries())out[f.id]=f.type==='integer'?(i===2?9:2):`DEMO-${orgKey}-${f.id}`.slice(0,f.max);if(orgKey==='FLEET'){out.vehicles=9;out.stopped=2;out.downtimeHours=7}return validateFields(orgKey,out)}
