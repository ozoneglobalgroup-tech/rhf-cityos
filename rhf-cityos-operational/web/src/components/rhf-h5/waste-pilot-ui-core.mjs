/** Presentation-only policy helpers. API/DB govern authorization. */
export const DEMO_WASTE_CODE='DEMO_WASTE_ORG';
export function isWasteDemoOrganization(unit){return !!unit&&unit.code===DEMO_WASTE_CODE&&unit.kind==='ORGANIZATION'&&unit.active!==false;}
export function isWasteDemoCity(name){return typeof name==='string'&&/شیراز/.test(name)&&/دمو\s*آزمایشی/.test(name);}
export function selectOpenCase(rows){return (rows||[]).find(x=>x.status==='IN_PROGRESS')?.id||(rows||[]).find(x=>!['CLOSED','REJECTED'].includes(x.status))?.id||(rows||[])[0]?.id||'';}
export function canIndependentlyReview(action,role,actorId){return !!action&&!!actorId&&['MUNICIPAL_ADMIN'].includes(role)&&action.created_by!==actorId&&action.status==='PROPOSED';}
export function canIndependentlyReviewValue(value,role,actorId){return !!value&&!!actorId&&['MUNICIPAL_ADMIN','DEPUTY'].includes(role)&&value.created_by!==actorId&&value.status==='DISCOVERY';}
export function datasetRows(snapshot,key){const x=snapshot?.datasets?.[key];return Array.isArray(x?.rows)?x.rows:[];}
export function isVerifiedPublicValue(_snapshot){return false;} // Demo cannot certify field impacts.
