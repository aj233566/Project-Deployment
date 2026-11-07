// NASA EONET: open natural events of every kind (storms and cyclones, wildfires, volcanoes, floods, landslides, drought, dust and haze,
// snow, temperature extremes) around India. Keyless and open to browser requests. Used next to GDACS (cyclones and floods) and USGS
// (earthquakes) so the command center shows the other kinds of natural event too.

const EONET_URL = 'https://eonet.gsfc.nasa.gov/api/v3/events';
const TIMEOUT_MS = 30000;
// minLon, maxLat, maxLon, minLat: India and the seas and neighbours around it.
const BBOX = '60,38,100,5';

// Categories we show, with the plain label used on screen. Anything else (human-made events, water colour) is left out.
export const EONET_CATEGORIES = Object.freeze({
  severeStorms: 'Severe storm / cyclone',
  wildfires: 'Wildfire',
  volcanoes: 'Volcano',
  floods: 'Flood',
  landslides: 'Landslide',
  drought: 'Drought',
  dustHaze: 'Dust and haze',
  snow: 'Snow',
  tempExtremes: 'Temperature extreme',
});

const centre = (geometry) => {
  if (!geometry) return null;
  if (geometry.type === 'Point' && Array.isArray(geometry.coordinates)) {
    const [lng, lat] = geometry.coordinates;
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }
  if (geometry.type === 'Polygon' && Array.isArray(geometry.coordinates?.[0])) {
    const ring = geometry.coordinates[0].filter((point) => Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1]));
    if (!ring.length) return null;
    return { lat: ring.reduce((sum, point) => sum + point[1], 0) / ring.length, lng: ring.reduce((sum, point) => sum + point[0], 0) / ring.length };
  }
  return null;
};

export function parseEonetEvents(payload) {
  const events = [];
  for (const event of Array.isArray(payload?.events) ? payload.events : []) {
    const categoryId = event?.categories?.[0]?.id;
    if (!EONET_CATEGORIES[categoryId]) continue;
    const geometries = Array.isArray(event.geometry) ? event.geometry : [];
    const latest = geometries[geometries.length - 1];
    const place = centre(latest);
    if (!place) continue;
    events.push({
      id: `EONET-${event.id}`,
      type: 'EV',
      category: categoryId,
      typeLabel: EONET_CATEGORIES[categoryId],
      name: String(event.title || EONET_CATEGORIES[categoryId]).slice(0, 120),
      level: 'orange',
      country: null,
      from: geometries[0]?.date || null,
      to: null,
      updated: latest?.date || null,
      current: true,
      lat: place.lat,
      lng: place.lng,
      track: geometries.map((geometry) => (geometry.type === 'Point' && Array.isArray(geometry.coordinates) ? [geometry.coordinates[1], geometry.coordinates[0]] : null)).filter(Boolean),
      url: event.link || event.sources?.[0]?.url || null,
      severity: Number.isFinite(latest?.magnitudeValue) ? `${latest.magnitudeValue} ${latest.magnitudeUnit || ''}`.trim() : null,
    });
  }
  events.sort((a, b) => String(b.updated).localeCompare(String(a.updated)));
  return events;
}

export async function fetchEonetEvents({ fetchImpl = globalThis.fetch, signal } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  try {
    const response = await fetchImpl(`${EONET_URL}?status=open&days=30&bbox=${BBOX}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`eonet.gsfc.nasa.gov returned HTTP ${response.status}`);
    return parseEonetEvents(await response.json());
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
