import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import {
  IMAGERY_PROVIDERS, INDIA_VIEW_BOUNDS, LAYER_GROUPS, MAP_MAX_ZOOM, buildMap3dStyle, flatViewport, isActionableMapTileError, stateFillOpacity, toGlZoom, toLeafletZoom,
} from '../../utils/commandCenter/map3dStyle';
import {
  areasToGeoJson, draftToGeoJson, habitationsToGeoJson, hazardsToGeoJson, heatToGeoJson, incidentsToGeoJson,
  sitesToGeoJson, statesToGeoJson, zonesToGeoJson,
} from '../../utils/commandCenter/map3dData';
import { addMapIcons } from '../../utils/commandCenter/map3dIcons';
import { arcBetween, areasToArrivalIncidents, calloutFor } from '../../utils/commandCenter/incidentEvents';
import { arrowMarkup, fxColor, glyphKey, headingDeg, pinMarkup } from '../../utils/commandCenter/fxMarkup';
import { hiddenForFocus } from '../../utils/commandCenter/mapFocus';
import SharedMapControls from './SharedMapControls';
import { IncidentHits } from './IncidentHits';
import { incidentCoords } from '../../utils/commandCenter/incidentStats';
import { useIncidentArrivals } from '../../hooks/useIncidentArrivals';
import { getCommandCenterRegion } from '../../utils/gis/commandCenterRegions';
import { ZOOM_ENTER_STATE } from '../../utils/commandCenter/scope';

// MapLibre 6 keeps its worker in a separate file; tile decoding (vectors, elevation) cannot run without it.
maplibregl.setWorkerUrl(workerUrl);

// How far the camera may wander. It must be wide: on a very wide screen a tight box forces a zoom above the one where auto switching opens
// a state, and the page would flip from India to the state under the centre by itself.
const INDIA_BOUNDS = [[25, -12], [135, 62]];
const PITCH = { national: 0, region: 52, state: 48 };
// This many failed imagery tiles inside the window move the map to the next imagery provider.
const IMAGERY_FAILURES = 8;
const FAILURE_WINDOW_MS = 30000;
const SEVERITIES = ['critical', 'high', 'medium', 'low'];

// Wraps the MapLibre map in the small subset of the Leaflet API that the page and the zoom-switching hook use.
function createAdapter(map, container) {
  return {
    on: (event, handler) => map.on(event, handler),
    off: (event, handler) => map.off(event, handler),
    getSize: () => ({ x: map.getCanvas().clientWidth, y: map.getCanvas().clientHeight }),
    getCenter: () => { const c = map.getCenter(); return { lat: c.lat, lng: c.lng }; },
    getZoom: () => toLeafletZoom(map.getZoom()),
    getBounds: () => {
      const view = flatViewport(map.getCenter(), map.getZoom(), map.getCanvas().clientWidth, map.getCanvas().clientHeight);
      return { getSouth: () => view.south, getNorth: () => view.north, getWest: () => view.west, getEast: () => view.east };
    },
    getContainer: () => container,
    flyTo: ([lat, lng], leafletZoom, options = {}) => map.flyTo({ center: [lng, lat], zoom: toGlZoom(leafletZoom), pitch: Math.min(Math.max(map.getPitch(), 45), 60), duration: (options.duration || 1) * 1000, curve: 1.3 }),
    invalidateSize: () => map.resize(),
    fitBounds: (bounds, options = {}) => map.fitBounds([[bounds[0][1], bounds[0][0]], [bounds[1][1], bounds[1][0]]], { padding: 40, maxZoom: options.maxZoom ? toGlZoom(options.maxZoom) : undefined, duration: 1200 }),
    kind: 'maplibre',
  };
}

const text = (tag, content) => {
  const element = document.createElement(tag);
  element.textContent = content;
  return element;
};

function popup(map, lngLat, rows, offset = 14) {
  const body = document.createElement('div');
  rows.filter(Boolean).forEach((row, index) => body.append(text(index === 0 ? 'b' : 'div', row)));
  new maplibregl.Popup({ closeButton: true, offset, className: 'icc-gl-popup' }).setLngLat(lngLat).setDOMContent(body).addTo(map);
}

