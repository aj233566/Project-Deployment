// Labels, colours and small helpers for the "people nearby" feature.

export const PEOPLE_STATUS = Object.freeze({
  'need-help': { label: 'Needs help', color: '#ef4444', glyph: 'help' },
  'can-help': { label: 'Can help', color: '#22c55e', glyph: 'help' },
  safe: { label: 'Safe', color: '#38bdf8', glyph: 'safe' },
  sharing: { label: 'Sharing location', color: '#94a3b8', glyph: 'person' },
});

export const AUTHORITY_COLOR = '#a78bfa';

export function statusOf(person) {
  return PEOPLE_STATUS[person?.status] || PEOPLE_STATUS.sharing;
}

export function colorOf(person) {
  return person?.isAuthority ? AUTHORITY_COLOR : statusOf(person).color;
}

export function glyphOf(person) {
  return person?.isAuthority ? 'safe' : statusOf(person).glyph;
}

export function labelOf(person) {
  return person?.isAuthority ? 'Authority' : statusOf(person).label;
}

export function distanceText(km) {
  if (!Number.isFinite(km)) return '';
  return km < 1 ? 'under 1 km away' : `${km.toFixed(1)} km away`;
}

// "just now", "40 s ago", "3 min ago".
export function seenText(iso, now = Date.now()) {
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return '';
  const seconds = Math.max(0, Math.round((now - time) / 1000));
  if (seconds < 20) return 'just now';
  if (seconds < 90) return `${seconds} s ago`;
  return `${Math.round(seconds / 60)} min ago`;
}

// People who need help first, then the nearest.
export function sortPeople(people) {
  const rank = (person) => (person.status === 'need-help' ? 0 : person.isAuthority ? 1 : 2);
  return [...(Array.isArray(people) ? people : [])].sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    const da = Number.isFinite(a.distanceKm) ? a.distanceKm : Infinity;
    const db = Number.isFinite(b.distanceKm) ? b.distanceKm : Infinity;
    return da - db;
  });
}
