import { useCallback } from 'react';
import indiaStates from '../data/gis/indiaStates';
import { usePolledFeed } from './usePolledFeed';
import { fetchForecastGrid } from '../services/commandCenter/openMeteoFeeds';
import { fetchIndiaPopulation } from '../services/commandCenter/populationFeed';

const MINUTE = 60 * 1000;

// Every state capital and city in the registry, once each, for the nationwide rain and wind heat on the 3D map.
const GRID_PLACES = (() => {
  const seen = new Set();
  const places = [];
  for (const state of indiaStates) {
    for (const city of state.cities) {
      const key = `${city.lat.toFixed(2)},${city.lng.toFixed(2)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      places.push({ name: city.name, lat: city.lat, lng: city.lng });
    }
  }
  return places;
})();

// India's live population figure (World Bank), refreshed daily.
export function useIndiaPopulation() {
  return usePolledFeed('india-population', useCallback((signal) => fetchIndiaPopulation({ signal }), []), 24 * 60 * MINUTE);
}

export function useIndiaGrid() {
  return usePolledFeed('india-grid', useCallback((signal) => fetchForecastGrid(GRID_PLACES, { signal }), []), 30 * MINUTE);
}
