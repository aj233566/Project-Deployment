import { Circle, CircleMarker, Polyline, Tooltip, Popup } from 'react-leaflet';
import { BRAHMAPUTRA_SPINE, computeFloodState } from '../../../data/gis/floodSim';
export default function FloodSimLayer({ active = false, level = 0 }) {
  if (!active) return null;
  const state = computeFloodState(level);
  const reachM = Math.max(state.reachKm, 0.5) * 1000;
  const bandOpacity = 0.1 + 0.28 * level;
  return (
    <>
      <Polyline positions={BRAHMAPUTRA_SPINE} pathOptions={{ color: '#3aa0d8', weight: 2.5, opacity: 0.9 }} />

      {BRAHMAPUTRA_SPINE.map(([lat, lng], i) => (
        <Circle
          key={`inun-${i}`}
          center={[lat, lng]}
          radius={reachM}
          pathOptions={{ stroke: false, fillColor: '#2b7fc4', fillOpacity: bandOpacity }}
        />
      ))}

      {state.roads.map((r) => (
        <CircleMarker
          key={r.id}
          center={r.mid}
          radius={6}
          pathOptions={
            r.cut
              ? { color: '#F0555A', fillColor: '#F0555A', fillOpacity: 0.9, weight: 2 }
              : { color: '#2FD67B', fillColor: '#123', fillOpacity: 0.8, weight: 2 }
          }
        >
          <Tooltip direction="top" className="gis-zone-tip">
            <b style={{ color: r.cut ? '#F0555A' : '#2FD67B' }}>{r.cut ? '✕ CUT' : '✓ OPEN'}</b> · {r.name}
          </Tooltip>
        </CircleMarker>
      ))}

      {state.villages.map((v) => {
        const flooded = v.flooded;
        const radius = flooded ? 6 + v.depth * 6 : 5;
        const color = flooded ? '#F0555A' : '#4f97c4';
        return (
          <CircleMarker
            key={v.id}
            center={[v.lat, v.lng]}
            radius={radius}
            pathOptions={{ color, fillColor: color, fillOpacity: flooded ? 0.55 : 0.35, weight: 2 }}
          >
            <Popup>
              <div style={{ fontFamily: 'var(--font-ui)', minWidth: 160 }}>
                <div style={{ color, fontWeight: 700 }}>{v.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {flooded ? `FLOODED · depth idx ${(v.depth * 100).toFixed(0)}%` : 'Not yet inundated'}
                </div>
                <div style={{ fontSize: 11, marginTop: 2 }}>
                  ~{v.pop.toLocaleString()}k people · {v.dist.toFixed(1)} km from river
                </div>
              </div>
            </Popup>
            <Tooltip direction="top" className="gis-zone-tip">
              {flooded ? '⚠ ' : ''}
              {v.name}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
