/** V7.5 isolated synthetic-operations lab. NEVER a production operations API. */
import {randomUUID} from 'node:crypto';
import {RECORD_KINDS,validateRecord} from './waste-suite-defs.mjs';
import {identifier,fail,isCurrent} from './organization-identity-core.mjs';
import {isWasteDemoCity,isWasteOrganization,WASTE_CODE} from './waste-pilot-core.mjs';
export const LAB_MODE='RHF-WASTE-LAB-V7.5';
export const RESTRICTED=new Set(['LEGAL','VIOLATION']);
export const FLOW_TYPES=Object.freeze({WEIGHBRIDGE_REVIEW:'رسیدگی به قبض باسکول',FLEET_MAINTENANCE:'رسیدگی به خرابی ناوگان',CONTRACTOR_REVIEW:'کنترل پیمانکار',INSPECTION_REVIEW:'بازرسی و کنترل کیفیت',STAFFING_REVIEW:'پوشش شیفت',EDUCATION_REVIEW:'بررسی مشارکت آموزشی',VALUE_OPPORTUNITY:'فرصت خلق ارزش',LEGAL_REVIEW:'بررسی حقوقی آزمایشی'});
const text=(x,min,max,label)=>{if(typeof x!=='string'||x.trim().length<min||x.length>max||/[\x00-\x1f]/.test(x))fail(`${label}: طول یا متن نامعتبر است`,400);return x.trim()};
export function guardCity(city){if(!city||!isWasteDemoCity(city.name))fail('فقط شهرداری آزمایشی شیراز مجاز است',403)}
export function checkRequestOrigin(req){const origin=req?.headers?.origin;const host=req?.headers?.host;if(!origin||!host)fail('BROWSER_ORIGIN_REQUIRED',403);let u;try{u=new URL(origin)}catch{fail('INVALID_ORIGIN',403)}if(!['http:','https:'].includes(u.protocol)||u.host!==host||u.protocol!==(process.env.PUBLIC_HTTPS==='true'?'https:':'http:'))fail('ORIGIN_MISMATCH',403)}
export function exactKeys(raw,keys){if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(x=>!keys.includes(x)))fail('درخواست دارای فیلد غیرمجاز است',400)}
export function access({user,city,role,appointment,unit}){
 guardCity(city);
 if(user?.is_system_admin)return {kind:'ADMIN',orgId:unit?.id||null,canRestricted:true,canReview:true};
 if(!appointment||appointment.user_id!==user?.id||appointment.tenant_id!==city.tenant_id||appointment.municipality_id!==city.id||appointment.position_code!=='ORG_CEO'||!isCurrent(appointment)||appointment.org_unit_id!==unit?.id||!isWasteOrganization(unit))fail('دسترسی سازمانی تأییدشده وجود ندارد',403);
 return {kind:'CEO',orgId:unit.id,canRestricted:false,canReview:false};
}
export function domainAllowed(domain,permit){if(!Object.hasOwn(RECORD_KINDS,domain))fail('حوزه تعریف نشده است',400);if(RESTRICTED.has(domain)&&!permit.canRestricted)fail('حوزه حقوقی یا تخلفات به مجوز ویژه نیاز دارد',403);return domain;}
export function normalizedRecord({domain,data,code,evidenceRef,requestKey},permit){domainAllowed(domain,permit);text(code,4,80,'کد رکورد');text(evidenceRef,12,260,'مرجع مصنوعی شواهد');identifier(requestKey,'کلید یکتای درخواست');let payload;try{payload=validateRecord(domain,data)}catch(e){fail('INVALID_DEMO_RECORD: '+e.message,400)}return {domain,code:code.trim(),evidenceRef:evidenceRef.trim(),requestKey,payload};}
export function normalizedFlow(raw,permit){exactKeys(raw,['action','requestKey','kind','title','description','relatedRecordId','metric','unit','baseline','target']);identifier(raw.requestKey,'کلید درخواست');if(!Object.hasOwn(FLOW_TYPES,raw.kind))fail('نوع فرایند نامعتبر',400);if(raw.kind==='LEGAL_REVIEW'&&!permit.canRestricted)fail('مجوز بررسی حقوقی لازم است',403);
 const b={kind:raw.kind,requestKey:raw.requestKey,title:text(raw.title,8,160,'عنوان'),description:text(raw.description,35,2000,'شرح'),relatedRecordId:raw.relatedRecordId?identifier(raw.relatedRecordId,'شناسه رکورد'):null,metric:null,unit:null,baseline:null,target:null};
 if(b.kind==='VALUE_OPPORTUNITY'){b.metric=text(raw.metric,5,120,'شاخص');b.unit=text(raw.unit,1,50,'واحد');for(const k of ['baseline','target']){if(raw[k]===undefined||raw[k]===null||raw[k]==='')continue;if(typeof raw[k]!=='number'||!Number.isFinite(raw[k])||Math.abs(raw[k])>1e9)fail('عدد شاخص نامعتبر است');b[k]=raw[k]}}else if(['metric','unit','baseline','target'].some(k=>raw[k]!==undefined))fail('شاخص فقط برای فرصت ارزش مجاز است');return b;}
