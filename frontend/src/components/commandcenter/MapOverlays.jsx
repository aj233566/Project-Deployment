import { CircleMarker, TileLayer, Tooltip } from 'react-leaflet';
import { formatDischarge } from '../../utils/commandCenter/riverStatus';

const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';

const RIVER_TONE_COLORS = { orange: '#d97732', yellow: '#c9a227', green: '#3d8b63', blue: '#4f7c8a' };

function riverRadius(discharge) {
  return Math.min(26, Math.max(8, Math.log10(discharge + 1) * 6.2));
}

// Layers drawn inside the embedded SENTRY map for the Rainfall and River Levels tabs.
export default function MapOverlays({ mode, rivers }) {
  if (mode === 'rain') {
    return (
      <TileLayer
        key="gibs-imerg"
        url={`${GIBS}/IMERG_Precipitation_Rate/default/default/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`}
        attribution='Rainfall: <a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noreferrer">NASA GIBS</a> · IMERG'
        maxNativeZoom={6}
        maxZoom={19}
        opacity={0.78}
        zIndex={8}
      />
    );
  }
  if (mode === 'rivers') {
    const rows = (Array.isArray(rivers) ? rivers : []).filter(
      (river) => river.status !== 'unavailable' && Number.isFinite(river.snapped?.lat ?? river.lat),
    );
    return rows.map((river) => {
      const lat = river.snapped?.lat ?? river.lat;
      const lng = river.snapped?.lng ?? river.lng;
      const color = RIVER_TONE_COLORS[river.tone] || '#4f7c8a';
      return (
        <CircleMarker
          key={river.id}
          center={[lat, lng]}
          radius={riverRadius(river.today)}
          pathOptions={{ color, weight: 2, fillColor: color, fillOpacity: 0.32, opacity: 0.95 }}
        >
          <Tooltip permanent direction="right" offset={[10, 0]} className="icc-river-tip">
            <b>{river.river} · {river.place}</b>
            <span>{formatDischarge(river.today)} {river.unit} · {river.label}</span>
          </Tooltip>
        </CircleMarker>
      );
    });
  }
  return null;
}
