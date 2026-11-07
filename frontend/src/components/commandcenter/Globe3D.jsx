import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { loadCesium } from '../../utils/commandCenter/cesiumLoader';
import { createEsriImageryProvider } from '../../utils/commandCenter/photorealRoute';
import { createPilotManager, osmBuildingStyle, setupShadows } from '../../utils/commandCenter/cesiumBuildings';
import { playGlobeRipple } from '../../utils/commandCenter/cesiumRipples';
import { areasToArrivalIncidents } from '../../utils/commandCenter/incidentEvents';
import { useIncidentArrivals } from '../../hooks/useIncidentArrivals';
import { hiddenForFocus } from '../../utils/commandCenter/mapFocus';
import SharedMapControls from './SharedMapControls';
import { IncidentHits } from './IncidentHits';
import {
  ION_GOOGLE_ASSET_ID, KEYLESS_TERRAIN_URL, cameraRangeFor, describeGlobeRoute, selectGlobeRoute,
} from '../../utils/commandCenter/photorealRoute';
import { incidentCoords, normalizeSeverity } from '../../utils/commandCenter/incidentStats';
import { IMAGERY_PROVIDERS, INDIA_VIEW_BOUNDS, SEVERITY_COLOR } from '../../utils/commandCenter/map3dStyle';
import { statesToGeoJson } from '../../utils/commandCenter/map3dData';
import { getCommandCenterRegion } from '../../utils/gis/commandCenterRegions';

const googleKey = import.meta.env.VITE_GOOGLE_MAP_TILES_API_KEY || '';
const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN || '';
const allowGoogle = ['1', 'true'].includes(String(import.meta.env.VITE_ALLOW_GOOGLE_3D || '').toLowerCase());

const sevColor = (sev) => SEVERITY_COLOR[sev] || '#4f7c8a';

// 3D globe on CesiumJS: Esri satellite imagery on open terrain, and Google Photorealistic 3D Tiles when a Cesium ion token
// or a Google Map Tiles key is configured. SENTRY records are drawn on top as Cesium entities.
const GLOBE_LAYERS = Object.freeze({
  states: 'State risk tint and outlines',
  areas: 'Affected areas and safe zones',
  incidents: 'Incidents',
  sites: 'Relocation sites',
  hazards: 'Hazard events and earthquakes',
  buildings: '3D buildings',
  route: 'Emergency road route',
});
// The Controls panel's layer buttons and map displays on this globe.
const LAYER_BUTTONS = Object.entries(GLOBE_LAYERS).map(([key, title]) => ({
  key, title, label: { states: 'RISK', areas: 'ZONE', incidents: 'INC', sites: 'SITE', hazards: 'HAZ', buildings: 'BLDG', route: 'ROUTE' }[key] || key.toUpperCase(),
}));
const STYLE_OPTIONS = IMAGERY_PROVIDERS.map((provider) => ({ key: provider.id, label: provider.name, shortLabel: { esri: 'ESRI', eox: 'S2', gibs: 'VIIRS' }[provider.id] || provider.id, provider: provider.licence }));
const SEVERITIES = ['critical', 'high', 'medium', 'low'];
const EMPTY_FORM = { name: '', kind: 'affected', severity: 'high' };

