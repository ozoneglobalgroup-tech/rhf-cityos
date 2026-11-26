// Pure client-side contract validation. Backend withScope/RLS is the actual authority.
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const bad=(x)=>{throw Error(x)};
export const STAGES=Object.freeze({
 DRAFT_OR_STALE:{label:'پیش‌نویس یا شواهد منسوخ',kind:'blocked',index:0},
 INDEPENDENT_REVIEW:{label:'بررسی مستقل جاری',kind:'review',index:1},
 PLANNING_DRAFT:{label:'برگه برنامه‌ریزی',kind:'planning',index:2},
 WORK_ORDER_PROPOSAL:{label:'دستورکار پیشنهادی',kind:'proposal',index:3},
 INDEPENDENT_CLEARANCE:{label:'تصمیم مستقل دستورکار',kind:'cleared',index:4},
 HANDOFF_INTENT_ONLY:{label:'درخواست تحویل به اپراتور',kind:'intent',index:5}
});
export const steps=['پرونده','بررسی','برنامه‌ریزی','دستورکار','تصمیم','درخواست تحویل'];
export function endpoint(cityId,desk,orgId){
 if(!UUID.test(cityId)||!['mayor','deputy'].includes(desk)||orgId)bad('CITY_DESK_ONLY');
 return `/api/v1/cities/${encodeURIComponent(cityId)}/dv32ux17-case-chain-assurance`;
}
export function safeChain(r,{cityId,tenantId,desk}){
 if(!['mayor','deputy'].includes(desk)||!UUID.test(cityId)||!UUID.test(tenantId)||
 r?.schema!=='RHF-DV32UX17-CHAIN-ASSURANCE-v1'||r.cityId!==cityId||r.tenantId!==tenantId||
 !['MAYOR','DEPUTY','MUNICIPAL_ADMIN'].includes(r.role)||
 !Array.isArray(r.entries)||r.entries.length>40||r.sampleLimit!==40||
 typeof r.truncated!=='boolean'||r.readOnly!==true||r.currentEvidenceValidated!==true||
 r.temporalExecuted!==false||r.dispatchAuthorized!==false||r.verifiedUrbanValue!==false||
 r.officialMissionMappingCertified!==false||r.authenticatedUat!=='NOT_RUN'||r.finalGo!=='NO_GO')bad('UNTRUSTED_CHAIN_REPORT');
 if((desk==='deputy'&&!['DEPUTY','MUNICIPAL_ADMIN'].includes(r.role))||(desk==='mayor'&&!['MAYOR','MUNICIPAL_ADMIN'].includes(r.role)))bad('ROLE_SCOPE_MISMATCH');
 const seen=new Set();let stale=0,reviewed=0,planning=0,cleared=0,handoffIntents=0;
 const entries=r.entries.map(x=>{
  if(!UUID.test(x.caseId)||seen.has(x.caseId)||!STAGES[x.stage]||
   typeof x.summary!=='string'||x.summary.length>180||
   typeof x.staleEvidence!=='boolean'||typeof x.independentReview!=='boolean'||
   typeof x.planningCurrent!=='boolean'||typeof x.workOrderCleared!=='boolean'||
   typeof x.operatorIntentCurrent!=='boolean'||x.temporalExecuted!==false||
   x.dispatchAuthorized!==false||x.verifiedUrbanValue!==false)bad('BAD_CHAIN_ENTRY');
  seen.add(x.caseId);
  if(x.staleEvidence)stale++;
  if(x.independentReview)reviewed++;
  if(x.planningCurrent)planning++;
  if(x.workOrderCleared)cleared++;
  if(x.operatorIntentCurrent)handoffIntents++;
  if(x.stage==='HANDOFF_INTENT_ONLY'&&!x.operatorIntentCurrent)bad('UNTRUSTED_HANDOFF_STAGE');
  if(x.operatorIntentCurrent&&!x.workOrderCleared||x.workOrderCleared&&!x.planningCurrent||x.planningCurrent&&!x.independentReview)bad('INCONSISTENT_ENTRY');
  return {...x,view:STAGES[x.stage]};
 });
 const expected={sampled:entries.length,stale,reviewed,planning,cleared,handoffIntents};
 for(const [k,n] of Object.entries(expected))if(r.stats?.[k]!==n)bad('BAD_CHAIN_AGGREGATE_'+k);
 return {entries,stats:expected,asOf:typeof r.asOf==='string'?r.asOf:'',truncated:r.truncated,finalGo:false};
}
