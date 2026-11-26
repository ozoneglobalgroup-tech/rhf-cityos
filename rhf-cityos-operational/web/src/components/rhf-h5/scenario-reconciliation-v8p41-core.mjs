// RHF City OS V8P4.1 — deterministic, read-only reconciliation of the V8P3.5 synthetic library.
// It does not certify tenant isolation, field evidence, operations or public value.
import {PORTFOLIO_VERSION} from './deputy-portfolio-v8p3-core.mjs';
import {DEMO_SCENARIOS,scenarioRequestKey} from './deputy-scenario-v8p35-core.mjs';
import {DOSSIER_KEYS,validateFields,validateEvidenceRefs} from './deputy-dossier-schema.mjs';
export const RECONCILIATION_VERSION='RHF-SCENARIO-RECONCILIATION-V8P4.1';
export const EXPECTED_RECONCILIATION_RECORDS=DEMO_SCENARIOS.reduce((n,s)=>n+s.records.length,0);
export const EXPECTED_RECONCILIATION_SCENARIOS=DEMO_SCENARIOS.length;
export const RECONCILIATION_IS_READ_ONLY=true;
export const RECONCILIATION_SELF_CERTIFIES=false;
const ERRORS=Object.freeze({MISSING:'در خروجی مجاز پیدا نشد',DUPLICATE:'شناسه پرونده تکراری است',ORG_MISMATCH:'حوزه پرونده با سناریو یکسان نیست',TITLE_MISMATCH:'عنوان پرونده با نمونه اولیه تفاوت دارد',FIELDS_MISMATCH:'مقادیر فرم با داده نمونه یکسان نیست',REFERENCE_MISMATCH:'ارجاع سناریوی آموزشی معتبر نیست',REVIEW_STATE:'وضعیت پرونده نامعتبر است',CROSS_REFERENCE:'ارجاع این رکورد به پرونده دیگری منتسب است',INVALID_SCOPE:'دامنه یا قرارداد داده نامعتبر است'});
const sameFields=(a,b)=>{if(!a||typeof a!=='object'||Array.isArray(a)||!b||typeof b!=='object'||Array.isArray(b))return false;
 const ak=Object.keys(a).sort(),bk=Object.keys(b).sort();return ak.length===bk.length&&ak.every((k,i)=>k===bk[i]&&(typeof a[k]==='string'||Number.isSafeInteger(a[k]))&&a[k]===b[k]);};
