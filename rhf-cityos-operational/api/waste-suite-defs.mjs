/** Safe, bounded classification; client-supplied fields not in these specs are rejected. */
export const RECORD_KINDS=Object.freeze({
 FLEET:{label:'ناوگان و ماشین‌آلات',fields:{assetCode:'code',assetType:'text',plate:'text',capacityKg:'nonneg',ownership:'text',condition:'text',contractorCode:'text',zone:'text',odometerKm:'nonneg',nextService:'date'} ,required:['assetCode','assetType','condition']},
 MAINTENANCE:{label:'تعمیرات و توقف ناوگان',fields:{assetCode:'code',maintenanceType:'text',openedAt:'date',closedAt:'date',downtimeHours:'nonneg',costMinor:'integer',workshopRef:'text'},required:['assetCode','maintenanceType','openedAt']},
 COLLECTION:{label:'پسماند جمع‌آوری‌شده و باسکول',fields:{stream:'enum:WET,DRY,MIXED,GREEN,BULKY,CONSTRUCTION,HAZARDOUS,MEDICAL,OTHER',material:'enum:ORGANIC,PAPER,PLASTIC,GLASS,METAL,TEXTILE,E_WASTE,WOOD,GREEN,MIXED,OTHER',netKg:'positive',grossKg:'positive',tareKg:'nonneg',weighedAt:'date',scaleTicket:'code',vehicleCode:'text',contractorCode:'text',district:'text',routeCode:'text',destinationCode:'text',treatment:'enum:TRANSFER,RECYCLE,COMPOST,LANDFILL,RECOVERY,OTHER',sourceMethod:'enum:WEIGHBRIDGE,ESTIMATE'},required:['stream','material','netKg','weighedAt','scaleTicket','sourceMethod']},
 CONTRACTOR:{label:'پیمانکاران و قراردادها',fields:{contractorCode:'code',name:'text',contractRef:'code',serviceType:'enum:STREET_CLEANING,WET_COLLECTION,DRY_COLLECTION,SORTING,TRANSFER,OTHER',startDate:'date',endDate:'date',contractStatus:'text',plannedCoverage:'nonneg'},required:['contractorCode','name','contractRef','serviceType']},
 CONTRACT_EVAL:{label:'عملکرد و کسورات پیمانکار',fields:{contractorCode:'code',periodStart:'date',periodEnd:'date',plannedServices:'integer',completedServices:'integer',inspectedServices:'integer',passedInspections:'integer',complaints:'integer',deductionMinor:'integer'},required:['contractorCode','periodStart','periodEnd','plannedServices','completedServices']},
 SHIFT:{label:'شیفت‌ها، تنظیف و غیبت',fields:{serviceDate:'date',serviceType:'enum:STREET_CLEANING,WET_COLLECTION,DRY_COLLECTION,TRANSFER,OTHER',district:'text',routeCode:'text',shiftName:'text',requiredStaff:'integer',presentStaff:'integer',absentStaff:'integer',replacementStaff:'integer',plannedKm:'nonneg',completedKm:'nonneg',contractorCode:'text'},required:['serviceDate','serviceType','routeCode','requiredStaff','presentStaff','absentStaff']},
 EDUCATION:{label:'آموزش و مشارکت شهروندان',fields:{heldAt:'date',district:'text',topic:'text',channel:'enum:IN_PERSON,SCHOOL,ONLINE,MEDIA,OTHER',audience:'text',participants:'integer',preScore:'score',postScore:'score',campaignRef:'text'},required:['heldAt','topic','channel','participants']},
 FACILITY:{label:'مراکز پردازش، انتقال و دفع',fields:{facilityCode:'code',facilityType:'enum:TRANSFER,SORTING,RECYCLING,COMPOST,LANDFILL,OTHER',district:'text',operatorCode:'text',capacityTonsPerDay:'nonneg',controlStatus:'text'},required:['facilityCode','facilityType','controlStatus']},
 QUALITY:{label:'بازرسی کیفیت و شکایات',fields:{inspectedAt:'date',district:'text',routeCode:'text',serviceType:'text',inspectedCount:'integer',passedCount:'integer',complaints:'integer',inspectorRef:'text'},required:['inspectedAt','routeCode','inspectedCount','passedCount']},
 VIOLATION:{label:'تخلفات پسماند و اخطاریه‌ها',fields:{detectedAt:'date',violationType:'text',district:'text',subjectRef:'text',noticeRef:'text',caseStatus:'text',description:'text'},required:['detectedAt','violationType','district','caseStatus']},
 LEGAL:{label:'پرونده‌های حقوقی و دادگاه',fields:{legalRef:'code',courtRef:'text',relatedViolationRef:'text',stage:'text',hearingAt:'date',decisionRef:'text',caseStatus:'text',summary:'text'},required:['legalRef','stage','caseStatus']},
});
export const LEGAL_ROLES=new Set(['MUNICIPAL_ADMIN','AUDITOR']);
export const READ_ROLES=new Set(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR','AUDITOR']);
export const WRITE_ROLES=new Set(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR']);
export const REVIEW_ROLES=new Set(['MUNICIPAL_ADMIN','AUDITOR']);
export const RECORD_STATES=Object.freeze(['SUBMITTED','VERIFIED','REJECTED']);
function validString(x,max=240){return typeof x==='string'&&x.trim().length>0&&x.trim().length<=max&&!/[\u0000-\u0008]/.test(x)}
export function validateRecord(kind,body){
 const spec=RECORD_KINDS[kind];if(!spec)throw Error('INVALID_WASTE_DOMAIN');
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('INVALID_PAYLOAD');
 if(Object.keys(body).some(k=>!Object.hasOwn(spec.fields,k)))throw Error('UNTRUSTED_FIELD_DENIED');
 for(const k of spec.required)if(body[k]===undefined||body[k]===null||body[k]==='')throw Error('REQUIRED_FIELD_'+k);
 const result={};
 for(const [k,v] of Object.entries(body)){
  if(v===null||v==='')continue;
  const type=spec.fields[k];
  if(type.startsWith('enum:')){if(typeof v!=='string'||!type.slice(5).split(',').includes(v))throw Error('INVALID_'+k);}
  else if(type==='text'||type==='code'){if(!validString(v,type==='text'?700:100)||type==='code'&&!/^[\p{L}\p{N}_.\/-]+$/u.test(v))throw Error('INVALID_'+k);}
  else if(type==='date'){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(v)||!Number.isFinite(Date.parse(v)))throw Error('INVALID_'+k);}
  else if(type==='positive'||type==='nonneg'||type==='integer'||type==='score'){
   if(typeof v!=='number'||!Number.isFinite(v)||v>(type==='integer'?1e9:1e12)||v<(type==='positive'?0.000001:0)||((type==='integer'||type==='score')&&!Number.isInteger(v))||(type==='score'&&v>100))throw Error('INVALID_'+k);
  }
  result[k]=v;
 }
 if(kind==='SHIFT'&&result.presentStaff+result.absentStaff>result.requiredStaff+Number(result.replacementStaff||0))throw Error('SHIFT_HEADCOUNT_INCONSISTENT');
 if(kind==='CONTRACT_EVAL'&&Number(result.completedServices)>Number(result.plannedServices))throw Error('CONTRACT_COUNT_INVALID');
 if(kind==='CONTRACT_EVAL'&&result.passedInspections!==undefined&&result.inspectedServices!==undefined&&result.passedInspections>result.inspectedServices)throw Error('INSPECTION_COUNT_INVALID');
 if(kind==='QUALITY'&&result.passedCount>result.inspectedCount)throw Error('QUALITY_COUNT_INVALID');
 if(kind==='COLLECTION'&&result.sourceMethod==='WEIGHBRIDGE'){if(result.grossKg===undefined||result.tareKg===undefined||result.grossKg<=result.tareKg||Math.abs(result.grossKg-result.tareKg-result.netKg)>0.01)throw Error('WEIGHBRIDGE_MASS_BALANCE_INVALID')}
 if(kind==='COLLECTION'&&result.sourceMethod==='ESTIMATE')result.estimateOnly=true;
 return Object.freeze(result);
}
export function safeSummary(rows){
 const ok=rows.filter(r=>r.review_state==='VERIFIED');
 const weights=ok.filter(r=>r.record_kind==='COLLECTION'&&r.payload.sourceMethod==='WEIGHBRIDGE');
 const sums={};const special={};const municipal=new Set(['WET','DRY','MIXED','GREEN','BULKY']);for(const r of weights){const k=r.payload.stream;const target=municipal.has(k)?sums:special;target[k]=(target[k]||0)+Number(r.payload.netKg||0)}
 const shifts=ok.filter(r=>r.record_kind==='SHIFT');
 return {verifiedWeighedKgByStream:sums,specialWasteKgByStream:special,verifiedLoadCount:weights.length,verifiedAbsences:shifts.reduce((n,r)=>n+Number(r.payload.absentStaff||0),0),verifiedShiftCount:shifts.length,
   pendingReview:rows.filter(r=>r.review_state==='SUBMITTED').length,legalCases:rows.filter(r=>r.record_kind==='LEGAL').length,syntheticOnly:true,verifiedRealWorldValue:false};
}

/** Deterministic, evidence-bound agent candidates. Not automated decisions or verified outcomes. */
export function deriveAgentCandidates(rows){
 const suggestions=[];
 const verified=rows.filter(r=>r.review_state==='VERIFIED');
 const push=(r,code,title,detail)=>suggestions.push({code,title,detail,recordId:r.id,recordKind:r.record_kind,decision:'HUMAN_REVIEW_REQUIRED',autoExecute:false,verifiedImpact:false});
 for(const r of verified){
  const p=r.payload||{};
  if(r.record_kind==='CONTRACT_EVAL'&&p.plannedServices>0&&p.completedServices/p.plannedServices<0.9)push(r,'CONTRACT_SERVICE_GAP','بازبینی تحقق خدمات پیمانکار',`تحقق خدمات ${p.completedServices} از ${p.plannedServices} ثبت شده است؛ نیازمند کنترل قرارداد و مستندات.`);
  if(r.record_kind==='QUALITY'&&p.inspectedCount>0&&p.passedCount/p.inspectedCount<0.9)push(r,'QUALITY_EXCEPTION','بازبینی کیفیت تنظیف',`نتیجه پذیرفته‌شده ${p.passedCount} از ${p.inspectedCount} بازرسی است؛ بررسی مستقل علت پیشنهاد می‌شود.`);
  if(r.record_kind==='SHIFT'&&p.requiredStaff>0&&p.absentStaff/p.requiredStaff>0.1)push(r,'SHIFT_ABSENCE_RISK','ریسک پوشش نیروی انسانی',`غیبت تجمیعی ${p.absentStaff} از ${p.requiredStaff} نفر برنامه ثبت شده؛ ارجاع به HR برای کنترل.`);
  if(r.record_kind==='COLLECTION'&&p.sourceMethod==='ESTIMATE')push(r,'WEIGHT_EVIDENCE_MISSING','نیاز به سند وزن معتبر',`رکورد ${r.record_code} برآوردی است و در مجموع تناژ باسکولی محاسبه نمی‌شود.`);
  if(r.record_kind==='EDUCATION'&&Number.isFinite(p.preScore)&&Number.isFinite(p.postScore)&&p.postScore<=p.preScore)push(r,'EDUCATION_MEASUREMENT','بازبینی اثر آموزش',`امتیاز پس‌آزمون افزایش ثبت‌شده ندارد؛ بررسی کیفیت نمونه‌گیری پیشنهاد می‌شود.`);
 }
 return suggestions.slice(0,50);
}
