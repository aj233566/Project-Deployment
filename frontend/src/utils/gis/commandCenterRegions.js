import indiaStates from '../../data/gis/indiaStates.js';
import indiaRiverPoints from '../../data/gis/indiaRiverPoints.js';

// A "region" is one view of the Command Center: all India, Delhi NCR, or a single state / union territory.
// kind: 'national' (India), 'region' (Delhi NCR) or 'state'.

const place = (name, lat, lng) => Object.freeze({ name, lat, lng });
const river = (id, riverName, placeName, lat, lng) => Object.freeze({ id, river: riverName, place: placeName, lat, lng });

const DELHI_CODE = 'IN-DL';

const REGIONS = Object.freeze({
  india: Object.freeze({
    id: 'india',
    kind: 'national',
    label: 'INDIA',
    title: 'INDIA',
    weatherLabel: 'CENTRAL INDIA POINT',
    bounds: [[5, 66], [39, 100]],
    satelliteBounds: [[4, 64], [38, 100]],
    weatherPoint: [22.9734, 78.6569],
    maxZoom: 5,
    forecastPlaces: Object.freeze([
      place('Delhi', 28.6139, 77.209),
      place('Mumbai', 19.076, 72.8777),
      place('Kolkata', 22.5726, 88.3639),
      place('Chennai', 13.0827, 80.2707),
      place('Guwahati', 26.1445, 91.7362),
      place('Bhubaneswar', 20.2961, 85.8245),
      place('Patna', 25.5941, 85.1376),
      place('Dehradun', 30.3165, 78.0322),
      place('Visakhapatnam', 17.6868, 83.2185),
      place('Vijayawada', 16.5062, 80.648),
      place('Hyderabad', 17.385, 78.4867),
      place('Thiruvananthapuram', 8.5241, 76.9366),
    ]),
    riverPoints: Object.freeze([
      river('ganga-patna', 'Ganga', 'Patna', 25.62, 85.2),
      river('brahmaputra-tezpur', 'Brahmaputra', 'Tezpur', 26.63, 92.8),
      river('ganga-varanasi', 'Ganga', 'Varanasi', 25.31, 83.04),
      river('mahanadi-cuttack', 'Mahanadi', 'Cuttack', 20.47, 85.88),
      river('narmada-bharuch', 'Narmada', 'Bharuch', 21.72, 73.0),
      river('kosi-barrage', 'Kosi', 'Kosi Barrage', 26.53, 86.93),
      river('yamuna-delhi', 'Yamuna', 'Delhi', 28.6139, 77.209),
      river('teesta-jalpaiguri', 'Teesta', 'Jalpaiguri', 26.55, 88.72),
    ]),
    districtKeywords: Object.freeze([]),
    placeKeywords: Object.freeze([]),
  }),
  ncr: Object.freeze({
    id: 'ncr',
    kind: 'region',
    label: 'DELHI NCR',
    title: 'DELHI NCR',
    weatherLabel: 'DELHI NCR POINT',
    bounds: [[27, 76.4], [29.3, 78]],
    // Wider than the map focus so the satellite panel shows the weather systems around Delhi.
    satelliteBounds: [[17, 64], [38, 94]],
    weatherPoint: [28.6139, 77.209],
    maxZoom: 10,
    forecastPlaces: Object.freeze([
      place('Delhi', 28.6139, 77.209),
      place('Gurugram', 28.4595, 77.0266),
      place('Noida', 28.5355, 77.391),
      place('Ghaziabad', 28.6692, 77.4538),
      place('Faridabad', 28.4089, 77.3178),
      place('Meerut', 28.9845, 77.7064),
      place('Sonipat', 28.9931, 77.0151),
      place('Rohtak', 28.8955, 76.6066),
    ]),
    riverPoints: Object.freeze([
      river('yamuna-delhi', 'Yamuna', 'Delhi', 28.6139, 77.209),
      river('yamuna-agra', 'Yamuna', 'Agra (downstream)', 27.2, 78.02),
    ]),
    // District names used to pick NDMA alerts that mention this region.
    districtKeywords: Object.freeze([
      'delhi', 'gurugram', 'gurgaon', 'faridabad', 'noida', 'gautam buddha nagar', 'gautam buddh nagar',
      'ghaziabad', 'meerut', 'baghpat', 'sonipat', 'rohtak', 'jhajjar', 'rewari', 'panipat', 'palwal',
      'nuh', 'mewat', 'hapur', 'bulandshahr', 'muzaffarnagar', 'shamli', 'karnal', 'jind', 'bhiwani',
      'charkhi dadri', 'mahendragarh', 'alwar',
    ]),
    placeKeywords: Object.freeze([]),
  }),
});

const statesByCode = new Map(indiaStates.map((state) => [state.code, state]));
const stateRegionCache = new Map();

