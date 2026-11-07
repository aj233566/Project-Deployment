import { memo, useEffect, useMemo, useState } from 'react';
import { TileLayer } from 'react-leaflet';
import { buildTomTomTrafficTiles, getTomTomApiKeys } from '../../../config/tomtom';
import { reportTomTomTileFailure } from '../../../services/gis/tomtomTrafficStatus';
import { orderKeysByHealth, markKeyUnhealthy, getKeyHealthStorage } from '../../../services/gis/tomtomKeyHealth';
function TomTomTrafficLayer({ visible = false, onStatusChange }) {
  const trafficEnabled = import.meta.env?.VITE_TOMTOM_TRAFFIC_ENABLED === 'true';
  const storage = getKeyHealthStorage();
  const keys = useMemo(
    () => orderKeysByHealth(getTomTomApiKeys(), { storage }),
    [storage],
  );
  const [keyIndex, setKeyIndex] = useState(0);
  const [trafficUnavailable, setTrafficUnavailable] = useState(false);
  const activeKey = keys[keyIndex] || null;
  const tiles = useMemo(
    () => (activeKey ? buildTomTomTrafficTiles(activeKey) : null),
    [activeKey],
  );
  useEffect(() => {
    if (!visible || !trafficEnabled) {
      onStatusChange?.('idle');
      return;
    }
    if (!tiles || trafficUnavailable) {
      onStatusChange?.('unavailable');
      return;
    }
    onStatusChange?.('loading');
  }, [visible, trafficEnabled, tiles, trafficUnavailable, onStatusChange]);
  const handleKeyFailure = () => {
    markKeyUnhealthy(activeKey, { storage });
    setKeyIndex((i) => (i < keys.length - 1 ? i + 1 : i));
    if (keyIndex >= keys.length - 1) {
      setTrafficUnavailable(true);
      reportTomTomTileFailure(onStatusChange);
    }
  };
  if (!visible || !trafficEnabled || !tiles || trafficUnavailable) return null;
  return (
    <>
      <TileLayer
        key={`tomtom-flow-${keyIndex}`}
        url={tiles.trafficFlow}
        attribution="Traffic &copy; TomTom"
        opacity={0.72}
        minZoom={0}
        maxZoom={18}
        maxNativeZoom={18}
        zIndex={420}
        crossOrigin
        eventHandlers={{ load: () => onStatusChange?.('ready'), tileerror: handleKeyFailure }}
      />
      <TileLayer
        key={`tomtom-incidents-${keyIndex}`}
        url={tiles.trafficIncidents}
        attribution="Incidents &copy; TomTom"
        opacity={0.9}
        minZoom={0}
        maxZoom={18}
        maxNativeZoom={18}
        zIndex={421}
        crossOrigin
        eventHandlers={{ tileerror: handleKeyFailure }}
      />
    </>
  );
}
export default memo(TomTomTrafficLayer);
