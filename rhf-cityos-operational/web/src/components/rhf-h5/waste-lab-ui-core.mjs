/** V7.5 demo-only client presentation, never an authorization authority. */
export const LAB_VERSION='RHF-WASTE-LAB-V7.5';
export const WASTE_UX_VERSION='RHF-WASTE-UX-V7.5.1';
export const LAB_DOMAINS=[
 {id:'COLLECTION',name:'جمع‌آوری و باسکول',icon:'scale',fields:[['stream','جریان پسماند','select','DRY,WET,MIXED,GREEN,BULKY,CONSTRUCTION,HAZARDOUS,MEDICAL,OTHER'],['material','جنس پسماند','select','PLASTIC,ORGANIC,PAPER,GLASS,METAL,WOOD,MIXED,OTHER'],['sourceMethod','روش وزن','select','WEIGHBRIDGE,ESTIMATE'],['scaleTicket','شماره قبض','text'],['weighedAt','تاریخ توزین','date'],['netKg','وزن خالص (کیلوگرم)','number'],['grossKg','وزن ناخالص','number'],['tareKg','وزن خالی','number'],['routeCode','کد مسیر','text']],required:['stream','material','sourceMethod','scaleTicket','weighedAt','netKg']},
 {id:'FLEET',name:'ناوگان و ماشین‌آلات',icon:'truck',fields:[['assetCode','شناسه خودرو','text'],['assetType','نوع ماشین‌آلات','text'],['condition','وضعیت','text'],['capacityKg','ظرفیت (کیلوگرم)','number'],['zone','حوزه خدمت','text']],required:['assetCode','assetType','condition']},
 {id:'MAINTENANCE',name:'تعمیرات و توقف',icon:'wrench',fields:[['assetCode','شناسه خودرو','text'],['maintenanceType','نوع تعمیرات','text'],['openedAt','شروع توقف','date'],['downtimeHours','مدت توقف (ساعت)','number'],['workshopRef','مرجع کارگاه','text']],required:['assetCode','maintenanceType','openedAt']},
 {id:'CONTRACTOR',name:'پیمانکاران و قراردادها',icon:'file',fields:[['contractorCode','کد پیمانکار','text'],['name','نام پیمانکار','text'],['contractRef','کد قرارداد','text'],['serviceType','نوع خدمت','select','STREET_CLEANING,WET_COLLECTION,DRY_COLLECTION,SORTING,TRANSFER,OTHER'],['contractStatus','وضعیت قرارداد','text']],required:['contractorCode','name','contractRef','serviceType']},
 {id:'CONTRACT_EVAL',name:'عملکرد پیمانکاران',icon:'chart',fields:[['contractorCode','کد پیمانکار','text'],['periodStart','ابتدای دوره','date'],['periodEnd','انتهای دوره','date'],['plannedServices','خدمات برنامه‌ریزی‌شده','integer'],['completedServices','خدمات انجام‌شده','integer'],['inspectedServices','خدمات بازرسی‌شده','integer'],['passedInspections','بازرسی قابل‌قبول','integer']],required:['contractorCode','periodStart','periodEnd','plannedServices','completedServices']},
 {id:'SHIFT',name:'منابع انسانی و شیفت‌ها',icon:'users',fields:[['serviceDate','روز خدمت','date'],['serviceType','نوع خدمت','select','STREET_CLEANING,WET_COLLECTION,DRY_COLLECTION,TRANSFER,OTHER'],['routeCode','مسیر','text'],['shiftName','شیفت','text'],['requiredStaff','نفرات موردنیاز','integer'],['presentStaff','نفرات حاضر','integer'],['absentStaff','غایبان','integer']],required:['serviceDate','serviceType','routeCode','requiredStaff','presentStaff','absentStaff']},
 {id:'QUALITY',name:'کیفیت و بازرسی',icon:'shield',fields:[['inspectedAt','تاریخ بازرسی','date'],['routeCode','کد مسیر','text'],['inspectedCount','تعداد بازرسی','integer'],['passedCount','تعداد قابل‌قبول','integer'],['complaints','شکایات','integer']],required:['inspectedAt','routeCode','inspectedCount','passedCount']},
 {id:'FACILITY',name:'تأسیسات و بازیافت',icon:'factory',fields:[['facilityCode','کد مرکز','text'],['facilityType','نوع مرکز','select','TRANSFER,SORTING,RECYCLING,COMPOST,LANDFILL,OTHER'],['capacityTonsPerDay','ظرفیت اسمی (تن/روز)','number'],['controlStatus','وضعیت مرکز','text']],required:['facilityCode','facilityType','controlStatus']},
 {id:'EDUCATION',name:'آموزش و مشارکت',icon:'book',fields:[['heldAt','تاریخ آموزش','date'],['topic','موضوع','text'],['channel','کانال','select','IN_PERSON,SCHOOL,ONLINE,MEDIA,OTHER'],['participants','تعداد شرکت‌کنندگان','integer'],['preScore','امتیاز قبل','integer'],['postScore','امتیاز بعد','integer']],required:['heldAt','topic','channel','participants']},
 {id:'VIOLATION',name:'تخلفات (محدود)',icon:'alert',restricted:true,fields:[['detectedAt','زمان شناسایی','date'],['violationType','نوع تخلف','text'],['district','محدوده','text'],['caseStatus','وضعیت','text']],required:['detectedAt','violationType','district','caseStatus']},
 {id:'LEGAL',name:'حقوقی (محدود)',icon:'lock',restricted:true,fields:[['legalRef','شماره مرجع ساختگی','text'],['stage','مرحله','text'],['caseStatus','وضعیت','text'],['summary','شرح بدون اطلاعات شخصی','text']],required:['legalRef','stage','caseStatus']}
];
export const FLOWS=[['WEIGHBRIDGE_REVIEW','بررسی باسکول'],['FLEET_MAINTENANCE','تعمیرات ناوگان'],['CONTRACTOR_REVIEW','ارزیابی پیمانکار'],['INSPECTION_REVIEW','بازرسی کیفیت'],['STAFFING_REVIEW','پوشش شیفت'],['EDUCATION_REVIEW','آموزش و مشارکت'],['VALUE_OPPORTUNITY','فرصت خلق ارزش'],['LEGAL_REVIEW','بررسی حقوقی محدود']];
export const AGENTS=[['WEIGHBRIDGE_A01','کنترل شواهد باسکول','COLLECTION'],['FLEET_A02','پایش توقف ناوگان','MAINTENANCE'],['CONTRACT_A03','پایش عملکرد پیمانکار','CONTRACT_EVAL'],['QUALITY_A04','پایش کیفیت','QUALITY'],['STAFF_A05','کنترل پوشش شیفت','SHIFT'],['VALUE_A06','کشف فرصت ارزش','BPMS']];
export function validateLabResponse(x,city){if(!x||x.mode!==LAB_VERSION||x.cityId!==city||x.synthetic!==true||x.isolated!==true||x.verifiedPublicValue!==false||!Array.isArray(x.rows)||x.rows.length>300||!['CEO','ADMIN','REVIEWER'].includes(x.scope))throw Error('پاسخ آزمایشگاهی با محدوده یا قرارداد API تطابق ندارد');if(x.rows.some(r=>r.synthetic!==true||r.fieldVerified!==false||r.verifiedPublicValue!==false))throw Error('رکورد آزمایشی تأیید میدانی ندارد');return x;}
export function createPayload(def,form){const result={};for(const [k,,type] of def.fields){const v=form[k];if(v===undefined||v===null||v==='')continue;result[k]=['number','integer'].includes(type)?Number(v):v;}for(const k of def.required){if(result[k]===undefined||result[k]==='')throw Error(`فیلد «${def.fields.find(f=>f[0]===k)?.[1]||k}» الزامی است`);}return result;}
export function summarize(rows){if(!rows)return null;const records=rows.filter(r=>r.kind==='RECORD');const processes=rows.filter(r=>r.kind==='FLOW');return {records:records.length,flows:processes.length,pending:rows.filter(r=>r.status==='SUBMITTED').length,domains:new Set(records.map(r=>r.domain)).size,fixtures:rows.filter(r=>r.status==='FIXTURE').length,verifiedPublicValue:0};}
const num=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
export function deriveAgents(rows){if(!Array.isArray(rows))return [];const out=[];const push=(r,agentId,title,reason,flowKind)=>out.push({id:agentId+':'+r.id,agentId,title,reason,flowKind,recordId:r.id,recordCode:r.code,domain:r.domain,synthetic:true,dispatchAllowed:false,verifiedValue:false});
 for(const r of rows.filter(x=>x.kind==='RECORD')){const p=r.payload||{};
  if(r.domain==='COLLECTION'&&(p.sourceMethod==='ESTIMATE'||r.status==='SUBMITTED'))push(r,'WEIGHBRIDGE_A01','تکمیل شواهد توزین','وزن برآوردی یا رکورد در انتظار بررسی مستقل است.','WEIGHBRIDGE_REVIEW');
  if(r.domain==='MAINTENANCE'&&num(p.downtimeHours)>4)push(r,'FLEET_A02','بررسی توقف ناوگان',`مدت توقف ساختگی ${p.downtimeHours} ساعت ثبت شده است.`,'FLEET_MAINTENANCE');
  if(r.domain==='CONTRACT_EVAL'&&num(p.plannedServices)>0&&num(p.completedServices)!==null&&p.completedServices/p.plannedServices<.9)push(r,'CONTRACT_A03','کسری خدمات ثبت‌شده',`تحقق ساختگی ${p.completedServices} از ${p.plannedServices} خدمت است.`,'CONTRACTOR_REVIEW');
  if(r.domain==='QUALITY'&&num(p.inspectedCount)>0&&num(p.passedCount)!==null&&p.passedCount/p.inspectedCount<.9)push(r,'QUALITY_A04','کیفیت نیازمند بررسی',`قبولی ساختگی ${p.passedCount} از ${p.inspectedCount} بازرسی است.`,'INSPECTION_REVIEW');
  if(r.domain==='SHIFT'&&num(p.requiredStaff)>0&&num(p.absentStaff)>0)push(r,'STAFF_A05','کمبود پوشش شیفت',`غیبت تجمیعی ساختگی ${p.absentStaff} نفر ثبت شده است.`,'STAFFING_REVIEW');
 }
 if(rows.some(r=>r.kind==='FLOW'&&r.payload?.processKind==='VALUE_OPPORTUNITY')){const r=rows.find(r=>r.kind==='FLOW'&&r.payload?.processKind==='VALUE_OPPORTUNITY');push(r,'VALUE_A06','فرصت سنجش ارزش','خط مبنا و هدف صرفاً فرضیه آموزشی هستند.','VALUE_OPPORTUNITY');}
 return out.slice(0,30);
}
/** Interactive domain tools on SYNTHETIC journal ONLY. No field claims and no financial decisions. */
export function domainTool(domain,rows){
 if(!Array.isArray(rows))return {label:'داده نامشخص',value:null,unit:'',synthetic:true};
 const list=rows.filter(r=>r.kind==='RECORD'&&r.domain===domain),sum=k=>list.reduce((t,r)=>t+(typeof r.payload?.[k]==='number'&&Number.isFinite(r.payload[k])?r.payload[k]:0),0);
 let label='رکوردهای آزمایشی',value=list.length,unit='رکورد';
 if(domain==='COLLECTION'){label='وزن باسکولی ثبت‌شده در آزمایشگاه';value=list.reduce((t,r)=>{const p=r.payload||{};return t+(p.sourceMethod==='WEIGHBRIDGE'&&Number.isFinite(p.netKg)&&Number.isFinite(p.grossKg)&&Number.isFinite(p.tareKg)&&Math.abs(p.grossKg-p.tareKg-p.netKg)<=.01?p.netKg:0)},0);unit='کیلوگرم ساختگی';}
 else if(domain==='MAINTENANCE'){label='ساعت توقف ثبت‌شده';value=sum('downtimeHours');unit='ساعت ساختگی';}
 else if(domain==='CONTRACT_EVAL'){label='تحقق خدمات در نمونه‌ها';const p=sum('plannedServices');value=p>0?Math.round(100*sum('completedServices')/p):null;unit='درصد ساختگی';}
 else if(domain==='QUALITY'){label='قبولی بازرسی‌های نمونه';const q=sum('inspectedCount');value=q>0?Math.round(100*sum('passedCount')/q):null;unit='درصد ساختگی';}
 else if(domain==='SHIFT'){label='نرخ حضور شیفت نمونه';const q=sum('requiredStaff');value=q>0?Math.round(100*sum('presentStaff')/q):null;unit='درصد ساختگی';}
 else if(domain==='EDUCATION'){label='شرکت‌کننده در نمونه آموزشی';value=sum('participants');unit='نفر ساختگی';}
 else if(domain==='FACILITY'){label='جمع ظرفیت اسمی مراکز نمونه';value=sum('capacityTonsPerDay');unit='تن/روز اسمی، نه ظرفیت قابل استفاده';}
 return {label,value,unit,synthetic:true,fieldVerified:false};
}

