// Many incidents can sit in the same place. Drawing one translucent disc per incident stacks them into a dark red mass, so the map
// draws one disc per small cell (about 2 km), using the most serious incident there, and says how many incidents it stands for.

const RANK = { Critical: 4, High: 3, Warning: 2, Operational: 1 };
const CELL_DEGREES = 0.02;

const isResolved = (status) => String(status || '').toLowerCase() === 'resolved';

export function groupDangerZones(incidents) {
  const cells = new Map();
  for (const incident of Array.isArray(incidents) ? incidents : []) {
    const lat = incident?.location?.lat;
    const lng = incident?.location?.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (isResolved(incident.status)) continue;
    const key = `${Math.round(lat / CELL_DEGREES)}:${Math.round(lng / CELL_DEGREES)}`;
    const cell = cells.get(key);
    if (!cell) {
      cells.set(key, { incident, count: 1 });
    } else {
      cell.count += 1;
      if ((RANK[incident.severity] || 0) > (RANK[cell.incident.severity] || 0)) cell.incident = incident;
    }
  }
  return [...cells.entries()].map(([key, cell]) => ({ key, incident: cell.incident, count: cell.count }));
}
