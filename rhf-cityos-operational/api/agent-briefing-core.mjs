// RHF City OS V8P6.6 — bounded, explainable specialist briefing; NOT autonomous dispatch.
import {createHash} from 'node:crypto';
import {SPECIALISTS,classifyEvidence,SCAN_LIMIT,CASE_SCAN_LIMIT} from './agent-specialist-core.mjs';
export const AGENT_BRIEF_VERSION='RHF-SPECIALIST-AGENT-BRIEFING-V8P6.6';
export const AGENT_BRIEF_PARTS=Object.freeze(['agent-specialist-briefing']);
export const BRIEF_SOURCE='RUVOS_SCOPED_CASE_EVIDENCE';
export const AGENT_CATALOG=Object.freeze([
 ...SPECIALISTS.map(x=>({key:x.key,title:x.label,domain:x.domain,state:'RULE_BASED_REVIEW_ONLY',dataSource:BRIEF_SOURCE})),
 {key:'WASTE',title:'تحلیلگر خدمات پسماند',domain:'پسماند',state:'CASE_SPECIFIC_DATA_NOT_VERIFIED',dataSource:null},
 {key:'GREEN_SPACE',title:'تحلیلگر فضای سبز و آبیاری',domain:'فضای سبز',state:'CASE_SPECIFIC_DATA_NOT_VERIFIED',dataSource:null},
 {key:'FLEET',title:'تحلیلگر ناوگان',domain:'ناوگان',state:'CASE_SPECIFIC_DATA_NOT_VERIFIED',dataSource:null},
 {key:'CITIZEN_137',title:'تحلیلگر درخواست شهروندی',domain:'مشارکت شهروندی',state:'CASE_SPECIFIC_DATA_NOT_VERIFIED',dataSource:null},
]);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEYS=Object.freeze({NO_WORK_ORDER_LINK:0,ACTIVE_CONTRACT_LINK_GAP:1,INSPECTION_PASS_NOT_CURRENT:2,VALUE_VERIFICATION_GAP:3});
const text=(s,max=220)=>typeof s==='string'?s.replace(/[<>\u0000-\u001f\u007f]/g,'').trim().slice(0,max):'';
const int=n=>Number.isSafeInteger(n)&&n>=0;
const hash=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const known=new Set(SPECIALISTS.map(x=>x.key));
export function createAgentBriefing({city,caseRows,evidenceByCase,now=Date.now(),partial=false}){
 if(!city||!uuid.test(city.id||'')||!uuid.test(city.tenant_id||'')||!Array.isArray(caseRows)||caseRows.length>SCAN_LIMIT||!Number.isFinite(now)||!Array.isArray(evidenceByCase)||evidenceByCase.length!==caseRows.length)throw Error('BRIEF_SCOPE_INVALID');
 const cases=new Set(),issues=[],trace=[];
 for(let i=0;i<caseRows.length;i++){
  const row=caseRows[i],x=evidenceByCase[i];
  if(!uuid.test(row?.id||'')||cases.has(row.id)||!x||x.case?.id!==row.id||!x.execution||!x.finance||!x.value)throw Error('BRIEF_EVIDENCE_INVALID');
  cases.add(row.id);
  const fingerprint=hash(x),found=classifyEvidence(row.id,x);
  const entries=[];
  for(const f of found){
   if(!known.has(f.specialist)||!(f.code in KEYS)||!Array.isArray(f.steps)||f.steps.length!==3||f.source!==BRIEF_SOURCE||f.municipalActionExecuted!==false)throw Error('BRIEF_RULE_INVALID');
   const severity='REVIEW_REQUIRED'; // Not a diagnosis, a field incident or a regulatory breach.
   const item={id:f.id,caseId:row.id,specialist:f.specialist,code:f.code,title:text(f.title,180),why:text(f.why,450),observation:text(f.observation,240),steps:f.steps.map(z=>text(z,180)),reviewOrder:KEYS[f.code],severity,casePriority:['LOW','NORMAL','HIGH','CRITICAL'].includes(x.case.priority)?x.case.priority:'UNKNOWN',status:text(x.case.status,48),evidenceFingerprint:fingerprint,evidenceBasis:BRIEF_SOURCE,caseDataFreshness:'NOT_ESTABLISHED',dataTrust:'NOT_LINKED_TO_CASE',location:'موقعیت در شواهد این خوانش تأیید نشده',locationVerified:false,requiredAuthorization:'HUMAN_REVIEW',expectedOutcome:'NOT_ESTIMATED',estimatedCost:'NOT_ESTIMATED',modelInvoked:false,autonomousDispatch:false,municipalActionExecuted:false,publicValueVerified:false};
   issues.push(item);entries.push(item.id);
  }
  trace.push({caseId:row.id,evidenceFingerprint:fingerprint,ruleMatches:entries.length});
 }
 issues.sort((a,b)=>a.reviewOrder-b.reviewOrder||a.caseId.localeCompare(b.caseId)||a.id.localeCompare(b.id));
 if(issues.length>SCAN_LIMIT*4||trace.length>SCAN_LIMIT)throw Error('BRIEF_LIMIT_EXCEEDED');
 return {version:AGENT_BRIEF_VERSION,municipalityId:city.id,tenantId:city.tenant_id,generatedAt:new Date(now).toISOString(),mode:'DETERMINISTIC_SCOPED_READ_ONLY',source:BRIEF_SOURCE,caseLimit:SCAN_LIMIT,scannedCases:caseRows.length,partial:partial===true,items:issues,caseEvidence:trace,findingsCount:issues.length,unflaggedSampleCases:caseRows.length-new Set(issues.map(x=>x.caseId)).size,agents:AGENT_CATALOG,modelInvoked:false,autoWrites:0,autonomousDispatch:false,municipalActionExecuted:false,publicValueVerified:false,notes:['رتبه‌بندی صرفاً ترتیب بازبینی شکاف شواهد است؛ فوریت، تخلف یا خسارت را اثبات نمی‌کند.','نمونه محدود پرونده‌های اخیر؛ نبود یافته به معنی سلامت سازمان یا شهر نیست.','برای هر اقدام، مجوز انسانی، بررسی تازه شواهد و فرایند موجود RUVOS ضروری است.','اتصال زنده منابع و موقعیت مکانی در این تحلیل احراز نشده است.']};
}
export function validateAgentBriefing(obj,city){
 if(!obj||obj.version!==AGENT_BRIEF_VERSION||obj.municipalityId!==city||!uuid.test(obj.tenantId||'')||obj.mode!=='DETERMINISTIC_SCOPED_READ_ONLY'||obj.source!==BRIEF_SOURCE||obj.caseLimit!==SCAN_LIMIT||!int(obj.scannedCases)||obj.scannedCases>SCAN_LIMIT||typeof obj.partial!=='boolean'||!Array.isArray(obj.items)||obj.items.length>48||!Array.isArray(obj.caseEvidence)||obj.caseEvidence.length!==obj.scannedCases||!Array.isArray(obj.agents)||obj.agents.length!==8||!int(obj.findingsCount)||obj.findingsCount!==obj.items.length||!int(obj.unflaggedSampleCases)||obj.unflaggedSampleCases>obj.scannedCases||obj.modelInvoked!==false||obj.autoWrites!==0||obj.autonomousDispatch!==false||obj.municipalActionExecuted!==false||obj.publicValueVerified!==false||!Number.isFinite(Date.parse(obj.generatedAt)))return false;
 const knownKeys=new Set(AGENT_CATALOG.map(x=>x.key)),ids=new Set(),caseIds=new Set(obj.caseEvidence.map(x=>x.caseId));
 if(caseIds.size!==obj.caseEvidence.length||!obj.caseEvidence.every(x=>uuid.test(x.caseId||'')&&/^[a-f0-9]{64}$/.test(x.evidenceFingerprint||'')&&int(x.ruleMatches)&&x.ruleMatches<=4))return false;
 if(!obj.agents.every(x=>knownKeys.has(x.key)&&x.state===AGENT_CATALOG.find(y=>y.key===x.key).state)||new Set(obj.agents.map(x=>x.key)).size!==8)return false;
 return obj.items.every(x=>x&&typeof x.id==='string'&&!ids.has(x.id)&&ids.add(x.id)&&caseIds.has(x.caseId)&&knownKeys.has(x.specialist)&&['OPERATIONS','CONTRACT','INSPECTION','VALUE'].includes(x.specialist)&&x.severity==='REVIEW_REQUIRED'&&int(x.reviewOrder)&&x.reviewOrder<=3&&typeof x.title==='string'&&x.title.length>0&&x.title.length<=180&&typeof x.why==='string'&&x.why.length<=450&&Array.isArray(x.steps)&&x.steps.length===3&&x.steps.every(z=>typeof z==='string'&&z.length<=180)&&x.requiredAuthorization==='HUMAN_REVIEW'&&x.evidenceBasis===BRIEF_SOURCE&&/^[a-f0-9]{64}$/.test(x.evidenceFingerprint||'')&&x.dataTrust==='NOT_LINKED_TO_CASE'&&x.locationVerified===false&&x.modelInvoked===false&&x.autonomousDispatch===false&&x.municipalActionExecuted===false&&x.publicValueVerified===false);
}
