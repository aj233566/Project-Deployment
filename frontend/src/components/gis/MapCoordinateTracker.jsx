import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
// The listener is attached once (not on every render): a map move made by another effect in the same
// render, such as CommandCenterRegionFocus fitting a state, would otherwise land while it was detached.
export default function MapCoordinateTracker({ onViewChange }) {
  const map = useMap();
  useEffect(() => {
    const report = () => {
      const c = map.getCenter();
      onViewChange?.(c.lat, c.lng, map.getZoom());
    };
    map.on('moveend zoomend resize', report);
    report();
    return () => {
      map.off('moveend zoomend resize', report);
    };
  }, [map, onViewChange]);
  return null;
}
