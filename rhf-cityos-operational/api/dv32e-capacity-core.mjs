// RHF City OS DV32E — deterministic, advisory-only, city-scoped capacity governance.
// No allocation, approval, financial valuation, dispatch or mutation is performed.
const MAX_BPS = 10000n;
const MAX_ROWS = 200;

export function toMilli(value) {
  const s = String(value ?? '').trim();
  if (!/^\d+(?:\.\d{1,3})?$/.test(s)) throw new TypeError('quantity must be a nonnegative decimal with up to 3 fractional digits');
  const [whole, fraction=''] = s.split('.');
  return BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, '0'));
}
export function fromMilli(value) {
  if (typeof value !== 'bigint' || value < 0n) throw new TypeError('invalid milli quantity');
  return `${value / 1000n}.${String(value % 1000n).padStart(3, '0')}`;
}
function bps(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > Number(MAX_BPS)) throw new TypeError('invalid basis points');
  return BigInt(n);
}
function boundedStr(value, max=240) { return String(value ?? '').slice(0,max); }
function uuid(value) { return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }

export function capacityEvidence(row) {
  if (!uuid(row.id)) throw new TypeError('resource id must be UUID');
  const allocatable = bps(row.allocatable_bps);
  const quality = bps(row.quality_bps);
  const total = toMilli(row.total_quantity);
  const reserve = toMilli(row.reserve_quantity);
  const reserved = toMilli(row.reserved_quantity);
  // Quality is used for evidence confidence only; it does NOT multiply physical capacity.
  const nominalCap = total * allocatable / MAX_BPS;
  const netPool = nominalCap > reserve ? nominalCap - reserve : 0n;
  const available = netPool > reserved ? netPool - reserved : 0n;
  const overcommitted = reserved > netPool;
  const authorized = row.authorized === true;
  const reviewable = authorized && available > 0n && !overcommitted;
  const className = !authorized ? 'NOT_AUTHORIZED' : overcommitted ? 'CAPACITY_CONFLICT' : available === 0n ? 'NO_HEADROOM' : 'HUMAN_REVIEW_CANDIDATE';
  return {
    resourceId: row.id,
    code: boundedStr(row.code,80), name: boundedStr(row.name_fa,200),
    resourceKind: boundedStr(row.resource_kind,60), unit: boundedStr(row.unit,50),
    ownerUnitId: uuid(row.owner_unit_id) ? row.owner_unit_id : null,
    constraints: boundedStr(row.constraints_note,400),
    totalQuantity: fromMilli(total), allocatableBps: Number(allocatable),
    qualityBps: Number(quality), protectedReserve: fromMilli(reserve),
    governedPool: fromMilli(netPool), alreadyReserved: fromMilli(reserved),
    headroomQuantity: fromMilli(available),
    reviewable, classification: className,
    proposedAction: reviewable ? 'HUMAN_ASSESSMENT_ONLY' : 'NONE',
    evidenceRefs: [`capacity_resources:${row.id}`, `capacity_allocations:aggregate:${row.id}`],
    valueVerification: {status:'NOT_VERIFIED', baselineRequired:true, followupRequired:true, independentReviewerRequired:true, monetizedBenefit:null},
    humanApprovalRequired:true, automaticReservation:false, fieldDispatchAllowed:false
  };
}
export function createGovernanceReport({cityId,tenantId,resources,caseGroups=[],generatedAt=new Date().toISOString()}) {
  if (!uuid(cityId) || !uuid(tenantId)) throw new TypeError('invalid scope');
  if (!Array.isArray(resources) || resources.length > MAX_ROWS + 1) throw new TypeError('too many resource rows');
  const truncated = resources.length > MAX_ROWS;
  const rows = resources.slice(0,MAX_ROWS).map(capacityEvidence);
  const backlogs = caseGroups.map(r=>({status:boundedStr(r.status,40),priority:boundedStr(r.priority,40), count:Number(r.n)}));
  if (backlogs.some(r=>!Number.isSafeInteger(r.count) || r.count < 0)) throw new TypeError('invalid backlog');
  const backlogTotal=backlogs.reduce((n,r)=>n+r.count,0);
  rows.sort((a,b) => Number(b.reviewable)-Number(a.reviewable) || b.qualityBps-a.qualityBps || a.code.localeCompare(b.code));
  return {
    schema:'RHF-DV32E-CAPACITY-GOVERNANCE-v1', readOnly:true, generatedAt,
    scope:{tenantId,municipalityId:cityId},
    summary:{resourcePools:rows.length,reviewCandidates:rows.filter(x=>x.reviewable).length,
      authorizationBlocked:rows.filter(x=>x.classification==='NOT_AUTHORIZED').length,
      capacityConflicts:rows.filter(x=>x.classification==='CAPACITY_CONFLICT').length,
      openServiceCases:backlogTotal,truncated},
    backlogByStatusAndPriority:backlogs,
    opportunities:rows,
    caveats:[
      'A service-case backlog does not establish resource suitability or measured demand.',
      'Capacity headroom is not a verified financial or public-value outcome.',
      'Independent baseline, follow-up, attribution and reviewer evidence are mandatory before claiming value.'
    ],
    controls:{dataScope:'TRANSACTION_LOCAL_RLS',humanApprovalRequired:true,aggregatePoolOnly:true,
      writeOperations:false,automaticReservation:false,fieldDispatchAllowed:false,valueGate:'INDEPENDENT_VERIFICATION_REQUIRED'}
  };
}
