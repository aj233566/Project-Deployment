// Rule-based watch levels derived from free model data (Open-Meteo).
// These are model-derived advisories for situational awareness. They are not official warnings,
// and every alert carries the figure that triggered it so an operator can judge it.

export const LEVEL_RANK = { red: 3, orange: 2, yellow: 1 };

const KIND_PRIORITY = { rain: 10, landslide: 9, wave: 8, heat: 7, storm: 6, wind: 5, cold: 4, snow: 3, aqi: 2, visibility: 1, uv: 0 };

// IMD 24-hour rainfall classes (mm): heavy 64.5-115.5, very heavy 115.6-204.4, extremely heavy 204.5+.
export function rainfallCategory(mm24) {
  if (!Number.isFinite(mm24)) return null;
  if (mm24 >= 204.5) return { level: 'red', label: 'Extremely heavy rainfall' };
  if (mm24 >= 115.6) return { level: 'red', label: 'Very heavy rainfall' };
  if (mm24 >= 64.5) return { level: 'orange', label: 'Heavy rainfall' };
  if (mm24 >= 35) return { level: 'yellow', label: 'Significant rainfall' };
  return null;
}

// Gust thresholds follow the Beaufort scale: strong breeze/near-gale 50+, gale 62+, storm 89+ km/h.
export function windCategory(gustKmh) {
  if (!Number.isFinite(gustKmh)) return null;
  if (gustKmh >= 89) return { level: 'red', label: 'Storm-force gusts' };
  if (gustKmh >= 62) return { level: 'orange', label: 'Gale-force gusts' };
  if (gustKmh >= 50) return { level: 'yellow', label: 'Strong gusts' };
  return null;
}

// US AQI bands: unhealthy 151+, very unhealthy 201+, hazardous 301+.
export function aqiCategory(aqi) {
  if (!Number.isFinite(aqi)) return null;
  if (aqi >= 301) return { level: 'red', label: 'Hazardous air quality' };
  if (aqi >= 201) return { level: 'orange', label: 'Very unhealthy air' };
  if (aqi >= 151) return { level: 'yellow', label: 'Unhealthy air' };
  return null;
}

export function aqiBand(aqi) {
  if (!Number.isFinite(aqi)) return { label: 'Unavailable', tone: 'muted' };
  if (aqi <= 50) return { label: 'Good', tone: 'green' };
  if (aqi <= 100) return { label: 'Moderate', tone: 'yellow' };
  if (aqi <= 150) return { label: 'Unhealthy for sensitive groups', tone: 'orange' };
  if (aqi <= 200) return { label: 'Unhealthy', tone: 'red' };
  if (aqi <= 300) return { label: 'Very unhealthy', tone: 'red' };
  return { label: 'Hazardous', tone: 'red' };
}

// IMD fog classes: very dense < 50 m, dense 50-200 m, moderate 200-500 m.
export function visibilityCategory(meters) {
  if (!Number.isFinite(meters)) return null;
  if (meters < 50) return { level: 'red', label: 'Very low visibility' };
  if (meters < 200) return { level: 'orange', label: 'Low visibility' };
  if (meters < 500) return { level: 'yellow', label: 'Reduced visibility' };
  return null;
}

// Heat: IMD heat wave starts at 40 C in the plains, severe at 45 C.
export function heatCategory(maxC) {
  if (!Number.isFinite(maxC)) return null;
  if (maxC >= 45) return { level: 'red', label: 'Severe heat wave' };
  if (maxC >= 43) return { level: 'orange', label: 'Heat wave' };
  if (maxC >= 40) return { level: 'yellow', label: 'Very hot' };
  return null;
}

// Cold: IMD cold wave is a minimum of 4 C or less in the plains, severe at 2 C or less.
export function coldCategory(minC) {
  if (!Number.isFinite(minC)) return null;
  if (minC <= 2) return { level: 'red', label: 'Severe cold wave' };
  if (minC <= 4) return { level: 'orange', label: 'Cold wave' };
  if (minC <= 6) return { level: 'yellow', label: 'Very cold' };
  return null;
}

