// Pure safeguards used for budget, contract and statement approval.
export const FINANCE_READ_ROLES=Object.freeze(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR','AUDITOR']);
export const FINANCE_WRITE_ROLES=Object.freeze(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR']);
export const BUDGET_STATUS=Object.freeze({DRAFT:['APPROVED'],APPROVED:[]});
export const CONTRACT_STATUS=Object.freeze({DRAFT:['ACTIVE'],ACTIVE:['CLOSED'],CLOSED:[]});
export const STATEMENT_STATUS=Object.freeze({DRAFT:['SUBMITTED'],SUBMITTED:['CERTIFIED','REJECTED'],REJECTED:['SUBMITTED'],CERTIFIED:[]});
export function exactRial(v,{zero=false}={}){
 if(typeof v!=='string'&&typeof v!=='number')throw Error('مبلغ باید عدد صحیح ریالی باشد');
 if(typeof v==='string'&&!/^(0|[1-9][0-9]*)$/.test(v))throw Error('مبلغ باید عدد صحیح و بدون جداکننده باشد');
 const n=Number(v);if(!Number.isSafeInteger(n)||n>(900000000000000)||n<(zero?0:1))throw Error('مبلغ خارج از محدوده مجاز است');
 return n;
}
export function validTransition(graph,from,to){return Object.hasOwn(graph,from)&&graph[from].includes(to)}
export function independent(role,actor,creator){return FINANCE_WRITE_ROLES.includes(role)&&Boolean(actor)&&Boolean(creator)&&actor!==creator}
export function withinLimit(used,amount,limit){return BigInt(used)+BigInt(amount)<=BigInt(limit)}
export function statementSum(rows){let total=0n;for(const r of rows){let n=exactRial(r.amount_rial);total+=BigInt(n);}if(total>900000000000000n)throw Error('جمع مبلغ از حد مجاز عبور کرده است');return total.toString()}
export function uniqueCostIds(ids){if(!Array.isArray(ids)||ids.length<1||ids.length>60)throw Error('بین ۱ تا ۶۰ ردیف هزینه انتخاب کنید');
 if(ids.some(x=>typeof x!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x)))throw Error('شناسه هزینه نامعتبر است');
 if(new Set(ids).size!==ids.length)throw Error('ردیف هزینه تکراری است');return [...ids].sort();}
