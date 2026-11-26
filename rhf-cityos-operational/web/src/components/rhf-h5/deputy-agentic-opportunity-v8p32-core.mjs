// RHF City OS V8P3.2: human-gated synthetic opportunities, NOT autonomous agents.
// Computation only from validated, tenant/city-scoped V8P2 dossier API rows.
// Persistence exclusively through existing governed V8P2 CREATE, SUBMIT and REVIEW routes.
import {DOSSIER_KEYS,validateFields,validateEvidenceRefs} from './deputy-dossier-schema.mjs';
import {syntheticIndicator} from './deputy-portfolio-v8p3-core.mjs';
export const OPPORTUNITY_VERSION='RHF-AGENTIC-OPPORTUNITY-V8P3.2';
export const DRAFT_PREFIX='[V8P3.2]';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const safeText=v=>String(v||'').replace(/[\x00-\x1f<>]/g,' ').trim();
function validBoard(board){return Boolean(board&&board.synthetic===true&&board.verifiedPublicValue===false&&board.autonomousDispatch===false&&typeof board.cityId==='string'&&Array.isArray(board.rows)&&Array.isArray(board.indicators)&&typeof board.canCreate==='boolean'&&typeof board.canReview==='boolean');}
export function discoverOpportunities(board){
 if(!validBoard(board))throw Error('INVALID_SCOPED_BOARD');
 const byId=new Map(board.rows.map(r=>[r.id,r]));
 return board.indicators.flatMap(s=>{
  const r=byId.get(s.id);
  if(!r||r.orgKey!==s.orgKey||!DOSSIER_KEYS.includes(r.orgKey)||!UUID.test(r.id)||
   r.synthetic!==true||r.verifiedPublicValue!==false||r.title.startsWith(DRAFT_PREFIX)||
   r.status==='REJECTED'||
   !Number.isSafeInteger(s.quantity)||s.quantity<=0)return [];
  const trusted=syntheticIndicator(r);
  if(!trusted||trusted.quantity!==s.quantity||trusted.code!==s.code)return [];
  return [{id:r.id,orgKey:r.orgKey,sourceCode:r.code,sourceStatus:r.status,
   title:r.title,measure:s.label,quantity:s.quantity,proposal:s.proposal,
   evidenceCount:r.evidenceRefs.length,
   sourceType:'SYNTHETIC_POSTGRES_DOSSIER',confidence:'UNVERIFIED',
   authorization:'HUMAN_REVIEW_REQUIRED',valueStatus:'NOT_VERIFIED',
   estimatedSavings:null,estimatedBenefit:null,allocationApproved:false}];
 });
}
export function proposalFromOpportunity(board,opportunity){
 if(!validBoard(board)||!board.canCreate)throw Error('NOT_AUTHORIZED_TO_CREATE_DRAFT');
 const row=board.rows.find(r=>r.id===opportunity?.id&&r.orgKey===opportunity?.orgKey);
 if(!row||!discoverOpportunities(board).some(x=>x.id===row.id))throw Error('SOURCE_RECORD_NOT_VERIFIED');
 const fields=validateFields(row.orgKey,row.fields);
 const evidenceRefs=validateEvidenceRefs(row.evidenceRefs);
 const title=`${DRAFT_PREFIX} بررسی پیشنهادی ${safeText(row.title)}`.slice(0,140);
 const description=[
  'پیش‌نویس آزمایشی پیشنهادی برای بررسی انسانی؛ فاقد اقدام میدانی یا اختیار تخصیص.',
  `منبع پرونده: ${row.id} ؛ کد منبع: ${safeText(row.code)}`,
  `شاخص محاسبه‌شده از فرم SYNTHETIC: ${safeText(opportunity.measure)} = ${opportunity.quantity}.`,
  `پیشنهاد قاعده‌محور: ${safeText(opportunity.proposal)}.`,
  'محدودیت: امکان استفاده از ظرفیت، مجوز قانونی، هزینه، خط مبنای معتبر و تحقق ارزش تأیید نشده‌اند.',
  'اقدام بعد: بازبین مستقل باید شواهد و محدوده اختیار را بررسی کند؛ ارسال و تصمیم فقط از API اصلی.'
 ].join('\n').slice(0,1500);
 if(title.length<8||description.length<30)throw Error('INVALID_DRAFT_TEXT');
 return {action:'CREATE',orgKey:row.orgKey,status:'DRAFT',title,description,fields,evidenceRefs};
}
export async function deterministicRequestKey(cityId,sourceId,webCrypto=globalThis.crypto){
 if(!UUID.test(cityId)||!UUID.test(sourceId)||!webCrypto?.subtle?.digest)throw Error('CANNOT_CREATE_SAFE_IDEMPOTENCY_KEY');
 const bytes=new TextEncoder().encode(`${OPPORTUNITY_VERSION}|${cityId}|${sourceId}`);
 const b=new Uint8Array(await webCrypto.subtle.digest('SHA-256',bytes)).slice(0,16);
 b[6]=(b[6]&15)|0x80; // RFC 9562 version 8, application-defined deterministic UUID
 b[8]=(b[8]&63)|0x80;
 const hex=Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
 return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export function authorityView(board){
 if(!validBoard(board))throw Error('INVALID_SCOPED_BOARD');
 return {read:true,createDraft:board.canCreate,reviewSeparate:board.canReview,
  autoDispatch:false,verifiedPublicValue:false,legalAuthorityVerified:false,
  note:'مجوزهای ایجاد و بازبینی از API شهرداری جاری استخراج شده‌اند؛ سمت قانونی و اختیار تخصیص خارج از این نما باید مستقل احراز شوند.'};
}