function regionFromState(state) {
  const [south, west] = state.bounds[0];
  const [north, east] = state.bounds[1];
  const capital = state.capital || { name: state.name, lat: state.center[0], lng: state.center[1] };
  const cities = state.cities.length ? state.cities : [capital];
  // Satellite context: the state plus a generous margin, never tighter than about 6 degrees across.
  const padLat = Math.max((north - south) * 1.1, 3);
  const padLng = Math.max((east - west) * 1.1, 3);
  const keywords = new Set([state.name, capital.name, ...cities.map((city) => city.name)].map((name) => name.toLowerCase()));
  return Object.freeze({
    id: state.code,
    kind: 'state',
    stateCode: state.code,
    label: state.name.toUpperCase(),
    title: state.name.toUpperCase(),
    weatherLabel: `${capital.name.toUpperCase()} POINT`,
    bounds: state.bounds,
    satelliteBounds: [[state.center[0] - padLat, state.center[1] - padLng], [state.center[0] + padLat, state.center[1] + padLng]],
    weatherPoint: [capital.lat, capital.lng],
    maxZoom: 11,
    forecastPlaces: Object.freeze(cities.map((city) => place(city.name, city.lat, city.lng))),
    riverPoints: Object.freeze(
      indiaRiverPoints
        .filter((point) => point.stateCode === state.code)
        .map((point) => river(point.id, point.river, point.place, point.lat, point.lng)),
    ),
    districtKeywords: Object.freeze([]),
    placeKeywords: Object.freeze([...keywords]),
  });
}

export function getCommandCenterRegion(regionId) {
  if (REGIONS[regionId]) return REGIONS[regionId];
  if (regionId === DELHI_CODE) return REGIONS.ncr;
  const state = statesByCode.get(regionId);
  if (!state) return REGIONS.india;
  if (!stateRegionCache.has(regionId)) stateRegionCache.set(regionId, regionFromState(state));
  return stateRegionCache.get(regionId);
}

// Choices for the "select view" menu: India, Delhi NCR, then every state and union territory by name.
export function listViewOptions() {
  const options = [
    { id: 'india', label: 'India: all states', group: 'India' },
    { id: 'ncr', label: 'Delhi NCR', group: 'India' },
  ];
  for (const state of [...indiaStates].sort((a, b) => a.name.localeCompare(b.name))) {
    if (state.code === DELHI_CODE) continue;
    options.push({ id: state.code, label: state.name, group: state.kind === 'ut' ? 'Union territories' : 'States' });
  }
  return options;
}

function getCoordinates(incident) {
  const location = incident?.location;
  const latitude = location?.latitude ?? location?.lat;
  const longitude = location?.longitude ?? location?.lng;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return [latitude, longitude];
}

function inBounds(bounds, latitude, longitude) {
  const [[south, west], [north, east]] = bounds;
  return latitude >= south && latitude <= north && longitude >= west && longitude <= east;
}

// Does a coordinate belong to this view? State views use the boundary index when it is loaded and
// fall back to the state's bounding box until then.
export function regionContains(regionOrId, latitude, longitude, stateIndex = null) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  const region = typeof regionOrId === 'string' ? getCommandCenterRegion(regionOrId) : regionOrId;
  if (region.kind === 'state' && stateIndex) return stateIndex.find(latitude, longitude) === region.stateCode;
  return inBounds(region.bounds, latitude, longitude);
}

export function partitionIncidentsByRegion(incidents, regionOrId, stateIndex = null) {
  const region = typeof regionOrId === 'string' ? getCommandCenterRegion(regionOrId) : regionOrId;
  const inRegion = [];
  const unmapped = [];
  for (const incident of Array.isArray(incidents) ? incidents : []) {
    const coordinates = getCoordinates(incident);
    if (!coordinates) {
      unmapped.push(incident);
      continue;
    }
    if (regionContains(region, coordinates[0], coordinates[1], stateIndex)) inRegion.push(incident);
  }
  return { inRegion, unmapped };
}

export function summarizeIncidents(incidents) {
  const severity = { critical: 0, high: 0, warning: 0, low: 0, unknown: 0 };
  const hazardCounts = new Map();
  for (const incident of Array.isArray(incidents) ? incidents : []) {
    const level = String(incident?.severity || '').trim().toLowerCase();
    if (level === 'critical') severity.critical += 1;
    else if (level === 'high') severity.high += 1;
    else if (level === 'moderate' || level === 'medium' || level === 'warning') severity.warning += 1;
    else if (level === 'low' || level === 'operational') severity.low += 1;
    else severity.unknown += 1;

    const rawLabel = incident?.hazardSubtype || incident?.type;
    const label = typeof rawLabel === 'string' && rawLabel.trim() ? rawLabel.trim() : 'Type not recorded';
    const key = label.toLowerCase();
    const current = hazardCounts.get(key);
    hazardCounts.set(key, { label: current?.label || label, count: (current?.count || 0) + 1 });
  }
  const hazards = [...hazardCounts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return { severity, hazards };
}
