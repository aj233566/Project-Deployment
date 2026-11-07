// Which incidents deserve a pop-up for a citizen: new since the last look, serious (Critical or High), still open and near the person.
// `seen` is a Set of incident ids, or null before the first look (then nothing is "new", so a page that just opened does not shout about
// incidents that were already there).
import { directKm } from './safePlaces.js';

export const ALERT_RADIUS_KM = 100;
const SERIOUS = new Set(['critical', 'high']);

const idOf = (incident) => String(incident?._id || incident?.id || '');

export function seriousIncidentIds(incidents) {
  return new Set((Array.isArray(incidents) ? incidents : []).map(idOf).filter(Boolean));
}

export function newNearbyIncidents(incidents, seen, origin, radiusKm = ALERT_RADIUS_KM) {
  if (!seen || !origin || !Number.isFinite(origin.lat) || !Number.isFinite(origin.lng)) return [];
  const found = [];
  for (const incident of Array.isArray(incidents) ? incidents : []) {
    const id = idOf(incident);
    if (!id || seen.has(id)) continue;
    if (!SERIOUS.has(String(incident.severity || '').toLowerCase())) continue;
    if (String(incident.status || '').toLowerCase() === 'resolved') continue;
    const lat = incident?.location?.lat;
    const lng = incident?.location?.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const km = directKm(origin.lat, origin.lng, lat, lng);
    if (km > radiusKm) continue;
    found.push({ id, severity: String(incident.severity), type: String(incident.type || 'Incident').replace(/_/g, ' '), place: String(incident.location?.address || ''), km: Number(km.toFixed(1)) });
  }
  return found.sort((a, b) => a.km - b.km);
}
