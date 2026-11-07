import { useEffect, useState } from 'react';
import { CircleMarker, MapContainer, Rectangle, TileLayer, useMap } from 'react-leaflet';
import { formatLatLon } from '../../utils/gis/formatCoords';
import { getMapScaleBar, getOverviewZoomForBounds } from '../../utils/gis/mapOverview';

const OVERVIEW_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

function OverviewMapSync({ center, viewportBounds }) {
  const map = useMap();
  useEffect(() => {
    const syncView = () => {
      const zoom = getOverviewZoomForBounds(map, viewportBounds);
      map.setView(center, zoom, { animate: false });
    };
    syncView();
    map.on('resize', syncView);
    return () => map.off('resize', syncView);
  }, [center, map, viewportBounds]);
  return null;
}

export default function MapOverviewInset({ map }) {
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    if (!map) return undefined;

    const update = () => {
      const center = map.getCenter();
      const bounds = map.getBounds();
      const southWest = bounds.getSouthWest();
      const northEast = bounds.getNorthEast();
      setSnapshot({
        center: [center.lat, center.lng],
        latitude: center.lat,
        longitude: center.lng,
        mainZoom: map.getZoom(),
        viewportBounds: [
          [southWest.lat, southWest.lng],
          [northEast.lat, northEast.lng],
        ],
      });
    };

    update();
    map.on('moveend zoomend resize', update);
    return () => map.off('moveend zoomend resize', update);
  }, [map]);

  if (!snapshot) return null;

  const scale = getMapScaleBar(snapshot.latitude, snapshot.mainZoom);
  const compassId = 'gis-map-overview-compass';

  return (
    <section className="gis-map-overview" aria-label="Map overview and scale">
      <div className="gis-map-overview-tools">
        <div className="gis-map-compass" role="img" aria-label="North is up">
          <span className="gis-map-compass-n">N</span>
          <svg viewBox="0 0 44 44" aria-labelledby={compassId}>
            <title id={compassId}>North compass</title>
            <circle cx="22" cy="22" r="18" />
            <path d="M22 5 28 25 22 21 16 25Z" className="gis-compass-north" />
            <path d="M22 39 16 19 22 23 28 19Z" className="gis-compass-south" />
          </svg>
        </div>
        <div className="gis-map-scale" aria-label={`Main map scale ${scale.label}`}>
          <span>SCALE · {scale.label}</span>
          <div className="gis-map-scale-line" style={{ width: `${Math.min(126, scale.width)}px` }}>
            <i />
            <i />
          </div>
        </div>
      </div>

      <div className="gis-map-overview-frame">
        <MapContainer
          center={snapshot.center}
          zoom={1}
          minZoom={1}
          maxZoom={19}
          zoomControl={false}
          attributionControl={false}
          dragging={false}
          scrollWheelZoom={false}
          touchZoom={false}
          doubleClickZoom={false}
          boxZoom={false}
          keyboard={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer url={OVERVIEW_TILES} maxNativeZoom={19} maxZoom={19} updateWhenZooming={false} />
          <OverviewMapSync center={snapshot.center} viewportBounds={snapshot.viewportBounds} />
          <Rectangle
            bounds={snapshot.viewportBounds}
            pathOptions={{ color: '#ff4757', weight: 2, fillColor: '#ff4757', fillOpacity: 0.08 }}
          />
          <CircleMarker
            center={snapshot.center}
            radius={2.5}
            pathOptions={{ color: '#fff', weight: 1, fillColor: '#ff4757', fillOpacity: 1 }}
          />
        </MapContainer>
      </div>

      <div className="gis-map-overview-footer">
        <span>CENTER</span>
        <span>{formatLatLon(snapshot.latitude, snapshot.longitude, 5)}</span>
      </div>
    </section>
  );
}
