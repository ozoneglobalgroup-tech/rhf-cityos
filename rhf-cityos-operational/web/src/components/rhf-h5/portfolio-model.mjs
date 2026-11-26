/** RHF City OS — F1 municipal deputy portfolio model.
 * Pure, read-only and conservative: only a verified parent chain indicates
 * an organization's deputy affiliation. UI input must already be city-scoped
 * by the parent app; this model is not an authorization boundary.
 */
export const PORTFOLIO_VERSION='F1_NATIONAL_PORTFOLIO_V0_1';
const ACTIVE_CASES=new Set(['RECEIVED','TRIAGED','ASSIGNED','IN_PROGRESS','AWAITING_ACCEPTANCE']);
const KNOWN_KINDS=new Set(['MUNICIPALITY','DEPUTY','ORGANIZATION','DIRECTORATE','DEPARTMENT','DISTRICT','SUBDISTRICT','SITE','OPERATION_TEAM','CONTRACTOR_INTERFACE']);
const DEPUTY_PATTERN=/خدمات\s*شهری|محیط\s*زیست/i;
const CAT=[
  ['cemetery',/آرامستان|بهشت\s*زهرا|بهشت\s*رضا|تدفین|متوفی/,'آرامستان‌ها'],
  ['markets',/میدان|میادین|تره\s*بار|محصولات\s*کشاورزی|ساماندهی\s*مشاغل/,'میادین و مشاغل'],
  ['waste',/پسماند|بازیافت|تفکیک/,'پسماند و بازیافت'],
  ['greenspace',/فضای\s*سبز|بوستان|پارک\s*ها/,'فضای سبز و بوستان‌ها'],
  ['fire',/آتش\s*نشانی|امداد|ایمنی/,'آتش‌نشانی و ایمنی'],
  ['beautification',/زیباسازی|منظر\s*شهری/,'زیباسازی و منظر شهری'],
  ['environment',/محیط\s*زیست|پایش\s*محیط/,'محیط‌زیست شهری'],
  ['fleet',/ناوگان|موتوری|ماشین\s*آلات/,'ناوگان و ماشین‌آلات'],
  ['cleaning',/رفت\s*و\s*روب|نظافت|خدمات\s*شهری/,'خدمات و نظافت شهری'],
  ['inspection',/بازرسی|نظارت|کنترل\s*کیفیت/,'نظارت و بازرسی'],
  ['stormwater',/آب\s*های\s*سطحی|آبگرفتگی|سیلاب/,'آب‌های سطحی و سیلاب'],
  ['animal',/حیوانات|سگ\s*های\s*بلاصاحب/,'حیوانات شهری'],
  ['public_facilities',/سرویس\s*بهداشتی|تأسیسات\s*عمومی|مبلمان\s*شهری/,'خدمات و تأسیسات عمومی'],
  ['street_vending',/سد\s*معبر|دستفروشان|مشاغل\s*مزاحم/,'ساماندهی مشاغل و سد معبر'],
  ['contracts',/قرارداد|پیمانکار/,'قراردادها و پیمانکاران'],
  ['planning',/برنامه\s*ریزی|پروژه|توسعه/,'برنامه‌ریزی و توسعه']
];
export const SERVICE_DOMAINS=Object.freeze(CAT.map(([code,,name])=>Object.freeze({code,name})));
const string=(v,max=220)=>typeof v==='string'?v.trim().slice(0,max):'';
const rowCity=r=>r?.municipality_id??r?.municipalityId??null;
const rowTenant=r=>r?.tenant_id??r?.tenantId??null;
const parentId=r=>string(r?.parent_id??r?.parentId??r?.parent_unit_id??r?.parentUnitId,100);
const kindOf=r=>string(r?.kind??r?.type??r?.unit_kind,60).toUpperCase();
const pickLabel=r=>string(r?.name_fa??r?.name??r?.title??r?.label,180)||'واحد بدون نام';
const canUse=(row,city)=>row&&typeof row==='object'&&!Array.isArray(row)&&(!rowCity(row)||rowCity(row)===city);
const scopeIssue=(row,city)=>!!rowCity(row)&&rowCity(row)!==city;
const classify=name=>{for(const [code,re,label] of CAT)if(re.test(name))return {code,label,source:'NAME_HEURISTIC_NOT_APPROVED'};return {code:'other',label:'نیازمند طبقه‌بندی',source:'UNCLASSIFIED'};};
export function deriveDeputyPortfolio({city,cityName='',units,cases}={}){
  if(typeof city!=='string'||city.length<2) return {ready:false,reason:'CITY_REQUIRED',unitsLoaded:false,casesLoaded:false,organizations:[],counts:{},catalogScope:'NO_SCOPE'};
  const unitsLoaded=Array.isArray(units),casesLoaded=Array.isArray(cases);
  const validUnits=unitsLoaded?units.filter(u=>canUse(u,city)&&string(u?.id,100)):[];
  const excludedUnits=unitsLoaded?units.filter(u=>scopeIssue(u,city)).length:0;
  const duplicateIds=new Set(), byId=new Map();
  for(const u of validUnits){const id=string(u.id,100);if(byId.has(id)){duplicateIds.add(id);continue;}byId.set(id,{id,name:pickLabel(u),kind:kindOf(u),parentId:parentId(u),raw:u});}
  const rootIds=[...byId.values()].filter(u=>u.kind==='DEPUTY'&&DEPUTY_PATTERN.test(u.name)).map(u=>u.id);
  function relation(u){
    const seen=new Set([u.id]);let cursor=u;
    while(cursor?.parentId){if(rootIds.includes(cursor.parentId))return 'VERIFIED';if(seen.has(cursor.parentId))return 'CYCLE';seen.add(cursor.parentId);const next=byId.get(cursor.parentId);if(!next)return 'UNVERIFIED_PARENT';cursor=next;}
    return 'UNVERIFIED_PARENT';
  }
  const casesInScope=casesLoaded?cases.filter(c=>canUse(c,city)):[];
  const caseCounts=new Map();let casesWithUnmappedUnit=0;
  for(const c of casesInScope){if(!ACTIVE_CASES.has(c?.status))continue;
    const id=string(c?.unit_id??c?.unitId,100);if(!id||!byId.has(id)){casesWithUnmappedUnit++;continue;}
    caseCounts.set(id,(caseCounts.get(id)||0)+1);
  }
  const orgs=[...byId.values()].filter(u=>['ORGANIZATION','DIRECTORATE','DEPARTMENT','DISTRICT','SUBDISTRICT','SITE','OPERATION_TEAM'].includes(u.kind));
  const organizations=orgs.map(u=>({id:u.id,name:u.name,kind:u.kind,kindVerified:KNOWN_KINDS.has(u.kind),parentId:u.parentId,affiliation:relation(u),category:classify(u.name),openLinkedCases:casesLoaded?caseCounts.get(u.id)||0:null,progress:null,progressEvidence:'NOT_CONNECTED',city})).sort((a,b)=>{
    const rank=x=>x.affiliation==='VERIFIED'?0:1;
    return rank(a)-rank(b)||a.name.localeCompare(b.name,'fa');
  });
  const verified=organizations.filter(u=>u.affiliation==='VERIFIED');
  const counts={loadedUnits:unitsLoaded?byId.size:null,verifiedSubunits:unitsLoaded&&rootIds.length?verified.length:null,
    totalCandidateSubunits:unitsLoaded?organizations.length:null,unverifiedSubunits:unitsLoaded?organizations.filter(x=>x.affiliation!=='VERIFIED').length:null,
    linkedOpenCases:casesLoaded?organizations.reduce((s,x)=>s+x.openLinkedCases,0):null,
    unmappedOpenCases:casesLoaded?casesWithUnmappedUnit:null,excludedCrossCityUnits:unitsLoaded?excludedUnits:null,
    duplicateUnitIds:duplicateIds.size,deputyRoots:rootIds.length};
  return {ready:unitsLoaded,reason:unitsLoaded?'LOADED_ROWS_ONLY':'ORG_DATA_NOT_LOADED',city,cityName:string(cityName)||'شهرداری انتخاب‌شده',unitsLoaded,casesLoaded,
    roots:rootIds,organizations,counts,catalogScope:'TEMPLATES_NOT_ORG_MEMBERSHIP',status:'READ_ONLY',evidence:'NO_PROJECT_PROGRESS_SOURCE'};
}
export function filterPortfolioRows(snapshot,{query='',only='all',limit=100}={}){
  const q=string(query,100).toLocaleLowerCase('fa');const rows=Array.isArray(snapshot?.organizations)?snapshot.organizations:[];
  const max=Number.isSafeInteger(limit)?Math.max(0,Math.min(limit,500)):100;
  return rows.filter(r=>(only==='all'||(only==='verified'&&r.affiliation==='VERIFIED')||(only==='unverified'&&r.affiliation!=='VERIFIED'))&&(!q||`${r.name} ${r.category.label} ${r.kind}`.toLocaleLowerCase('fa').includes(q))).slice(0,max);
}
export function displayCount(n){return Number.isSafeInteger(n)&&n>=0?n.toLocaleString('fa-IR'):'—';}
