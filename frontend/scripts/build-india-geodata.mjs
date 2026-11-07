// Generates the India state registry, simplified state polygons and verified river points used by the
// Command Center. Run once (or to refresh):  node scripts/build-india-geodata.mjs
//
// Sources (all free, no key):
//   * Natural Earth 1:50m admin-1 states/provinces and 1:10m populated places (public domain)
//   * Open-Meteo flood API (GloFAS) to confirm that each candidate river point lands on a real river channel
//
// The polygons are used only to decide which state a coordinate belongs to. They are never drawn on the map.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../src/data/gis');
const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/';
const SIMPLIFY_DEGREES = 0.02;
const MIN_ISLAND_AREA = 0.00002;
const COAST_SNAP_DEGREES = 0.25;
const MIN_RIVER_PEAK = 10;
const round = (value) => Math.round(value * 1000) / 1000;

async function getJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`);
  return response.json();
}

// Douglas-Peucker on an open polyline, iterative so very long rings cannot overflow the stack.
function simplifyLine(points, tolerance) {
  if (points.length <= 2) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop();
    let maxDistance = 0;
    let index = -1;
    const [x1, y1] = points[start];
    const [x2, y2] = points[end];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;
    for (let i = start + 1; i < end; i += 1) {
      const [x, y] = points[i];
      let distance;
      if (lengthSquared === 0) {
        distance = Math.hypot(x - x1, y - y1);
      } else {
        const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSquared));
        distance = Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
      }
      if (distance > maxDistance) {
        maxDistance = distance;
        index = i;
      }
    }
    if (maxDistance > tolerance && index !== -1) {
      keep[index] = 1;
      stack.push([start, index], [index, end]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function simplifyRing(ring, tolerance) {
  const open = ring.slice(0, -1);
  const simplified = simplifyLine(open, tolerance);
  if (simplified.length < 3) return null;
  return [...simplified, simplified[0]].map(([lng, lat]) => [round(lng), round(lat)]);
}

function ringArea(ring) {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return Math.abs(area) / 2;
}

function ringBounds(ring) {
  let south = 90;
  let north = -90;
  let west = 180;
  let east = -180;
  for (const [lng, lat] of ring) {
    south = Math.min(south, lat);
    north = Math.max(north, lat);
    west = Math.min(west, lng);
    east = Math.max(east, lng);
  }
  return { south, north, west, east };
}

function inRing(lat, lng, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inPolygons(lat, lng, polygons) {
  return polygons.some(([outer, ...holes]) => inRing(lat, lng, outer) && !holes.some((hole) => inRing(lat, lng, hole)));
}

function toPolygons(geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const result = [];
  for (const rings of polygons) {
    const outer = simplifyRing(rings[0], SIMPLIFY_DEGREES);
    if (!outer || ringArea(outer) < MIN_ISLAND_AREA) continue;
    const holes = rings.slice(1).map((hole) => simplifyRing(hole, SIMPLIFY_DEGREES)).filter((hole) => hole && ringArea(hole) > 0.002);
    result.push([outer, ...holes]);
  }
  return result;
}

// Closest polygon vertex to a point, so coastal towns that the coarse shapes just miss still get a state.
function nearestCode(lat, lng, entries, limit) {
  let best = null;
  let bestDistance = limit;
  for (const entry of entries) {
    for (const [outer] of entry.polygons) {
      for (const [x, y] of outer) {
        const distance = Math.hypot(x - lng, y - lat);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = entry.code;
        }
      }
    }
  }
  return best;
}

// Natural Earth mislabels some entries (it calls Himachal Pradesh a union territory), so the eight union
// territories are listed by code instead of trusting its type field.
const UNION_TERRITORIES = new Set(['IN-AN', 'IN-CH', 'IN-DH', 'IN-DL', 'IN-JK', 'IN-LA', 'IN-LD', 'IN-PY']);

// The 1:50m shapes drop or blur a few coastal and island areas, so these are set by hand (public geography).
const BOUNDS_OVERRIDE = { 'IN-LD': [[8.0, 71.5], [12.6, 74.0]] };
const CAPITAL_OVERRIDE = {
  'IN-LD': { name: 'Kavaratti', lat: 10.5626, lng: 72.6369 },
  'IN-GA': { name: 'Panaji', lat: 15.4909, lng: 73.8278 },
};

async function buildStates() {
  console.log('Downloading Natural Earth admin-1 (1:50m)...');
  const admin1 = await getJson(`${NE}ne_50m_admin_1_states_provinces.geojson`);
  const india = admin1.features.filter((f) => f.properties.iso_a2 === 'IN' || f.properties.adm0_a3 === 'IND');
  console.log(`  ${india.length} Indian states and union territories`);

  console.log('Downloading Natural Earth populated places (1:10m)...');
  const places = await getJson(`${NE}ne_10m_populated_places_simple.geojson`);
  const indianPlaces = places.features
    .filter((f) => f.properties.adm0name === 'India' || f.properties.iso_a2 === 'IN')
    .map((f) => ({
      name: f.properties.nameascii || f.properties.name,
      lat: f.properties.latitude,
      lng: f.properties.longitude,
      pop: f.properties.pop_max || 0,
      capital: /capital/i.test(f.properties.featurecla || ''),
    }));
  console.log(`  ${indianPlaces.length} Indian places`);

  const prepared = india
    .map((feature) => ({ feature, code: feature.properties.iso_3166_2, polygons: toPolygons(feature.geometry) }))
    .filter((entry) => entry.polygons.length);

  // Every place belongs to the state whose shape contains it, or the nearest one within ~25 km.
  const placeState = new Map();
  for (const place of indianPlaces) {
    const hit = prepared.find((entry) => inPolygons(place.lat, place.lng, entry.polygons));
    const code = hit ? hit.code : nearestCode(place.lat, place.lng, prepared, COAST_SNAP_DEGREES);
    if (code) placeState.set(place, code);
  }

  const registry = [];
  const polygonsByCode = {};
  for (const { feature, code, polygons } of prepared) {
    const props = feature.properties;
    const b = ringBounds(polygons.flatMap(([outer]) => outer));
    const inside = indianPlaces.filter((place) => placeState.get(place) === code);
    inside.sort((a, c) => Number(c.capital) - Number(a.capital) || c.pop - a.pop);
    const capital = CAPITAL_OVERRIDE[code] || inside.find((place) => place.capital) || inside[0] || null;
    const cities = [];
    if (capital) cities.push(capital);
    for (const place of [...inside].sort((a, c) => c.pop - a.pop)) {
      if (cities.length >= 6) break;
      if (!cities.some((city) => city.name === place.name)) cities.push(place);
    }
    const largest = polygons.reduce((best, polygon) => (ringArea(polygon[0]) > ringArea(best[0]) ? polygon : best));
    const lb = ringBounds(largest[0]);
    let center = capital ? [capital.lat, capital.lng] : [(lb.south + lb.north) / 2, (lb.west + lb.east) / 2];
    if (!inPolygons(center[0], center[1], polygons)) center = [(lb.south + lb.north) / 2, (lb.west + lb.east) / 2];
    registry.push({
      code,
      name: props.name === 'Andaman and Nicobar' ? 'Andaman and Nicobar Islands' : props.name,
      kind: UNION_TERRITORIES.has(code) ? 'ut' : 'state',
      bounds: BOUNDS_OVERRIDE[code] || [[round(b.south), round(b.west)], [round(b.north), round(b.east)]],
      center: [round(center[0]), round(center[1])],
      capital: capital ? { name: capital.name, lat: round(capital.lat), lng: round(capital.lng) } : null,
      cities: cities.map((city) => ({ name: city.name, lat: round(city.lat), lng: round(city.lng) })),
    });
    polygonsByCode[code] = polygons;
  }
  registry.sort((a, b) => a.name.localeCompare(b.name));
  return { registry, polygonsByCode, prepared };
}

// Candidate points along major rivers. Each is kept only if the flood model returns a real flow there,
// because the model snaps to the nearest river cell and many coordinates miss the main channel.
const RIVER_CANDIDATES = [
  ['Yamuna', 'Delhi', 28.6139, 77.209], ['Yamuna', 'Agra', 27.2, 78.02], ['Yamuna', 'Mathura', 27.5, 77.69],
  ['Ganga', 'Haridwar', 29.93, 78.18], ['Ganga', 'Kanpur', 26.45, 80.4], ['Ganga', 'Prayagraj', 25.42, 81.9],
  ['Ganga', 'Varanasi', 25.31, 83.04], ['Ganga', 'Patna', 25.62, 85.2], ['Ganga', 'Bhagalpur', 25.25, 87.0], ['Ganga', 'Farakka', 24.82, 87.92],
  ['Brahmaputra', 'Tezpur', 26.63, 92.8], ['Brahmaputra', 'Guwahati', 26.15, 91.7], ['Brahmaputra', 'Dibrugarh', 27.48, 94.9],
  ['Godavari', 'Nashik', 19.99, 73.79], ['Godavari', 'Nanded', 19.15, 77.32], ['Godavari', 'Bhadrachalam', 17.67, 80.89], ['Godavari', 'Rajahmundry', 16.95, 81.75],
  ['Krishna', 'Sangli', 16.85, 74.57], ['Krishna', 'Raichur', 16.2, 77.35], ['Krishna', 'Vijayawada', 16.52, 80.62],
  ['Cauvery', 'Mysuru', 12.42, 76.57], ['Cauvery', 'Mettur', 11.8, 77.8], ['Cauvery', 'Tiruchirappalli', 10.83, 78.69],
  ['Mahanadi', 'Sambalpur', 21.47, 83.97], ['Mahanadi', 'Cuttack', 20.47, 85.88],
  ['Narmada', 'Hoshangabad', 22.75, 77.72], ['Narmada', 'Bharuch', 21.72, 73.0], ['Tapti', 'Surat', 21.2, 72.83],
  ['Chambal', 'Kota', 25.18, 75.83], ['Son', 'Dehri', 24.9, 84.2], ['Gandak', 'Valmikinagar', 27.4, 84.0], ['Ghaghara', 'Ayodhya', 26.8, 82.2],
  ['Kosi', 'Kosi Barrage', 26.53, 86.93], ['Teesta', 'Jalpaiguri', 26.55, 88.72], ['Teesta', 'Rangpo', 27.18, 88.53],
  ['Sutlej', 'Ropar', 30.97, 76.52], ['Beas', 'Pong', 31.97, 75.95], ['Chenab', 'Akhnoor', 32.9, 74.74], ['Jhelum', 'Srinagar', 34.08, 74.8], ['Indus', 'Leh', 34.16, 77.58],
  ['Tungabhadra', 'Hospet', 15.27, 76.4], ['Sabarmati', 'Ahmedabad', 23.03, 72.58], ['Mahi', 'Vadodara', 22.5, 73.1],
  ['Barak', 'Silchar', 24.82, 92.8], ['Subarnarekha', 'Jamshedpur', 22.8, 86.2],
];

async function buildRivers(prepared) {
  console.log('Checking river candidates against the flood model...');
  const lat = RIVER_CANDIDATES.map((c) => c[2]).join(',');
  const lng = RIVER_CANDIDATES.map((c) => c[3]).join(',');
  const payload = await getJson(`https://flood-api.open-meteo.com/v1/flood?latitude=${lat}&longitude=${lng}&daily=river_discharge&past_days=14&forecast_days=7`);
  const rows = Array.isArray(payload) ? payload : [payload];
  const kept = [];
  rows.forEach((row, index) => {
    const [river, place, plat, plng] = RIVER_CANDIDATES[index];
    const values = (row.daily?.river_discharge || []).filter((v) => typeof v === 'number');
    const peak = values.length ? Math.max(...values) : 0;
    const hit = prepared.find((entry) => inPolygons(plat, plng, entry.polygons));
    const code = hit ? hit.code : nearestCode(plat, plng, prepared, 1);
    const ok = peak >= MIN_RIVER_PEAK;
    console.log(`  ${ok ? 'keep' : 'drop'}  ${river.padEnd(12)} ${place.padEnd(16)} peak ${String(Math.round(peak)).padStart(6)} m3/s  ${code || '(outside)'}`);
    if (ok) {
      kept.push({
        id: `${river}-${place}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        river,
        place,
        lat: plat,
        lng: plng,
        stateCode: code,
      });
    }
  });
  return kept;
}

const { registry, polygonsByCode, prepared } = await buildStates();
const rivers = await buildRivers(prepared);

await mkdir(outDir, { recursive: true });
const registryJson = JSON.stringify(registry);
const polygonJson = JSON.stringify(polygonsByCode);
const banner = '// Generated by scripts/build-india-geodata.mjs. Do not edit by hand.\n';
await writeFile(resolve(outDir, 'indiaStates.js'), `${banner}export default ${registryJson};\n`);
await writeFile(resolve(outDir, 'indiaStatePolygons.js'), `${banner}export default ${polygonJson};\n`);
await writeFile(resolve(outDir, 'indiaRiverPoints.js'), `${banner}export default ${JSON.stringify(rivers)};\n`);
console.log(`\nWrote ${registry.length} states (${(registryJson.length / 1024).toFixed(1)} KB), polygons (${(polygonJson.length / 1024).toFixed(1)} KB), ${rivers.length} river points.`);