export default function Globe3D({ incidents, areas, sites, hazardEvents, quakes, stateIndex, stateRows, scopeId, focus, onSelectView, canDraw, onCreateArea, controls, allIncidents, focusPresetId, onFocusPresetChange, controlsTarget, controlsActive }) {
  const controlsRef = useRef(controls);
  const baseLayerRef = useRef(null);
  const [styleKey, setStyleKey] = useState(IMAGERY_PROVIDERS[0].id);
  const boxRef = useRef(null);
  const viewerRef = useRef(null);
  const cesiumRef = useRef(null);
  const sourcesRef = useRef({});
  const latest = useRef({ onSelectView });
  const route = useMemo(() => selectGlobeRoute({ googleKey, ionToken, allowGoogle }), []);
  const info = describeGlobeRoute(route);
  const [state, setState] = useState({ status: 'loading', message: '', photoreal: false });
  const [ready, setReady] = useState(false);
  const [picked, setPicked] = useState(null);
  const [pilot, setPilot] = useState(null);
  const pilotRef = useRef(null);
  const osmRef = useRef(null);
  const drawingRef = useRef(false);
  const [hidden, setHidden] = useState(() => new Set());
  const [panelOpen, setPanelOpen] = useState(false);
  const [draw, setDraw] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [flat, setFlat] = useState(false);

  useEffect(() => { latest.current = { onSelectView }; controlsRef.current = controls; });
  useEffect(() => { drawingRef.current = Boolean(draw); }, [draw]);
  useEffect(() => {
    if (focusPresetId) setHidden(hiddenForFocus('globe', focusPresetId));
  }, [focusPresetId]);

  useEffect(() => {
    let cancelled = false;
    let viewer = null;
    let shadowCleanup = null;
    (async () => {
      let Cesium;
      try {
        Cesium = await loadCesium();
      } catch (error) {
        if (!cancelled) setState({ status: 'error', message: error.message, photoreal: false });
        return;
      }
      if (cancelled || !boxRef.current) return;
      cesiumRef.current = Cesium;
      try {
        if (ionToken) Cesium.Ion.defaultAccessToken = ionToken;
        viewer = new Cesium.Viewer(boxRef.current, {
          baseLayer: false, baseLayerPicker: false, geocoder: false, homeButton: false, sceneModePicker: false, navigationHelpButton: false,
          animation: false, timeline: false, fullscreenButton: false, infoBox: false, selectionIndicator: false, requestRenderMode: true, maximumRenderTimeChange: Infinity,
          skyAtmosphere: new Cesium.SkyAtmosphere(),
        });
        viewerRef.current = viewer;
        if (import.meta.env.DEV) window.__sentryCesium = viewer;
        const { scene } = viewer;
        scene.globe.baseColor = Cesium.Color.fromCssColorString('#06142a');
        scene.globe.depthTestAgainstTerrain = true;
        scene.globe.showGroundAtmosphere = true;
        scene.highDynamicRange = false;

        // Imagery: dark-graded Esri World Imagery.
        const imagery = createEsriImageryProvider(Cesium);
        if (cancelled) return;
        const layer = viewer.imageryLayers.addImageryProvider(imagery);
        layer.brightness = 0.82;
        layer.saturation = 0.9;
        layer.contrast = 1.08;
        baseLayerRef.current = layer;

        // Terrain: Cesium World Terrain with an ion token, otherwise the open Re:Earth / Mapterhorn mesh (CC BY 4.0).
        let terrainNote = '';
        try {
          scene.terrainProvider = ionToken
            ? await Cesium.createWorldTerrainAsync({ requestVertexNormals: true })
            : await Cesium.CesiumTerrainProvider.fromUrl(KEYLESS_TERRAIN_URL, { credit: 'Terrain: Re:Earth / Mapterhorn (CC BY 4.0)' });
        } catch (error) {
          terrainNote = ` Terrain could not load (${error.message}); the globe is flat.`;
        }

        // Cesium OSM Buildings (OpenStreetMap footprints and heights) with a free ion token.
        let osmTileset = null;
        if (route === 'ion-osm') {
          try {
            const osm = await Cesium.createOsmBuildingsAsync();
            if (cancelled) return;
            osm.style = osmBuildingStyle(Cesium);
            scene.primitives.add(osm);
            osmTileset = osm;
            osmRef.current = osm;
          } catch (error) {
            terrainNote += ` OSM Buildings could not load (${error.message}).`;
          }
        }

        // Photorealistic buildings, only when Google is switched on explicitly.
        let photoreal = false;
        if (route === 'google-direct' || route === 'google-ion') {
          try {
            const tileset = route === 'google-direct'
              ? await Cesium.createGooglePhotorealistic3DTileset({ key: googleKey.trim() })
              : await Cesium.Cesium3DTileset.fromIonAssetId(ION_GOOGLE_ASSET_ID);
            if (cancelled) return;
            scene.primitives.add(tileset);
            scene.globe.show = false;
            photoreal = true;
          } catch (error) {
            terrainNote += ` Photorealistic tiles could not load (${error.message}).`;
          }
        }
        if (route === 'ion-osm') {
          shadowCleanup = setupShadows(Cesium, viewer, osmTileset);
          pilotRef.current = createPilotManager({
            Cesium, viewer, osmTileset,
            onChange: (change) => setPilot((current) => ({ ...current, ...change })),
          });
        }
        for (const name of ['states', 'areas', 'incidents', 'sites', 'hazards', 'route', 'points', 'draft', 'fx']) {
          const source = new Cesium.CustomDataSource(name);
          sourcesRef.current[name] = source;
          await viewer.dataSources.add(source);
        }

        const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
        handler.setInputAction((click) => {
          if (drawingRef.current) {
            let position = scene.pickPositionSupported ? scene.pickPosition(click.position) : undefined;
            if (!position) position = scene.globe.pick(viewer.camera.getPickRay(click.position), scene);
            if (!position) return;
            const c = Cesium.Cartographic.fromCartesian(position);
            const point = [Number(Cesium.Math.toDegrees(c.longitude).toFixed(6)), Number(Cesium.Math.toDegrees(c.latitude).toFixed(6))];
            setDraw((current) => (current ? { ...current, points: [...current.points, point] } : current));
            return;
          }
          // "Add map point" from the Controls panel: the next click drops a saved point.
          if (controlsRef.current?.addPointMode) {
            let position = scene.pickPositionSupported ? scene.pickPosition(click.position) : undefined;
            if (!position) position = scene.globe.pick(viewer.camera.getPickRay(click.position), scene);
            if (!position) return;
            const c = Cesium.Cartographic.fromCartesian(position);
            controlsRef.current.addPoint(Number(Cesium.Math.toDegrees(c.latitude).toFixed(6)), Number(Cesium.Math.toDegrees(c.longitude).toFixed(6)));
            return;
          }
          const hit = scene.pick(click.position);
          const entity = hit?.id;
          if (entity?.sentry) {
            if (entity.sentry.code) latest.current.onSelectView?.(entity.sentry.code);
            else {
              if (entity.sentry.incidentId) controlsRef.current?.selectIncident(entity.sentry.incidentId);
              setPicked(entity.sentry);
            }
          } else setPicked(null);
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        setState({ status: 'ready', message: terrainNote.trim(), photoreal });
        setReady(true);
        viewer.scene.requestRender();
      } catch (error) {
        if (!cancelled) setState({ status: 'error', message: error.message || 'The 3D globe could not start.', photoreal: false });
      }
    })();
    return () => {
      cancelled = true;
      pilotRef.current?.dispose();
      pilotRef.current = null;
      osmRef.current = null;
      shadowCleanup?.();
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
      viewerRef.current = null;
      sourcesRef.current = {};
      setReady(false);
    };
  }, [route]);

  // Records on the globe.
  useEffect(() => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;
    if (!ready || !Cesium || !viewer) return;
    const { states, areas: areaSource, incidents: incidentSource, sites: siteSource, hazards } = sourcesRef.current;
    const color = (css, alpha = 1) => Cesium.Color.fromCssColorString(css).withAlpha(alpha);
    const clamp = Cesium.HeightReference.CLAMP_TO_GROUND;
    const point = (lng, lat, css, size, sentry) => ({
      position: Cesium.Cartesian3.fromDegrees(lng, lat),
      point: { pixelSize: size, color: color(css), outlineColor: Cesium.Color.WHITE, outlineWidth: 2, heightReference: clamp, disableDepthTestDistance: Number.POSITIVE_INFINITY },
      sentry,
    });

    viewer.entities.suspendEvents();
    for (const source of [states, areaSource, incidentSource, siteSource, hazards]) source.entities.removeAll();

    for (const feature of statesToGeoJson(stateIndex?.entries, stateRows).features) {
      const { sev, code, name, count } = feature.properties;
      const css = sev === 'none' ? '#4f7c8a' : sevColor(sev);
      for (const rings of feature.geometry.coordinates) {
        const positions = rings[0].map(([lng, lat]) => Cesium.Cartesian3.fromDegrees(lng, lat));
        states.entities.add({
          polygon: { hierarchy: positions, material: color(css, sev === 'none' ? 0.05 : 0.22), classificationType: Cesium.ClassificationType.TERRAIN },
          polyline: { positions: [...positions, positions[0]], width: 1.5, material: color('#c9ecff', 0.7), clampToGround: true },
          sentry: { code, title: name, rows: [count > 0 ? `${count} active incidents` : 'No active incidents'] },
        });
      }
    }
    for (const area of Array.isArray(areas) ? areas : []) {
      const ring = area?.geometry?.coordinates?.[0];
      if (!Array.isArray(ring) || area.status === 'resolved') continue;
      const css = area.kind === 'safe' ? '#3d8b63' : sevColor(area.severity);
      const positions = ring.map(([lng, lat]) => Cesium.Cartesian3.fromDegrees(lng, lat));
      areaSource.entities.add({
        polygon: { hierarchy: positions, material: color(css, 0.35), classificationType: Cesium.ClassificationType.BOTH },
        polyline: { positions, width: 3, material: color(css, 0.95), clampToGround: true },
        sentry: { title: area.name, rows: [area.kind === 'safe' ? 'Safe zone' : `Affected area, ${area.severity} severity`, area.notes] },
      });
    }
    for (const incident of Array.isArray(incidents) ? incidents : []) {
      const coords = incidentCoords(incident);
      if (!coords || String(incident.status).toLowerCase() === 'resolved') continue;
      const sev = normalizeSeverity(incident.severity);
      incidentSource.entities.add(point(coords.lng, coords.lat, sevColor(sev === 'unknown' ? 'low' : sev), 14, {
        title: String(incident.type || 'incident').replace(/_/g, ' '), rows: [`Severity: ${sev}`, `Status: ${incident.status || 'not recorded'}`], incidentId: String(incident._id || incident.id || ''),
      }));
    }
    for (const site of Array.isArray(sites) ? sites : []) {
      const [lng, lat] = site?.location?.coordinates || [];
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || site.roadAccess === 'BLOCKED') continue;
      siteSource.entities.add(point(lng, lat, '#3d8b63', 12, { title: site.name || 'Relocation site', rows: [`Road access: ${site.roadAccess || 'UNKNOWN'}`] }));
    }
    for (const event of Array.isArray(hazardEvents) ? hazardEvents : []) {
      if (!event.current || !Number.isFinite(event.lat) || !Number.isFinite(event.lng)) continue;
      hazards.entities.add(point(event.lng, event.lat, event.type === 'TC' ? '#d64545' : '#4f7c8a', 16, { title: `${event.typeLabel}: ${event.name}`, rows: [event.severity, event.level && `Alert level: ${event.level}`] }));
    }
    for (const quake of Array.isArray(quakes) ? quakes : []) {
      if (!(quake.mag >= 3) || !Number.isFinite(quake.lat) || !Number.isFinite(quake.lng)) continue;
      hazards.entities.add(point(quake.lng, quake.lat, '#a78bfa', 12, { title: `Earthquake M ${quake.mag.toFixed(1)}`, rows: [quake.place] }));
    }
    viewer.entities.resumeEvents();
    viewer.scene.requestRender();
  }, [ready, incidents, areas, sites, hazardEvents, quakes, stateIndex, stateRows]);

  // Layer switches.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!ready || !viewer) return;
    for (const key of ['states', 'areas', 'incidents', 'sites', 'hazards', 'route']) {
      if (sourcesRef.current[key]) sourcesRef.current[key].show = !hidden.has(key);
    }
    if (osmRef.current && !osmRef.current.isDestroyed()) osmRef.current.show = !hidden.has('buildings');
    viewer.scene.requestRender();
  }, [ready, hidden]);

  // The outline being drawn.
  useEffect(() => {
    const Cesium = cesiumRef.current;
    const draft = sourcesRef.current.draft;
    const viewer = viewerRef.current;
    if (!ready || !Cesium || !draft) return;
    draft.entities.removeAll();
    const points = draw?.points || [];
    const cartesians = points.map(([lng, lat]) => Cesium.Cartesian3.fromDegrees(lng, lat));
    for (const position of cartesians) {
      draft.entities.add({ position, point: { pixelSize: 11, color: Cesium.Color.WHITE, outlineColor: Cesium.Color.fromCssColorString('#0ea5e9'), outlineWidth: 3, heightReference: Cesium.HeightReference.CLAMP_TO_GROUND, disableDepthTestDistance: Number.POSITIVE_INFINITY } });
    }
    if (cartesians.length >= 3) {
      draft.entities.add({
        polygon: { hierarchy: cartesians, material: Cesium.Color.fromCssColorString('#4f7c8a').withAlpha(0.3), classificationType: Cesium.ClassificationType.BOTH },
        polyline: { positions: [...cartesians, cartesians[0]], width: 3, material: Cesium.Color.fromCssColorString('#e0f2fe'), clampToGround: true },
      });
    } else if (cartesians.length === 2) {
      draft.entities.add({ polyline: { positions: cartesians, width: 3, material: Cesium.Color.fromCssColorString('#e0f2fe'), clampToGround: true } });
    }
    viewer.scene.requestRender();
  }, [ready, draw]);

  // Arrival animation, after the reference video (see cesiumRipples.js).
  const lastEvent = useRef(null);
  const playArrival = (event) => {
    const coords = incidentCoords(event.incident);
    if (!coords || !cesiumRef.current || !viewerRef.current || controlsRef.current?.arrivalEnabled === false) return;
    playGlobeRipple(cesiumRef.current, viewerRef.current, sourcesRef.current.fx, event, coords, lastEvent.current);
    lastEvent.current = coords;
  };
  const arrivalAreas = useMemo(() => areasToArrivalIncidents(areas), [areas]);
  const arrivals = useIncidentArrivals(allIncidents || incidents, playArrival, ready) + useIncidentArrivals(arrivalAreas, playArrival, ready);

  const applyFocus = (presetId) => {
    setHidden(presetId ? hiddenForFocus('globe', presetId) : new Set());
    onFocusPresetChange?.(presetId);
  };
  const toggleGroup = (key) => setHidden((current) => {
    onFocusPresetChange?.(null);
    const next = new Set(current);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const tilt = (down) => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium) return;
    setFlat(down);
    viewer.camera.flyTo({
      destination: viewer.camera.positionWC,
      orientation: { heading: viewer.camera.heading, pitch: Cesium.Math.toRadians(down ? -90 : -45), roll: 0 },
      duration: 0.8,
    });
  };
  const startDrawing = () => { drawingRef.current = true; setForm(EMPTY_FORM); setDraw({ points: [], saving: false, error: '' }); setPanelOpen(false); };
  const save = async () => {
    if (!draw || draw.points.length < 3 || !form.name.trim()) return;
    setDraw({ ...draw, saving: true, error: '' });
    try {
      await onCreateArea({
        name: form.name.trim(),
        kind: form.kind,
        severity: form.kind === 'safe' ? 'low' : form.severity,
        geometry: { type: 'Polygon', coordinates: [[...draw.points, draw.points[0]]] },
      });
      setDraw(null);
    } catch (error) {
      setDraw((current) => (current ? { ...current, saving: false, error: error?.response?.data?.message || error?.message || 'The area could not be saved.' } : current));
    }
  };

  // Controls panel: saved points, the chosen relocation site, the emergency road route and the map display.
  const flyToLngLat = useCallback((lng, lat, range) => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;
    if (!Cesium || !viewer) return;
    viewer.camera.flyToBoundingSphere(new Cesium.BoundingSphere(Cesium.Cartesian3.fromDegrees(lng, lat), 1), {
      offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), range), duration: 1.8,
    });
  }, []);
  const userPoints = controls?.userPoints;
  useEffect(() => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;
    const source = sourcesRef.current.points;
    if (!ready || !Cesium || !source) return;
    source.entities.removeAll();
    for (const point of userPoints || []) {
      source.entities.add({
        position: Cesium.Cartesian3.fromDegrees(point.lng, point.lat),
        point: { pixelSize: 16, color: Cesium.Color.fromCssColorString('#22d3ee'), outlineColor: Cesium.Color.WHITE, outlineWidth: 3, heightReference: Cesium.HeightReference.CLAMP_TO_GROUND, disableDepthTestDistance: Number.POSITIVE_INFINITY },
        sentry: { title: point.name || 'Saved map point', rows: [`${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`] },
      });
    }
    viewer.scene.requestRender();
  }, [ready, userPoints]);
  // The camera only follows choices made while this map is showing, not ones left over from another tab.
  const handled = useRef({ point: controls?.focusPoint?.nonce, site: controls?.siteNonce, route: controls?.route?.summary });
  const focusPoint = controls?.focusPoint;
  useEffect(() => {
    if (handled.current.point === focusPoint?.nonce) return;
    const point = (controlsRef.current?.userPoints || []).find((item) => item.id === focusPoint?.id);
    if (ready && point) { handled.current.point = focusPoint.nonce; flyToLngLat(point.lng, point.lat, 3000); }
  }, [ready, focusPoint, flyToLngLat]);
  const selectedSite = controls?.selectedSite;
  const siteNonce = controls?.siteNonce;
  useEffect(() => {
    const [lng, lat] = selectedSite?.location?.coordinates || [];
    if (!ready || handled.current.site === siteNonce || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    handled.current.site = siteNonce;
    flyToLngLat(lng, lat, 3500);
    const timer = window.setTimeout(() => setPicked({ title: selectedSite.name || 'Relocation site', rows: [`Road access: ${selectedSite.roadAccess || 'UNKNOWN'}`] }), 0);
    return () => window.clearTimeout(timer);
  }, [ready, selectedSite, siteNonce, flyToLngLat]);
  const routeSummary = controls?.route?.summary;
  useEffect(() => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;
    const source = sourcesRef.current.route;
    if (!ready || !Cesium || !source) return;
    source.entities.removeAll();
    const line = (routeSummary?.coordinates || []).filter((pair) => Number.isFinite(pair?.[0]) && Number.isFinite(pair?.[1]));
    if (line.length > 1) {
      const positions = Cesium.Cartesian3.fromDegreesArray(line.flatMap(([lat, lng]) => [lng, lat]));
      source.entities.add({ polyline: { positions, width: 7, clampToGround: true, material: new Cesium.PolylineOutlineMaterialProperty({ color: Cesium.Color.fromCssColorString('#22d3ee'), outlineColor: Cesium.Color.fromCssColorString('#04121f'), outlineWidth: 2 }) } });
      if (handled.current.route !== routeSummary) {
        handled.current.route = routeSummary;
        viewer.camera.flyToBoundingSphere(Cesium.BoundingSphere.fromPoints(positions), { duration: 1.8, offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-60), 0) });
      }
    }
    viewer.scene.requestRender();
  }, [ready, routeSummary]);
  const chooseStyle = (key) => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;
    const provider = IMAGERY_PROVIDERS.find((item) => item.id === key);
    if (!Cesium || !viewer || !provider) return;
    const layer = viewer.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({ url: provider.url, maximumLevel: provider.maxzoom, credit: provider.name }), 0);
    layer.brightness = 0.82; layer.saturation = 0.9; layer.contrast = 1.08;
    if (baseLayerRef.current && !baseLayerRef.current.isDestroyed()) viewer.imageryLayers.remove(baseLayerRef.current, true);
    baseLayerRef.current = layer;
    setStyleKey(key);
    viewer.scene.requestRender();
  };

  // Fly to the picked view, and when RESET VIEW is pressed.
  const goToRegion = useCallback((duration) => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;
    if (!Cesium || !viewer) return;
    const region = getCommandCenterRegion(focus.id);
    const bounds = region.kind === 'national' ? INDIA_VIEW_BOUNDS : region.bounds;
    const [[south, west], [north, east]] = bounds;
    const center = Cesium.Cartesian3.fromDegrees((west + east) / 2, (south + north) / 2);
    const sphere = new Cesium.BoundingSphere(center, 1);
    const pitch = region.kind === 'national' ? -50 : region.kind === 'region' ? -40 : -45;
    const range = cameraRangeFor(bounds) * (region.kind === 'national' ? 1.35 : 1);
    const options = { offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(pitch), range) };
    viewer.camera.flyToBoundingSphere(sphere, { ...options, duration });
  }, [focus.id]);
  useEffect(() => {
    if (ready) goToRegion(focus.token === 0 ? 0 : 2.2);
  }, [ready, focus.id, focus.token, goToRegion]);

  return (
    <div className="icc-globe">
      <div ref={boxRef} className="icc-globe-canvas" />
      <div className="icc-gl-controls" role="group" aria-label="Map tools">
        <button type="button" className={flat ? 'active' : ''} onClick={() => tilt(true)}>2D</button>
        <button type="button" className={flat ? '' : 'active'} onClick={() => tilt(false)}>3D</button>
        <button type="button" className={panelOpen ? 'active' : ''} aria-expanded={panelOpen} onClick={() => setPanelOpen((open) => !open)}>LAYERS</button>
        {canDraw ? <button type="button" className={draw ? 'active' : ''} onClick={draw ? () => setDraw(null) : startDrawing}>{draw ? 'CANCEL' : 'DRAW AREA'}</button> : null}
      </div>
      {controls?.arrivalEnabled === false ? null : <IncidentHits count={arrivals} />}
      {controls && controlsTarget && controlsActive ? createPortal(
        <SharedMapControls
          controls={controls}
          sites={sites}
          layers={LAYER_BUTTONS}
          hidden={hidden}
          onToggleLayer={toggleGroup}
          focusId={focusPresetId}
          onApplyFocus={applyFocus}
          styleOptions={STYLE_OPTIONS}
          mapStyle={styleKey}
          onSetMapStyle={chooseStyle}
          onResetView={() => { applyFocus(null); goToRegion(1.6); }}
          idPrefix="globe"
        />,
        controlsTarget,
      ) : null}
      {panelOpen ? (
        <ul className="icc-gl-layers" aria-label="Map layers">
          {Object.entries(GLOBE_LAYERS).map(([key, label]) => (
            <li key={key}><label><input type="checkbox" checked={!hidden.has(key)} onChange={() => toggleGroup(key)} />{label}</label></li>
          ))}
        </ul>
      ) : null}
      {draw ? (
        <div className="icc-gl-draw" role="group" aria-label="Draw an area">
          <b>Click the globe to outline the area ({draw.points.length} {draw.points.length === 1 ? 'point' : 'points'})</b>
          <label>Name<input type="text" value={form.name} maxLength={120} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>Type
            <select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value })}>
              <option value="affected">Affected area</option>
              <option value="safe">Safe zone</option>
            </select>
          </label>
          {form.kind === 'affected' ? (
            <label>Severity
              <select value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value })}>
                {SEVERITIES.map((level) => <option key={level} value={level}>{level}</option>)}
              </select>
            </label>
          ) : null}
          {draw.error ? <p className="icc-gl-error" role="alert">{draw.error}</p> : null}
          <div className="icc-gl-draw-actions">
            <button type="button" onClick={() => setDraw((current) => (current ? { ...current, points: current.points.slice(0, -1) } : current))} disabled={draw.points.length === 0 || draw.saving}>Undo point</button>
            <button type="button" className="primary" onClick={save} disabled={draw.points.length < 3 || !form.name.trim() || draw.saving}>{draw.saving ? 'Saving…' : 'Save area'}</button>
          </div>
        </div>
      ) : null}
      <p className={`icc-globe-status${state.photoreal ? ' good' : ''}`} role="status">
        {state.status === 'loading' ? 'Loading the 3D globe…' : null}
        {state.status === 'error' ? `The 3D globe could not start: ${state.message}` : null}
        {state.status === 'ready' ? <>{info.label}. {state.photoreal ? '' : info.note} {state.message}</> : null}
      </p>
      {pilot?.pilot ? (
        <div className="icc-globe-pilot" role="group" aria-label="Pilot building data">
          <b>{pilot.pilot.name}: {pilot.pilot.source === 'overture' ? 'Overture Maps buildings' : 'Cesium OSM Buildings'}</b>
          {pilot.pilot.source === 'overture' ? (
            <>
              <div>{pilot.pilot.counts.total} drawn · {pilot.pilot.counts.recorded} with a recorded height · {pilot.pilot.counts.estimated} height estimated from floors · {pilot.pilot.counts.default} drawn at a default 5 m</div>
              <div className="icc-globe-key"><i style={{ background: '#4a7096' }} />recorded <i style={{ background: '#607082' }} />estimated <i style={{ background: '#a4adb8' }} />default</div>
            </>
          ) : (
          <div className="icc-globe-key"><i style={{ background: '#cbd4dd' }} />recorded height <i style={{ background: '#bdc7d1' }} />floors only <i style={{ background: '#dce2e8' }} />no height (3 m default)</div>
          )}
          <button type="button" onClick={() => pilotRef.current?.toggleSource()}>Compare: show {pilot.pilot.source === 'overture' ? 'Cesium OSM Buildings' : 'Overture Maps'}</button>
        </div>
      ) : null}
      {pilot?.pilotError ? <p className="icc-globe-status" role="status" style={{ top: 'auto', bottom: 40 }}>{pilot.pilotError}</p> : null}
      {picked ? (
        <div className="icc-globe-pick" role="dialog" aria-label="Selected record">
          <b>{picked.title}</b>
          {(picked.rows || []).filter(Boolean).map((row) => <div key={row}>{row}</div>)}
          <button type="button" onClick={() => setPicked(null)}>Close</button>
        </div>
      ) : null}
      <span className="icc-sr">{scopeId}</span>
    </div>
  );
}
