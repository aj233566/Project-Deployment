const PLACEHOLDER_KEYS = new Set([
  '',
  'your-tomtom-key',
  'your_tomtom_api_key_here',
  'key-one',
  'key-two'
]);
export function normalizeTomTomKeys(value) {
  const candidates = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(candidates
    .map((key) => String(key).trim())
    .filter((key) => key && !PLACEHOLDER_KEYS.has(key.toLowerCase())))];
}
export function getTomTomApiKeys(environment = typeof import.meta !== 'undefined' ? import.meta.env : undefined) {
  return normalizeTomTomKeys(environment?.VITE_TOMTOM_API_KEYS || environment?.VITE_TOMTOM_API_KEY);
}
export function createTomTomKeyring(keys) {
  const availableKeys = normalizeTomTomKeys(keys);
  let index = 0;
  return {
    current: () => availableKeys[index] || null,
    currentIndex: () => index,
    keys: () => [...availableKeys],
    advance: () => {
      if (index >= availableKeys.length - 1) return false;
      index += 1;
      return true;
    }
  };
}
const MAP_TILE_BASE_URL = 'https://api.tomtom.com/map/1/tile';
export function buildTomTomTrafficTiles(apiKey) {
  const key = encodeURIComponent(apiKey);
  return {
    trafficFlow: `https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png?key=${key}`,
    trafficIncidents: `https://api.tomtom.com/traffic/map/4/tile/incidents/s3/{z}/{x}/{y}.png?key=${key}`
  };
}
export function buildTomTomBasemapTiles(apiKey) {
  const key = encodeURIComponent(apiKey);
  return {
    street: `${MAP_TILE_BASE_URL}/basic/main/{z}/{x}/{y}.png?key=${key}`,
    dark: `${MAP_TILE_BASE_URL}/basic/night/{z}/{x}/{y}.png?key=${key}`,
    satellite: `${MAP_TILE_BASE_URL}/sat/main/{z}/{x}/{y}.jpg?key=${key}`,
    hybridOverlay: `${MAP_TILE_BASE_URL}/hybrid/main/{z}/{x}/{y}.png?key=${key}`
  };
}
