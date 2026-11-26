/** RUVOS H8: never label string-assignee missions as personal tasks. */
export const MY_WORK_ROLES = Object.freeze(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR','AUDITOR']);
export const MY_WORK_PARTS = Object.freeze(['my-work']);
export const MAX_ITEMS = 50;
export const isReviewer = role => role === 'MUNICIPAL_ADMIN';
export function safeFollowup(x) {
  if (!x || typeof x !== 'object') throw new TypeError('INVALID_FOLLOWUP_ROW');
  return {
    id:x.id,caseId:x.case_id,caseSummary:typeof x.case_summary==='string'?x.case_summary:null,
    status:x.status,kind:x.kind,note:x.note,createdBy:x.created_by,
    approvedBy:x.approved_by??null,createdAt:x.created_at,approvedAt:x.approved_at??null
  };
}
export function shapeWorkInbox({city,role,own,approvals}) {
  if(!city?.id || !MY_WORK_ROLES.includes(role)) throw new TypeError('INVALID_SCOPED_INBOX');
  const mine=Array.isArray(own)?own:[];
  const pending=isReviewer(role)&&Array.isArray(approvals)?approvals:[];
  return {
    mode:'READ_ONLY',scope:city.id,role,autoWrites:0,executionEnabled:false,
    myProposals:{rows:mine.slice(0,MAX_ITEMS).map(safeFollowup),isPartial:mine.length>MAX_ITEMS,limit:MAX_ITEMS},
    eligibleReviewQueue:{rows:pending.slice(0,MAX_ITEMS).map(safeFollowup),isPartial:pending.length>MAX_ITEMS,limit:MAX_ITEMS,
      label:'در حوزه اختیار بررسی این نقش؛ انتساب انحصاری شخصی نیست'},
    personalMissions:{available:false,rows:[],reason:'missions.assignee فیلد متنی است و به شناسه معتبر کاربر متصل نیست.'},
    notices:['پیگیری EXECUTED فقط اجرای پیگیری داخلی است، نه مأموریت واقعی.',
      'تنها آخرین ردیف‌های مجاز نمایش داده می‌شوند؛ نبود رکورد در این نما به معنای نبود وظیفه در کل شهر نیست.']
  };
}
