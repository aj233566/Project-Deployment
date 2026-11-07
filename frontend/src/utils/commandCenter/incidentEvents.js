// Works out which incidents just appeared or changed, so the maps can play the arrival animation for them.
// Only what happens while the page is open counts: a new incident (a citizen report or one made by an authority) or a changed
// one (severity or status). The incidents already there when the page opens are remembered, not animated.

import { incidentCoords, incidentTypeLabel, normalizeSeverity } from './incidentStats.js';

export const EVENT_GAP_MS = 120;

const idOf = (incident) => String(incident?._id || incident?.id || '');
const signatureOf = (incident) => `${normalizeSeverity(incident?.severity)}|${String(incident?.status || '').toLowerCase()}`;
const isResolved = (incident) => String(incident?.status || '').toLowerCase() === 'resolved';

// previous: Map of id -> signature from the last call, or null on the first call (which only records what is there).
export function diffIncidentEvents(previous, incidents) {
  const list = (Array.isArray(incidents) ? incidents : []).filter((incident) => idOf(incident) && incidentCoords(incident) && !isResolved(incident));
  const next = new Map(list.map((incident) => [idOf(incident), signatureOf(incident)]));
  if (previous === null) return { events: [], next };
  const events = [];
  for (const incident of list) {
    const before = previous.get(idOf(incident));
    if (before === undefined) events.push({ kind: 'new', incident });
    else if (before !== next.get(idOf(incident))) events.push({ kind: 'updated', incident });
  }
  return { events, next };
}

// Text for the callout chip: what happened, where, how serious, and whether it is new or changed.
export function calloutFor(event) {
  const { incident, kind } = event;
  const place = incident?.location?.address || incident?.location?.name || (() => {
    const c = incidentCoords(incident);
    return c ? `${c.lat.toFixed(3)}, ${c.lng.toFixed(3)}` : 'Location not recorded';
  })();
  return {
    tag: kind === 'updated' ? 'UPDATED' : 'NEW',
    title: incidentTypeLabel(incident).toUpperCase(),
    place: String(place).slice(0, 80),
    severity: normalizeSeverity(incident?.severity),
  };
}

// A curved line of [lng, lat] points from one place to another (a quadratic curve bowed to one side), like the dotted arcs in the
// reference video. The bow is a fifth of the distance, so a short hop barely curves and a long one arcs clearly.
export function arcBetween(from, to, steps = 32) {
  const [x0, y0] = from;
  const [x1, y1] = to;
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const cx = mx - (y1 - y0) * 0.2;
  const cy = my + (x1 - x0) * 0.2;
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const u = 1 - t;
    points.push([u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1]);
  }
  return points;
}

// A drawn area (affected area or safe zone) as an incident-shaped record at the middle of its outline, so the same arrival
// animation can play when one is added or changed. An area's severity and status are what make it count as changed.
export function areaCentroid(area) {
  const ring = area?.geometry?.coordinates?.[0];
  if (!Array.isArray(ring) || ring.length === 0) return null;
  const points = ring.filter((pair) => Number.isFinite(pair?.[0]) && Number.isFinite(pair?.[1]));
  if (points.length === 0) return null;
  const sum = points.reduce((total, [lng, lat]) => [total[0] + lng, total[1] + lat], [0, 0]);
  return { lat: sum[1] / points.length, lng: sum[0] / points.length };
}

export function areasToArrivalIncidents(areas) {
  return (Array.isArray(areas) ? areas : []).flatMap((area) => {
    const center = areaCentroid(area);
    if (!center || !area?._id) return [];
    const safe = area.kind === 'safe';
    return [{
      _id: `area-${area._id}`,
      type: safe ? 'safe zone' : 'affected area',
      severity: safe ? 'low' : area.severity,
      status: area.status || 'active',
      location: { latitude: center.lat, longitude: center.lng, address: area.name },
    }];
  });
}
