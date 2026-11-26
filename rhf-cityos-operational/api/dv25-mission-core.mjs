/** RHF City OS DV2.5 — scoped mission-to-organization responsibility mapping.
 * RHF DESIGN REFERENCE ONLY. Does not certify municipal mandates, execution,
 * legally assigned authority, measurable benefit, or independent verification.
 */
import {DV2_AXES} from './dv2-readiness-core.mjs';
import {templateNodes} from './dv21-org-core.mjs';
import {extendedNodes} from './dv24-org-core.mjs';
export const DV25_SCHEMA='RHF-DV25-MISSION-RESPONSIBILITY-v1';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// [mission, responsible department, assisting departments, evidence category, waste contribution departments]
const LINKS=Object.freeze([
 ['E01','WASTE_ROUTE_PLANNING',['WASTE_SEPARATION','WASTE_DISPOSAL_ENV'],'WASTE',['WASTE_ROUTE_PLANNING','WASTE_SEPARATION']],
 ['E02','ENV_AIR_QUALITY',['ENV_SOIL_WATER'],'ENVIRONMENT',[]],
 ['E03','ENV_PEST_CONTROL',['ENV_SOIL_WATER'],'ENVIRONMENT',['WASTE_DISPOSAL_ENV']],
 ['E04','WASTE_MATERIAL_RECOVERY',['WASTE_RECYCLE','VALUE_BASELINE_VERIFICATION'],'WASTE',['WASTE_MATERIAL_RECOVERY','WASTE_SEPARATION']],
 ['S01','PUBLIC_STREET_SWEEPING',['PUBLIC_URBAN_WASHING'],'PUBLIC_SERVICES',['WASTE_COLLECTION']],
 ['S02','HSE_INCIDENT_MANAGEMENT',['ORG_HSE'],'HSE',['WASTE_OPERATIONAL_INCIDENTS','WASTE_HSE']],
 ['S03','CEMETERY_OPERATIONS',['ORG_CEMETERIES'],'CEMETERIES',[]],
 ['S04','PUBLIC_EMERGENCY',['FLEET_MAINTENANCE'],'PUBLIC_SERVICES',[]],
 ['G01','GREEN_PARK_ASSETS',['GREEN_IRRIGATION'],'GREEN_SPACES',[]],
 ['G02','GREEN_TREES_GARDENS',['GREEN_IRRIGATION'],'GREEN_SPACES',[]],
 ['G03','BEAUTY_FURNITURE',['BEAUTY_LIGHTING'],'OTHER',[]],
 ['C01','MARKETS_JOBS',['MARKETS_FOOD_SUPPLY'],'MARKETS',[]],
 ['C02','CONTRACT_QUALITY',['ORG_CONTRACTS'],'OTHER',['WASTE_COLLECTION']],
 ['C03','VALUE_BASELINE_VERIFICATION',['ORG_VALUE_GOV'],'OTHER',['WASTE_MATERIAL_RECOVERY']],
 ['P01','ORG_EDUCATION',['CITIZEN_SERVICE_137'],'EDUCATION',['WASTE_SEPARATION']],
 ['P02','CITIZEN_SERVICE_137',['ORG_EDUCATION'],'OTHER',['WASTE_COLLECTION']],
 ['P03','ORG_EDUCATION',['CITIZEN_SERVICE_137'],'EDUCATION',['WASTE_SEPARATION']]
]);
const catalog=DV2_AXES.flatMap(a=>a.missions.map(m=>({code:m.code,title:m.title,axisCode:a.id,axisTitle:a.title})));
export function missionBlueprint(wasteCode){
 const base=templateNodes(wasteCode),ext=extendedNodes();
 const known=new Map([...base,...ext].map(x=>[x.code,x]));
 const seen=new Set();
 const out=LINKS.map(([code,ownerCode,supportCodes,sector,wasteCodes])=>{
  if(seen.has(code))throw Error('DV25_MISSION_DUPLICATE');seen.add(code);
  const m=catalog.find(x=>x.code===code);
  if(!m||!known.has(ownerCode)||supportCodes.some(c=>!known.has(c))||wasteCodes.some(c=>!known.has(c)||!c.startsWith('WASTE_')))throw Error('DV25_MISSION_TEMPLATE_INVALID:'+code);
  return Object.freeze({...m,ownerCode,supportCodes:[...supportCodes],sector,wasteCodes:[...wasteCodes],classification:'RHF_DESIGN_REFERENCE_NOT_OFFICIAL'});
 });
 if(out.length!==17||seen.size!==17||catalog.some(x=>!seen.has(x.code)))throw Error('DV25_MISSION_COUNT_MISMATCH');
 return out;
}
function validNode(node,byCode,known,city){
 if(!node||node.active!==true||node.tenant_id!==city.tenant_id||node.municipality_id!==city.id||!UUID.test(node.id||''))return false;
 const ref=known.get(node.code);
 if(!ref||node.kind!==ref.kind)return false;
 const parent=ref.parentCode?byCode.get(ref.parentCode):null;
 return ref.parentCode?!!parent&&node.parent_id===parent.id:node.parent_id===null;
}
const integer=x=>Number.isInteger(x)&&x>=0&&x<1000000;
/** Pure, scope-restricting presentation of real organizational rows and reviewed DOCUMENT counts. */
export function createMissionMatrix({city,viewerId,surface,wasteCode,orgs,counts,tenantCityCount}){
 if(!city||!UUID.test(city.id||'')||!UUID.test(city.tenant_id||'')||!UUID.test(viewerId||'')||!['deputy','waste'].includes(surface))throw Error('DV25_SCOPE_INVALID');
 if(!Array.isArray(orgs)||orgs.length>500||orgs.some(x=>x.tenant_id!==city.tenant_id||x.municipality_id!==city.id))throw Error('DV25_ORG_SCOPE_INVALID');
 if(!Array.isArray(counts)||counts.length>30||counts.some(x=>!['NEED','CAPACITY'].includes(x.kind)||!integer(Number(x.n))||typeof x.sector!=='string'))throw Error('DV25_EVIDENCE_INVALID');
 if(!Number.isInteger(tenantCityCount)||tenantCityCount<1)throw Error('DV25_TENANT_COUNT_INVALID');
 const known=new Map([...templateNodes(wasteCode),...extendedNodes()].map(x=>[x.code,x]));
 const byCode=new Map();for(const x of orgs){if(byCode.has(x.code))throw Error('DV25_DUPLICATE_ORG_CODE');byCode.set(x.code,x)}
 const report=missionBlueprint(wasteCode).filter(m=>surface==='deputy'||m.wasteCodes.length>0).map(m=>{
  const codes=surface==='deputy'?[m.ownerCode,...m.supportCodes]:m.wasteCodes;
  const units=codes.map(code=>({code,nameFa:known.get(code)?.nameFa||'نامعلوم',registered:validNode(byCode.get(code),byCode,known,city)}));
  const matched=counts.filter(x=>x.sector===m.sector);
  const reviewedNeeds=matched.filter(x=>x.kind==='NEED').reduce((n,x)=>n+Number(x.n),0);
  const reviewedCapacities=matched.filter(x=>x.kind==='CAPACITY').reduce((n,x)=>n+Number(x.n),0);
  const directOwnerReady=surface==='deputy'?units[0]?.registered===true:units.some(x=>x.registered);
  return {code:m.code,title:m.title,axisCode:m.axisCode,axisTitle:m.axisTitle,sector:m.sector,
   responsibility:surface==='deputy'?'RHF_PROPOSED_PRIMARY_OWNER':'WASTE_CONTRIBUTION_ONLY',
   ownerStructurePresent:directOwnerReady,registeredUnits:units.filter(x=>x.registered).length,expectedUnits:units.length,units,
   reviewedDocumentSignals:{needs:reviewedNeeds,capacities:reviewedCapacities},
   operationalState:'NOT_ATTESTED',legalMandate:'NOT_ATTESTED',valueVerified:false,executionAuthorized:false};
 });
 return {schema:DV25_SCHEMA,cityId:city.id,tenantId:city.tenant_id,viewerId,surface,cityName:city.name,
  catalogSource:'RHF_PROPOSED_REFERENCE_NOT_OFFICIAL_MANDATES',axisCount:surface==='deputy'?5:new Set(report.map(x=>x.axisCode)).size,
  totalMissions:report.length,structuralCoverageCount:report.filter(x=>x.ownerStructurePresent).length,
  evidenceMeasure:'REVIEWED_DOCUMENT_COUNT_NOT_REALIZED_VALUE',missions:report,
  readiness:{tenantExclusive:tenantCityCount===1,tenantCityCount,needsTwoTenantUat:true},
  governance:{readOnly:true,missionActivation:false,noAutoAppointments:true,noAutoExecution:true,
   valueVerification:'NOT_ATTESTED',operationalReadiness:'NOT_ATTESTED',tenantIsolationUat:'NOT_ATTESTED'}};
}
