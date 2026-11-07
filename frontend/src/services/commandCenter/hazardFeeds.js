// Free hazard feeds: GDACS (UN/EC global disaster alerts) and USGS earthquakes. Both are keyless
// and allow browser requests. Events are filtered to the India region and sorted most urgent first.

const GDACS_URL = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH';
const USGS_URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query';
const TIMEOUT_MS = 30000;

// North Indian Ocean + subcontinent: where a cyclone or flood is relevant to India.
const GDACS_REGION = { south: 0, north: 40, west: 40, east: 100 };
const USGS_REGION = { south: 5, north: 38, west: 66, east: 100 };

const EVENT_LABELS = { TC: 'Tropical cyclone', FL: 'Flood', WF: 'Wildfire', EQ: 'Earthquake', DR: 'Drought', TS: 'Tsunami' };
// Floods are listed worldwide, so keep only those in India and its neighbours.
const FLOOD_COUNTRIES = /india|nepal|bangladesh|pakistan|bhutan|sri lanka/i;
const LEVEL_RANK = { red: 3, orange: 2, green: 1 };

async function getJson(url, { fetchImpl = globalThis.fetch, signal } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`${new URL(url).hostname} returned HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

const dateOnly = (date) => date.toISOString().slice(0, 10);

function insideRegion(lat, lng, region) {
  return lat >= region.south && lat <= region.north && lng >= region.west && lng <= region.east;
}

export function parseGdacsEvents(payload, now = Date.now()) {
  const events = [];
  for (const feature of payload?.features || []) {
    const props = feature?.properties || {};
    const [lng, lat] = feature?.geometry?.coordinates || [];
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const country = String(props.country || '');
    // Cyclones are kept when they sit over the North Indian Ocean / subcontinent; other events need a country match.
    // Tsunamis are kept when they sit over the Indian Ocean region (they often have no country); floods and droughts need a country match.
    const inRegion = props.eventtype === 'TC' || props.eventtype === 'TS'
      ? insideRegion(lat, lng, GDACS_REGION) || /india/i.test(country)
      : FLOOD_COUNTRIES.test(country);
    if (!inRegion) continue;
    const level = String(props.alertlevel || 'Green').toLowerCase();
    const to = props.todate ? new Date(props.todate).getTime() : null;
    const current = String(props.iscurrent) === 'true';
    // Hide finished events unless they ended in the last 3 days.
    if (!current && (!Number.isFinite(to) || to < now - 3 * 24 * 3600e3)) continue;
    events.push({
      id: `${props.eventtype}-${props.eventid}`,
      type: props.eventtype,
      typeLabel: EVENT_LABELS[props.eventtype] || props.eventtype,
      name: String(props.name || props.eventname || EVENT_LABELS[props.eventtype] || 'Event').replace(/^Tropical Cyclone /i, 'Cyclone '),
      level: LEVEL_RANK[level] ? level : 'green',
      country: country || null,
      from: props.fromdate || null,
      to: props.todate || null,
      current,
      lat,
      lng,
      url: props.url?.report || null,
      severity: props.severitydata?.severitytext || null,
    });
  }
  events.sort((a, b) => Number(b.current) - Number(a.current)
    || LEVEL_RANK[b.level] - LEVEL_RANK[a.level]
    || String(b.from).localeCompare(String(a.from)));
  return events;
}

export async function fetchGdacsEvents(options, now = new Date()) {
  const from = dateOnly(new Date(now.getTime() - 30 * 24 * 3600e3));
  // One request per event type: GDACS caps a response at 100 events and wildfires would crowd out the rest.
  const request = (type) => getJson(
    `${GDACS_URL}?eventlist=${type}&fromdate=${from}&todate=${dateOnly(now)}&alertlevel=Green;Orange;Red`,
    options,
  );
  // A type that fails (or is empty) must not hide the others, so each request is allowed to fail on its own, but not all of them.
  const results = await Promise.allSettled([request('TC'), request('FL'), request('TS'), request('DR')]);
  if (results.every((result) => result.status === 'rejected')) throw results[0].reason;
  const features = results.flatMap((result) => (result.status === 'fulfilled' ? result.value?.features || [] : []));
  return parseGdacsEvents({ features }, now.getTime());
}

export function parseUsgsQuakes(payload) {
  const quakes = [];
  for (const feature of payload?.features || []) {
    const [lng, lat, depthKm] = feature?.geometry?.coordinates || [];
    const props = feature?.properties || {};
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(props.mag)) continue;
    quakes.push({
      id: feature.id,
      mag: props.mag,
      place: props.place || 'Location not given',
      time: Number.isFinite(props.time) ? new Date(props.time).toISOString() : null,
      depthKm: Number.isFinite(depthKm) ? depthKm : null,
      // USGS sets this when an agency has issued a tsunami message for the quake.
      tsunami: props.tsunami === 1,
      lat,
      lng,
      url: props.url || null,
    });
  }
  quakes.sort((a, b) => String(b.time).localeCompare(String(a.time)));
  return quakes;
}

export async function fetchRegionQuakes(options, now = new Date()) {
  const start = dateOnly(new Date(now.getTime() - 7 * 24 * 3600e3));
  const url = `${USGS_URL}?format=geojson&starttime=${start}&minmagnitude=2.5`
    + `&minlatitude=${USGS_REGION.south}&maxlatitude=${USGS_REGION.north}`
    + `&minlongitude=${USGS_REGION.west}&maxlongitude=${USGS_REGION.east}&orderby=time`;
  return parseUsgsQuakes(await getJson(url, options));
}
