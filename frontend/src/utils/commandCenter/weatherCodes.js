// WMO weather codes as returned by Open-Meteo, mapped to a description and an icon key.

const TABLE = [
  { codes: [0], text: 'Clear sky', icon: 'clear' },
  { codes: [1], text: 'Mainly clear', icon: 'clear' },
  { codes: [2], text: 'Partly cloudy', icon: 'partly' },
  { codes: [3], text: 'Overcast', icon: 'cloud' },
  { codes: [45, 48], text: 'Fog', icon: 'fog' },
  { codes: [51, 53, 55, 56, 57], text: 'Drizzle', icon: 'rain' },
  { codes: [61, 63, 65, 66, 67], text: 'Rain', icon: 'rain' },
  { codes: [71, 73, 75, 77, 85, 86], text: 'Snow', icon: 'snow' },
  { codes: [80, 81, 82], text: 'Rain showers', icon: 'rain' },
  { codes: [95, 96, 99], text: 'Thunderstorm', icon: 'storm' },
];

export function describeWeather(code) {
  const entry = TABLE.find((row) => row.codes.includes(code));
  return entry ? { text: entry.text, icon: entry.icon } : { text: 'Conditions unavailable', icon: 'cloud' };
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

export function compassPoint(degrees) {
  if (!Number.isFinite(degrees)) return '';
  return COMPASS[Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16];
}

export function formatVisibility(meters) {
  if (!Number.isFinite(meters)) return '—';
  if (meters >= 10000) return `${Math.round(meters / 1000)} km`;
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}
