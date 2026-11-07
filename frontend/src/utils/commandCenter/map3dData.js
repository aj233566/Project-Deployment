// GeoJSON for the 3D map, built from SENTRY records and the state boundary index.

import { ZONE_RADIUS_M, circlePolygon } from './map3dStyle.js';
import { incidentCoords, normalizeSeverity } from './incidentStats.js';

const collection = (features) => ({ type: 'FeatureCollection', features });
const sevOf = (incident) => {
  const level = normalizeSeverity(incident?.severity);
  return level === 'unknown' ? 'low' : level;
};
const isResolved = (incident) => String(incident?.status || '').toLowerCase() === 'resolved';

export function incidentsToGeoJson(incidents) {
  const features = [];
  for (const incident of Array.isArray(incidents) ? incidents : []) {
    const coords = incidentCoords(incident);
    if (!coords || isResolved(incident)) continue;
    features.push({
      type: 'Feature',
      id: features.length,
      geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] },
      properties: { id: String(incident._id || incident.id || ''), sev: sevOf(incident), type: String(incident.type || 'incident'), status: String(incident.status || '') },
    });
  }
  return collection(features);
}

// Impact zones: a modelled radius around each active incident. SENTRY records hold a point, not a surveyed outline.
export function zonesToGeoJson(incidents) {
  const features = [];
  for (const incident of Array.isArray(incidents) ? incidents : []) {
    const coords = incidentCoords(incident);
    if (!coords || isResolved(incident)) continue;
    const sev = sevOf(incident);
    features.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: circlePolygon(coords.lat, coords.lng, ZONE_RADIUS_M[sev]) },
      properties: { sev },
    });
  }
  return collection(features);
}

export function habitationsToGeoJson(habitations) {
  const features = [];
  for (const record of Array.isArray(habitations) ? habitations : []) {
    const [lng, lat] = record?.location?.coordinates || [];
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: { name: String(record.name || 'Habitation'), level: String(record?.risk?.level || 'UNASSESSED').toUpperCase(), population: Number(record.population) || 0 },
    });
  }
  return collection(features);
}

// One feature per state, tinted by its worst active incident level ('none' when it has no active incident).
export function statesToGeoJson(entries, rows) {
  const byCode = new Map((rows || []).map((row) => [row.code, row]));
  return collection((entries || []).map((entry) => {
    const row = byCode.get(entry.code);
    return {
      type: 'Feature',
      geometry: { type: 'MultiPolygon', coordinates: entry.polygons },
      properties: { code: entry.code, name: entry.state.name, sev: row ? row.topSeverity : 'none', count: row ? row.count : 0, critical: row ? row.critical : 0, high: row ? row.high : 0 },
    };
  }));
}

// Heat points: the next 24 hours of forecast rain and gusts at monitored places, plus active incidents.
// Weights follow the IMD / Beaufort steps used by the forecast panel: 1 means heavy rain or worse, and
// a place with only light rain contributes a faint glow rather than none.
export const HEAVY_RAIN_MM = 64.5;
export const GALE_KMH = 62;
const INCIDENT_WEIGHT = { critical: 1, high: 0.75, medium: 0.5, low: 0.3 };

export function heatToGeoJson(places, incidents) {
  const features = [];
  for (const place of Array.isArray(places) ? places : []) {
    if (!Number.isFinite(place?.lat) || !Number.isFinite(place?.lng)) continue;
    const rain = Number.isFinite(place.rain24h) ? Math.min(place.rain24h / HEAVY_RAIN_MM, 1) : 0;
    const wind = Number.isFinite(place.maxGust24h) && place.maxGust24h >= 40 ? Math.min((place.maxGust24h - 30) / (GALE_KMH * 1.6 - 30), 0.8) : 0;
    const w = Math.max(rain, wind);
    if (w < 0.03) continue;
    features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [place.lng, place.lat] }, properties: { w: Number(w.toFixed(3)), kind: rain >= wind ? 'rain' : 'wind' } });
  }
  for (const incident of Array.isArray(incidents) ? incidents : []) {
    const coords = incidentCoords(incident);
    if (!coords || isResolved(incident)) continue;
    features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] }, properties: { w: INCIDENT_WEIGHT[sevOf(incident)], kind: 'incident' } });
  }
  return collection(features);
}

// Ongoing cyclone and flood events (GDACS) and earthquakes of magnitude 3 and above (USGS) as icon points.
const EVENT_ICON = { wildfires: 'ev-fire', volcanoes: 'ev-volcano', severeStorms: 'ev-storm', snow: 'ev-snow', tempExtremes: 'ev-heat', dustHaze: 'ev-dust', floods: 'flood', landslides: 'ev-event', drought: 'ev-heat' };
export const hazardIcon = (event) => (event?.type === 'TC' ? 'cyclone' : event?.type === 'DR' ? 'ev-heat' : event?.type === 'EV' ? (EVENT_ICON[event.category] || 'ev-event') : 'flood');

export function hazardsToGeoJson(events, quakes) {
  const features = [];
  for (const event of Array.isArray(events) ? events : []) {
    if (!Number.isFinite(event?.lat) || !Number.isFinite(event?.lng) || !event.current) continue;
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [event.lng, event.lat] },
      properties: { icon: hazardIcon(event), name: String(event.name || ''), label: String(event.typeLabel || ''), level: String(event.level || ''), detail: String(event.severity || '') },
    });
  }
  for (const quake of Array.isArray(quakes) ? quakes : []) {
    if (!Number.isFinite(quake?.lat) || !Number.isFinite(quake?.lng) || !(quake.mag >= 3)) continue;
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [quake.lng, quake.lat] },
      properties: { icon: 'quake', name: `M ${quake.mag.toFixed(1)}`, label: 'Earthquake', level: '', detail: String(quake.place || '') },
    });
  }
  return collection(features);
}

// Outlines drawn by authorities: affected areas (coloured by severity) and safe zones.
export function areasToGeoJson(areas) {
  const features = [];
  for (const area of Array.isArray(areas) ? areas : []) {
    const ring = area?.geometry?.coordinates?.[0];
    if (!Array.isArray(ring) || ring.length < 4 || area.status === 'resolved') continue;
    features.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: area.geometry.coordinates },
      properties: { id: String(area._id || ''), name: String(area.name || 'Area'), kind: area.kind === 'safe' ? 'safe' : 'affected', sev: String(area.severity || 'medium'), hazard: String(area.hazardType || ''), notes: String(area.notes || '') },
    });
  }
  return collection(features);
}

// Relocation sites that are open or restricted (a blocked site is not a safe place to send people).
export function sitesToGeoJson(sites) {
  const features = [];
  for (const site of Array.isArray(sites) ? sites : []) {
    const [lng, lat] = site?.location?.coordinates || [];
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || site.roadAccess === 'BLOCKED') continue;
    const free = Number.isFinite(site.totalCapacity) ? Math.max(0, site.totalCapacity - (site.occupancy || 0) - (site.reservedCapacity || 0)) : null;
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: { name: String(site.name || 'Relocation site'), access: String(site.roadAccess || 'UNKNOWN'), free: free === null ? -1 : free, total: Number(site.totalCapacity) || 0 },
    });
  }
  return collection(features);
}

// The outline being drawn: points so far, plus a line (2 points) or a polygon (3 or more).
export function draftToGeoJson(points) {
  const list = Array.isArray(points) ? points : [];
  const features = list.map((point) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: point }, properties: {} }));
  if (list.length >= 3) features.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[...list, list[0]]] }, properties: {} });
  else if (list.length === 2) features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: list }, properties: {} });
  return collection(features);
}
