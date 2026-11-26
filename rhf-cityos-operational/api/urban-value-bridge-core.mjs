/** RHF Future Cities — evidence-bound, read-only opportunity discovery.
 * A deterministic discovery adapter, NOT a LangGraph/Temporal execution proof.
 * Never certifies public value or authorizes municipal action.
 */
export const BRIDGE_VERSION='RHF-DUAL-VALUE-BRIDGE-V1';
const UID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedStatuses=new Set(['SUBMITTED','AUTHORIZED','REJECTED']);
const allowedWasteKinds=new Set(['COLLECTION','SHIFT','QUALITY','CONTRACT_EVAL','MAINTENANCE','FLEET','EDUCATION','FACILITY','CONTRACTOR']);
const asNumber=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
export function mayViewDeputy({role,systemAdmin=false,approvedDeputy=false}){
 const oversight=systemAdmin||['MUNICIPAL_ADMIN','AUDITOR'].includes(role);
 return oversight||(role==='DEPUTY'&&approvedDeputy);
}
export function discoverOpportunities({cityId,tenantId,surface,wasteRows=[],valueRows=[],deriveWaste}){
 if(!UID.test(cityId||'')||!UID.test(tenantId||'')||!['deputy','waste'].includes(surface))throw Error('INVALID_DISCOVERY_SCOPE');
 if(!Array.isArray(wasteRows)||!Array.isArray(valueRows)||typeof deriveWaste!=='function')throw Error('INVALID_DISCOVERY_INPUT');
 const authorizedWaste=wasteRows.filter(r=>r&&allowedWasteKinds.has(r.record_kind)&&UID.test(r.id||''));
 const safeRows=authorizedWaste.filter(r=>r.review_state==='VERIFIED');
 const result=[];
 const pending=authorizedWaste.filter(r=>r.review_state==='SUBMITTED');
 if(pending.length){
  result.push({id:'REVIEW_QUEUE_'+cityId,source:'WASTE_OPS',category:'REVIEW_BACKLOG',title:'بررسی صف سوابق پسماند',
   explanation:`${pending.length} سابقه قابل مشاهده در انتظار بررسی داخلی است؛ این تعداد شاخص کیفیت خدمات شهری نیست.`,
   evidence:pending.slice(0,12).map(x=>({id:x.id,type:x.record_kind})),
   nextStep:'بررسی مستقل سوابق و ارزیابی نیاز به اقدام اصلاحی',metric:'review_queue_count',baseline:null,target:null,unit:'record',
   confidence:'RULE_BASED',stage:'HUMAN_REVIEW_REQUIRED',verifiedPublicValue:false,canAutoExecute:false});
 }
 for(const c of deriveWaste(safeRows).slice(0,24)){
  const record=safeRows.find(r=>r.id===c.recordId);
  if(!record||!allowedWasteKinds.has(record.record_kind))continue;
  result.push({id:`WASTE_${String(c.code||'RULE').replace(/[^A-Z0-9_]/g,'').slice(0,60)}_${record.id}`,
   source:'WASTE_OPS',category:c.code||'REVIEW',title:String(c.title||'فرصت نیازمند بررسی').slice(0,140),
   explanation:String(c.detail||'بررسی شواهد الزامی است').slice(0,400),
   evidence:[{id:record.id,type:record.record_kind}],nextStep:'کنترل داده منبع، طراحی اقدام و درخواست تصویب انسان مسئول',
   metric:null,baseline:null,target:null,unit:null,confidence:'RULE_BASED',stage:'HUMAN_REVIEW_REQUIRED',
   verifiedPublicValue:false,canAutoExecute:false});
 }
 for(const p of valueRows.slice(0,80)){
  if(!p||p.kind!=='VALUE_OPPORTUNITY'||!allowedStatuses.has(p.status)||!UID.test(p.id||''))continue;
  result.push({id:'VALUE_HYPOTHESIS_'+p.id,source:'DEPUTY_PROCESS',category:'VALUE_HYPOTHESIS',
   title:'فرضیه ارزش شهری ثبت‌شده',explanation:`فرضیه با وضعیت ${p.status} وجود دارد؛ اعتبارسنجی خط مبنا و نتیجه مستقل هنوز اثبات نشده است.`,
   evidence:[{id:p.id,type:'VALUE_OPPORTUNITY'}],nextStep:'تکمیل شواهد، تأیید تصمیم، مشاهده پس از اجرا و راستی‌آزمایی مستقل',
   metric:typeof p.metric==='string'?p.metric.slice(0,100):null,baseline:asNumber(p.baseline),target:asNumber(p.target),
   unit:typeof p.unit==='string'?p.unit.slice(0,40):null,confidence:'REGISTERED_HYPOTHESIS',
   stage:p.status==='AUTHORIZED'?'AUTHORIZED_NOT_EXECUTED':p.status==='REJECTED'?'REJECTED':'HUMAN_REVIEW_REQUIRED',
   verifiedPublicValue:false,canAutoExecute:false});
 }
 return Object.freeze({schema:BRIDGE_VERSION,cityId,tenantId,surface,
  governance:{readOnly:true,decisionApproval:'HUMAN_REQUIRED',execution:'NOT_CONNECTED',valueVerification:'NOT_ATTESTED',
   temporal:'NOT_ATTESTED',langGraph:'NOT_ATTESTED',aiModel:'NOT_EXECUTED',syntheticDataMayBePresent:true},
  coverage:{wasteRecordsObserved:authorizedWaste.length,verifiedWasteRecords:safeRows.length,pendingWasteRecords:pending.length,
   registeredValueHypotheses:valueRows.length,boundedSample:true,notMunicipalityPerformance:true},
  candidates:result.slice(0,40)});
}
