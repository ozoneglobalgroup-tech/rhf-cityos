// RHF V8P3.3: descriptive, read-only authority topology. No grant of access or legal authority.
import {DOSSIER_SCHEMAS} from './deputy-dossier-schema.mjs';
export const AUTHORITY_GRAPH_VERSION='RHF-URBAN-AUTHORITY-GRAPH-V8P3.3';
const UNIT_KINDS=new Set(['MUNICIPALITY','DEPUTY','ORGANIZATION','DIRECTORATE','DEPARTMENT','DISTRICT','SUBDISTRICT','SITE','OPERATION_TEAM','CONTRACTOR_INTERFACE']);
export function buildAuthorityGraph({city,unit,permit,rows,partial=false}){
 if(!city?.id||!unit?.id||!permit||!Array.isArray(rows)||typeof partial!=='boolean')throw Error('AUTHORITY_GRAPH_INPUT_INVALID');
 if(!['ADMIN','INDEPENDENT_REVIEWER','DEPUTY'].includes(permit.kind))throw Error('AUTHORITY_GRAPH_SEAT_INVALID');
 if(rows.length>101)throw Error('AUTHORITY_GRAPH_EXCESSIVE_ROWS');
 const seen=new Set();
 const units=rows.map(r=>{
  if(!r?.id||seen.has(r.id)||!UNIT_KINDS.has(r.kind)||typeof r.name_fa!=='string'||r.name_fa.length>180||typeof r.code!=='string'||r.code.length>100)throw Error('AUTHORITY_GRAPH_UNIT_INVALID');
  seen.add(r.id);return {id:`unit:${r.id}`,label:r.name_fa,kind:'REGISTERED_ORG_UNIT',unitKind:r.kind,code:r.code,active:true};
 });
 if(!seen.has(unit.id))throw Error('AUTHORITY_GRAPH_ROOT_MISSING');
 const edges=[];
 for(const r of rows){if(r.parent_id&&seen.has(r.parent_id))edges.push({from:`unit:${r.parent_id}`,to:`unit:${r.id}`,relation:'REGISTERED_PARENT_CHILD',verifiedSource:'ORG_UNITS'});}
 const domains=Object.entries(DOSSIER_SCHEMAS).map(([key,s])=>({id:`domain:${key}`,label:s.label,kind:'SYNTHETIC_LOGICAL_DOMAIN',domainKey:key,legalEntityVerified:false}));
 for(const domain of domains)edges.push({from:`unit:${unit.id}`,to:domain.id,relation:'SYNTHETIC_DOSSIER_COVERAGE',verifiedSource:'DOSSIER_SCHEMA_ONLY'});
 return {mode:AUTHORITY_GRAPH_VERSION,cityId:city.id,synthetic:true,legalAuthorityVerified:false,autonomousDispatch:false,verifiedPublicValue:false,
  source:'ORG_UNITS_AND_V8P2_DOSSIER_POLICY',partial,
  rootId:`unit:${unit.id}`,seat:permit.kind,
  permissions:{readSyntheticDossiers:true,createSyntheticDraft:permit.canCreate===true,reviewOtherCreatorsSubmitted:permit.canReview===true,autoDispatch:false,allocateResources:false,approvePublicValue:false},
  counts:{registeredUnits:units.length,syntheticDomains:domains.length},
  nodes:[...units,...domains],edges,
  caveat:'مشاهده ساختار ثبت‌شده و قابلیت‌های پرونده آزمایشی، به‌معنای اثبات مالکیت داده، اختیار قانونی، انتساب حقوقی سازمان‌ها یا مجوز اقدام اجرایی نیست.'};
}
