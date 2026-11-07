// Shapes for the arrival effect, shared by the Leaflet maps, the 3D map and (drawn onto a canvas) the 3D globe. They follow normal
// emergency-GIS conventions, with a little depth so they read as objects on the map rather than flat stickers:
//   pin:   a glossy location pin in the severity colour, a soft shadow on the ground, and a white badge with the symbol of the incident
//   arrow: a two-tone navigation arrow (light upper half, dark lower half) travelling along a dashed connector
// Colours come from the fixed severity palette and symbols from the fixed table below, never from record text, so the markup is safe
// to inject.
import { LUCIDE_GLYPHS } from './lucideGlyphs.js';

export const FX_COLORS = Object.freeze({ critical: '#ff3b4a', high: '#fb923c', medium: '#facc15', low: '#4ade80', unknown: '#94a3b8' });
export const FX_INK = '#101d29';
// Pin outline on a 52 x 60 grid (tip at 26, 57); the finished pin sits in a 56 x 70 box with the tip at (28, 59).
export const PIN_PATH = 'M26 3C13 3 5 12 5 25C5 39 26 57 26 57C26 57 47 39 47 25C47 12 39 3 26 3Z';
export const PIN_BOX = Object.freeze({ width: 56, height: 70, tipX: 28, tipY: 59 });
// Arrow on a 48 x 48 grid, pointing right; the notch is at (16, 24).
export const ARROW_PATH = 'M9 8L44 24L9 40L16 24Z';
export const ARROW_UPPER = 'M9 8L44 24L16 24Z';
export const ARROW_LOWER = 'M16 24L44 24L9 40Z';
export const ARROW_TAIL = 'M3 24H13';
export const GLYPHS = LUCIDE_GLYPHS;

export const fxColor = (severity) => FX_COLORS[severity] || FX_COLORS.high;

// Mix a #rrggbb colour with white (amount above 0) or black (amount below 0): shade('#ff0000', 0.5) is a lighter red.
export function shade(hex, amount) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return hex;
  const target = amount >= 0 ? 255 : 0;
  const t = Math.min(Math.abs(amount), 1);
  const channel = (i) => Math.round(parseInt(m[1].slice(i, i + 2), 16) * (1 - t) + target * t);
  return `#${[0, 2, 4].map((i) => channel(i).toString(16).padStart(2, '0')).join('')}`;
}

// Screen heading in degrees for a move of (dx, dy) pixels: 0 points right, 90 points down. A move of nothing keeps the last heading.
export function headingDeg(dx, dy, fallback = 0) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || (dx === 0 && dy === 0)) return fallback;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

// Which symbol an incident gets. The hazard type is preferred; the report type is the fallback.
export function glyphKey(incident) {
  const hazard = String(incident?.hazardSubtype || '').toLowerCase();
  const type = String(incident?.type || '').toLowerCase();
  if (/fire/.test(hazard) || /fire/.test(type)) return 'fire';
  if (/flood|cloudburst/.test(hazard) || /flood/.test(type)) return 'flood';
  if (/earthquake/.test(hazard) || /earthquake/.test(type)) return 'earthquake';
  if (/landslide|erosion/.test(hazard) || /landslide|slope/.test(type)) return 'landslide';
  if (/road|infrastructure/.test(type)) return 'road';
  return 'dot';
}

const hexId = (hex) => String(hex).replace('#', '');

export function arrowMarkup(color) {
  return `<div class="fx-arrow" style="--c:${color}"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="${ARROW_TAIL}" stroke="${FX_INK}" stroke-opacity="0.55" stroke-width="8" stroke-linecap="round" fill="none"/><path d="${ARROW_TAIL}" stroke="${color}" stroke-width="3" stroke-linecap="round" fill="none"/><path d="${ARROW_UPPER}" fill="${shade(color, 0.35)}"/><path d="${ARROW_LOWER}" fill="${shade(color, -0.3)}"/><path d="${ARROW_PATH}" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round" stroke-opacity="0.95"/><path d="${ARROW_PATH}" fill="none" stroke="${FX_INK}" stroke-width="0.8" stroke-linejoin="round" stroke-opacity="0.4"/></svg></div>`;
}

// Every marker gets its own gradient ids: the same id on many markers makes the page refer to the first one only, and when that one is
// removed (an effect pin fades out) the others lose their colour.
let pinSerial = 0;

export function pinMarkup(color, glyph = 'dot') {
  const serial = (pinSerial += 1);
  const id = `${hexId(color)}-${serial}`;
  const key = GLYPHS[glyph] ? glyph : 'dot';
  const dark = shade(color, -0.5);
  const paths = GLYPHS[key].map((d) => `<path d="${d}"/>`).join('');
  const symbol = key === 'dot'
    ? `<g transform="translate(16.5 14.5) scale(0.8)" fill="${dark}">${paths}</g>`
    : `<g transform="translate(16.5 14.5) scale(0.8)" fill="none" stroke="${dark}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${paths}</g>`;
  return `<div class="fx-pin" style="--c:${color}"><svg viewBox="0 0 ${PIN_BOX.width} ${PIN_BOX.height}" aria-hidden="true"><defs><radialGradient id="fxs${serial}"><stop offset="0" stop-color="#000" stop-opacity="0.5"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient><linearGradient id="fxb${id}" x1="0.1" y1="0" x2="0.9" y2="1"><stop offset="0" stop-color="${shade(color, 0.4)}"/><stop offset="0.5" stop-color="${color}"/><stop offset="1" stop-color="${shade(color, -0.4)}"/></linearGradient><radialGradient id="fxc${serial}" cx="0.35" cy="0.3" r="0.9"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cfdae6"/></radialGradient></defs><ellipse cx="${PIN_BOX.tipX}" cy="${PIN_BOX.tipY}" rx="14" ry="4.2" fill="url(#fxs${serial})"/><g transform="translate(2 2)"><path d="${PIN_PATH}" fill="url(#fxb${id})" stroke="${shade(color, -0.55)}" stroke-width="2" stroke-linejoin="round"/><path d="M11.5 16C14 9 21 5.5 28 6.3" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="3" stroke-linecap="round"/><circle cx="26" cy="24" r="13" fill="url(#fxc${serial})" stroke="${shade(color, -0.35)}" stroke-width="1.5"/>${symbol}<ellipse cx="21.5" cy="17.5" rx="4.5" ry="2.2" fill="#fff" fill-opacity="0.65" transform="rotate(-25 21.5 17.5)"/></g></svg></div>`;
}

// The marker for a habitation zone (red, orange, yellow, green). It is the same glossy pin as the arrival effect, in the zone colour, with
// a house in the badge; the level is also told by the small sign on the pin (alert, warning, eye, shield) so it does not rely on colour alone.
export const ZONE_SIGN = Object.freeze({ RED: 'alert', ORANGE: 'ring', YELLOW: 'watch', GREEN: 'safe' });
export function zonePinMarkup(color, level) {
  return pinMarkup(color, ZONE_SIGN[level] || 'home');
}
