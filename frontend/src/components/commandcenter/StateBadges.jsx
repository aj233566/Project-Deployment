import { useMemo } from 'react';
import L from 'leaflet';
import { Marker, Tooltip } from 'react-leaflet';

const compact = (count) => (count >= 1000 ? `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k` : String(count));

function badgeIcon(row) {
  // Only the count and a fixed severity class go into the markup, so nothing from a record can reach the HTML.
  return L.divIcon({
    className: 'icc-state-badge-wrap',
    html: `<span class="icc-state-badge icc-state-badge-${row.topSeverity}">${compact(row.count)}</span>`,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
  });
}

// One badge per state that has active incidents, on the national map. Clicking a badge opens that state.
export default function StateBadges({ rows, onSelect }) {
  const badges = useMemo(
    () => rows.filter((row) => Array.isArray(row.center)).map((row) => ({ row, icon: badgeIcon(row) })),
    [rows],
  );
  return badges.map(({ row, icon }) => (
    <Marker
      key={row.code}
      position={row.center}
      icon={icon}
      zIndexOffset={900}
      keyboard
      title={`${row.name}: ${row.count} active incidents. Open this state.`}
      eventHandlers={{ click: () => onSelect(row.code) }}
    >
      <Tooltip direction="top" offset={[0, -22]} className="icc-state-tip">
        <b>{row.name}</b>
        <span>{row.count} active · {row.critical} critical · {row.high} high</span>
        <em>Click to open this state</em>
      </Tooltip>
    </Marker>
  ));
}
