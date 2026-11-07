import { useEffect, useRef } from 'react';
import { resolveScope } from '../utils/commandCenter/scope';

const SETTLE_MS = 450;

// Watches the map and reports which view (India, Delhi NCR or a state) its position now calls for.
// The check runs once the map has stopped moving. `holdUntilRef.current` is a timestamp: while it is in the
// future, changes the map makes on its own (for example while it flies to a view the user picked) are ignored.
export function useMapScope({ map, index, scopeId, enabled, holdUntilRef, onScope }) {
  const scopeRef = useRef(scopeId);
  const onScopeRef = useRef(onScope);

  useEffect(() => {
    scopeRef.current = scopeId;
    onScopeRef.current = onScope;
  }, [scopeId, onScope]);

  useEffect(() => {
    if (!map || !index || !enabled) return undefined;
    let timer = null;

    const evaluate = () => {
      if (holdUntilRef.current > Date.now()) return;
      const size = map.getSize();
      if (!size.x || !size.y) return;
      const bounds = map.getBounds();
      const center = map.getCenter();
      const next = resolveScope({
        zoom: map.getZoom(),
        center: { lat: center.lat, lng: center.lng },
        viewport: { south: bounds.getSouth(), north: bounds.getNorth(), west: bounds.getWest(), east: bounds.getEast() },
        index,
        currentId: scopeRef.current,
      });
      if (next !== scopeRef.current) onScopeRef.current(next);
    };

    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(evaluate, SETTLE_MS);
    };

    map.on('moveend', schedule);
    // Also check where the map is now: the boundaries may have just finished loading, or auto switching just came back on.
    schedule();
    return () => {
      map.off('moveend', schedule);
      window.clearTimeout(timer);
    };
  }, [map, index, enabled, holdUntilRef]);
}
