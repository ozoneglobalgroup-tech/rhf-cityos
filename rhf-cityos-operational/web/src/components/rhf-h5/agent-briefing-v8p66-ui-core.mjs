// RHF V8P6.6: fail-closed response contract, view-only client helpers.
export const BRIEFING_UI_VERSION='RHF-EXECUTIVE-AGENT-BRIEFING-V8P6.6';
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const agentKeys=['OPERATIONS','CONTRACT','INSPECTION','VALUE'];
export const BRIEF_AGENTS=Object.freeze({OPERATIONS:'اجرای خدمت',CONTRACT:'قرارداد و پیمانکار',INSPECTION:'نظارت و بازرسی',VALUE:'سنجش ارزش'});
export function validateBriefing(city,x){
 if(!UUID.test(city||'')||!x||x.version!=='RHF-SPECIALIST-AGENT-BRIEFING-V8P6.6'||x.municipalityId!==city||!UUID.test(x.tenantId||'')||x.mode!=='DETERMINISTIC_SCOPED_READ_ONLY'||x.source!=='RUVOS_SCOPED_CASE_EVIDENCE'||x.caseLimit!==12||!Number.isInteger(x.scannedCases)||x.scannedCases<0||x.scannedCases>12||typeof x.partial!=='boolean'||!Array.isArray(x.items)||x.items.length>48||x.findingsCount!==x.items.length||!Array.isArray(x.caseEvidence)||x.caseEvidence.length!==x.scannedCases||!Array.isArray(x.agents)||x.agents.length!==8||x.modelInvoked!==false||x.autoWrites!==0||x.autonomousDispatch!==false||x.municipalActionExecuted!==false||x.publicValueVerified!==false||!Number.isFinite(Date.parse(x.generatedAt)))return null;
 const ids=new Set(),cases=new Set(x.caseEvidence.map(s=>s.caseId));
 if(cases.size!==x.caseEvidence.length||!x.caseEvidence.every(s=>UUID.test(s.caseId||'')&&/^[a-f0-9]{64}$/.test(s.evidenceFingerprint||'')&&Number.isInteger(s.ruleMatches)&&s.ruleMatches>=0&&s.ruleMatches<=4))return null;
 if(x.agents.filter(a=>agentKeys.includes(a.key)&&a.state==='RULE_BASED_REVIEW_ONLY').length!==4||x.agents.filter(a=>!agentKeys.includes(a.key)&&a.state==='CASE_SPECIFIC_DATA_NOT_VERIFIED').length!==4)return null;
 for(const f of x.items){
  if(!f||typeof f.id!=='string'||ids.has(f.id)||!cases.has(f.caseId)||!agentKeys.includes(f.specialist)||!['NO_WORK_ORDER_LINK','ACTIVE_CONTRACT_LINK_GAP','INSPECTION_PASS_NOT_CURRENT','VALUE_VERIFICATION_GAP'].includes(f.code)||!Number.isInteger(f.reviewOrder)||f.reviewOrder<0||f.reviewOrder>3||typeof f.title!=='string'||f.title.length>180||!f.title||typeof f.why!=='string'||f.why.length>450||typeof f.observation!=='string'||f.observation.length>240||!Array.isArray(f.steps)||f.steps.length!==3||f.steps.some(s=>typeof s!=='string'||s.length>180)||!/^([a-f0-9]{64})$/.test(f.evidenceFingerprint||'')||f.evidenceBasis!=='RUVOS_SCOPED_CASE_EVIDENCE'||f.requiredAuthorization!=='HUMAN_REVIEW'||f.severity!=='REVIEW_REQUIRED'||f.locationVerified!==false||f.dataTrust!=='NOT_LINKED_TO_CASE'||f.modelInvoked!==false||f.autonomousDispatch!==false||f.municipalActionExecuted!==false||f.publicValueVerified!==false)return null;
  ids.add(f.id);
 }
 return x;
}
export function briefMemo({cityName='شهرداری جاری',data,item}){
 if(!data||!item)return '';
 const lines=[`RHF City OS | V8P6.6 | گزارش بازبینی فقط‌خواندنی`,`شهر: ${cityName}`,`شناسه پرونده: ${item.caseId}`,`موضوع: ${item.title}`,`حوزه: ${BRIEF_AGENTS[item.specialist]}`,`علت بازبینی: ${item.why}`,`شواهد اولیه: ${item.observation}`,`شناسه اثرانگشت شواهد: ${item.evidenceFingerprint}`,`تاریخ خوانش: ${data.generatedAt}`,'گزینه‌های پیشنهادی:',...item.steps.map((s,i)=>`${i+1}. ${s}`),'هزینه و اثر: برآورد نشده','مجوز انسانی: الزامی','اتصال مستقیم داده GIS/IoT به پرونده: احراز نشده','نه وقوع تخلف، نه اجرای عملیات و نه تحقق ارزش عمومی توسط این تحلیل اثبات نشده است.'];
 return lines.join('\n');
}