export function normalizedReview(raw){exactKeys(raw,['action','decision','note','version']);if(raw.action!=='REVIEW'||!['REVIEWED','REJECTED'].includes(raw.decision))fail('تصمیم نامعتبر است');if(!Number.isSafeInteger(raw.version)||raw.version<1)fail('نسخه نامعتبر است');return {decision:raw.decision,version:raw.version,note:text(raw.note,30,1200,'دلیل تصمیم')};}
export function canReview(permit,user,row){if(!permit.canReview)fail('مجوز بازبین وجود ندارد',403);if(!row||row.status!=='SUBMITTED')fail('این درخواست قابل تصمیم نیست',409);if(row.created_by===user.id)fail('خودتأییدی ممنوع است',403);}
export function safeRow(r){return {id:r.id,kind:r.kind,domain:r.domain,code:r.code,title:r.title||null,description:r.description||null,status:r.status,version:r.version,evidenceRef:r.evidence_ref||null,relatedRecordId:r.related_record_id||null,payload:r.payload||{},createdAt:r.created_at,createdBy:r.created_by,reviewedAt:r.reviewed_at||null,reviewedBy:r.reviewed_by||null,reviewNote:r.review_note||null,synthetic:true,fieldVerified:false,verifiedPublicValue:false,dispatchAllowed:false};}
export function sampleRecords(){const d='2026-11-09';return [
 ['COLLECTION','DEMO-WB-001',{stream:'DRY',material:'PLASTIC',grossKg:1300,tareKg:800,netKg:500,weighedAt:d,scaleTicket:'DEMO-WB-001',sourceMethod:'WEIGHBRIDGE',routeCode:'DEMO-ROUTE-01',vehicleCode:'DEMO-TRUCK-01'}],
 ['COLLECTION','DEMO-WB-002',{stream:'WET',material:'ORGANIC',netKg:690,weighedAt:d,scaleTicket:'DEMO-WB-002',sourceMethod:'ESTIMATE',routeCode:'DEMO-ROUTE-02'}],
 ['FLEET','DEMO-TRUCK-01',{assetCode:'DEMO-TRUCK-01',assetType:'کامیون جمع‌آوری',condition:'نیازمند بازبینی',capacityKg:3500,zone:'منطقه آزمایشی ۱'}],
 ['FLEET','DEMO-TRUCK-02',{assetCode:'DEMO-TRUCK-02',assetType:'خودروی نظافت',condition:'آماده آزمایشی',capacityKg:2000,zone:'منطقه آزمایشی ۲'}],
 ['MAINTENANCE','DEMO-MNT-001',{assetCode:'DEMO-TRUCK-01',maintenanceType:'بازبینی سیستم ترمز',openedAt:d,downtimeHours:7,workshopRef:'DEMO-WORKSHOP'}],
 ['CONTRACTOR','DEMO-CNT-01',{contractorCode:'DEMO-CNT-01',name:'پیمانکار فرضی الف',contractRef:'DEMO-CONTRACT-01',serviceType:'DRY_COLLECTION',contractStatus:'آزمایشی'}],
 ['CONTRACT_EVAL','DEMO-EVAL-01',{contractorCode:'DEMO-CNT-01',periodStart:'2026-11-01',periodEnd:d,plannedServices:100,completedServices:78,inspectedServices:35,passedInspections:28}],
 ['SHIFT','DEMO-SHIFT-01',{serviceDate:d,serviceType:'STREET_CLEANING',routeCode:'DEMO-ROUTE-01',requiredStaff:22,presentStaff:18,absentStaff:4,shiftName:'صبح'}],
 ['EDUCATION','DEMO-EDU-01',{heldAt:d,topic:'آموزش تفکیک در مبدأ',channel:'SCHOOL',participants:65,preScore:52,postScore:69,district:'منطقه آزمایشی'}],
 ['FACILITY','DEMO-FAC-01',{facilityCode:'DEMO-FAC-01',facilityType:'SORTING',capacityTonsPerDay:95,controlStatus:'اسمی و تأییدنشده'}],
 ['QUALITY','DEMO-QA-001',{inspectedAt:d,routeCode:'DEMO-ROUTE-01',inspectedCount:30,passedCount:23,complaints:4}],
 ['VIOLATION','DEMO-VIO-01',{detectedAt:d,violationType:'تخلیه غیرمجاز فرضی',district:'منطقه آزمایشی',caseStatus:'فقط سناریو'}],
 ['LEGAL','DEMO-LEGAL-01',{legalRef:'DEMO-LEGAL-01',stage:'بررسی فرضی',caseStatus:'فاقد پرونده قضایی واقعی',summary:'داده کاملاً ساختگی برای آزمون کنترل دسترسی'}]
 ].map(([domain,code,payload])=>({domain,code,payload:validateRecord(domain,payload),evidenceRef:`SYNTHETIC-V75/${code}`}));}
export function sampleFlows(){return [
 {kind:'WEIGHBRIDGE_REVIEW',code:'DEMO-FLOW-WB',title:'بررسی نمونه مغایرت باسکول',description:'بررسی آزمایشی انتساب قبض باسکول به پرونده و اصالت شواهد؛ هیچ بازدید میدانی انجام نشده است.'},
 {kind:'FLEET_MAINTENANCE',code:'DEMO-FLOW-FLEET',title:'پیگیری آزمایشی توقف ناوگان',description:'بازبینی فرضی توقف خودروی جمع‌آوری و پیشنهاد تکمیل شواهد تعمیرات بدون اعزام خودکار.'},
 {kind:'VALUE_OPPORTUNITY',code:'DEMO-FLOW-VALUE',title:'فرصت فرضی کاهش توقف ناوگان',description:'فرضیه آموزشی برای بررسی کاهش زمان توقف؛ این اعداد واقعی یا ارزش شهری تأییدشده نیستند.',metric:'ساعات توقف ناوگان',unit:'ساعت',baseline:12,target:8}
 ];}
export function requestId(){return randomUUID()}
