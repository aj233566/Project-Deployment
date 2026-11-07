// Pilot building layer: Overture Maps buildings and building parts for three Delhi NCR areas, drawn as extruded polygons.
// Heights are labelled by how they are known, and the map colours them differently so estimates are never mistaken for records.
//   recorded   the source has a height in metres
//   estimated  the source has only a floor count; height = floors x FLOOR_HEIGHT_M (an assumption, shown as such)
//   default    neither; drawn at DEFAULT_HEIGHT_M so the footprint is visible, not claimed as a height

export const FLOOR_HEIGHT_M = 3.3;
export const DEFAULT_HEIGHT_M = 5;
const PILOT_RADIUS_KM = 2.4;

// Which source draws each pilot area by default. Set from the measurements in the README (footprints and recorded heights per source).
export const PILOT_SOURCE = Object.freeze({ 'connaught-place': 'osm', loni: 'overture', gurugram: 'overture' });

export const PILOTS = Object.freeze([
  { key: 'connaught-place', name: 'Connaught Place, Delhi', center: [77.2167, 28.6315] },
  { key: 'loni', name: 'Loni, Ghaziabad', center: [77.2884, 28.7515] },
  { key: 'gurugram', name: 'Gurugram (Cyber Hub)', center: [77.089, 28.495] },
]);

function distanceKm(lngA, latA, lngB, latB) {
  const dx = (lngA - lngB) * 111.32 * Math.cos(((latA + latB) / 2) * (Math.PI / 180));
  const dy = (latA - latB) * 110.57;
  return Math.hypot(dx, dy);
}

// The pilot area a camera position is inside, or null.
export function pilotForPosition(lng, lat) {
  let best = null;
  for (const pilot of PILOTS) {
    const distance = distanceKm(lng, lat, pilot.center[0], pilot.center[1]);
    if (distance <= PILOT_RADIUS_KM && (!best || distance < best.distance)) best = { pilot, distance };
  }
  return best ? best.pilot : null;
}

// How a feature's height is known, and what to draw: { top, base, kind }.
export function heightOf(props) {
  const base = Number.isFinite(props.m) ? props.m : 0;
  if (Number.isFinite(props.h) && props.h > 0) return { top: props.h, base, kind: 'recorded' };
  if (Number.isFinite(props.f) && props.f > 0) return { top: props.f * FLOOR_HEIGHT_M, base, kind: 'estimated' };
  return { top: DEFAULT_HEIGHT_M, base, kind: 'default' };
}

const lerp = (a, b, t) => Math.round(a + (b - a) * t);
const mix = (from, to, t) => [lerp(from[0], to[0], t), lerp(from[1], to[1], t), lerp(from[2], to[2], t)];

// Steel-blue for recorded heights (paler with height), grey-blue for estimates, light grey for default footprints.
const PALETTE = {
  recorded: { low: [74, 112, 150], high: [196, 218, 238] },
  estimated: { low: [96, 112, 130], high: [160, 174, 190] },
  default: { low: [164, 173, 184], high: [164, 173, 184] },
};

export function colorFor(kind, top) {
  const range = PALETTE[kind] || PALETTE.default;
  const t = Math.min(Math.max((top - 4) / 70, 0), 1);
  return mix(range.low, range.high, t);
}

// Turns an exported pilot file into drawable descriptors. A building that has parts is not drawn itself: its parts are,
// because the parts carry the real shape (a podium with a tower, for example).
export function buildInstances(collection) {
  const instances = [];
  const counts = { recorded: 0, estimated: 0, default: 0, parts: 0, skippedWithParts: 0 };
  for (const feature of collection?.features || []) {
    const props = feature.properties || {};
    const ring = feature.geometry?.coordinates?.[0];
    if (!Array.isArray(ring) || ring.length < 4) continue;
    if (props.t === 'b' && props.p === 1) { counts.skippedWithParts += 1; continue; }
    const { top, base, kind } = heightOf(props);
    if (top <= base) continue;
    if (props.t === 'p') counts.parts += 1;
    counts[kind] += 1;
    instances.push({ ring, base, top, kind, color: colorFor(kind, top), part: props.t === 'p' });
  }
  return { instances, counts };
}