// Replaces the imagery source with the next provider (the source's maximum zoom is fixed when it is created).
function swapImagery(map, provider) {
  const spec = buildMap3dStyle().layers.find((layer) => layer.id === 'imagery');
  if (map.getLayer('imagery')) map.removeLayer('imagery');
  if (map.getSource('imagery')) map.removeSource('imagery');
  map.addSource('imagery', { type: 'raster', tiles: [provider.url], tileSize: 256, maxzoom: provider.maxzoom });
  map.addLayer(spec, 'hillshade');
}

const EMPTY_FORM = { name: '', kind: 'affected', severity: 'high' };

// The Controls panel's layer buttons and map displays on this map.
const LAYER_ORDER = ['incidents', 'areas', 'habitations', 'sites', 'route', 'roads', 'buildings', 'states', 'hazards', 'heat', 'fires', 'labels'];
const LAYER_BUTTONS = LAYER_ORDER.filter((key) => LAYER_GROUPS[key]).map((key) => ({
  key,
  label: { incidents: 'INC', sites: 'SITE', route: 'ROUTE', areas: 'ZONE', habitations: 'HAB', roads: 'ROAD', buildings: 'BLDG', states: 'RISK', labels: 'NAME', heat: 'HEAT', fires: 'FIRE', hazards: 'HAZ' }[key] || key.toUpperCase(),
  title: LAYER_GROUPS[key].label,
}));
const STYLE_OPTIONS = IMAGERY_PROVIDERS.map((provider) => ({ key: provider.id, label: provider.name, shortLabel: { esri: 'ESRI', eox: 'S2', gibs: 'VIIRS' }[provider.id] || provider.id, provider: provider.licence }));
const lineCollection = (coordinates) => ({ type: 'FeatureCollection', features: coordinates.length > 1 ? [{ type: 'Feature', geometry: { type: 'LineString', coordinates }, properties: {} }] : [] });

