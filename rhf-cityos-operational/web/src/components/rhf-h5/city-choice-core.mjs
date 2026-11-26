/** RHF CityOS V3: display preference only, never an authorization or execution flag. */
export const CITY_LENSES=Object.freeze({
 OPERATIONAL:Object.freeze({label:'عملیات',description:'پرونده‌ها، خدمات، مأموریت‌ها و منابع'}),
 AGENTIC:Object.freeze({label:'عامل‌محور',description:'شواهد، پیشنهادهای عامل و مجوز انسانی'}),
 VALUE:Object.freeze({label:'ارزش‌محور',description:'نیاز، ظرفیت، خط مبنا و شواهد مستقل'}),
});
export function normalizeCityLens(value){return Object.hasOwn(CITY_LENSES,value)?value:'OPERATIONAL'}
export function selectedPilotTab(mode){return ({AGENTIC:'agents',VALUE:'value',OPERATIONAL:'suite'})[normalizeCityLens(mode)]}
export function safeRows(result,max=100){return Array.isArray(result?.rows)?result.rows.filter(x=>x&&typeof x==='object').slice(0,max):[]}
export function cityLensSummary({agentStatus=null,followups=null,valueSummary=null,valueCases=null}={}){
 const actions=safeRows(followups);const cases=safeRows(valueCases);
 const a=agentStatus&&agentStatus.mode==='BOUNDED_READ_ONLY';
 const vt=valueSummary?.cases?.total;
 return {
  agentReady:a, agentMode:a?'BOUNDED_READ_ONLY':'UNKNOWN', agentActionCount:followups&&Array.isArray(followups.rows)?actions.length:null,
  proposedActions:followups&&Array.isArray(followups.rows)?actions.filter(x=>x.status==='PROPOSED').length:null,
  valueCaseTotal:Number.isSafeInteger(vt)&&vt>=0?vt:null,
  independentlyReviewed:typeof valueSummary?.cases?.reviewed==='number'?valueSummary.cases.reviewed:null,
  opportunities:cases,
  verifiedOutcomeCount:typeof valueSummary?.verified_outcomes==='number'?valueSummary.verified_outcomes:null,
  autonomousExecution:false,
 };
}
export function wasteEvidenceReadiness(rows=[],stats=null){
 const arr=Array.isArray(rows)?rows:[];
 const complete=arr.filter(r=>r?.review_state==='VERIFIED');
 const measured=complete.filter(r=>r.record_kind==='COLLECTION'&&r.payload?.sourceMethod==='WEIGHBRIDGE');
 const estimated=complete.filter(r=>r.record_kind==='COLLECTION'&&r.payload?.sourceMethod==='ESTIMATE');
 const raw=stats?.verifiedWeighedKgByStream||{};
 const mass=Object.values(raw).reduce((s,n)=>s+(typeof n==='number'&&Number.isFinite(n)?n:0),0);
 return Object.freeze({
  approvedMeasurements:measured.length,approvedEstimates:estimated.length,internalMeasuredKg:mass,
  pending:arr.filter(r=>r?.review_state==='SUBMITTED').length,
  requiresBaseline:true, independentPublicValueVerified:false,
  sourceLimited:true,
 });
}
