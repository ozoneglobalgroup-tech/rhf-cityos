/** RHF W01/W04 — scope and value representation helpers. No DB or authorization bypass. */
export const WASTE_CODE='DEMO_WASTE_ORG';
export const WASTE_READ_ROLES=Object.freeze(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR','AUDITOR']);
export const WASTE_WRITE_ROLES=Object.freeze(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR']);
export const WASTE_REVIEW_ROLES=Object.freeze(['MUNICIPAL_ADMIN']);
export const MAX_ROWS=200;
export function isWasteDemoCity(name){
 return typeof name==='string'&&/شیراز/.test(name)&&/دمو\s*آزمایشی/.test(name);
}
export function isWasteOrganization(org){
 return !!org&&org.code===WASTE_CODE&&org.kind==='ORGANIZATION'&&
        org.active===true&&org.parent_kind==='DEPUTY'&&org.parent_active===true&&
        /خدمات\s*شهری/.test(org.parent_name_fa||'');
}
export function limited(rows,max=MAX_ROWS){
 if(!Array.isArray(rows))throw Error('ROWS_REQUIRED');
 return {rows:rows.slice(0,max),truncated:rows.length>max};
}
export function valueEvidenceState(row){
 if(!row||row.status!=='VERIFIED'||!row.verified_by||!row.verified_at||row.verified_by===row.created_by)return 'NOT_INDEPENDENTLY_VERIFIED';
 return 'VERIFICATION_RECORDED_SYNTHETIC_ONLY';
}
export function isSafePilotCase(caseRow,allowedIds){
 return !!caseRow&&typeof caseRow.id==='string'&&allowedIds.has(caseRow.id);
}