const refCode=(s,r)=>`DEMO-V8P35-${s.id}-${r.id}`;
const statusOK=x=>['DRAFT','SUBMITTED','REVIEWED','REJECTED'].includes(x);
export const reconciliationEmpty=(city,reason='NO_VALID_SCOPED_DATA')=>({version:RECONCILIATION_VERSION,cityId:city||null,mode:'UNAVAILABLE',reason,partial:false,expectedRecords:EXPECTED_RECONCILIATION_RECORDS,matched:0,missing:EXPECTED_RECONCILIATION_RECORDS,conflicts:0,unexpectedRefs:0,scenariosPassed:0,domainsPassed:0,complete:false,synthetic:true,verifiedPublicValue:false,autonomousDispatch:false,items:[],scenarios:[],canCreate:false});
export async function reconcileScenarioDossiers(board,city){
 if(!city||!board||board.mode!==PORTFOLIO_VERSION||board.cityId!==city||board.synthetic!==true||board.verifiedPublicValue!==false||board.autonomousDispatch!==false||!Array.isArray(board.rows)||board.rows.length>200||board.partial!==true&&board.partial!==false) return reconciliationEmpty(city);
 if(!/^[a-f0-9-]{36}$/i.test(city))return reconciliationEmpty(city,'CITY_IDENTIFIER_INVALID');
 if(board.rows.some(x=>!x||typeof x.code!=='string'||typeof x.orgKey!=='string'||!DOSSIER_KEYS.includes(x.orgKey)||typeof x.id!=='string'||typeof x.title!=='string'||!Array.isArray(x.evidenceRefs)||typeof x.fields!=='object'||x.synthetic!==true||x.verifiedPublicValue!==false))return reconciliationEmpty(city,'DOSSIER_CONTRACT_INVALID');
 const codeMap=new Map(),referenceOwners=new Map();
 for(const row of board.rows){try{validateFields(row.orgKey,row.fields);validateEvidenceRefs(row.evidenceRefs);}catch{return reconciliationEmpty(city,'DOSSIER_FIELDS_INVALID');}
  codeMap.set(row.code,[...(codeMap.get(row.code)||[]),row]);
  for(const ref of row.evidenceRefs){const code=ref.referenceCode;referenceOwners.set(code,[...(referenceOwners.get(code)||[]),row.id]);}
 }
 const items=[];const grouped=[];const expectedRefs=new Set();
 try{
  for(const s of DEMO_SCENARIOS){let passed=0;const sub=[];
   for(const fixture of s.records){const ref=refCode(s,fixture);expectedRefs.add(ref);
    const key=await scenarioRequestKey(city,s.id,fixture.id);const code=`RHF8P2-${key}`;
    const candidates=codeMap.get(code)||[];const row=candidates.length===1?candidates[0]:null;
    let issue='';if(candidates.length>1)issue='DUPLICATE';else if(!row)issue='MISSING';
    else if(row.orgKey!==fixture.orgKey)issue='ORG_MISMATCH';
    else if(row.title!==fixture.title)issue='TITLE_MISMATCH';
    else if(!sameFields(row.fields,fixture.fields))issue='FIELDS_MISMATCH';
    else if(!statusOK(row.status))issue='REVIEW_STATE';
    else if(row.evidenceRefs.filter(x=>x.referenceCode===ref).length!==1)issue='REFERENCE_MISMATCH';
    if(!issue&&referenceOwners.get(ref)?.some(id=>id!==row.id))issue='CROSS_REFERENCE';
    if(!issue)passed++;
    const item={scenarioId:s.id,recordId:fixture.id,orgKey:fixture.orgKey,title:fixture.title,status:issue||'MATCH',reason:issue?ERRORS[issue]:null,storedId:row?.id||null,storedStatus:row?.status||null};
    items.push(item);sub.push(item);
   }
   grouped.push({id:s.id,title:s.title,expected:s.records.length,matched:passed,complete:passed===s.records.length,records:sub});
  }
 }catch{return reconciliationEmpty(city,'CRYPTOGRAPHIC_IDENTIFIER_UNAVAILABLE');}
 const unexpectedRefs=[...referenceOwners.keys()].filter(x=>/^DEMO-V8P35-/.test(x)&&!expectedRefs.has(x)).length;
 const matched=items.filter(x=>x.status==='MATCH').length,conflicts=items.filter(x=>x.status!=='MATCH'&&x.status!=='MISSING').length;
 const domains=new Set(items.filter(x=>x.status==='MATCH').map(x=>x.orgKey));const partial=board.partial===true;
 return {version:RECONCILIATION_VERSION,cityId:city,mode:'SCOPED_SYNTHETIC_RECONCILIATION',reason:null,partial,expectedRecords:EXPECTED_RECONCILIATION_RECORDS,matched,missing:items.filter(x=>x.status==='MISSING').length,conflicts,unexpectedRefs,scenariosPassed:grouped.filter(x=>x.complete).length,domainsPassed:domains.size,
  complete:!partial&&matched===EXPECTED_RECONCILIATION_RECORDS&&conflicts===0&&unexpectedRefs===0&&domains.size===DOSSIER_KEYS.length,
  synthetic:true,verifiedPublicValue:false,autonomousDispatch:false,canCreate:board.canCreate===true,items,scenarios:grouped};
}
export function reconciliationReport(result,timestamp=''){
 const safe=result?.version===RECONCILIATION_VERSION&&result.mode==='SCOPED_SYNTHETIC_RECONCILIATION';
 return {version:RECONCILIATION_VERSION,createdAt:String(timestamp||''),mode:safe?result.mode:'UNAVAILABLE',cityId:safe?result.cityId:null,
  gate:'PENDING_INDEPENDENT_REVIEW',method:'CITY_SCOPED_DETERMINISTIC_CODE_REF_ORG_TITLE_FIELDS_MATCH',
  expectedRecords:EXPECTED_RECONCILIATION_RECORDS,matched:safe?result.matched:0,missing:safe?result.missing:EXPECTED_RECONCILIATION_RECORDS,conflicts:safe?result.conflicts:0,unexpectedRefs:safe?result.unexpectedRefs:0,scenariosPassed:safe?result.scenariosPassed:0,partial:safe?result.partial:false,
  scenarioDatasetReconciled:safe&&result.complete===true,items:safe?result.items.map(x=>({scenarioId:x.scenarioId,recordId:x.recordId,status:x.status})):[],
  synthetic:true,autonomousDispatch:false,publicValueVerified:false,crossTenantIsolationIndependentlyVerified:false,realWorldOperationsCertified:false};
}
