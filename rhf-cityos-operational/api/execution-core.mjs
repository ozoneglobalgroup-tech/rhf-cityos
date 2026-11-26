export const COST_CATEGORIES=['STAFF','FUEL','EQUIPMENT','MATERIAL','CONTRACTOR','OTHER'];
export const ORDER_TRANSITIONS={DRAFT:['ISSUED','CANCELLED'],ISSUED:['DELIVERED','CANCELLED'],DELIVERED:['ACCEPTED'],ACCEPTED:[],CANCELLED:[]};
export const COST_TRANSITIONS={DRAFT:['SUBMITTED'],SUBMITTED:['APPROVED','REJECTED'],APPROVED:[],REJECTED:[]};
export const FINANCIAL_REVIEW_ROLES=['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR'];
export function rialAmount(v){
 if(typeof v!=='number' && typeof v!=='string')throw Error('مبلغ نامعتبر');
 if(typeof v==='string'&&!/^(0|[1-9][0-9]*)$/.test(v))throw Error('مبلغ باید عدد صحیح مثبت به ریال باشد');
 const n=Number(v);
 if(!Number.isSafeInteger(n)||n<0||n>900000000000000)throw Error('مبلغ خارج از محدوده مجاز است');
 return n;
}
export function allowedTransition(graph,from,to){return Object.hasOwn(graph,from)&&graph[from].includes(to);}
export function canIndependentReview(role,reviewer,creator){return FINANCIAL_REVIEW_ROLES.includes(role)&&Boolean(reviewer)&&Boolean(creator)&&reviewer!==creator;}
export function sumCostTotals(rows=[]){let draft=0,submitted=0,approved=0,rejected=0;for(const c of rows){let n=Number(c.amount_rial);if(!Number.isSafeInteger(n)||n<0)throw Error('مبلغ ردیف صحیح نیست');if(c.status==='DRAFT')draft+=n;else if(c.status==='SUBMITTED')submitted+=n;else if(c.status==='APPROVED')approved+=n;else if(c.status==='REJECTED')rejected+=n;}return {draft,submitted,approved,rejected};}
