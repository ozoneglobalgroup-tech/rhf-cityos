/** Pure organizational drill-down helpers. Data must already be scoped by the API. */
export function descendants(units, rootId) {
  const children = new Map();
  for (const u of units || []) {
    const parent = u.parent_id ?? null;
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(u.id);
  }
  const ids = new Set(), stack = [rootId];
  while (stack.length) {
    const id = stack.pop();
    if (ids.has(id)) continue;
    ids.add(id);
    for (const child of children.get(id) || []) stack.push(child);
  }
  return ids;
}

export function organizationSnapshot(units = [], services = [], cases = []) {
  const byId = new Map(units.map(u => [u.id, u]));
  const serviceOwner = new Map(services.map(s => [s.id, s.owner_unit_id]));
  const rows = [], completed = new Set();
  const children = new Map();
  for (const u of units) {
    const pid = u.parent_id && byId.has(u.parent_id) && u.parent_id !== u.id ? u.parent_id : null;
    if (!children.has(pid)) children.set(pid, []);
    children.get(pid).push(u);
  }
  const walk = (unit, depth, ancestors) => {
    if (completed.has(unit.id) || ancestors.has(unit.id)) return;
    completed.add(unit.id);
    const ids = descendants(units,unit.id);
    const serviceIds = new Set(services.filter(s => ids.has(s.owner_unit_id)).map(s => s.id));
    const caseIds = new Set(cases.filter(c => ids.has(c.unit_id) || serviceIds.has(c.service_id)).map(c => c.id));
    rows.push({ ...unit, depth, childrenCount:(children.get(unit.id)||[]).length,
      servicesCount:serviceIds.size, casesCount:caseIds.size });
    const next = new Set(ancestors);next.add(unit.id);
    for (const child of (children.get(unit.id)||[])) walk(child,depth+1,next);
  };
  for(const root of children.get(null)||[]) walk(root,0,new Set());
  // A corrupted cycle or orphan must not suppress nodes in the UI.
  for(const unit of units) if (!completed.has(unit.id)) walk(unit,0,new Set());
  return rows;
}

export function casesForOrgTree(units,services,cases,rootId) {
  const ids = descendants(units,rootId);
  const serviceIds = new Set(services.filter(s=>ids.has(s.owner_unit_id)).map(s=>s.id));
  return cases.filter(c=>ids.has(c.unit_id)||serviceIds.has(c.service_id));
}