/** V7.5.1: transparent, client-only what-if calculators. No writes, no real-world verification. */
export const DEMO_TOOLS={
 COLLECTION:{title:'محاسبه وزن خالص آزمایشی',inputs:[['grossKg','وزن ناخالص (کیلوگرم)'],['tareKg','وزن خالی (کیلوگرم)']],unit:'کیلوگرم',description:'وزن = ناخالص منهای خالی؛ فقط شبیه‌سازی و نه قبض واقعی'},
 FLEET:{title:'برآورد ظرفیت اسمی حمل',inputs:[['capacityKg','ظرفیت اسمی خودرو (کیلوگرم)'],['trips','تعداد سرویس فرضی']],unit:'کیلوگرم اسمی',description:'ظرفیت اسمی × سرویس؛ بار حمل‌شده واقعی نیست'},
 MAINTENANCE:{title:'محاسبه توقف تجمعی',inputs:[['hours','ساعت توقف هر خودرو'],['vehicles','تعداد خودروی فرضی']],unit:'خودرو-ساعت',description:'فقط مجموع زمان توقف فرضی'},
 CONTRACTOR:{title:'پوشش بررسی قراردادهای فرضی',inputs:[['reviewed','قرارداد بررسی‌شده'],['total','کل قراردادها']],unit:'درصد',description:'پوشش بررسی؛ به معنی تأیید قراردادی نیست'},
 CONTRACT_EVAL:{title:'نسبت تحقق خدمت فرضی',inputs:[['completed','خدمات انجام‌شده'],['planned','خدمات برنامه‌ریزی‌شده']],unit:'درصد',description:'ارزیابی آزمایشی؛ نه مبنای کسورات مالی'},
 SHIFT:{title:'درصد حضور فرضی',inputs:[['present','نفرات حاضر'],['required','نفرات موردنیاز']],unit:'درصد',description:'فقط شمارش تجمیعی؛ بدون اطلاعات فردی'},
 QUALITY:{title:'نرخ قبولی بازرسی فرضی',inputs:[['passed','بازرسی قابل‌قبول'],['inspected','کل بازرسی‌ها']],unit:'درصد',description:'کیفیت حقیقی یا رضایت شهروندان اثبات نمی‌شود'},
 FACILITY:{title:'ظرفیت اسمی در بازه فرضی',inputs:[['nominal','ظرفیت اسمی (تن در روز)'],['days','تعداد روز']],unit:'تن اسمی',description:'ظرفیت اسمی × روز؛ ظرفیت قابل‌استفاده یا پردازش واقعی نیست'},
 EDUCATION:{title:'تعداد شرکت‌کنندگان فرضی',inputs:[['participants','شرکت‌کننده در هر جلسه'],['sessions','تعداد جلسه']],unit:'نفر-جلسه',description:'مشارکت آموزشی و نه اثربخشی آموزش'},
 VIOLATION:{title:'پوشش بررسی پرونده تخلف فرضی',inputs:[['reviewed','پرونده بررسی‌شده'],['total','پرونده‌های ثبت‌شده']],unit:'درصد',description:'فقط شمارش اداری؛ هیچ تشخیص تخلف یا تصمیم قانونی صادر نمی‌شود'},
 LEGAL:{title:'تکمیل مدارک پرونده فرضی',inputs:[['complete','مدرک تکمیل‌شده'],['required','مدرک لازم']],unit:'درصد',description:'فقط چک‌لیست نمونه؛ رأی یا نظر حقوقی نیست'}
};
const ratioDomains=new Set(['CONTRACTOR','CONTRACT_EVAL','SHIFT','QUALITY','VIOLATION','LEGAL']);
export function calculateDemoTool(domain,values){
 const spec=DEMO_TOOLS[domain];if(!spec)throw Error('ابزار ناشناخته است');
 const v=spec.inputs.map(([k])=>{const raw=values?.[k];if(raw===undefined||raw===null||String(raw).trim()==='')throw Error('هر دو ورودی برای محاسبه لازم است');const n=Number(raw);if(!Number.isFinite(n)||n<0||n>1e9)throw Error('ورودی باید عدد معتبر و غیرمنفی باشد');return n});
 const [a,b]=v;let result;
 if(domain==='COLLECTION'){if(a<=b)throw Error('وزن ناخالص باید از وزن خالی بیشتر باشد');result=a-b;}
 else if(ratioDomains.has(domain)){if(b<=0)throw Error('مخرج باید بزرگ‌تر از صفر باشد');if(a>b)throw Error('عدد بخش نمی‌تواند از کل بیشتر باشد');result=100*a/b;}
 else result=a*b;
 if(!Number.isFinite(result))throw Error('محاسبه نامعتبر است');
 return {value:Math.round(result*100)/100,unit:spec.unit,synthetic:true,verifiedPublicValue:false,dispatchAllowed:false};
}
const FLOW_HINTS={
 WEIGHBRIDGE_REVIEW:['پیگیری نقص شواهد باسکول','این درخواست فقط برای کنترل مدارک آزمایشی توزین است؛ تطبیق قبض با پرونده و بررسی انسانی مستقل لازم است.'],
 FLEET_MAINTENANCE:['بررسی توقف ناوگان آزمایشی','توقف ثبت‌شده در داده ساختگی است؛ علت احتمالی، مدارک تعمیرات و تصمیم مسئول باید جداگانه بررسی شود.'],
 CONTRACTOR_REVIEW:['بازبینی عملکرد پیمانکار آزمایشی','شاخص‌های انجام خدمت ساختگی‌اند؛ قبل از هر تصمیم، قرارداد، گزارش بازرسی و شواهد مستقل باید بررسی شوند.'],
 INSPECTION_REVIEW:['پیگیری کیفیت خدمات آزمایشی','نتیجه بازرسی نمونه نیازمند کنترل و تأیید بازبین مستقل است؛ این ثبت به معنی تحقق کیفیت میدانی نیست.'],
 STAFFING_REVIEW:['بررسی کمبود شیفت فرضی','پوشش شیفت فقط به صورت تجمیعی گزارش شده است؛ علت کمبود و برنامه جایگزین باید توسط مسئول بررسی شود.'],
 EDUCATION_REVIEW:['بازبینی برنامه آموزشی آزمایشی','آمار مشارکت آموزشی فرضی است؛ اثربخشی آموزش و نتایج شهروندی مستقلاً باید ارزیابی شوند.'],
 VALUE_OPPORTUNITY:['فرصت بهبود قابل سنجش آزمایشی','فرضیه خلق ارزش بدون تأیید واقعی است؛ شاخص، واحد، خط مبنا، هدف و برنامه راستی‌آزمایی مستقل نیاز دارد.'],
 LEGAL_REVIEW:['بررسی محرمانه پرونده فرضی','این پرونده صرفاً آزمایشی و بدون اطلاعات اشخاص واقعی است؛ بررسی حقوقی فقط به مسئول مجاز ارجاع می‌شود.']
};
export function presetDemoFlow(kind,record=null){
 if(!FLOWS.some(x=>x[0]===kind))throw Error('الگوی فرایند ناشناخته است');
 const [title,description]=FLOW_HINTS[kind];return {kind,title:record?.code?`${title} — ${record.code}`:title,description,relatedRecordId:record?.kind==='RECORD'?record.id:'',metric:kind==='VALUE_OPPORTUNITY'?'زمان توقف ناوگان':'',unit:kind==='VALUE_OPPORTUNITY'?'ساعت':'',baseline:'',target:''};
}
export function agentEvidence(rows,agentId){
 if(!AGENTS.some(a=>a[0]===agentId))return [];
 return deriveAgents(Array.isArray(rows)?rows:[]).filter(x=>x.agentId===agentId);
}
