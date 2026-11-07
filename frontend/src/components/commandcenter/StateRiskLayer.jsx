import { useMemo } from 'react';
import { Polygon, Tooltip } from 'react-leaflet';

const SEVERITY_COLOR = { critical: '#d64545', high: '#d97732', medium: '#c9a227', low: '#3d8b63' };
const NEUTRAL = '#4f7c8a';

// Boundary data is [lng, lat]; Leaflet wants [lat, lng].
function toLeaflet(polygons) {
  return polygons.map((rings) => rings.map((ring) => ring.map(([lng, lat]) => [lat, lng])));
}

// Tints every state by its worst active incident level and outlines it in light, like the reference maps.
// The state under view is drawn brighter; the others fade back. Clicking a state opens its dashboard.
export default function StateRiskLayer({ entries, rows, activeCode, onSelect }) {
  const shapes = useMemo(
    () => entries.map((entry) => ({ code: entry.code, name: entry.state.name, positions: toLeaflet(entry.polygons) })),
    [entries],
  );
  const byCode = useMemo(() => new Map(rows.map((row) => [row.code, row])), [rows]);
  const anyActive = Boolean(activeCode);

  return shapes.map((shape) => {
    const row = byCode.get(shape.code);
    const color = row ? SEVERITY_COLOR[row.topSeverity] || NEUTRAL : NEUTRAL;
    const active = shape.code === activeCode;
    const dim = anyActive && !active;
    return (
      <Polygon
        key={shape.code}
        positions={shape.positions}
        pathOptions={{
          color: active ? '#e0f2fe' : color,
          weight: active ? 2.5 : 1.2,
          opacity: dim ? 0.35 : 0.85,
          fillColor: color,
          fillOpacity: row ? (dim ? 0.12 : 0.32) : (dim ? 0.03 : 0.08),
          lineJoin: 'round',
        }}
        eventHandlers={{ click: () => onSelect(shape.code) }}
      >
        <Tooltip sticky direction="top" className="icc-state-tip">
          <b>{shape.name}</b>
          <span>{row ? `${row.count} active · ${row.critical} critical · ${row.high} high` : 'No active incidents'}</span>
          <em>Click to open this state</em>
        </Tooltip>
      </Polygon>
    );
  });
}
