export const AGENT_MISSION_UI_VERSION='RHF-AGENT-MISSION-LEDGER-V8P5.0';
export const OBJECTIVES=Object.freeze([
 ['NEXT_SAFE_ACTION','پیشنهاد اقدام ایمن بعدی'],
 ['CAPACITY_OPPORTUNITY','بررسی ظرفیت بین‌سازمانی'],
 ['FINANCIAL_CONTROL','کنترل شواهد مالی و قراردادی']
]);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const validUUID=x=>typeof x==='string'&&UUID.test(x);
export const ROLES=Object.freeze(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR']);
export function verifyRuntime(result,city){return !!result&&result.version===AGENT_MISSION_UI_VERSION&&result.scope===city&&result.postgresLedger===true&&result.autoDispatch===false&&result.langGraph==='NOT_CONNECTED'&&result.temporal==='NOT_CONNECTED'&&typeof result.role==='string';}
export function verifyMissions(response,city){if(!response||response.scope!==city||!Array.isArray(response.rows)||response.rows.length>100)return null;
 const seen=new Set();for(const x of response.rows){if(!validUUID(x.id)||!validUUID(x.caseId)||!['PROPOSED','AUTHORIZED','REJECTED','WITHDRAWN'].includes(x.status)||!Number.isSafeInteger(x.version)||!x.version||!validUUID(x.createdBy)||x.dispatched!==false||x.verifiedPublicValue!==false||seen.has(x.id))return null;seen.add(x.id);}return response.rows;}
export function mayReviewMission(m,role,actor){return !!m&&m.status==='PROPOSED'&&role==='MUNICIPAL_ADMIN'&&validUUID(actor)&&m.createdBy!==actor;}
export function mayWithdrawMission(m,actor){return !!m&&m.status==='PROPOSED'&&validUUID(actor)&&m.createdBy===actor;}
export function validateNewMissionUI({requestKey,caseId,objective,note}){if(!validUUID(requestKey)||!validUUID(caseId)||!OBJECTIVES.some(x=>x[0]===objective)||typeof note!=='string'||note.trim().length<12||note.trim().length>600)return null;return {requestKey,caseId,objective,note:note.trim()};}
