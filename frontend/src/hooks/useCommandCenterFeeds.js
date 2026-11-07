import { useCallback, useMemo } from 'react';
import { usePolledFeed } from './usePolledFeed';
import {
  fetchAirQuality,
  fetchMarine,
  fetchForecastGrid,
  fetchPointWeather,
  fetchRiverFlows,
} from '../services/commandCenter/openMeteoFeeds';
import { fetchGdacsEvents, fetchRegionQuakes } from '../services/commandCenter/hazardFeeds';
import { fetchEonetEvents } from '../services/commandCenter/eonetFeed';
import { fetchSachetAlerts } from '../services/commandCenter/sachetFeed';
import { deriveForecastAlerts } from '../utils/commandCenter/forecastAlerts';
import { mergeSachetAlerts, prepareSachetAlerts } from '../utils/commandCenter/sachetAlerts';

const MINUTE = 60 * 1000;
const NO_STATE_FEED = Object.freeze({ alerts: [], supported: false });

// The state whose NDMA feed belongs to this view: Delhi NCR uses Delhi's feed, and All India has none of its own.
function sachetStateCode(region) {
  if (region.kind === 'state') return region.stateCode;
  if (region.kind === 'region') return 'IN-DL';
  return null;
}

// Every free public feed the command center uses, each with its own loading / live / error state.
export function useCommandCenterFeeds(region) {
  const regionId = region.id;

  const weather = usePolledFeed(
    regionId,
    useCallback((signal) => fetchPointWeather(region.weatherPoint, { signal }), [region]),
    10 * MINUTE,
  );
  const forecast = usePolledFeed(
    regionId,
    useCallback((signal) => fetchForecastGrid(region.forecastPlaces, { signal }), [region]),
    15 * MINUTE,
  );
  const air = usePolledFeed(
    regionId,
    useCallback((signal) => fetchAirQuality(region.forecastPlaces, { signal }), [region]),
    30 * MINUTE,
  );
  const marine = usePolledFeed(
    regionId,
    useCallback((signal) => fetchMarine(region.forecastPlaces, { signal }), [region]),
    30 * MINUTE,
  );
  const rivers = usePolledFeed(
    regionId,
    useCallback((signal) => fetchRiverFlows(region.riverPoints, { signal }), [region]),
    60 * MINUTE,
  );
  const hazards = usePolledFeed(
    'india',
    useCallback((signal) => fetchGdacsEvents({ signal }), []),
    15 * MINUTE,
  );
  const quakes = usePolledFeed(
    'india',
    useCallback((signal) => fetchRegionQuakes({ signal }), []),
    10 * MINUTE,
  );
  const events = usePolledFeed(
    'india',
    useCallback((signal) => fetchEonetEvents({ signal }), []),
    15 * MINUTE,
  );
  const sachet = usePolledFeed(
    'india',
    useCallback(() => fetchSachetAlerts(), []),
    5 * MINUTE,
  );
  const stateCode = sachetStateCode(region);
  const stateSachet = usePolledFeed(
    stateCode || 'none',
    useCallback(() => (stateCode ? fetchSachetAlerts(stateCode) : Promise.resolve(NO_STATE_FEED)), [stateCode]),
    5 * MINUTE,
  );

  // Forecast places joined with their air-quality reading, then turned into watch levels.
  const places = useMemo(() => {
    const grid = forecast.data;
    if (!Array.isArray(grid)) return null;
    const aqiByName = new Map((air.data || []).map((entry) => [entry.name, entry]));
    const waveByName = new Map((marine.data || []).map((entry) => [entry.name, entry.maxWave24h]));
    return grid.map((place) => ({ ...place, aqi: aqiByName.get(place.name)?.aqi ?? null, pm25: aqiByName.get(place.name)?.pm25 ?? null, maxWave24h: waveByName.get(place.name) ?? null }));
  }, [forecast.data, air.data, marine.data]);

  const forecastAlerts = useMemo(() => (places ? deriveForecastAlerts(places) : null), [places]);

  // All India alerts, plus the ones for this view: the state's own NDMA feed (where NDMA publishes one) merged with
  // the All India items that name the view's districts or places.
  const regionalAlerts = useMemo(() => {
    if (!sachet.data) return null;
    const all = prepareSachetAlerts(sachet.data.alerts);
    const keywords = region.kind === 'state' ? region.placeKeywords : region.districtKeywords;
    const own = stateSachet.data?.supported ? prepareSachetAlerts(stateSachet.data.alerts) : [];
    const regional = region.kind === 'national' ? all : mergeSachetAlerts(own, prepareSachetAlerts(sachet.data.alerts, keywords));
    return {
      all,
      regional,
      stale: Boolean(sachet.data.stale),
      fetchedAt: sachet.data.fetchedAt,
      stateFeed: {
        status: stateSachet.status,
        supported: Boolean(stateSachet.data?.supported),
        stale: Boolean(stateSachet.data?.stale),
      },
    };
  }, [sachet.data, stateSachet.data, stateSachet.status, region]);

  return { weather, forecast, air, rivers, hazards, events, quakes, sachet, stateSachet, places, forecastAlerts, regionalAlerts };
}
