// Map search over the operator's own SENTRY records (no external geocoder, no query leaves the browser).

import {
  incidentCoords,
  incidentLocationLabel,
  incidentSubtypeLabel,
  incidentTypeLabel,
  normalizeSeverity,
  shortIncidentId,
} from './incidentStats.js';

const MAX_RESULTS = 8;
const asArray = (value) => (Array.isArray(value) ? value : []);

function lngLat(record) {
  const [lng, lat] = record?.location?.coordinates || [];
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function score(haystack, needle) {
  const text = haystack.toLowerCase();
  if (!text.includes(needle)) return 0;
  if (text.startsWith(needle)) return 3;
  if (text.split(/[\s,·\-_/]+/).some((word) => word.startsWith(needle))) return 2;
  return 1;
}

export function searchRecords(query, { incidents, habitations, sites, places } = {}) {
  const needle = String(query || '').trim().toLowerCase();
  if (needle.length < 2) return [];
  const results = [];

  for (const incident of asArray(incidents)) {
    const coords = incidentCoords(incident);
    if (!coords) continue;
    const type = incidentTypeLabel(incident);
    const subtype = incidentSubtypeLabel(incident);
    const where = incidentLocationLabel(incident, places);
    const matched = score(`${type} ${subtype || ''} ${where} ${shortIncidentId(incident)} ${incident.severity || ''}`, needle);
    if (!matched) continue;
    results.push({
      key: `incident-${incident._id || incident.id}`,
      kind: 'incident',
      title: `${type}${subtype ? ` · ${subtype}` : ''}`,
      sub: `${normalizeSeverity(incident.severity).toUpperCase()} · ${where}`,
      ...coords,
      matched,
    });
  }

  for (const record of asArray(habitations)) {
    const coords = lngLat(record);
    if (!coords) continue;
    const matched = score(`${record.name || ''} ${record.district || ''} ${record.state || ''}`, needle);
    if (!matched) continue;
    results.push({
      key: `habitation-${record._id || record.name}`,
      kind: 'habitation',
      title: record.name || 'Habitation',
      sub: `Habitation · ${[record.district, record.state].filter(Boolean).join(', ') || 'area not recorded'}`,
      ...coords,
      matched,
    });
  }

  for (const record of asArray(sites)) {
    const coords = lngLat(record);
    if (!coords) continue;
    const matched = score(`${record.name || ''} ${record.district || ''} ${record.state || ''}`, needle);
    if (!matched) continue;
    results.push({
      key: `site-${record._id || record.name}`,
      kind: 'site',
      title: record.name || 'Relocation site',
      sub: `Relocation site · ${[record.district, record.state].filter(Boolean).join(', ') || 'area not recorded'}`,
      ...coords,
      matched,
    });
  }

  results.sort((a, b) => b.matched - a.matched || a.title.localeCompare(b.title));
  return results.slice(0, MAX_RESULTS);
}
