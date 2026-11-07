// How a natural event (GDACS cyclone / flood, NASA EONET storm, wildfire, volcano ...) is drawn on the flat map: a symbol and a colour.
// Only fixed names come out of here, never text from a feed, so the result is safe to use in map markup.

const BY_CATEGORY = {
  wildfires: { glyph: 'fire', color: '#fb923c' },
  severeStorms: { glyph: 'storm', color: '#facc15' },
  volcanoes: { glyph: 'volcano', color: '#f87171' },
  floods: { glyph: 'flood', color: '#38bdf8' },
  landslides: { glyph: 'landslide', color: '#d6a35c' },
  drought: { glyph: 'heat', color: '#f59e0b' },
  dustHaze: { glyph: 'dust', color: '#d6b98a' },
  snow: { glyph: 'snow', color: '#bae6fd' },
  tempExtremes: { glyph: 'heat', color: '#f97316' },
};

export function eventStyle(event) {
  if (event?.type === 'TC') return { glyph: 'cyclone', color: '#f87171' };
  if (event?.type === 'FL') return { glyph: 'flood', color: '#38bdf8' };
  if (event?.type === 'TS') return { glyph: 'flood', color: '#22d3ee' };
  if (event?.type === 'DR') return { glyph: 'heat', color: '#f59e0b' };
  return BY_CATEGORY[event?.category] || { glyph: 'dot', color: '#e2e8f0' };
}

// Events that can be drawn: a real place and still going on.
export function drawableEvents(events) {
  return (Array.isArray(events) ? events : []).filter((event) => event && event.current !== false && Number.isFinite(event.lat) && Number.isFinite(event.lng));
}

// The path a moving event (a cyclone) has taken, as [[lat, lng], ...] with at least two real points; otherwise an empty list.
export function trackPoints(event) {
  const points = (Array.isArray(event?.track) ? event.track : []).filter((point) => Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1]));
  return points.length >= 2 ? points : [];
}
