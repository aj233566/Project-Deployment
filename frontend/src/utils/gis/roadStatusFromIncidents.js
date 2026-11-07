const ROAD_IMPACT_RULES = [
  { match: 'roadblock', status: 'blocked' },
  { match: 'infrastructure', status: 'blocked' },
  { match: 'landslide', status: 'restricted' },
  { match: 'flood', status: 'restricted' },                              
  { match: 'slope', status: 'restricted' },                                  
];
function normalizeKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z]/g, '');
}
function roadImpactFor(incident) {
  const key = normalizeKey(incident?.rawType || incident?.type);
  if (!key) return null;
  const rule = ROAD_IMPACT_RULES.find((r) => key.includes(r.match));
  return rule ? rule.status : null;
}
function routeName(incident) {
  const address = incident?.location?.address;
  if (typeof address === 'string' && address.trim()) {
    return address.split(',')[0].trim();
  }
  if (typeof incident?.title === 'string' && incident.title.trim()) {
    return incident.title.trim();
  }
  return 'Unnamed route';
}
export function deriveRoadStatusFromIncidents(incidents = []) {
  if (!Array.isArray(incidents)) return [];
  return incidents.reduce((rows, incident) => {
    if (normalizeKey(incident?.status) === 'resolved') return rows;
    const status = roadImpactFor(incident);
    if (!status) return rows;
    const label = incident?.type || 'Hazard';
    const reason = incident?.description && String(incident.description).trim()
      ? incident.description
      : `${label} reported — ${status === 'blocked' ? 'route impassable' : 'reduced access'}`;
    rows.push({
      id: incident?.id || `${routeName(incident)}-${rows.length}`,
      name: routeName(incident),
      status,
      condition: reason,
      lat: incident?.location?.lat ?? null,
      lng: incident?.location?.lng ?? null,
    });
    return rows;
  }, []);
}
export default deriveRoadStatusFromIncidents;
