import { isWithinIndia } from './indiaBounds.js';
function inIndia(lat, lng) {
  return isWithinIndia(lat, lng);
}
export function filterIndiaEarthquakes(quakes) {
  if (!Array.isArray(quakes)) return [];
  return quakes.filter(
    (quake) =>
      quake &&
      typeof quake.lat === 'number' &&
      typeof quake.lng === 'number' &&
      inIndia(quake.lat, quake.lng),
  );
}
export async function fetchIndiaEarthquakes() {
  const URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';
  try {
    const res = await fetch(URL, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data || !Array.isArray(data.features)) return [];
    const quakes = data.features
      .map((f) => {
        const c = f.geometry && f.geometry.coordinates;
        if (!c || c.length < 2) return null;
        const [lng, lat, depthKm] = c;
        const p = f.properties || {};
        return {
          id: f.id,
          lat,
          lng,
          depthKm: depthKm ?? null,
          mag: typeof p.mag === 'number' ? p.mag : null,
          place: p.place || 'Unknown location',
          time: p.time ? new Date(p.time).toISOString() : null,
          url: p.url || null
        };
      });
    return filterIndiaEarthquakes(quakes);
  } catch {
    return [];
  }
}
export async function fetchHospitalsInBounds(b) {
  if (!b) return [];
  if (Math.abs(b.north - b.south) > 3 || Math.abs(b.east - b.west) > 3) return [];
  const bbox = `${b.south},${b.west},${b.north},${b.east}`;
  const query =
    `[out:json][timeout:20];` +
    `(node["amenity"~"^(hospital|clinic)$"](${bbox});` +
    `way["amenity"~"^(hospital|clinic)$"](${bbox}););` +
    `out center 120;`;
  const MIRRORS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
  ];
  // All mirrors are asked at once and the first good answer wins; a mirror that is silent for 8 s is dropped, so the caller
  // (the road-route button) never waits long for a slow one.
  const ask = async (url) => {
    const res = await fetch(url, { method: 'POST', body: query, signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`Overpass ${res.status}`);
    const ct = res.headers.get('content-type') || '';
    const text = await res.text();
    if (!ct.includes('json') && !text.trim().startsWith('{')) throw new Error('Overpass sent no JSON');
    const data = JSON.parse(text);
    return (data.elements || [])
      .map((el) => {
        const lat = el.lat ?? (el.center && el.center.lat);
        const lng = el.lon ?? (el.center && el.center.lon);
        if (typeof lat !== 'number' || typeof lng !== 'number') return null;
        const tags = el.tags || {};
        return {
          id: `${el.type}/${el.id}`,
          lat,
          lng,
          name: tags.name || (tags.amenity === 'clinic' ? 'Clinic' : 'Hospital'),
          kind: tags.amenity || 'hospital'
        };
      })
      .filter(Boolean);
  };
  try {
    return await Promise.any(MIRRORS.map(ask));
  } catch {
    return [];
  }
}
const INDIC_SCRIPT_RE = /[ऀ-෿਀-੿]/;
function isEnglishText(text) {
  if (!text) return false;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  const indic = (text.match(/[ऀ-෿਀-੿]/g) || []).length;
  return latin >= 8 && indic <= latin * 0.15;
}
export async function fetchSachetAlerts() {
  const URL = '/sachet/cap_public_website/rss/rss_india.xml';
  try {
    const res = await fetch(URL, { cache: 'no-store' });
    if (!res.ok) return [];
    const xml = await res.text();
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) return [];
    const items = Array.from(doc.querySelectorAll('item'));
    return items
      .map((it) => {
        const q = (sel) => {
          const el = it.querySelector(sel);
          return el ? el.textContent.trim() : '';
        };
        const title = q('title');
        if (!title) return null;
        if (!isEnglishText(title) || INDIC_SCRIPT_RE.test(title)) return null;
        const author = q('author');
        const agencyMatch = author.match(/\(([^)]+)\)/);
        const pub = q('pubDate');
        return {
          id: q('guid') || q('link') || title,
          title,
          agency: agencyMatch ? agencyMatch[1] : (author || 'NDMA'),
          category: q('category') || 'Alert',
          time: pub ? new Date(pub).toISOString() : null,
          link: q('link') || null
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}
