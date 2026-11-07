import { useMemo } from 'react';
import L from 'leaflet';
import { Circle, useMap } from 'react-leaflet';

export default function SoftZoneDisc({
  center,
  radiusMeters,
  color,
  fillOpacity = 0.08,
  pulse = false,
  pane = 'gisZonePane',
  className = '',
  eventHandlers,
  children,
}) {
  const map = useMap();
  // A new renderer is made when the map changes, so the dependency is intended.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const svgRenderer = useMemo(() => L.svg({ padding: 0.5 }), [map]);
  if (!Array.isArray(center) || !center.every(Number.isFinite) || !Number.isFinite(radiusMeters) || radiusMeters <= 0) {
    return null;
  }

  const levelClass = className ? ` ${className}` : '';
  return (
    <Circle
      center={center}
      radius={radiusMeters}
      renderer={svgRenderer}
      pane={pane}
      eventHandlers={eventHandlers}
      pathOptions={{
        color,
        opacity: 0.76,
        weight: pulse ? 1.6 : 1.25,
        dashArray: pulse ? '3 5' : '4 5',
        lineCap: 'round',
        fillColor: color,
        fillOpacity: Math.min(0.14, Math.max(0.035, fillOpacity)),
        className: `sentry-risk-radius sentry-zone-area${pulse ? ' sentry-zone-area--pulse sentry-risk-radius--pulse' : ''}${levelClass}`,
      }}
    >
      {children}
    </Circle>
  );
}
