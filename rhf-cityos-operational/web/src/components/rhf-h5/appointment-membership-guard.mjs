// DV32UX31: fail-closed UI preflight; API and RLS remain authoritative.
export function isApprovedCurrentAppointment(row, now = Date.now()) {
  if (!row || row.status !== 'APPROVED' || typeof row.userId !== 'string' || !row.userId.trim()) return false;
  if (typeof row.positionCode !== 'string' || !['MAYOR', 'DEPUTY_HEAD', 'ORG_CEO'].includes(row.positionCode)) return false;
  if (row.positionCode !== 'MAYOR' && !(typeof row.orgUnitId === 'string' && row.orgUnitId.trim())) return false;
  if (typeof row.validFrom !== 'string' || !Number.isFinite(Date.parse(row.validFrom)) || Date.parse(row.validFrom) > now) return false;
  for (const field of ['validTo', 'expiresAt']) {
    if (row[field] != null && row[field] !== '') {
      const expiry = Date.parse(row[field]);
      if (!Number.isFinite(expiry) || expiry <= now) return false;
    }
  }
  return true;
}

// Never turn an existing membership (including ADMIN or VIEWER) into VIEWER.
// This helper controls only the UI request; the server must enforce same-city IAM.
export function canRequestViewerMembership({ pilotOnly, userId, appointment, membership, now = Date.now() } = {}) {
  return pilotOnly === true && typeof userId === 'string' && !!userId.trim() &&
    appointment?.userId === userId && isApprovedCurrentAppointment(appointment, now) && membership == null;
}
