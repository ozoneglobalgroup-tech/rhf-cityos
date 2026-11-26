/** F1.2V. UI-only derived readiness. Not evidence of a formally approved organizational chart. */
export const READINESS_VERSION='f12v-org-readiness-v0.1';
const txt = v => typeof v==='string'?v.trim():'';
export function readinessFromPortfolio(snapshot) {
  if (!snapshot || !snapshot.unitsLoaded) return Object.freeze({status:'NOT_LOADED',counts:{loaded:null,candidates:null,linked:null,unverified:null,roots:null},rows:[],issues:['ORG_UNITS_NOT_LOADED'],progress:null,formalApproval:'UNVERIFIED'});
  const rows=(Array.isArray(snapshot.organizations)?snapshot.organizations:[]).map(r=>({
    id:txt(r.id),name:txt(r.name)||'بدون نام',kind:txt(r.kind)||'UNKNOWN',
    affiliation:r.affiliation==='VERIFIED'?'TREE_LINKED':'UNVERIFIED',
    domain:txt(r.category?.label)||'نیازمند طبقه‌بندی',
    openCases:Number.isSafeInteger(r.openLinkedCases)&&r.openLinkedCases>=0?r.openLinkedCases:null,
    progress:null,formalApproval:'UNVERIFIED'
  }));
  const linked=rows.filter(r=>r.affiliation==='TREE_LINKED').length;
  const unverified=rows.length-linked;
  const roots=Number.isSafeInteger(snapshot.counts?.deputyRoots)?snapshot.counts.deputyRoots:0;
  const loaded=Number.isSafeInteger(snapshot.counts?.loadedUnits)?snapshot.counts.loadedUnits:null;
  const issues=[];
  if(!roots)issues.push('NO_DEPUTY_ROOT');
  if(unverified)issues.push('AFFILIATION_UNVERIFIED');
  if(Number(snapshot.counts?.duplicateUnitIds)>0)issues.push('DUPLICATE_UNIT_IDS');
  if(Number(snapshot.counts?.excludedCrossCityUnits)>0)issues.push('CROSS_CITY_ROWS_EXCLUDED');
  return Object.freeze({status:'READ_ONLY',counts:{loaded,candidates:rows.length,linked,unverified,roots},rows,issues,progress:null,formalApproval:'UNVERIFIED'});
}
export function filterReadinessRows(data,{query='',tab='all',max=60}={}) {
  const q=txt(query).toLocaleLowerCase('fa').slice(0,100);
  const lim=Number.isSafeInteger(max)?Math.max(0,Math.min(max,300)):60;
  return (Array.isArray(data?.rows)?data.rows:[]).filter(r=>
    (tab==='all'||(tab==='linked'&&r.affiliation==='TREE_LINKED')||(tab==='unverified'&&r.affiliation==='UNVERIFIED')) &&
    (!q||`${r.name} ${r.kind} ${r.domain}`.toLocaleLowerCase('fa').includes(q))
  ).slice(0,lim);
}
export const displayNumber=n=>Number.isSafeInteger(n)&&n>=0?n.toLocaleString('fa-IR'):'—';