// Dark satellite map with real terrain, extruded OpenStreetMap buildings, glowing roads, rivers and boundaries,
// state risk tints, drawn areas, impact zones and incident points. Data layers are updated in place when records change.
export default function Map3D({
  incidents, habitations, sites, areas, heatPlaces, hazardEvents, quakes, stateIndex, stateRows, scopeId, focus,
  canDraw, onCreateArea, onSelectView, onMapInstance, onFail, controls, allIncidents, focusPresetId, onFocusPresetChange,
  controlsTarget, controlsActive,
}) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const readyRef = useRef(false);
  const terrainWantedRef = useRef(false);
  const tipRef = useRef(null);
  const drawingRef = useRef(false);
  const failures = useRef({ imagery: [], other: [], provider: 0 });
  const latest = useRef({ onSelectView, onMapInstance, onFail });
  const controlsRef = useRef(controls);
  const [styleKey, setStyleKey] = useState(IMAGERY_PROVIDERS[0].id);
  const [ready, setReady] = useState(false);
  const [pitch, setPitch] = useState(PITCH.national);
  const [notice, setNotice] = useState('');
  const [hidden, setHidden] = useState(() => new Set());
  const [panelOpen, setPanelOpen] = useState(false);
  const [draw, setDraw] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => { latest.current = { onSelectView, onMapInstance, onFail }; controlsRef.current = controls; });
  useEffect(() => { drawingRef.current = Boolean(draw); }, [draw]);
  useEffect(() => {
    if (focusPresetId) setHidden(hiddenForFocus('map3d', focusPresetId));
  }, [focusPresetId]);

  const incidentData = useMemo(() => incidentsToGeoJson(incidents), [incidents]);
  const zoneData = useMemo(() => zonesToGeoJson(incidents), [incidents]);
  const habitationData = useMemo(() => habitationsToGeoJson(habitations), [habitations]);
  const siteData = useMemo(() => sitesToGeoJson(sites), [sites]);
  const areaData = useMemo(() => areasToGeoJson(areas), [areas]);
  const heatData = useMemo(() => heatToGeoJson(heatPlaces, incidents), [heatPlaces, incidents]);
  const hazardData = useMemo(() => hazardsToGeoJson(hazardEvents, quakes), [hazardEvents, quakes]);
  const stateData = useMemo(() => statesToGeoJson(stateIndex?.entries, stateRows), [stateIndex, stateRows]);
  const draftData = useMemo(() => draftToGeoJson(draw?.points), [draw]);

  const handleTileError = useCallback((map, event) => {
    const now = Date.now();
    if (!isActionableMapTileError(event)) return;
    const bucket = event.sourceId === 'imagery' ? failures.current.imagery : failures.current.other;
    bucket.push(now);
    while (bucket.length && now - bucket[0] > FAILURE_WINDOW_MS) bucket.shift();
    if (event.sourceId === 'imagery' && bucket.length >= IMAGERY_FAILURES && failures.current.provider < IMAGERY_PROVIDERS.length - 1) {
      failures.current.provider += 1;
      failures.current.imagery = [];
      const next = IMAGERY_PROVIDERS[failures.current.provider];
      swapImagery(map, next);
      setNotice(`Satellite imagery provider was not responding. Now using ${next.name} (${next.licence}).`);
    } else if (event.sourceId !== 'imagery' && bucket.length >= 6) {
      setNotice('Some map layers are not loading right now. The map keeps working with the data it has.');
    }
  }, []);

  useEffect(() => {
    let map;
    try {
      map = new maplibregl.Map({
        container: boxRef.current,
        style: buildMap3dStyle(),
        center: [82.5, 22.5],
        zoom: 3.2,
        pitch: PITCH.national,
        maxPitch: 68,
        maxZoom: MAP_MAX_ZOOM,
        maxBounds: INDIA_BOUNDS,
        minZoom: 2.5,
        renderWorldCopies: false,
        attributionControl: { compact: true },
        canvasContextAttributes: { antialias: false },
      });
    } catch (error) {
      latest.current.onFail?.(error);
      return undefined;
    }
    mapRef.current = map;
    if (import.meta.env.DEV) window.__sentryGl = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    const adapter = createAdapter(map, boxRef.current);

    map.on('error', (event) => {
      if (event?.error?.message && /WebGL|context/i.test(event.error.message)) latest.current.onFail?.(event.error);
      else if (event?.sourceId) handleTileError(map, event);
    });
    map.on('pitchend', () => setPitch(Math.round(map.getPitch())));
    map.on('style.load', () => addMapIcons(map));
    map.on('load', () => {
      readyRef.current = true;
      if (terrainWantedRef.current) map.setTerrain({ source: 'dem', exaggeration: 1.35 });
      setReady(true);
      latest.current.onMapInstance?.(adapter);
    });

    // While an outline is being drawn, clicks add points and nothing else reacts.
    map.on('click', (event) => {
      // "Add map point" from the Controls panel: the next click drops a saved point.
      if (!drawingRef.current && controlsRef.current?.addPointMode) {
        controlsRef.current.addPoint(Number(event.lngLat.lat.toFixed(6)), Number(event.lngLat.lng.toFixed(6)));
        return;
      }
      if (!drawingRef.current) return;
      setDraw((current) => (current ? { ...current, points: [...current.points, [Number(event.lngLat.lng.toFixed(6)), Number(event.lngLat.lat.toFixed(6))]] } : current));
    });
    map.on('click', 'state-fill', (event) => {
      if (drawingRef.current || controlsRef.current?.addPointMode) return;
      const hit = map.queryRenderedFeatures(event.point, { layers: ['incident-icon', 'hazard-icon', 'incident-cluster', 'area-fill', 'site-icon'] });
      if (hit.length) return;
      const code = event.features?.[0]?.properties?.code;
      if (code) latest.current.onSelectView?.(code);
    });
    map.on('click', 'incident-cluster', async (event) => {
      if (drawingRef.current) return;
      const feature = event.features?.[0];
      if (!feature) return;
      const zoom = await map.getSource('incidents').getClusterExpansionZoom(feature.properties.cluster_id);
      map.easeTo({ center: feature.geometry.coordinates, zoom: zoom + 0.5, duration: 700 });
    });
    map.on('click', 'hazard-icon', (event) => {
      if (drawingRef.current) return;
      const props = event.features?.[0]?.properties || {};
      popup(map, event.lngLat, [`${props.label}: ${props.name}`, props.level && `Alert level: ${props.level}`, props.detail], 16);
    });
    map.on('click', 'incident-icon', (event) => {
      if (drawingRef.current || controlsRef.current?.addPointMode) return;
      const props = event.features?.[0]?.properties || {};
      controlsRef.current?.selectIncident(props.id || '');
      popup(map, event.lngLat, [String(props.type).replace(/_/g, ' '), `Severity: ${props.sev}`, `Status: ${props.status || 'not recorded'}`]);
    });
    map.on('click', 'site-icon', (event) => {
      if (drawingRef.current) return;
      const props = event.features?.[0]?.properties || {};
      popup(map, event.lngLat, [props.name, `Road access: ${props.access}`, Number(props.free) >= 0 ? `${props.free} of ${props.total} places free` : 'Capacity not recorded'], 16);
    });
    map.on('click', 'area-fill', (event) => {
      if (drawingRef.current) return;
      const props = event.features?.[0]?.properties || {};
      popup(map, event.lngLat, [props.name, props.kind === 'safe' ? 'Safe zone' : `Affected area, ${props.sev} severity`, props.hazard && `Hazard: ${props.hazard}`, props.notes], 0);
    });
    for (const layer of ['state-fill', 'incident-icon', 'incident-cluster', 'hazard-icon', 'site-icon', 'area-fill']) {
      map.on('mouseenter', layer, () => { if (!drawingRef.current) map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', layer, () => { if (!drawingRef.current) map.getCanvas().style.cursor = ''; if (layer === 'state-fill' && tipRef.current) tipRef.current.hidden = true; });
    }
    map.on('mousemove', 'state-fill', (event) => {
      const tip = tipRef.current;
      const props = event.features?.[0]?.properties;
      if (!tip || !props || drawingRef.current) return;
      tip.hidden = false;
      tip.style.left = `${event.point.x + 16}px`;
      tip.style.top = `${event.point.y + 16}px`;
      tip.replaceChildren(
        text('b', props.name),
        text('span', props.count > 0 ? `${props.count} active · ${props.critical} critical · ${props.high} high` : 'No active incidents'),
        text('em', 'Click to open this state'),
      );
    });

    return () => {
      readyRef.current = false;
      latest.current.onMapInstance?.(null);
      map.remove();
      mapRef.current = null;
    };
  }, [handleTileError]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const sets = { incidents: incidentData, zones: zoneData, habitations: habitationData, sites: siteData, areas: areaData, states: stateData, heat: heatData, hazards: hazardData, draft: draftData };
    for (const [name, data] of Object.entries(sets)) map.getSource(name)?.setData(data);
  }, [ready, incidentData, zoneData, habitationData, siteData, areaData, stateData, heatData, hazardData, draftData]);

  // Layer switches.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    for (const [key, group] of Object.entries(LAYER_GROUPS)) {
      for (const id of group.ids) {
        if (!map.getLayer(id)) continue;
        const buildingsIn3dView = key !== 'buildings' || pitch >= 10;
        const visible = !hidden.has(key) && buildingsIn3dView;
        map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
      }
    }
  }, [ready, hidden, pitch]);

  // Highlight the open state and dim the rest.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const code = scopeId === 'india' ? '' : (scopeId === 'ncr' ? 'IN-DL' : scopeId);
    map.setFilter('state-active', ['==', ['get', 'code'], code]);
    map.setPaintProperty('state-fill', 'fill-opacity', stateFillOpacity(code));
  }, [ready, scopeId]);

  // Move the camera when a view is picked (list, badge, outline, back button), and when RESET VIEW is pressed.
  const goToRegion = useCallback((duration) => {
    const map = mapRef.current;
    if (!map) return;
    const region = getCommandCenterRegion(focus.id);
    const [[south, west], [north, east]] = region.kind === 'national' ? INDIA_VIEW_BOUNDS : region.bounds;
    terrainWantedRef.current = region.kind !== 'national';
    if (readyRef.current && map.isStyleLoaded()) {
      map.setTerrain(terrainWantedRef.current ? { source: 'dem', exaggeration: 1.35 } : null);
    }
    map.fitBounds([[west, south], [east, north]], {
      padding: region.kind === 'national' ? { top: 30, bottom: 30, left: 30, right: 30 } : 50,
      // The India view must stay clearly below the zoom where auto switching opens a state, or a resize of the map (which fires a move)
      // on a large screen would flip the whole page to the state under the centre.
      maxZoom: region.kind === 'national' ? Math.min(toGlZoom(region.maxZoom), toGlZoom(ZOOM_ENTER_STATE) - 0.35) : toGlZoom(region.maxZoom),
      pitch: PITCH[region.kind] ?? 45,
      bearing: 0,
      duration,
    });
  }, [focus.id]);
  useEffect(() => {
    if (ready) goToRegion(focus.token === 0 ? 0 : 1800);
  }, [ready, focus.id, focus.token, goToRegion]);

  // Controls panel: saved points, the chosen relocation site and the emergency road route.
  const userPoints = controls?.userPoints;
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.getSource('points')?.setData({
      type: 'FeatureCollection',
      features: (userPoints || []).map((point) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [point.lng, point.lat] }, properties: { id: point.id } })),
    });
  }, [ready, userPoints]);
  // The camera only follows choices made while this map is showing, not ones left over from another tab.
  const handled = useRef({ point: controls?.focusPoint?.nonce, site: controls?.siteNonce, route: controls?.route?.summary });
  const focusPoint = controls?.focusPoint;
  useEffect(() => {
    const map = mapRef.current;
    if (handled.current.point === focusPoint?.nonce) return;
    const point = (controlsRef.current?.userPoints || []).find((item) => item.id === focusPoint?.id);
    if (ready && map && point) { handled.current.point = focusPoint.nonce; map.flyTo({ center: [point.lng, point.lat], zoom: Math.max(map.getZoom(), 12), pitch: 50, duration: 1200 }); }
  }, [ready, focusPoint]);
  const selectedSite = controls?.selectedSite;
  const siteNonce = controls?.siteNonce;
  useEffect(() => {
    const map = mapRef.current;
    const [lng, lat] = selectedSite?.location?.coordinates || [];
    if (!ready || !map || handled.current.site === siteNonce || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    handled.current.site = siteNonce;
    map.flyTo({ center: [lng, lat], zoom: 14, pitch: 55, duration: 1400 });
    popup(map, [lng, lat], [selectedSite.name, `Road access: ${selectedSite.roadAccess || 'UNKNOWN'}`], 16);
  }, [ready, selectedSite, siteNonce]);
  const routeSummary = controls?.route?.summary;
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const line = (routeSummary?.coordinates || []).map(([lat, lng]) => [lng, lat]);
    map.getSource('route')?.setData(lineCollection(line));
    if (line.length > 1 && handled.current.route !== routeSummary) {
      handled.current.route = routeSummary;
      const lngs = line.map((c) => c[0]);
      const lats = line.map((c) => c[1]);
      map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 90, maxZoom: 15, duration: 1400 });
    }
  }, [ready, routeSummary]);

  const chooseStyle = (key) => {
    const index = IMAGERY_PROVIDERS.findIndex((provider) => provider.id === key);
    const map = mapRef.current;
    if (index < 0 || !map) return;
    failures.current.provider = index;
    failures.current.imagery = [];
    swapImagery(map, IMAGERY_PROVIDERS[index]);
    setStyleKey(key);
  };

  useEffect(() => {
    const map = mapRef.current;
    if (map) map.getCanvas().style.cursor = draw ? 'crosshair' : '';
  }, [draw]);

  // Arrival animation, after the reference video: a huge ring and a pale outer ring pulse out, a tight focus ring marks the point,
  // a dotted arc runs from the previous event with a bright dot travelling along it, and a callout chip names what happened.
  const calloutRef = useRef(null);
  const lastEventRef = useRef(null);
  const arcsRef = useRef([]);
  const playArrival = (event) => {
    const map = mapRef.current;
    const coords = incidentCoords(event.incident);
    if (!map || !coords || controlsRef.current?.arrivalEnabled === false) return;
    const info = calloutFor(event);
    const lngLat = [coords.lng, coords.lat];

    const rings = document.createElement('div');
    rings.className = `icc-pulse icc-sev-${info.severity}`;
    for (const name of ['big', 'inner']) {
      const ring = document.createElement('i');
      ring.className = name;
      rings.append(ring);
    }
    // The location pin, with a small symbol for the kind of incident.
    const pinHost = document.createElement('div');
    pinHost.innerHTML = pinMarkup(fxColor(info.severity), glyphKey(event.incident));
    rings.append(pinHost.firstElementChild);
    const ringMarker = new maplibregl.Marker({ element: rings }).setLngLat(lngLat).addTo(map);
    window.setTimeout(() => ringMarker.remove(), 3400);

    const previous = lastEventRef.current;
    lastEventRef.current = lngLat;
    if (previous && (previous[0] !== lngLat[0] || previous[1] !== lngLat[1])) {
      const arc = arcBetween(previous, lngLat, 40);
      const feature = { type: 'Feature', geometry: { type: 'LineString', coordinates: arc }, properties: {} };
      arcsRef.current = [...arcsRef.current.slice(-2), feature];
      map.getSource('arcs')?.setData({ type: 'FeatureCollection', features: arcsRef.current });
      window.setTimeout(() => {
        arcsRef.current = arcsRef.current.filter((item) => item !== feature);
        map.getSource('arcs')?.setData({ type: 'FeatureCollection', features: arcsRef.current });
      }, 4500);
      const dot = document.createElement('div');
      dot.innerHTML = arrowMarkup(fxColor(info.severity));
      const dotMarker = new maplibregl.Marker({ element: dot }).setLngLat(arc[0]).addTo(map);
      const begin = performance.now();
      let heading = 0;
      const move = () => {
        const t = Math.min((performance.now() - begin) / 1600, 1);
        const index = Math.min(Math.floor(t * (arc.length - 1)), arc.length - 1);
        dotMarker.setLngLat(arc[index]);
        // The arrow points along the connector.
        const a = map.project(arc[index]);
        const b = map.project(arc[Math.min(index + 1, arc.length - 1)]);
        heading = headingDeg(b.x - a.x, b.y - a.y, heading);
        dot.firstElementChild?.style.setProperty('--rot', `${heading}deg`);
        if (t < 1) window.requestAnimationFrame(move); else dotMarker.remove();
      };
      window.requestAnimationFrame(move);
    }

    if (calloutRef.current) {
      const old = calloutRef.current;
      old.getElement().classList.add('out');
      window.setTimeout(() => old.remove(), 350);
    }
    const chip = document.createElement('div');
    chip.className = `icc-callout icc-sev-${info.severity}`;
    const icon = document.createElement('i');
    icon.textContent = '▲';
    const text = document.createElement('div');
    const head = document.createElement('b');
    head.textContent = `${info.tag} · ${info.title}`;
    const place = document.createElement('span');
    place.textContent = info.place;
    text.append(head, place);
    chip.append(icon, text);
    calloutRef.current = new maplibregl.Marker({ element: chip, anchor: 'left', offset: [34, -8] }).setLngLat(lngLat).addTo(map);
    const mine = calloutRef.current;
    window.setTimeout(() => { if (calloutRef.current === mine) calloutRef.current = null; mine.remove(); }, 5500);
  };
  const arrivalAreas = useMemo(() => areasToArrivalIncidents(areas), [areas]);
  const arrivals = useIncidentArrivals(allIncidents || incidents, playArrival, ready) + useIncidentArrivals(arrivalAreas, playArrival, ready);

  const tilt = (target) => {
    const map = mapRef.current;
    if (!map) return;
    terrainWantedRef.current = target > 0;
    if (readyRef.current && map.isStyleLoaded()) {
      map.setTerrain(terrainWantedRef.current ? { source: 'dem', exaggeration: 1.35 } : null);
    }
    map.easeTo({ pitch: target, duration: 800 });
  };
  const applyFocus = (presetId) => {
    setHidden(presetId ? hiddenForFocus('map3d', presetId) : new Set());
    onFocusPresetChange?.(presetId);
  };
  const toggleGroup = (key) => setHidden((current) => {
    onFocusPresetChange?.(null);
    const next = new Set(current);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const startDrawing = () => { drawingRef.current = true; setForm(EMPTY_FORM); setDraw({ points: [], saving: false, error: '' }); setPanelOpen(false); };
  const cancelDrawing = () => setDraw(null);
  const undoPoint = () => setDraw((current) => (current ? { ...current, points: current.points.slice(0, -1) } : current));

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

  return (
    <div className="icc-gl">
      <div ref={boxRef} className="icc-gl-canvas" />
      <div ref={tipRef} className="icc-gl-tip" hidden />
      <div className="icc-gl-controls" role="group" aria-label="Map tools">
        <button type="button" className={pitch < 10 ? 'active' : ''} onClick={() => tilt(0)}>2D</button>
        <button type="button" className={pitch >= 10 ? 'active' : ''} onClick={() => tilt(PITCH.region)}>3D</button>
        <button type="button" className={panelOpen ? 'active' : ''} aria-expanded={panelOpen} onClick={() => setPanelOpen((open) => !open)}>LAYERS</button>
        {canDraw ? <button type="button" className={draw ? 'active' : ''} onClick={draw ? cancelDrawing : startDrawing}>{draw ? 'CANCEL' : 'DRAW AREA'}</button> : null}
      </div>

      {controls?.arrivalEnabled === false ? null : <IncidentHits count={arrivals} />}
      {controls && controlsTarget && controlsActive ? createPortal(
        <SharedMapControls
          controls={controls}
          sites={sites}
          layers={LAYER_BUTTONS}
          hidden={hidden}
          onToggleLayer={toggleGroup}
          styleOptions={STYLE_OPTIONS}
          mapStyle={styleKey}
          onSetMapStyle={chooseStyle}
          onResetView={() => { applyFocus(null); goToRegion(1200); }}
          idPrefix="map3d"
        />,
        controlsTarget,
      ) : null}
      {panelOpen ? (
        <ul className="icc-gl-layers" aria-label="Map layers">
          {Object.entries(LAYER_GROUPS).map(([key, group]) => (
            <li key={key}>
              <label><input type="checkbox" checked={!hidden.has(key)} onChange={() => toggleGroup(key)} />{group.label}</label>
            </li>
          ))}
        </ul>
      ) : null}

      {draw ? (
        <div className="icc-gl-draw" role="group" aria-label="Draw an area">
          <b>Click the map to outline the area ({draw.points.length} {draw.points.length === 1 ? 'point' : 'points'})</b>
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
            <button type="button" onClick={undoPoint} disabled={draw.points.length === 0 || draw.saving}>Undo point</button>
            <button type="button" className="primary" onClick={save} disabled={draw.points.length < 3 || !form.name.trim() || draw.saving}>{draw.saving ? 'Saving…' : 'Save area'}</button>
          </div>
        </div>
      ) : null}

      {notice ? (
        <p className="icc-gl-notice" role="status">{notice} <button type="button" onClick={() => setNotice('')}>Dismiss</button></p>
      ) : null}

      {panelOpen ? (
      <ul className="icc-gl-legend" aria-label="Map key">
        <li><i style={{ background: '#fbbf24' }} />Expressway</li>
        <li><i style={{ background: '#d97732' }} />Highway</li>
        <li><i style={{ background: '#60c8ff' }} />River</li>
        <li><i style={{ background: '#76859b' }} />OpenStreetMap building footprints with mapped heights</li>
        <li><i style={{ background: '#8997a3' }} />Other footprints shown as a low 5 m model</li>
        <li><i className="ring" />Incident zone: modelled radius</li>
        <li><i className="area" />Drawn area (real outline)</li>
        <li><i className="heat" />Rain / wind heat, next 24 h</li>
        <li><i style={{ background: '#ff5a1f' }} />Fire detected (NASA VIIRS)</li>
        <li><i className="icon" style={{ borderColor: '#3d8b63' }} />Relocation site</li>
        <li><i className="icon" style={{ borderColor: '#d64545' }} />Cyclone</li>
        <li><i className="icon" style={{ borderColor: '#4f7c8a' }} />Flood</li>
        <li><i className="icon" style={{ borderColor: '#a78bfa' }} />Earthquake M3+</li>
      </ul>
      ) : null}
    </div>
  );
}
