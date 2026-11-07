const PLACEHOLDER = '—';
export function formatLatLon(lat, lng, decimals = 4) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return PLACEHOLDER;
  const latHemi = lat < 0 ? 'S' : 'N';
  const lngHemi = lng < 0 ? 'W' : 'E';
  const latStr = Math.abs(lat).toFixed(decimals);
  const lngStr = Math.abs(lng).toFixed(decimals);
  return `${latStr}°${latHemi} ${lngStr}°${lngHemi}`;
}
