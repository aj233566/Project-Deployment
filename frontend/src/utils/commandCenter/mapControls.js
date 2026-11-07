// Behaviour shared by every map on the page, so the Controls panel does the same thing on the 3D map, the 3D globe and the Live Map:
// the severity filter, the saved map points (the Live Map's own storage key, so a point dropped on one map shows on the others) and
// the nearest-facility choice for the emergency road route.

export const USER_POINTS_STORAGE_KEY = 'cascade-net.userPoints.v1';
export const ARRIVAL_MOTION_STORAGE_KEY = 'sentry:arrival-motion-enabled';

export function filterBySeverity(incidents, filter) {
  const list = Array.isArray(incidents) ? incidents : [];
  if (filter !== 'CRITICAL' && filter !== 'HIGH_PLUS') return list;
  return list.filter((incident) => {
    const severity = String(incident?.severity || '').toLowerCase();
    return severity === 'critical' || (filter === 'HIGH_PLUS' && severity === 'high');
  });
}

export function readUserPoints(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(USER_POINTS_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((point) => Number.isFinite(point?.lat) && Number.isFinite(point?.lng)) : [];
  } catch {
    return [];
  }
}

export function distanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (degrees) => (degrees * Math.PI) / 180;
  const a = Math.sin(toRad(lat2 - lat1) / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Registered relocation sites that a route may end at: not blocked, not closed, and with room left.
export function routableSites(sites) {
  return (Array.isArray(sites) ? sites : [])
    .filter((site) => {
      const access = String(site.roadAccess || '').toUpperCase();
      const status = String(site.status || '').toLowerCase();
      const available = site.capacity?.available;
      return access !== 'BLOCKED' && !['closed', 'inactive', 'deleted'].includes(status) && !(Number.isFinite(available) && available <= 0);
    })
    .map((site) => {
      const [lng, lat] = site.location?.coordinates || [];
      return { id: site._id, name: site.name || 'Registered relocation site', lat, lng, kind: 'relocation site' };
    });
}

export function nearestOf(origin, candidates) {
  return candidates
    .filter((candidate) => Number.isFinite(candidate.lat) && Number.isFinite(candidate.lng))
    .sort((a, b) => distanceKm(origin.lat, origin.lng, a.lat, a.lng) - distanceKm(origin.lat, origin.lng, b.lat, b.lng))[0] || null;
}
