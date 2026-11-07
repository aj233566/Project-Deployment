import { CircleMarker, Popup, Tooltip } from 'react-leaflet';
export default function MyLocationMarker({ location, simulated = false }) {
  if (!location || typeof location.lat !== 'number') return null;
  const color = simulated ? '#F59E0B' : '#22D3EE';
  return (
    <CircleMarker
      center={[location.lat, location.lng]}
      radius={9}
      pathOptions={{
        color,
        fillColor: color,
        fillOpacity: simulated ? 0.3 : 0.55,
        weight: 3,
        dashArray: simulated ? '4 3' : undefined
      }}
    >
      {simulated ? (
        <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>Demo reference position</Tooltip>
      ) : null}
      <Popup>{simulated ? 'Demo reference position — share your location for an accurate position' : 'You are here'}</Popup>
    </CircleMarker>
  );
}
