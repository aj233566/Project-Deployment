// Free, key-less Open-Meteo feeds used by the command center: current weather, a 24 h forecast grid,
// air quality and modelled river discharge. Multi-location requests keep each panel to one call.
// Open-Meteo is free for non-commercial use and requires attribution (shown in the page footer).

import { maxNext, minNext, sumNext } from '../../utils/commandCenter/forecastAlerts.js';
import { analyseRiverSeries } from '../../utils/commandCenter/riverStatus.js';

const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';
const AIR_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const FLOOD_URL = 'https://flood-api.open-meteo.com/v1/flood';
const MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine';
const TIMEOUT_MS = 15000;
const RIVER_PAST_DAYS = 14;
const RIVER_FUTURE_DAYS = 7;

const asList = (payload) => (Array.isArray(payload) ? payload : [payload]);
const finite = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

async function getJson(url, { fetchImpl = globalThis.fetch, signal, label = 'Open-Meteo' } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

function coordinateQuery(places) {
  return `latitude=${places.map((place) => place.lat).join(',')}&longitude=${places.map((place) => place.lng).join(',')}`;
}

export function parsePointWeather(payload) {
  const current = payload?.current;
  if (!current) return null;
  return {
    time: current.time || null,
    temperature: finite(current.temperature_2m),
    apparent: finite(current.apparent_temperature),
    humidity: finite(current.relative_humidity_2m),
    precipitation: finite(current.precipitation),
    weatherCode: finite(current.weather_code),
    windSpeed: finite(current.wind_speed_10m),
    windGust: finite(current.wind_gusts_10m),
    windDirection: finite(current.wind_direction_10m),
    pressure: finite(current.pressure_msl),
    cloudCover: finite(current.cloud_cover),
    visibilityM: finite(current.visibility),
    isDay: current.is_day === 1,
  };
}

export async function fetchPointWeather(point, options) {
  const [lat, lng] = point;
  const url = `${WEATHER_URL}?latitude=${lat}&longitude=${lng}`
    + '&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,'
    + 'wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,cloud_cover,visibility,is_day'
    + '&timezone=Asia%2FKolkata';
  return parsePointWeather(await getJson(url, { ...options, label: 'Open-Meteo weather' }));
}

export function parseForecastGrid(places, payload) {
  return asList(payload).map((entry, index) => ({
    ...places[index],
    rain24h: sumNext(entry?.hourly?.precipitation, 24),
    elevation: finite(entry?.elevation),
    maxGust24h: maxNext(entry?.hourly?.wind_gusts_10m, 24),
    maxTemp24h: maxNext(entry?.hourly?.temperature_2m, 24),
    minTemp24h: minNext(entry?.hourly?.temperature_2m, 24),
    maxCape24h: maxNext(entry?.hourly?.cape, 24),
    snow24h: sumNext(entry?.hourly?.snowfall, 24),
    uvMax: finite(entry?.daily?.uv_index_max?.[0]),
    visibilityM: finite(entry?.current?.visibility),
    temperature: finite(entry?.current?.temperature_2m),
    humidity: finite(entry?.current?.relative_humidity_2m),
    windSpeed: finite(entry?.current?.wind_speed_10m),
    weatherCode: finite(entry?.current?.weather_code),
  }));
}

export async function fetchForecastGrid(places, options) {
  if (!places?.length) return [];
  const url = `${WEATHER_URL}?${coordinateQuery(places)}`
    + '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,visibility'
    + '&hourly=precipitation,wind_gusts_10m,temperature_2m,cape,snowfall&daily=uv_index_max'
    + '&forecast_hours=24&forecast_days=1&timezone=Asia%2FKolkata';
  return parseForecastGrid(places, await getJson(url, { ...options, label: 'Open-Meteo forecast' }));
}

// Sea waves for the next 24 h. Places away from the sea come back empty, which is fine: they simply have no wave figure.
export function parseMarine(places, payload) {
  return asList(payload).map((entry, index) => ({ name: places[index]?.name, maxWave24h: maxNext(entry?.hourly?.wave_height, 24) }));
}

export async function fetchMarine(places, options) {
  if (!places?.length) return [];
  const url = `${MARINE_URL}?${coordinateQuery(places)}&hourly=wave_height&forecast_hours=24&timezone=Asia%2FKolkata`;
  return parseMarine(places, await getJson(url, { ...options, label: 'Open-Meteo marine' }));
}

export function parseAirQuality(places, payload) {
  return asList(payload).map((entry, index) => ({
    name: places[index]?.name,
    aqi: finite(entry?.current?.us_aqi),
    pm25: finite(entry?.current?.pm2_5),
    pm10: finite(entry?.current?.pm10),
  }));
}

export async function fetchAirQuality(places, options) {
  if (!places?.length) return [];
  const url = `${AIR_URL}?${coordinateQuery(places)}&current=us_aqi,pm2_5,pm10&timezone=Asia%2FKolkata`;
  return parseAirQuality(places, await getJson(url, { ...options, label: 'Open-Meteo air quality' }));
}

export function parseRiverFlows(points, payload, todayIso) {
  return asList(payload).map((entry, index) => {
    const point = points[index];
    const analysis = analyseRiverSeries(entry?.daily?.time, entry?.daily?.river_discharge, todayIso);
    return {
      ...point,
      snapped: { lat: finite(entry?.latitude), lng: finite(entry?.longitude) },
      unit: entry?.daily_units?.river_discharge || 'm³/s',
      ...analysis,
    };
  });
}

export async function fetchRiverFlows(points, options, now = new Date()) {
  if (!points?.length) return [];
  const url = `${FLOOD_URL}?${coordinateQuery(points)}&daily=river_discharge`
    + `&past_days=${RIVER_PAST_DAYS}&forecast_days=${RIVER_FUTURE_DAYS}`;
  const payload = await getJson(url, { ...options, label: 'Open-Meteo flood' });
  // The flood API labels days in GMT, so "today" is the GMT calendar date.
  return parseRiverFlows(points, payload, now.toISOString().slice(0, 10));
}