// Thunderstorm energy (CAPE, J/kg): 1500 strong, 2500 very strong, 3500 extreme. A model figure, not a lightning forecast.
export function stormCategory(cape) {
  if (!Number.isFinite(cape)) return null;
  if (cape >= 3500) return { level: 'red', label: 'Severe thunderstorm and lightning risk' };
  if (cape >= 2500) return { level: 'orange', label: 'Thunderstorm and lightning risk' };
  if (cape >= 1500) return { level: 'yellow', label: 'Thunderstorm and lightning possible' };
  return null;
}

// Snowfall over 24 h (cm).
export function snowCategory(cm) {
  if (!Number.isFinite(cm)) return null;
  if (cm >= 30) return { level: 'red', label: 'Very heavy snowfall' };
  if (cm >= 15) return { level: 'orange', label: 'Heavy snowfall' };
  if (cm >= 5) return { level: 'yellow', label: 'Snowfall' };
  return null;
}

// Sea waves (m), close to the IMD sea-state classes: rough 2.5-4, very rough 4-6, high 6 and above. Only places on the coast have a value.
export function waveCategory(meters) {
  if (!Number.isFinite(meters)) return null;
  if (meters >= 6) return { level: 'red', label: 'High waves' };
  if (meters >= 4) return { level: 'orange', label: 'Very rough seas' };
  if (meters >= 2.5) return { level: 'yellow', label: 'Rough seas' };
  return null;
}

// Landslide watch: heavy rain forecast on high ground. This is a rule of thumb from the forecast and the height of the place, not a
// slope or soil model, so it only says "watch".
export function landslideWatch(rainMm, elevationM) {
  if (!Number.isFinite(rainMm) || !Number.isFinite(elevationM)) return null;
  if (elevationM >= 500 && rainMm >= 115.6) return { level: 'red', label: 'Landslide watch: very heavy rain on hills' };
  if (elevationM >= 500 && rainMm >= 64.5) return { level: 'orange', label: 'Landslide watch: heavy rain on hills' };
  if (elevationM >= 1000 && rainMm >= 35) return { level: 'yellow', label: 'Landslide watch: rain on high hills' };
  return null;
}

// WHO UV index: 8-10 very high, 11+ extreme.
export function uvCategory(index) {
  if (!Number.isFinite(index)) return null;
  if (index >= 11) return { level: 'orange', label: 'Extreme UV' };
  if (index >= 8) return { level: 'yellow', label: 'Very high UV' };
  return null;
}

function makeAlert(kind, place, category, detail, value) {
  return {
    id: `${kind}-${place.name}`,
    kind,
    level: category.level,
    title: category.label,
    place: place.name,
    detail,
    value,
    lat: place.lat,
    lng: place.lng,
  };
}

