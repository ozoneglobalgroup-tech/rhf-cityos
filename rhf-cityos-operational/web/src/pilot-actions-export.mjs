// Excel/CSV-safe, UTF-8-BOM export of DISPLAYED (max 100) scoped records only.
// Never treat this export as proof of bank payment, approved financial benefit or legal compliance.
export const PILOT_CSV_FIELDS=['شناسه پرونده','عنوان پرونده','خدمت','وضعیت پرونده','شروط انجام‌شده از ۸','زنجیره کامل','معوق','اقدام بعدی','توضیح اقدام','مراحل ناقص'];
function escapeCell(value){
 let s=String(value??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'').replace(/[\r\n]+/g,' ').trim();
 // Prevent CSV formula injection in Excel/LibreOffice, including leading whitespace and control prefixes.
 if(/^[=+\-@\t]/.test(s))s="'"+s;
 return `"${s.replace(/"/g,'""')}"`;
}
export function pilotCsv({cases=[],cityName='',asOf='',truncated=false}={}){
 const rows=[['شهرداری',cityName],['زمان گزارش (UTC)',asOf],['دامنه خروجی','فقط پرونده‌های نمایش‌داده‌شده (حداکثر ۱۰۰ مورد)'],['فهرست محدود شده',truncated?'بله':'خیر'],['توضیح','زنجیره آزمایشی؛ گواهی صورت‌وضعیت پرداخت نیست']];
 rows.push(PILOT_CSV_FIELDS);
 for(const c of cases){
  const p=c.pilot||{};
  rows.push([c.id,c.summary,c.service_name,c.status,c.complete_count,c.full_trace?'بله':'خیر',p.overdue?'بله':'خیر',p.title,p.detail,(p.missing||[]).join(' | ')]);
 }
 return '\ufeff'+rows.map(r=>r.map(escapeCell).join(',')).join('\r\n')+'\r\n';
}
