/** Read-only presentation model. Server is authoritative for permission & scope. */
export const statusFa = Object.freeze({
  PROPOSED:'پیشنهاد شده', AUTHORIZED:'تأیید انسانی', QUEUED:'در صف اجرا',
  EXECUTED:'مأموریت ثبت‌شده', REJECTED:'ردشده', CANCELLED:'لغوشده',
  PENDING:'منتظر Worker',CLAIMED:'در اختیار Worker',RETRY:'در انتظار تلاش مجدد',
  FAILED:'ناموفق', DEAD_LETTER:'نیازمند رسیدگی', DONE:'انجام‌شده',
});
export const followupStatusFa = Object.freeze({
  PROPOSED:'پیشنهاد پیگیری',AUTHORIZED:'پیگیری تأییدشده',EXECUTED:'پیگیری داخلی ثبت‌شده',
  REJECTED:'پیگیری ردشده',CANCELLED:'پیگیری لغوشده'
});
export function normalizeAgentMissionResponse(source) {
  if(!source || typeof source!=='object' || Array.isArray(source))return {kind:'UNAVAILABLE',rows:[],message:'وضعیت از API دریافت نشد.'};
  if(source.mode==='AWAITING_SCHEMA')return {kind:'SCHEMA_PENDING',rows:[],message:'زیرساخت اجرایی عامل در پایگاه داده این شهرداری نصب نشده است.'};
  if(source.mode!=='GOVERNED' || !Array.isArray(source.rows))return {kind:'UNKNOWN',rows:[],message:'پاسخ API با قرارداد مورد انتظار سازگار نیست.'};
  return {kind:'READ_ONLY',rows:source.rows.slice(0,100).filter(x=>x && typeof x==='object'),message:'ثبت وضعیت‌ها صرفاً اطلاع‌رسانی است؛ اجرای واقعی عامل در این صفحه فعال نیست.'};
}
export function aggregateMissionStatuses(rows=[]) {
  const count = {total:0,proposed:0,queued:0,registered:0};
  for(const row of rows){
    if(!row || typeof row!=='object')continue;
    count.total++;
    if(row.status==='PROPOSED')count.proposed++;
    if(row.status==='QUEUED')count.queued++;
    if(row.status==='EXECUTED' && typeof row.missionId==='string' && row.missionId.length>0)count.registered++;
  }
  return count;
}
export function describeAgentAccess(response){
  if(!response||typeof response!=='object')return 'وضعیت عامل در دسترس نیست.';
  if(response.mode==='BOUNDED_READ_ONLY')return 'عامل راهبری عملیات: تحلیل و پیشنهاد با ابزارهای محدود و فقط‌خواندنی';
  return 'وضعیت عامل تأیید نشده است.';
}
export function humanTime(value){
  const d = new Date(value||'');
  if(!Number.isFinite(d.valueOf()))return '—';
  return new Intl.DateTimeFormat('fa-IR',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(d);
}
export function safeLabel(value){
  if(value === null||value===undefined||value==='')return '—';
  if(typeof value!=='string'&&typeof value!=='number')return '—';
  return String(value).slice(0,160);
}
