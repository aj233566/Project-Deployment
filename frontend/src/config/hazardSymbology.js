export const ZONE_LEVELS = ['RED', 'ORANGE', 'YELLOW', 'GREEN'];
const ZONES = {
  RED: { color: '#ef4444', shape: 'triangle', size: 38, rank: 4, label: 'Red — immediate', short: 'Red', description: 'Red zone · triangle · act immediately', fillOpacity: 0.16, weight: 1.5, radiusMeters: 4500, pulse: true },
  ORANGE: { color: '#f97316', shape: 'diamond', size: 35, rank: 3, label: 'Orange — high', short: 'Orange', description: 'Orange zone · diamond · high exposure', fillOpacity: 0.12, weight: 1.25, radiusMeters: 3800, pulse: false },
  YELLOW: { color: '#eab308', shape: 'square', size: 33, rank: 2, label: 'Yellow — watch', short: 'Yellow', description: 'Yellow zone · square · watch', fillOpacity: 0.09, weight: 1.25, radiusMeters: 3100, pulse: false },
  GREEN: { color: '#22c55e', shape: 'circle', size: 30, rank: 1, label: 'Green — lower', short: 'Green', description: 'Green zone · circle · lower assessed risk', fillOpacity: 0.07, weight: 1, radiusMeters: 2400, pulse: false },
};
export function normalizeZoneLevel(level) {
  const key = String(level || '').trim().toUpperCase();
  return ZONES[key] ? key : null;
}
export function zoneSymbologyFor(level) {
  const key = normalizeZoneLevel(level);
  return key ? { level: key, ...ZONES[key] } : null;
}
export function zoneAreaStyle(level) {
  const sym = zoneSymbologyFor(level);
  if (!sym) return null;
  return {
    color: sym.color,
    fillColor: sym.color,
    fillOpacity: sym.fillOpacity,
    opacity: 0.6,
    weight: sym.weight,
    radiusMeters: sym.radiusMeters,
    className: `sentry-zone-area sentry-zone-area--${sym.level.toLowerCase()}${sym.pulse ? ' sentry-zone-area--pulse' : ''}`,
  };
}
export function zoneMarkerSvg(level, { size } = {}) {
  const sym = zoneSymbologyFor(level);
  if (!sym) return '';
  const s = Number.isFinite(size) && size > 0 ? size : sym.size;
  const c = s / 2;
  const r = c - 3;
  let shape;
  switch (sym.shape) {
    case 'triangle':
      shape = `<path d="M ${c} ${c - r} L ${c + r} ${c + r * 0.85} L ${c - r} ${c + r * 0.85} Z"/>`;
      break;
    case 'diamond':
      shape = `<path d="M ${c} ${c - r} L ${c + r} ${c} L ${c} ${c + r} L ${c - r} ${c} Z"/>`;
      break;
    case 'square':
      shape = `<rect x="${c - r}" y="${c - r}" width="${2 * r}" height="${2 * r}" rx="2"/>`;
      break;
    default:
      shape = `<circle cx="${c}" cy="${c}" r="${r}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" role="img" aria-label="${sym.label} zone"><g fill="${sym.color}" stroke="#071114" stroke-width="5" stroke-linejoin="round" paint-order="stroke">${shape}</g><g fill="${sym.color}" stroke="#f8fafc" stroke-width="1.2" stroke-linejoin="round" paint-order="stroke">${shape}</g></svg>`;
}