// places: [{ name, lat, lng, rain24h, maxGust24h, maxTemp24h, minTemp24h, maxCape24h, snow24h, uvMax, aqi, visibilityM }]
export function deriveForecastAlerts(places, { limit = 10 } = {}) {
  const alerts = [];
  for (const place of Array.isArray(places) ? places : []) {
    const rain = rainfallCategory(place.rain24h);
    if (rain) alerts.push(makeAlert('rain', place, rain, `${Math.round(place.rain24h)} mm forecast in the next 24 h`, place.rain24h));
    const wind = windCategory(place.maxGust24h);
    if (wind) alerts.push(makeAlert('wind', place, wind, `Gusts up to ${Math.round(place.maxGust24h)} km/h in the next 24 h`, place.maxGust24h));
    const air = aqiCategory(place.aqi);
    if (air) alerts.push(makeAlert('aqi', place, air, `US AQI ${Math.round(place.aqi)} now`, place.aqi));
    const slide = landslideWatch(place.rain24h, place.elevation);
    if (slide) alerts.push(makeAlert('landslide', place, slide, `${Math.round(place.rain24h)} mm forecast at ${Math.round(place.elevation)} m height in the next 24 h`, place.rain24h));
    const wave = waveCategory(place.maxWave24h);
    if (wave) alerts.push(makeAlert('wave', place, wave, `Waves up to ${place.maxWave24h.toFixed(1)} m in the next 24 h`, place.maxWave24h));
    const heat = heatCategory(place.maxTemp24h);
    if (heat) alerts.push(makeAlert('heat', place, heat, `Up to ${Math.round(place.maxTemp24h)} °C in the next 24 h`, place.maxTemp24h));
    const cold = coldCategory(place.minTemp24h);
    if (cold) alerts.push(makeAlert('cold', place, cold, `Down to ${Math.round(place.minTemp24h)} °C in the next 24 h`, -place.minTemp24h));
    const storm = stormCategory(place.maxCape24h);
    if (storm) alerts.push(makeAlert('storm', place, storm, `Storm energy (CAPE) up to ${Math.round(place.maxCape24h)} J/kg in the next 24 h`, place.maxCape24h));
    const snow = snowCategory(place.snow24h);
    if (snow) alerts.push(makeAlert('snow', place, snow, `${Math.round(place.snow24h)} cm of snow in the next 24 h`, place.snow24h));
    const uv = uvCategory(place.uvMax);
    if (uv) alerts.push(makeAlert('uv', place, uv, `UV index up to ${Math.round(place.uvMax)} today`, place.uvMax));
    const sight = visibilityCategory(place.visibilityM);
    if (sight) alerts.push(makeAlert('visibility', place, sight, `Visibility ${Math.round(place.visibilityM)} m now`, place.visibilityM));
  }
  alerts.sort((a, b) => (
    LEVEL_RANK[b.level] - LEVEL_RANK[a.level]
    || KIND_PRIORITY[b.kind] - KIND_PRIORITY[a.kind]
    || b.value - a.value
    || a.place.localeCompare(b.place)
  ));
  return alerts.slice(0, limit);
}

export function minNext(values, hours = 24) {
  if (!Array.isArray(values)) return null;
  const slice = values.slice(0, hours).filter((value) => Number.isFinite(value));
  return slice.length ? Math.min(...slice) : null;
}

export function sumNext(values, hours = 24) {
  if (!Array.isArray(values)) return null;
  const slice = values.slice(0, hours).filter((value) => Number.isFinite(value));
  if (slice.length === 0) return null;
  return slice.reduce((total, value) => total + value, 0);
}

export function maxNext(values, hours = 24) {
  if (!Array.isArray(values)) return null;
  const slice = values.slice(0, hours).filter((value) => Number.isFinite(value));
  return slice.length ? Math.max(...slice) : null;
}

const finiteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const mean = (values) => (values.length ? values.reduce((total, value) => total + value, 0) / values.length : null);

// Average conditions across the monitored cities, for the all-India view where one point cannot
// stand for the country. Returns what the cities actually report and how many contributed.
export function summarizeCities(places) {
  const list = Array.isArray(places) ? places : [];
  const temps = list.map((place) => place.temperature).filter(finiteNumber);
  const wettest = list
    .filter((place) => finiteNumber(place.rain24h))
    .reduce((best, place) => (!best || place.rain24h > best.rain24h ? place : best), null);
  const hottest = list
    .filter((place) => finiteNumber(place.temperature))
    .reduce((best, place) => (!best || place.temperature > best.temperature ? place : best), null);
  return {
    count: list.length,
    temperature: mean(temps),
    humidity: mean(list.map((place) => place.humidity).filter(finiteNumber)),
    windSpeed: mean(list.map((place) => place.windSpeed).filter(finiteNumber)),
    wettest: wettest && wettest.rain24h >= 1 ? { name: wettest.name, rain24h: wettest.rain24h } : null,
    hottest: hottest ? { name: hottest.name, temperature: hottest.temperature } : null,
  };
}
