// Pure helpers that turn SENTRY incident / habitation records into command-center figures.
// Nothing here invents data: every number is counted or measured from the records passed in.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const SEVERITY_ALIASES = {
  critical: 'critical',
  severe: 'critical',
  high: 'high',
  moderate: 'medium',
  medium: 'medium',
  warning: 'medium',
  low: 'low',
  minor: 'low',
  operational: 'low',
};

export const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'];

const asArray = (value) => (Array.isArray(value) ? value : []);

function cleanText(value) {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  if (!text || /^(null|undefined)$/i.test(text)) return '';
  return text;
}

export function humanize(value) {
  const text = cleanText(value).replace(/[_-]+/g, ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

export function normalizeSeverity(raw) {
  const key = String(raw ?? '').trim().toLowerCase();
  return SEVERITY_ALIASES[key] || 'unknown';
}

function emptyCounts() {
  return { critical: 0, high: 0, medium: 0, low: 0, unknown: 0, total: 0 };
}

export function countBySeverity(incidents) {
  const counts = emptyCounts();
  for (const incident of asArray(incidents)) {
    counts[normalizeSeverity(incident?.severity)] += 1;
    counts.total += 1;
  }
  return counts;
}

export function incidentTimeMs(incident) {
  const stamp = new Date(incident?.createdAt || incident?.reportedAt || 0).getTime();
  return Number.isFinite(stamp) && stamp > 0 ? stamp : null;
}

// Counts the incidents reported inside the last `windowMs`, by severity.
export function countRecent(incidents, windowMs, now = Date.now()) {
  const counts = emptyCounts();
  for (const incident of asArray(incidents)) {
    const stamp = incidentTimeMs(incident);
    if (stamp === null || stamp > now || stamp < now - windowMs) continue;
    counts[normalizeSeverity(incident?.severity)] += 1;
    counts.total += 1;
  }
  return counts;
}

export function incidentCoords(incident) {
  const location = incident?.location;
  const lat = location?.latitude ?? location?.lat;
  const lng = location?.longitude ?? location?.lng;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

const TYPE_LABELS = {
  landslide: 'Landslide',
  road_blockage: 'Road blockage',
  slope_crack: 'Slope crack',
  slope_movement: 'Slope movement',
  flood: 'Flood',
  flash_flood: 'Flash flood',
  waterlogging: 'Waterlogging',
  fire: 'Fire',
  wildfire: 'Wildfire',
  earthquake: 'Earthquake',
  cyclone: 'Cyclone',
  chemical: 'Chemical leak',
};

export function incidentTypeLabel(incident) {
  const type = cleanText(incident?.type);
  if (!type) return 'Type not recorded';
  return TYPE_LABELS[type.toLowerCase()] || humanize(type);
}

export function incidentSubtypeLabel(incident) {
  return humanize(incident?.hazardSubtype) || null;
}

export const FILTER_GROUPS = [
  { key: 'landslide', label: 'Landslide / slope', types: ['landslide', 'slope_crack', 'slope_movement', 'rockfall', 'subsidence'] },
  { key: 'road', label: 'Road', types: ['road_blockage', 'road_damage', 'bridge_damage'] },
  { key: 'flood', label: 'Flood', types: ['flood', 'flash_flood', 'waterlogging'] },
  { key: 'fire', label: 'Fire', types: ['fire', 'wildfire'] },
  { key: 'quake', label: 'Earthquake', types: ['earthquake'] },
];

export function incidentGroup(incident) {
  const type = cleanText(incident?.type).toLowerCase();
  const group = FILTER_GROUPS.find((entry) => entry.types.includes(type));
  return group ? group.key : 'other';
}

// Chips for the map toolbar: only groups that actually have incidents, with counts.
export function buildFilterChips(incidents) {
  const counts = new Map();
  for (const incident of asArray(incidents)) {
    const key = incidentGroup(incident);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const chips = FILTER_GROUPS
    .filter((group) => counts.has(group.key))
    .map((group) => ({ key: group.key, label: group.label, count: counts.get(group.key) }));
  if (counts.has('other')) chips.push({ key: 'other', label: 'Other', count: counts.get('other') });
  return chips;
}

const STATUS_LABELS = {
  submitted: 'Reported',
  pending: 'Reported',
  verified: 'Verified',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export function incidentStatusLabel(incident) {
  const status = cleanText(incident?.status).toLowerCase();
  if (!status) return 'Status not recorded';
  return STATUS_LABELS[status] || humanize(status);
}

export function shortIncidentId(incident) {
  const id = String(incident?._id || incident?.id || '');
  return id ? `#${id.slice(-4).toUpperCase()}` : '#----';
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Registered places (habitations, relocation sites) as { name, lat, lng } points.
export function placesFromRecords({ habitations, relocationSites } = {}) {
  const places = [];
  for (const record of asArray(habitations)) {
    const [lng, lat] = record?.location?.coordinates || [];
    if (Number.isFinite(lat) && Number.isFinite(lng) && cleanText(record?.name)) {
      places.push({ name: record.name.trim(), lat, lng });
    }
  }
  for (const record of asArray(relocationSites)) {
    const [lng, lat] = record?.location?.coordinates || [];
    if (Number.isFinite(lat) && Number.isFinite(lng) && cleanText(record?.name)) {
      places.push({ name: record.name.trim(), lat, lng });
    }
  }
  return places;
}

export function nearestPlace(coords, places) {
  if (!coords) return null;
  let best = null;
  for (const place of asArray(places)) {
    const km = haversineKm(coords.lat, coords.lng, place.lat, place.lng);
    if (!best || km < best.km) best = { name: place.name, km };
  }
  return best;
}

export function formatCoords(coords) {
  if (!coords) return 'Location not recorded';
  const lat = `${Math.abs(coords.lat).toFixed(2)}°${coords.lat >= 0 ? 'N' : 'S'}`;
  const lng = `${Math.abs(coords.lng).toFixed(2)}°${coords.lng >= 0 ? 'E' : 'W'}`;
  return `${lat} ${lng}`;
}

// Address when one was recorded; otherwise the nearest registered place (if close), else coordinates.
export function incidentLocationLabel(incident, places, maxKm = 40) {
  const address = cleanText(incident?.location?.address);
  if (address) return address;
  const coords = incidentCoords(incident);
  const near = nearestPlace(coords, places);
  if (near && near.km <= maxKm) return `Near ${near.name} · ${near.km.toFixed(1)} km`;
  return formatCoords(coords);
}

const TREND_WINDOWS = {
  '24h': { buckets: 24, bucketMs: HOUR_MS },
  '7d': { buckets: 7, bucketMs: DAY_MS },
  '30d': { buckets: 30, bucketMs: DAY_MS },
};

export const TREND_WINDOW_KEYS = Object.keys(TREND_WINDOWS);

// Buckets incidents by report time. Day buckets align to IST midnight.
export function buildIncidentTrend(incidents, windowKey = '7d', now = Date.now()) {
  const config = TREND_WINDOWS[windowKey] || TREND_WINDOWS['7d'];
  const { buckets: bucketCount, bucketMs } = config;
  const end = Math.ceil((now + IST_OFFSET_MS) / bucketMs) * bucketMs - IST_OFFSET_MS;
  const start = end - bucketCount * bucketMs;
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    start: start + index * bucketMs,
    end: start + (index + 1) * bucketMs,
    ...emptyCounts(),
  }));
  const totals = emptyCounts();
  for (const incident of asArray(incidents)) {
    const stamp = incidentTimeMs(incident);
    if (stamp === null || stamp < start || stamp >= end) continue;
    const bucket = buckets[Math.min(bucketCount - 1, Math.floor((stamp - start) / bucketMs))];
    const severity = normalizeSeverity(incident?.severity);
    bucket[severity] += 1;
    bucket.total += 1;
    totals[severity] += 1;
    totals.total += 1;
  }
  const max = buckets.reduce((highest, bucket) => Math.max(highest, bucket.total), 0);
  return { buckets, totals, max, windowKey, bucketMs };
}

// Population living in habitations by assessed zone level (RED / ORANGE / YELLOW / GREEN).
export function summarizePopulationAtRisk(habitations) {
  const levels = { RED: 0, ORANGE: 0, YELLOW: 0, GREEN: 0, UNASSESSED: 0 };
  const rows = [];
  for (const record of asArray(habitations)) {
    const population = Number(record?.population);
    if (!Number.isFinite(population) || population <= 0) continue;
    const level = String(record?.risk?.level || '').toUpperCase();
    const key = Object.hasOwn(levels, level) ? level : 'UNASSESSED';
    levels[key] += population;
    rows.push({
      id: record._id || record.name,
      name: cleanText(record.name) || 'Unnamed habitation',
      district: cleanText(record.district),
      population,
      level: key,
      score: Number.isFinite(record?.risk?.score) ? record.risk.score : null,
    });
  }
  const atRisk = levels.RED + levels.ORANGE;
  const watch = levels.YELLOW;
  rows.sort((a, b) => levelRank(b.level) - levelRank(a.level) || b.population - a.population);
  return { levels, atRisk, watch, rows, total: rows.reduce((sum, row) => sum + row.population, 0) };
}

function levelRank(level) {
  return { RED: 4, ORANGE: 3, YELLOW: 2, GREEN: 1, UNASSESSED: 0 }[level] ?? 0;
}

export function summarizeResources(resources) {
  const rows = [];
  let total = 0;
  let available = 0;
  let deployed = 0;
  for (const record of asArray(resources)) {
    const rowTotal = Number(record?.total ?? record?.totalUnits);
    if (!Number.isFinite(rowTotal) || rowTotal < 0) continue;
    const rowAvailable = Number(record?.available ?? record?.availableUnits) || 0;
    const rowDeployed = Number(record?.deployed ?? record?.deployedUnits) || 0;
    total += rowTotal;
    available += rowAvailable;
    deployed += rowDeployed;
    rows.push({
      id: record._id || record.id || record.name,
      name: cleanText(record.name) || 'Unnamed resource',
      category: cleanText(record.category),
      location: cleanText(record.location),
      total: rowTotal,
      available: rowAvailable,
      deployed: rowDeployed,
    });
  }
  return { rows, total, available, deployed };
}

export function summarizeSites(sites) {
  const rows = [];
  let open = 0;
  for (const record of asArray(sites)) {
    const capacity = record?.capacity || {};
    const total = Number(capacity.total ?? record?.totalCapacity);
    const occupied = Number(capacity.occupied ?? record?.occupancy) || 0;
    const available = Number(capacity.available);
    const roadAccess = String(record?.roadAccess || 'UNKNOWN').toUpperCase();
    const status = String(record?.status || '').toUpperCase();
    if (roadAccess === 'OPEN' && status === 'ACTIVE') open += 1;
    rows.push({
      id: record._id || record.name,
      name: cleanText(record.name) || 'Unnamed site',
      roadAccess,
      status,
      total: Number.isFinite(total) ? total : null,
      occupied,
      available: Number.isFinite(available) ? available : (Number.isFinite(total) ? Math.max(0, total - occupied) : null),
    });
  }
  return { rows, open, total: rows.length };
}
