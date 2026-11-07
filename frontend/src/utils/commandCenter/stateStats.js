// National view figures: incidents and population grouped by state, and incident counts by hazard type.

import {
  FILTER_GROUPS,
  incidentCoords,
  incidentGroup,
  normalizeSeverity,
} from './incidentStats.js';

const asArray = (value) => (Array.isArray(value) ? value : []);
const SEVERITY_WEIGHT = { critical: 4, high: 3, medium: 2, low: 1, unknown: 0 };

function topSeverity(row) {
  for (const level of ['critical', 'high', 'medium', 'low']) {
    if (row[level] > 0) return level;
  }
  return 'unknown';
}

// Groups incidents by the state their coordinates fall in. Incidents with no coordinates or outside every
// state boundary are counted separately so the totals still add up.
export function groupIncidentsByState(incidents, index) {
  const byCode = new Map();
  let outside = 0;
  for (const incident of asArray(incidents)) {
    const coords = incidentCoords(incident);
    const code = coords && index ? index.find(coords.lat, coords.lng) : null;
    if (!code) {
      outside += 1;
      continue;
    }
    if (!byCode.has(code)) {
      byCode.set(code, { code, name: index.byCode[code]?.name || code, count: 0, critical: 0, high: 0, medium: 0, low: 0, unknown: 0, score: 0 });
    }
    const row = byCode.get(code);
    const severity = normalizeSeverity(incident?.severity);
    row[severity] += 1;
    row.count += 1;
    row.score += SEVERITY_WEIGHT[severity];
  }
  const rows = [...byCode.values()]
    .map((row) => ({ ...row, topSeverity: topSeverity(row), center: index.byCode[row.code]?.center || null }))
    .sort((a, b) => b.count - a.count || b.score - a.score || a.name.localeCompare(b.name));
  return { rows, outside };
}

// One entry per hazard group, including groups with no incidents, so the grid keeps a stable shape.
export function countByHazardGroup(incidents) {
  const counts = new Map();
  for (const incident of asArray(incidents)) {
    const key = incidentGroup(incident);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...FILTER_GROUPS.map((group) => ({ key: group.key, label: group.label })), { key: 'other', label: 'Other' }]
    .map((group) => ({ ...group, count: counts.get(group.key) || 0 }));
}

// People in habitations per state, split by assessed zone level (RED/ORANGE = at risk, YELLOW = watch).
export function summarizePopulationByState(habitations, index) {
  const byCode = new Map();
  for (const record of asArray(habitations)) {
    const population = Number(record?.population);
    const [lng, lat] = record?.location?.coordinates || [];
    if (!Number.isFinite(population) || population <= 0 || !index) continue;
    const code = index.find(lat, lng);
    if (!code) continue;
    if (!byCode.has(code)) {
      byCode.set(code, { code, name: index.byCode[code]?.name || code, atRisk: 0, watch: 0, total: 0, habitations: 0 });
    }
    const row = byCode.get(code);
    const level = String(record?.risk?.level || '').toUpperCase();
    if (level === 'RED' || level === 'ORANGE') row.atRisk += population;
    else if (level === 'YELLOW') row.watch += population;
    row.total += population;
    row.habitations += 1;
  }
  return [...byCode.values()].sort((a, b) => b.atRisk - a.atRisk || b.watch - a.watch || b.total - a.total || a.name.localeCompare(b.name));
}
