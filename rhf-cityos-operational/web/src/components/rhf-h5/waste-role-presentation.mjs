// DV32UX29: presentation identity is derived only from the server-authorized
// /my-workspaces response. This is UI gating, NOT a substitute for API/RLS.
const WASTE_NAME = /پسماند|\bwaste\b/i;
const TITLES = Object.freeze({
  ORG_CEO: Object.freeze({
    roleLabel: 'مدیرعامل سازمان پسماند',
    title: 'سیستم‌عامل مدیرعامل سازمان مدیریت پسماند',
    sectionTitle: 'فرماندهی و تصمیم‌سازی سازمان پسماند',
    homeTitle: 'نمای فرماندهی مدیرعامل',
  }),
  DEPUTY: Object.freeze({
    roleLabel: 'معاون خدمات شهری — نمای نظارتی',
    title: 'نمای نظارتی معاونت بر سازمان مدیریت پسماند',
    sectionTitle: 'نظارت و پایش عملکرد سازمان پسماند',
    homeTitle: 'نمای نظارتی معاونت',
  }),
  ADMIN_PREVIEW: Object.freeze({
    roleLabel: 'مدیر سامانه — پیش‌نمایش',
    title: 'پیش‌نمایش سازمان مدیریت پسماند برای مدیر سامانه',
    sectionTitle: 'پیش‌نمایش مدیریتی سازمان پسماند',
    homeTitle: 'پیش‌نمایش مدیر سامانه',
  }),
  BLOCKED: Object.freeze({
    roleLabel: 'فاقد انتصاب قابل تأیید',
    title: 'سازمان مدیریت پسماند — دسترسی محدود',
    sectionTitle: 'دسترسی محدود',
    homeTitle: 'دسترسی محدود',
  }),
});

function isCurrentWorkspace(item, now) {
  if (!item || typeof item !== 'object' || typeof item.positionCode !== 'string') return false;
  if (typeof item.status === 'string' && !['APPROVED', 'ACTIVE'].includes(item.status)) return false;
  if (item.validFrom && (!Number.isFinite(Date.parse(item.validFrom)) || Date.parse(item.validFrom) > now)) return false;
  if (item.validTo && (!Number.isFinite(Date.parse(item.validTo)) || Date.parse(item.validTo) <= now)) return false;
  // /my-workspaces exposes expiresAt; do not ignore this effective end date.
  if (item.expiresAt && (!Number.isFinite(Date.parse(item.expiresAt)) || Date.parse(item.expiresAt) <= now)) return false;
  return true;
}

function wasteUnit(item) {
  return [item.orgUnitName, item.orgUnitCode, item.organizationName, item.organizationCode]
    .some(x => typeof x === 'string' && WASTE_NAME.test(x));
}

export function wasteRolePresentation({isAdmin = false, workspacesStatus, workspaces = [], now = Date.now()} = {}) {
  const items = workspacesStatus === 'ready' && Array.isArray(workspaces)
    ? workspaces.filter(x => isCurrentWorkspace(x, now)) : [];
  // An admin may preview a workspace, but is never labelled as its appointed CEO.
  const mode = workspacesStatus !== 'ready' ? 'BLOCKED'
    : isAdmin ? 'ADMIN_PREVIEW'
    : items.some(x => x.positionCode === 'ORG_CEO' && wasteUnit(x)) ? 'ORG_CEO'
    : items.some(x => x.positionCode === 'DEPUTY_HEAD') ? 'DEPUTY' : 'BLOCKED';
  const blockedReason = workspacesStatus === 'loading' ? 'در حال تأیید انتصاب و نشست جاری'
    : workspacesStatus === 'restricted' ? 'دریافت انتصاب‌های مجاز از سرور ناموفق بود'
    : 'این حساب انتصاب معتبر در محدوده سازمان پسماند ندارد';
  return Object.freeze({mode, canRead: mode !== 'BLOCKED', blockedReason, ...TITLES[mode]});
}
