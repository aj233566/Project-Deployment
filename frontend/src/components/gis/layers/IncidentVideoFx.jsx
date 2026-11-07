import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import { useIncidentArrivals } from '../../../hooks/useIncidentArrivals';
import { arcBetween, calloutFor } from '../../../utils/commandCenter/incidentEvents';
import { incidentCoords } from '../../../utils/commandCenter/incidentStats';
import { arrowMarkup, fxColor, glyphKey, headingDeg, pinMarkup } from '../../../utils/commandCenter/fxMarkup';

const RING_MS = 3400;
const ARC_MS = 4500;
const TRAVEL_MS = 1600;

// The arrival effect on the Leaflet maps (the citizen map and the Live Map), in the style of a normal emergency map: a location pin in
// the severity colour with a small symbol for the kind of incident drops onto the place, one ring spreads out from it, and a thin dashed
// line with a navigation arrow runs from the previous event to the new one. A counter shows how many events have played.
// Only what happens while the page is open counts: the incidents already there when the map loads are remembered, not animated.
function IncidentVideoFx({ incidents, enabled = true }) {
  const map = useMap();
  const lastPoint = useRef(null);
  const live = useRef(new Set());
  const [count, setCount] = useState(0);
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const play = useCallback((event) => {
    const coords = incidentCoords(event.incident);
    if (!enabled || !coords || !map) return;
    setCount((value) => value + 1);
    const info = calloutFor(event);
    const color = fxColor(info.severity);
    const here = [coords.lat, coords.lng];
    const track = (layer, ms) => {
      live.current.add(layer);
      window.setTimeout(() => { live.current.delete(layer); layer.remove(); }, ms);
    };

    const rings = L.marker(here, {
      interactive: false,
      keyboard: false,
      zIndexOffset: 900,
      icon: L.divIcon({
        className: 'gis-fx',
        iconSize: [0, 0],
        html: `${reduced ? '' : `<div class="gis-fx-rings" style="--c:${color}"><i class="big"></i><i class="inner"></i></div>`}${pinMarkup(color, glyphKey(event.incident))}`,
      }),
    }).addTo(map);
    track(rings, RING_MS);

    const previous = lastPoint.current;
    lastPoint.current = [coords.lng, coords.lat];
    if (reduced || !previous || (previous[0] === coords.lng && previous[1] === coords.lat)) return;
    const arc = arcBetween(previous, [coords.lng, coords.lat], 40).map(([lng, lat]) => [lat, lng]);
    track(L.polyline(arc, { color: '#101d29', weight: 6, opacity: 0.5, interactive: false }).addTo(map), ARC_MS);
    track(L.polyline(arc, { color, weight: 2.5, opacity: 0.95, dashArray: '7 8', interactive: false }).addTo(map), ARC_MS);
    const arrow = L.marker(arc[0], { interactive: false, keyboard: false, zIndexOffset: 950, icon: L.divIcon({ className: 'gis-fx', iconSize: [0, 0], html: arrowMarkup(color) }) }).addTo(map);
    live.current.add(arrow);
    const begin = performance.now();
    let heading = 0;
    const move = () => {
      if (!live.current.has(arrow)) return;
      const t = Math.min((performance.now() - begin) / TRAVEL_MS, 1);
      const index = Math.min(Math.floor(t * (arc.length - 1)), arc.length - 1);
      arrow.setLatLng(arc[index]);
      // The arrow points along the connector.
      const a = map.latLngToContainerPoint(arc[index]);
      const b = map.latLngToContainerPoint(arc[Math.min(index + 1, arc.length - 1)]);
      heading = headingDeg(b.x - a.x, b.y - a.y, heading);
      arrow.getElement()?.firstElementChild?.style.setProperty('--rot', `${heading}deg`);
      if (t < 1) window.requestAnimationFrame(move);
      else { live.current.delete(arrow); arrow.remove(); }
    };
    window.requestAnimationFrame(move);
  }, [enabled, map, reduced]);

  useIncidentArrivals(incidents, play, Array.isArray(incidents));

  // Anything still on the map when this layer goes away is removed.
  useEffect(() => {
    const layers = live.current;
    return () => { layers.forEach((layer) => layer.remove()); layers.clear(); };
  }, []);

  if (!enabled || count === 0) return null;
  return createPortal(
    <div className="gis-fx-hits" role="status" aria-live="polite">
      <span className="gis-fx-hits-badge"><i aria-hidden="true">▲</i> INCIDENT ALERT</span>
      <span className="gis-fx-hits-title">LIVE INCIDENT FEED</span>
      <strong key={count} className="gis-fx-hits-count">{count}<em> {count === 1 ? 'EVENT' : 'EVENTS'}</em></strong>
    </div>,
    map.getContainer(),
  );
}

export default memo(IncidentVideoFx);
