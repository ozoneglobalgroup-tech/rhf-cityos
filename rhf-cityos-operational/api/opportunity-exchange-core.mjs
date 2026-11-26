// V8P3.4: evidence-bound screening of synthetic cross-domain needs and fleet activity.
// Counts of non-stopped vehicles are NOT availability, legal authority, or a verified match.
import {validateFields,DOSSIER_KEYS} from './deputy-dossier-schema.mjs';
export const EXCHANGE_VERSION='RHF-URBAN-OPPORTUNITY-EXCHANGE-V8P3.4';
const STATUS=new Set(['DRAFT','SUBMITTED','REVIEWED','REJECTED','FIXTURE']);
const NEED_RULES=Object.freeze({
 GREEN:{field:'irrigationIssues',name:'موارد فرضی آبیاری',kind:'MOBILITY_SUPPORT_SCREENING'},
 PUBLIC:{field:'overdue',name:'خدمات عمومی معوق نمونه',kind:'MOBILITY_SUPPORT_SCREENING'},
 BEAUTIFICATION:{field:'damaged',name:'اقلام نیازمند بررسی نمونه',kind:'MOBILITY_SUPPORT_SCREENING'}
});
const ID=/^[0-9a-f-]{36}$/i;
function validated(row){
 if(!row||!ID.test(row.id)||!DOSSIER_KEYS.includes(row.orgKey)||!STATUS.has(row.status)||typeof row.code!=='string'||row.code.length>150||typeof row.title!=='string'||row.title.length>200)throw Error('EXCHANGE_DOSSIER_CONTRACT_INVALID');
 return {...row,fields:validateFields(row.orgKey,row.fields)};
}
export function buildOpportunityExchange({cityId,permit,rows,partial=false}){
 if(!ID.test(cityId)||!permit||!['ADMIN','INDEPENDENT_REVIEWER','DEPUTY'].includes(permit.kind)||!Array.isArray(rows)||rows.length>200||typeof partial!=='boolean')throw Error('EXCHANGE_SCOPE_INVALID');
 const used=new Set();
 const clean=rows.map(validated);
 for(const r of clean){if(used.has(r.id))throw Error('EXCHANGE_DUPLICATE_SOURCE');used.add(r.id)}
 const eligible=clean.filter(r=>!['DRAFT','REJECTED'].includes(r.status));
 const needs=eligible.flatMap(r=>{
   const rule=NEED_RULES[r.orgKey];if(!rule)return [];
   const quantity=r.fields[rule.field];if(!Number.isSafeInteger(quantity)||quantity<=0)return [];
   return [{sourceId:r.id,sourceCode:r.code,orgKey:r.orgKey,title:r.title,metric:rule.name,observedSyntheticNeed:quantity,status:r.status,kind:rule.kind}];
 }).slice(0,50);
 const leads=eligible.filter(r=>r.orgKey==='FLEET'&&r.fields.vehicles>r.fields.stopped).map(r=>({
   sourceId:r.id,sourceCode:r.code,orgKey:r.orgKey,title:r.title,status:r.status,
   recordedVehicles:r.fields.vehicles,recordedStopped:r.fields.stopped,
   recordedNonStopped:r.fields.vehicles-r.fields.stopped,
   availableVehicles:null,availabilityVerified:false,assetSuitabilityVerified:false,locationVerified:false,legalAccessVerified:false
 })).slice(0,25);
 const candidates=[];
 for(const n of needs){for(const c of leads){
  if(candidates.length>=25)break;
  candidates.push({id:`${n.sourceId}:${c.sourceId}`,needSourceId:n.sourceId,capacitySourceId:c.sourceId,
    needOrgKey:n.orgKey,capacityOrgKey:'FLEET',needMetric:n.metric,observedSyntheticNeed:n.observedSyntheticNeed,
    recordedNonStoppedVehicles:c.recordedNonStopped,
    status:'REQUIRES_CAPACITY_VALIDATION',confirmedMatch:false,allocationAllowed:false,
    estimateOfBenefit:null,verifiedValue:false,
    unknowns:['دسترسی واقعی ناوگان','تطابق نوع خودرو با مأموریت','مکان و زمان قابل استفاده','مالکیت منابع و اجازه قانونی','هزینه و ارزش قابل اثبات']});
 }if(candidates.length>=25)break}
 return {mode:EXCHANGE_VERSION,cityId,synthetic:true,partial,source:'TENANT_CITY_DEPUTY_SCOPED_V8P2_POSTGRES_DOSSIERS',
   method:'RULE_BASED_EVIDENCE_SCREENING',permissions:{seat:permit.kind,canCreateSyntheticDraft:permit.canCreate===true,canReviewOtherCreator:permit.canReview===true},
   verifiedPublicValue:false,legalAuthorityVerified:false,autonomousDispatch:false,allocationAllowed:false,
   confirmedCapacityMatches:0,confirmedAvailableResources:0,
   counts:{returnedRecords:clean.length,needSignals:needs.length,capacityLeads:leads.length,unverifiedPairings:candidates.length},
   needs,capacityLeads:leads,candidates,
   caveat:'این فهرست فقط رابطه‌های احتمالی میان فرم‌های آزمایشی را نشان می‌دهد. خودرو غیرمتوقف الزاماً آزاد یا مناسب نیست؛ هیچ تخصیص، تأیید قانونی، ارزش مالی یا نتیجه میدانی استنتاج نشده است.'};
}
