import { Circle, Tooltip, useMap } from 'react-leaflet';
import { DISASTER_ZONES } from '../../../data/gis/disasterZones';
const SEV_COLOR = {
  critical: '#F0555A',
  high: '#F59E0B',
  moderate: '#22D3EE'
};
export default function DisasterZonesLayer({ visible = true, onSelectZone }) {
  const map = useMap();
  if (!visible) return null;
  return (
    <>
      {DISASTER_ZONES.map((z) => {
        const color = SEV_COLOR[z.severity] || SEV_COLOR.moderate;
        return (
          <Circle
            key={z.id}
            center={z.center}
            radius={z.radiusKm * 1000}
            pathOptions={{
              color,
              weight: 1,
              opacity: 0.55,
              fillColor: color,
              fillOpacity: 0.05,
              dashArray: '3 8'
            }}
            eventHandlers={{
              click: () => {
                map.flyTo(z.center, z.zoom, { duration: 0.8 });
                onSelectZone && onSelectZone(z);
              }
            }}
          >
            <Tooltip direction="top" offset={[0, -4]} opacity={1} className="gis-zone-tip">
              <span style={{ color, fontWeight: 700 }}>■</span> {z.name}
              <br />
              <span style={{ opacity: 0.75 }}>{z.hazard}</span>
            </Tooltip>
          </Circle>
        );
      })}
    </>
  );
}
