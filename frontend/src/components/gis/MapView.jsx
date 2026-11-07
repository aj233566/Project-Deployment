import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DEMO_MAP_CONFIG } from "../../data/gis/demoGisData";
import { MAP_TILE_SOURCES } from "../../config/mapTileSources";
const INDIA_BOUNDS = L.latLngBounds(
  L.latLng(5.0, 66.0),                                                  
  L.latLng(39.0, 100.0),                                                    
);
function MapRangeLimiter() {
  const map = useMap();
  useEffect(() => {
    const apply = () => {
      const size = map.getSize();
      if (!size.x || !size.y) return;
      const fitZoom = Math.floor(map.getBoundsZoom(INDIA_BOUNDS, false));
      map.setMinZoom(Math.max(DEMO_MAP_CONFIG.minZoom, fitZoom));
      if (map.getZoom() < map.getMinZoom()) map.setZoom(map.getMinZoom());
    };
    apply();
    map.on("resize", apply);
    return () => map.off("resize", apply);
  }, [map]);
  return null;
}
function MapReadyEmitter({ onReady }) {
  const map = useMap();
  useEffect(() => {
    if (onReady) onReady(map);
  }, [map, onReady]);
  return null;
}
function MapPaneStack() {
  const map = useMap();
  const panes = [
    ["gisRiskPane", 401],
    ["gisRoadPane", 410],
    ["gisZonePane", 420],
    ["gisRoutePane", 430],
    ["gisDecisionPane", 440],
    ["gisAlertPane", 450],
  ];
  panes.forEach(([name, zIndex]) => {
    const pane = map.getPane(name) || map.createPane(name);
    pane.style.zIndex = String(zIndex);
  });
  return null;
}
function MapAutoResize() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    let t = null;
    const fit = () => map.invalidateSize({ pan: false });
    const timers = [60, 200, 500, 1000, 1500].map((ms) => setTimeout(fit, ms));
    let firstObserved = true;
    const observer = new ResizeObserver(() => {
      if (firstObserved) {
        firstObserved = false;
        fit();
      }
      clearTimeout(t);
      t = setTimeout(fit, 250);
    });
    observer.observe(container);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(t);
      observer.disconnect();
    };
  }, [map]);
  return null;
}
export default function MapView({
  center = [22.5, 82.5],
  zoom = 5,
  className = "gis-dark-tiles",
  basemap = "osmdark",
  onMapReady,
  children,
}) {
  const base = MAP_TILE_SOURCES[basemap] || MAP_TILE_SOURCES.osmdark;
  const activeBasemap = MAP_TILE_SOURCES[basemap] ? basemap : 'osmdark';
  return (
    <div className={`gis-map-container gis-basemap-${activeBasemap}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        minZoom={DEMO_MAP_CONFIG.minZoom}
        maxZoom={DEMO_MAP_CONFIG.maxZoom}
        scrollWheelZoom={true}
        zoomControl={true}
        maxBounds={INDIA_BOUNDS}
        maxBoundsViscosity={1.0}
        preferCanvas={true}
        inertiaMaxSpeed={1500}
        inertiaDeceleration={3400}
        zoomSnap={0.5}
        zoomDelta={0.5}
        wheelPxPerZoomLevel={100}
        fadeAnimation={false}
        style={{ height: "100%", width: "100%" }}
        className={className}
      >
        <MapPaneStack />
        <MapAutoResize />
        <MapRangeLimiter />
        {onMapReady && <MapReadyEmitter onReady={onMapReady} />}

        <TileLayer
          key={activeBasemap}
          className={`gis-base-layer gis-base-${activeBasemap}`}
          attribution={base.attribution}
          url={base.url}
          subdomains={base.subdomains ?? "abc"}
          maxNativeZoom={base.maxNativeZoom}
          maxZoom={base.maxZoom || 19}
          keepBuffer={4}
          updateWhenZooming={true}
          updateWhenIdle={false}
          updateInterval={100}
        />
        {base.labels ? (
          <TileLayer
            key={`${activeBasemap}-labels`}
            className="gis-ref-layer"
            url={base.labels}
            maxNativeZoom={base.labelsMaxNativeZoom ?? base.maxNativeZoom}
            maxZoom={base.maxZoom || 19}
            keepBuffer={1}
            updateWhenZooming={false}
            crossOrigin={true}
          />
        ) : null}

        {children}
      </MapContainer>
    </div>
  );
}
