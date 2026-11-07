import { memo, useCallback, useMemo, useState } from 'react';
import L from 'leaflet';
import { Marker, Polygon, Popup } from 'react-leaflet';
import { useIncidentArrivals } from '../../../hooks/useIncidentArrivals';
import { areasToArrivalIncidents, calloutFor } from '../../../utils/commandCenter/incidentEvents';
import { incidentCoords } from '../../../utils/commandCenter/incidentStats';

const COLORS = { critical: '#ff3b4a', high: '#fb923c', medium: '#facc15', low: '#4ade80', safe: '#4ade80' };
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function arrivalIcon(info, safe) {
  const color = safe ? COLORS.safe : COLORS[info.severity] || COLORS.high;
  return L.divIcon({
    className: 'gis-area-arrival',
    iconSize: [0, 0],
    html: `<div style="--c:${color}"><i class="ring"></i><i class="ring r2"></i><i class="core"></i><span class="card"><b>${escapeHtml(`${info.tag} · ${info.title}`)}</b><small>${escapeHtml(info.place)}</small></span></div>`,
  });
}

// The areas an authority has drawn (affected areas and safe zones), for every signed-in user. A new or changed area plays the
// same arrival animation as an incident: a red flash over the map, rings from the middle of the area and a callout chip.
function AffectedAreaLayer({ areas, visible = true, animate = true }) {
  const [live, setLive] = useState([]);
  const active = useMemo(() => (Array.isArray(areas) ? areas.filter((area) => area?.status !== 'resolved' && Array.isArray(area?.geometry?.coordinates?.[0])) : []), [areas]);
  const pseudo = useMemo(() => areasToArrivalIncidents(active), [active]);

  const play = useCallback((event) => {
    const center = incidentCoords(event.incident);
    if (!animate || !center) return;
    const key = `${event.incident._id}-${Date.now()}`;
    setLive((items) => [...items, { key, center, info: calloutFor(event), safe: event.incident.type === 'safe zone' }]);
    window.dispatchEvent(new Event('gis:incident-arrival'));
    window.setTimeout(() => setLive((items) => items.filter((item) => item.key !== key)), 4500);
  }, [animate]);
  useIncidentArrivals(pseudo, play, true);

  if (!visible) return null;
  return (
    <>
      {active.map((area) => {
        const safe = area.kind === 'safe';
        const color = safe ? COLORS.safe : COLORS[area.severity] || COLORS.high;
        return (
          <Polygon
            key={area._id}
            positions={area.geometry.coordinates[0].map(([lng, lat]) => [lat, lng])}
            pathOptions={{ color, weight: 3, opacity: 0.95, fillColor: color, fillOpacity: safe ? 0.28 : 0.3 }}
          >
            <Popup>
              <strong>{area.name}</strong>
              <div>{safe ? 'Safe zone' : `Affected area, ${area.severity} severity`}</div>
              {area.hazardType ? <div>Hazard: {area.hazardType}</div> : null}
              {area.notes ? <div>{area.notes}</div> : null}
            </Popup>
          </Polygon>
        );
      })}
      {live.map((item) => (
        <Marker key={item.key} position={[item.center.lat, item.center.lng]} icon={arrivalIcon(item.info, item.safe)} interactive={false} keyboard={false} />
      ))}
    </>
  );
}

export default memo(AffectedAreaLayer);
