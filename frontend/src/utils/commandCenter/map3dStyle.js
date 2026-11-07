// Style for the 3D map: darkened satellite imagery on real elevation data, with glowing roads, water, boundaries
// and extruded buildings from OpenStreetMap vector tiles. Every source is a free public tile service.
//
//   imagery   Esri World Imagery (also used by the app's Satellite tab)
//   terrain   AWS Terrain Tiles, "terrarium" encoding (open data: SRTM, GMTED, and others)
//   vectors   OpenFreeMap (OpenStreetMap roads, water, available building footprints, boundaries and places)
//   buildings Cesium OSM Buildings 3D Tiles when a Cesium ion token is configured, with vector footprints as fallback

export const DEM_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
export const IMAGERY_URL = 'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
export const VECTOR_URL = 'https://tiles.openfreemap.org/planet';
export const GLYPHS_URL = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
export const CESIUM_OSM_BUILDINGS_LAYER_ID = 'cesium-osm-buildings';

// Extent includes mainland India, Jammu and Kashmir, and the southern islands with room for map labels.
export const INDIA_VIEW_BOUNDS = [[5.5, 67.5], [37.6, 98.2]];

// MapLibre emits these while users pan or zoom; they are expected request cancellations, not missing data.
export function isActionableMapTileError(event) {
  if (!event?.sourceId || !event.error) return false;
  const error = event.error;
  const message = String(error.message || '');
  if (error.name === 'AbortError' || /\b(abort(?:ed)?|cancel(?:led|ed)?|superseded)\b/i.test(message)) return false;
  if (error.status === 0 || error.statusCode === 0) return false;
  return true;
}

// Imagery providers in order of preference. The map switches down the list when tiles keep failing.
//   Esri World Imagery: sub-metre in cities, free to view with attribution; Esri's terms govern commercial use.
// Esri returns successful placeholder tiles in some areas at z19, so keep the source at z18 and overzoom those tiles.
//   EOX Sentinel-2 cloudless: 10 m worldwide mosaic; free for non-commercial use (CC BY-NC-SA), attribution required.
//   NASA GIBS VIIRS true colour: 250 m, public domain; reaches zoom 9 only, then the tiles are enlarged.
export const IMAGERY_PROVIDERS = Object.freeze([
  { id: 'esri', name: 'Esri World Imagery', maxzoom: 18, url: IMAGERY_URL, licence: 'Esri terms' },
  { id: 'eox', name: 'Sentinel-2 cloudless (EOX)', maxzoom: 13, url: 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg', licence: 'CC BY-NC-SA 4.0, non-commercial' },
  { id: 'gibs', name: 'NASA VIIRS true colour', maxzoom: 9, url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg', licence: 'Public domain' },
]);
export const MAP_MAX_ZOOM = IMAGERY_PROVIDERS[0].maxzoom;

// Which layers each switch in the layer panel shows or hides.
export const LAYER_GROUPS = Object.freeze({
  heat: { label: 'Rain / wind heat', ids: ['heat'] },
  fires: { label: 'Active fires', ids: ['fires'] },
  buildings: { label: '3D buildings', ids: ['buildings-flat', 'buildings-3d'] },
  roads: { label: 'Roads and rail', ids: ['road-glow', 'road-minor', 'road-major', 'road-trunk', 'road-motorway', 'rail'] },
  areas: { label: 'Affected areas and safe zones', ids: ['area-fill', 'area-line', 'zone-fill', 'zone-glow'] },
  hazards: { label: 'Hazard icons', ids: ['hazard-icon'] },
  habitations: { label: 'Habitations', ids: ['habitation-dot'] },
  incidents: { label: 'Incidents', ids: ['incident-halo', 'incident-cluster-ring', 'incident-cluster', 'incident-cluster-count', 'incident-icon'] },
  sites: { label: 'Relocation sites', ids: ['site-icon'] },
  route: { label: 'Emergency road route', ids: ['route-casing', 'route-line'] },
  states: { label: 'State risk tint', ids: ['state-fill'] },
  labels: { label: 'Place names', ids: ['label-state', 'label-city', 'label-village', 'label-water'] },
});

export const SEVERITY_COLOR = { critical: '#f87171', high: '#fb923c', medium: '#facc15', low: '#4ade80' };

// OpenFreeMap fills render_height with a default of 5 m when OSM has neither a height nor a level count.
// Give those footprints a low 5 m model so areas without surveyed heights still have 3D coverage.
// Keep the treatment subdued because this height is a visualization default, not measured building data.
export const DEFAULT_BUILDING_HEIGHT = 5;
export const MAX_BUILDING_RENDER_HEIGHT = 180;

const FONT = ['Noto Sans Regular'];
const NOT_MARITIME = ['!=', ['get', 'maritime'], 1];

// Text on the map canvas follows the page's 18 px minimum.
const textSize = (stops) => ['interpolate', ['linear'], ['zoom'], ...stops];

// State tint: strongest on the national map, fading to a hint by city zoom so the imagery and buildings show through.
// With a state open, that state is a little stronger and the others fade back.
export function stateFillOpacity(activeCode) {
  const level = (strong, weak, none) => (activeCode
    ? ['case', ['==', ['get', 'code'], activeCode], strong, ['==', ['get', 'sev'], 'none'], none / 2, weak]
    : ['case', ['==', ['get', 'sev'], 'none'], none, strong]);
  return ['interpolate', ['linear'], ['zoom'], 3, level(0.28, 0.1, 0.05), 7, level(0.2, 0.07, 0.04), 10, level(0.03, 0.01, 0.005), 11, level(0, 0, 0)];
}

// NASA GIBS WMS tile for the VIIRS active-fire detections (the layer is vector on the WMTS side).
// Use NASA's `default` time so the service picks its latest available day instead of requesting a future/missing tile.
export function fireTileUrl() {
  return 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1'
    + '&LAYERS=VIIRS_SNPP_Thermal_Anomalies_375m_All&STYLES=&FORMAT=image/png&TRANSPARENT=true&SRS=EPSG:3857'
    + '&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}&TIME=default';
}

// Building colour: light grey for low and default-height buildings, with blue-grey highlights for taller buildings.
// Within each class the shade varies from building to building by a repeatable function of its own height values
// (no random numbers and no invented data), so a street is not one flat colour.
const shadeOf = () => ['%', ['+', ['*', ['coalesce', ['get', 'render_height'], 5], 37.3], ['*', ['coalesce', ['get', 'render_min_height'], 0], 11.7]], 1];
export function buildingColor() {
  const height = ['coalesce', ['get', 'render_height'], DEFAULT_BUILDING_HEIGHT];
  const between = (low, high) => ['interpolate', ['linear'], shadeOf(), 0, low, 1, high];
  return ['case',
    ['<=', height, DEFAULT_BUILDING_HEIGHT], between('#aab3be', '#c1cad4'),
    ['<', height, 12], between('#b9c4d0', '#d1d9e2'),
    ['<', height, 30], between('#c9d4df', '#e0e7ee'),
    ['<', height, 70], between('#d7e0e9', '#edf2f6'),
    between('#e4eaf0', '#f8fafc')];
}

export function buildMap3dStyle() {
  const roadWidth = (a, b, c) => ['interpolate', ['exponential', 1.5], ['zoom'], 5, a, 10, b, 16, c];
  return {
    version: 8,
    name: 'SENTRY 3D',
    glyphs: GLYPHS_URL,
    // A low sun from the south-west: each wall and roof gets its own brightness, which gives buildings their shape.
    light: { anchor: 'map', position: [1.4, 215, 38], color: '#fff0d8', intensity: 0.62 },
    sky: {
      'sky-color': '#07142a',
      'horizon-color': '#1b4f8f',
      'fog-color': '#0a1a33',
      'sky-horizon-blend': 0.6,
      'horizon-fog-blend': 0.7,
      'fog-ground-blend': 0.3,
    },
    sources: {
      imagery: {
        type: 'raster', tiles: [IMAGERY_PROVIDERS[0].url], tileSize: 256, maxzoom: IMAGERY_PROVIDERS[0].maxzoom,
        attribution: 'Imagery © Esri, Maxar, Earthstar Geographics; fallbacks: Sentinel-2 cloudless by EOX (contains modified Copernicus Sentinel data), NASA GIBS',
      },
      dem: {
        type: 'raster-dem', tiles: [DEM_URL], tileSize: 256, maxzoom: 15, encoding: 'terrarium',
        attribution: 'Elevation: AWS Terrain Tiles (SRTM, GMTED and others)',
      },
      // A second copy of the elevation source: sharing one between terrain and hillshade lowers rendering quality.
      'dem-shade': { type: 'raster-dem', tiles: [DEM_URL], tileSize: 256, maxzoom: 15, encoding: 'terrarium' },
      osm: {
        type: 'vector', url: VECTOR_URL,
        attribution: '© OpenStreetMap contributors, OpenFreeMap',
      },
      fires: {
        // NASA GIBS VIIRS uses the GoogleMapsCompatible_Level9 matrix set. Keep
        // requests at its native maximum and let MapLibre overzoom those tiles.
        type: 'raster', tiles: [fireTileUrl()], tileSize: 256, maxzoom: 9,
        attribution: 'Active fires: NASA FIRMS / GIBS (VIIRS 375 m)',
      },
      heat: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
      hazards: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
      states: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
      zones: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
      incidents: { type: 'geojson', cluster: true, clusterMaxZoom: 7, clusterRadius: 44, data: { type: 'FeatureCollection', features: [] } },
      areas: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
      sites: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
      draft: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
      arcs: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
      route: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
      points: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
      habitations: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#040b17' } },
      {
        id: 'imagery', type: 'raster', source: 'imagery',
        paint: {
          'raster-brightness-max': 0.7, 'raster-brightness-min': 0.04, 'raster-saturation': -0.1,
          'raster-contrast': 0.14, 'raster-hue-rotate': 0, 'raster-fade-duration': 150,
        },
      },
      {
        id: 'hillshade', type: 'hillshade', source: 'dem-shade',
        paint: {
          'hillshade-shadow-color': '#000814', 'hillshade-highlight-color': '#6f93c4', 'hillshade-accent-color': '#16345f',
          'hillshade-exaggeration': 0.55, 'hillshade-illumination-direction': 315,
        },
      },
      // Navy grade over the imagery so roads, zones and labels stay readable.
      { id: 'grade', type: 'background', paint: { 'background-color': '#071a36', 'background-opacity': 0.0 } },

      // ---- glowing hazard heat: forecast rain and gusts across the country plus active incidents ----
      {
        id: 'heat', type: 'heatmap', source: 'heat', maxzoom: 12,
        paint: {
          'heatmap-weight': ['get', 'w'],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 3, 0.9, 9, 1.6],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 3, 38, 6, 70, 9, 120, 12, 160],
          'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(0,0,0,0)', 0.12, 'rgba(74,222,128,0.28)',
            0.32, 'rgba(250,204,21,0.5)', 0.55, 'rgba(251,146,60,0.68)', 0.8, 'rgba(248,113,113,0.8)', 1, 'rgba(255,60,60,0.9)'],
          'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.95, 9, 0.8, 12, 0.25],
        },
      },

      // ---- risk tint per state ----
      {
        id: 'state-fill', type: 'fill', source: 'states',
        paint: {
          'fill-color': ['match', ['get', 'sev'], 'critical', SEVERITY_COLOR.critical, 'high', SEVERITY_COLOR.high,
            'medium', SEVERITY_COLOR.medium, 'low', SEVERITY_COLOR.low, '#38bdf8'],
          'fill-opacity': stateFillOpacity(''),
        },
      },

      // ---- water ----
      { id: 'water', type: 'fill', source: 'osm', 'source-layer': 'water', paint: { 'fill-color': '#1479d4', 'fill-opacity': 0.42 } },
      {
        id: 'waterway-glow', type: 'line', source: 'osm', 'source-layer': 'waterway', minzoom: 6,
        paint: { 'line-color': '#38bdf8', 'line-opacity': 0.35, 'line-blur': 4, 'line-width': roadWidth(1.5, 5, 10) },
      },
      {
        id: 'waterway', type: 'line', source: 'osm', 'source-layer': 'waterway', minzoom: 6,
        paint: { 'line-color': '#60c8ff', 'line-opacity': 0.9, 'line-width': roadWidth(0.5, 1.4, 3.5) },
      },

      // ---- boundaries ----
      {
        id: 'district-line', type: 'line', source: 'osm', 'source-layer': 'boundary', minzoom: 7,
        filter: ['all', ['>=', ['get', 'admin_level'], 5], ['<=', ['get', 'admin_level'], 6], NOT_MARITIME],
        paint: { 'line-color': '#7dd3fc', 'line-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.18, 12, 0.5], 'line-width': 0.8, 'line-dasharray': [3, 2] },
      },
      {
        id: 'state-glow', type: 'line', source: 'osm', 'source-layer': 'boundary', minzoom: 3,
        filter: ['all', ['==', ['get', 'admin_level'], 4], NOT_MARITIME],
        paint: { 'line-color': '#38bdf8', 'line-opacity': 0.3, 'line-blur': 5, 'line-width': ['interpolate', ['linear'], ['zoom'], 3, 3, 10, 9] },
      },
      {
        id: 'state-line', type: 'line', source: 'osm', 'source-layer': 'boundary', minzoom: 3,
        filter: ['all', ['==', ['get', 'admin_level'], 4], NOT_MARITIME],
        paint: { 'line-color': '#c9ecff', 'line-opacity': 0.7, 'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.7, 10, 2] },
      },
      {
        id: 'country-glow', type: 'line', source: 'osm', 'source-layer': 'boundary', minzoom: 1,
        filter: ['all', ['==', ['get', 'admin_level'], 2], NOT_MARITIME],
        paint: { 'line-color': '#7dd3fc', 'line-opacity': 0.5, 'line-blur': 6, 'line-width': 8 },
      },
      {
        id: 'country-line', type: 'line', source: 'osm', 'source-layer': 'boundary', minzoom: 1,
        filter: ['all', ['==', ['get', 'admin_level'], 2], NOT_MARITIME],
        paint: { 'line-color': '#e6f6ff', 'line-opacity': 0.95, 'line-width': 1.6 },
      },
      {
        id: 'state-active', type: 'line', source: 'states', filter: ['==', ['get', 'code'], ''],
        paint: { 'line-color': '#ffffff', 'line-width': 3, 'line-blur': 0.5, 'line-opacity': 0.95 },
      },

      // ---- roads: soft glow underneath, then a thin bright line; brightness steps down with road class ----
      {
        id: 'road-glow', type: 'line', source: 'osm', 'source-layer': 'transportation', minzoom: 6,
        filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk']]],
        paint: {
          'line-color': ['match', ['get', 'class'], 'motorway', '#fbbf24', '#fb923c'], 'line-opacity': 0.4, 'line-blur': 4,
          'line-width': roadWidth(2, 6, 14),
        },
      },
      {
        id: 'road-minor', type: 'line', source: 'osm', 'source-layer': 'transportation', minzoom: 12,
        filter: ['in', ['get', 'class'], ['literal', ['minor', 'service', 'track', 'tertiary']]],
        paint: { 'line-color': '#e6eefb', 'line-opacity': 0.3, 'line-width': roadWidth(0.3, 0.7, 2.2) },
      },
      {
        id: 'road-major', type: 'line', source: 'osm', 'source-layer': 'transportation', minzoom: 8,
        filter: ['in', ['get', 'class'], ['literal', ['primary', 'secondary']]],
        paint: { 'line-color': '#e2e8f0', 'line-opacity': 0.6, 'line-width': roadWidth(0.5, 1.2, 4) },
      },
      {
        id: 'road-trunk', type: 'line', source: 'osm', 'source-layer': 'transportation', minzoom: 7,
        filter: ['==', ['get', 'class'], 'trunk'],
        paint: { 'line-color': '#fb923c', 'line-opacity': 0.95, 'line-width': roadWidth(0.8, 1.6, 4.5) },
      },
      {
        id: 'road-motorway', type: 'line', source: 'osm', 'source-layer': 'transportation', minzoom: 5.5,
        filter: ['==', ['get', 'class'], 'motorway'],
        paint: { 'line-color': '#fbbf24', 'line-opacity': ['interpolate', ['linear'], ['zoom'], 5.5, 0.35, 9, 1], 'line-width': roadWidth(0.7, 2, 5.5) },
      },
      {
        id: 'rail', type: 'line', source: 'osm', 'source-layer': 'transportation', minzoom: 9,
        filter: ['==', ['get', 'class'], 'rail'],
        paint: { 'line-color': '#a78bfa', 'line-opacity': 0.55, 'line-width': 1, 'line-dasharray': [4, 3] },
      },

      // ---- 3D buildings ----
      {
        id: 'buildings-flat', type: 'fill-extrusion', source: 'osm', 'source-layer': 'building', minzoom: 12,
        filter: ['all', ['!=', ['get', 'hide_3d'], true], ['<=', ['coalesce', ['get', 'render_height'], DEFAULT_BUILDING_HEIGHT], DEFAULT_BUILDING_HEIGHT]],
        paint: {
          'fill-extrusion-color': '#8997a3',
          'fill-extrusion-height': DEFAULT_BUILDING_HEIGHT,
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': 0.56, 'fill-extrusion-vertical-gradient': true,
        },
      },
      {
        id: 'buildings-3d', type: 'fill-extrusion', source: 'osm', 'source-layer': 'building', minzoom: 12,
        filter: ['all', ['!=', ['get', 'hide_3d'], true], ['>', ['coalesce', ['get', 'render_height'], DEFAULT_BUILDING_HEIGHT], DEFAULT_BUILDING_HEIGHT]],
        paint: {
          'fill-extrusion-color': buildingColor(),
          'fill-extrusion-height': ['min', ['get', 'render_height'], MAX_BUILDING_RENDER_HEIGHT],
          'fill-extrusion-base': ['min', ['coalesce', ['get', 'render_min_height'], 0], MAX_BUILDING_RENDER_HEIGHT],
          'fill-extrusion-opacity': 0.97, 'fill-extrusion-vertical-gradient': true,
        },
      },

      {
        id: 'fires', type: 'raster', source: 'fires', minzoom: 3,
        paint: { 'raster-opacity': 0.95, 'raster-brightness-min': 0.2, 'raster-saturation': 0.6, 'raster-fade-duration': 150 },
      },

      // ---- areas drawn by authorities (real outlines) ----
      {
        id: 'area-fill', type: 'fill', source: 'areas',
        paint: {
          'fill-color': ['case', ['==', ['get', 'kind'], 'safe'], '#4ade80', ['match', ['get', 'sev'], 'critical', SEVERITY_COLOR.critical, 'high', SEVERITY_COLOR.high, 'medium', SEVERITY_COLOR.medium, SEVERITY_COLOR.low]],
          'fill-opacity': 0.28,
        },
      },
      {
        id: 'area-line', type: 'line', source: 'areas',
        paint: {
          'line-color': ['case', ['==', ['get', 'kind'], 'safe'], '#86efac', ['match', ['get', 'sev'], 'critical', SEVERITY_COLOR.critical, 'high', SEVERITY_COLOR.high, 'medium', SEVERITY_COLOR.medium, SEVERITY_COLOR.low]],
          'line-width': 2.5, 'line-blur': 1.5, 'line-opacity': 0.95,
        },
      },

      // ---- disaster zones (modelled radius around a reported incident) and habitation risk points ----
      {
        id: 'zone-fill', type: 'fill', source: 'zones',
        paint: {
          'fill-color': ['match', ['get', 'sev'], 'critical', SEVERITY_COLOR.critical, 'high', SEVERITY_COLOR.high, 'medium', SEVERITY_COLOR.medium, SEVERITY_COLOR.low],
          'fill-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.18, 14, 0.1],
        },
      },
      {
        id: 'zone-glow', type: 'line', source: 'zones',
        paint: {
          'line-color': ['match', ['get', 'sev'], 'critical', SEVERITY_COLOR.critical, 'high', SEVERITY_COLOR.high, 'medium', SEVERITY_COLOR.medium, SEVERITY_COLOR.low],
          'line-width': 2, 'line-blur': 4, 'line-opacity': 0.55,
        },
      },
      {
        id: 'habitation-dot', type: 'circle', source: 'habitations', minzoom: 6,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 4, 14, 9],
          'circle-color': ['match', ['get', 'level'], 'RED', '#f87171', 'ORANGE', '#fb923c', 'YELLOW', '#facc15', 'GREEN', '#4ade80', '#94a3b8'],
          'circle-stroke-color': '#06101f', 'circle-stroke-width': 1.5, 'circle-opacity': 0.9,
        },
      },
      {
        id: 'incident-halo', type: 'circle', source: 'incidents', filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 14, 12, 26], 'circle-blur': 0.8, 'circle-opacity': 0.55,
          'circle-color': ['match', ['get', 'sev'], 'critical', SEVERITY_COLOR.critical, 'high', SEVERITY_COLOR.high, 'medium', SEVERITY_COLOR.medium, SEVERITY_COLOR.low],
        },
      },
      {
        id: 'incident-icon', type: 'symbol', source: 'incidents', filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': ['concat', 'warn-', ['get', 'sev']], 'icon-allow-overlap': true, 'icon-ignore-placement': true,
          'icon-size': ['interpolate', ['linear'], ['zoom'], 3, 0.55, 8, 0.8, 14, 1.1],
        },
      },
      {
        id: 'site-icon', type: 'symbol', source: 'sites', minzoom: 5,
        layout: { 'icon-image': 'safe', 'icon-allow-overlap': true, 'icon-size': ['interpolate', ['linear'], ['zoom'], 5, 0.6, 12, 1] },
      },
      {
        id: 'hazard-icon', type: 'symbol', source: 'hazards',
        layout: {
          'icon-image': ['get', 'icon'], 'icon-allow-overlap': true, 'icon-ignore-placement': true,
          'icon-size': ['interpolate', ['linear'], ['zoom'], 3, 0.6, 8, 0.85, 14, 1.1],
        },
      },

      // ---- dotted arcs between consecutive incident events (arrival animation) ----
            { id: 'arc-casing', type: 'line', source: 'arcs', paint: { 'line-color': '#101d29', 'line-width': 6, 'line-opacity': 0.5 } },
      { id: 'arc-line', type: 'line', source: 'arcs', paint: { 'line-color': '#fecaca', 'line-width': 2, 'line-dasharray': [3, 2.5], 'line-opacity': 0.9 } },

      // ---- the emergency road route, and the points saved from the Controls panel ----
      { id: 'route-casing', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#04121f', 'line-width': 9, 'line-opacity': 0.9 } },
      { id: 'route-line', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#22d3ee', 'line-width': 5 } },
      { id: 'point-dot', type: 'circle', source: 'points', paint: { 'circle-radius': 9, 'circle-color': '#22d3ee', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3 } },

      // ---- the outline being drawn ----
      { id: 'draft-fill', type: 'fill', source: 'draft', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#38bdf8', 'fill-opacity': 0.25 } },
      { id: 'draft-line', type: 'line', source: 'draft', filter: ['!=', ['geometry-type'], 'Point'], paint: { 'line-color': '#e0f2fe', 'line-width': 2.5, 'line-dasharray': [2, 1.5] } },
      { id: 'draft-point', type: 'circle', source: 'draft', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 7, 'circle-color': '#ffffff', 'circle-stroke-color': '#0ea5e9', 'circle-stroke-width': 3 } },

      // ---- labels ----
      {
        id: 'label-state', type: 'symbol', source: 'osm', 'source-layer': 'place', minzoom: 3, maxzoom: 8,
        filter: ['in', ['get', 'class'], ['literal', ['state', 'province']]],
        layout: { 'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']], 'text-font': FONT, 'text-size': textSize([3, 18, 7, 22]), 'text-transform': 'uppercase', 'text-letter-spacing': 0.12 },
        paint: { 'text-color': '#dff3ff', 'text-halo-color': '#020817', 'text-halo-width': 2, 'text-opacity': 0.85 },
      },
      {
        id: 'label-city', type: 'symbol', source: 'osm', 'source-layer': 'place', minzoom: 4,
        filter: ['in', ['get', 'class'], ['literal', ['city', 'town']]],
        layout: { 'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']], 'text-font': FONT, 'text-size': textSize([4, 18, 12, 24]), 'symbol-sort-key': ['get', 'rank'] },
        paint: { 'text-color': '#ffffff', 'text-halo-color': '#020817', 'text-halo-width': 2 },
      },
      {
        id: 'label-village', type: 'symbol', source: 'osm', 'source-layer': 'place', minzoom: 10,
        filter: ['in', ['get', 'class'], ['literal', ['village', 'suburb', 'neighbourhood']]],
        layout: { 'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']], 'text-font': FONT, 'text-size': 18 },
        paint: { 'text-color': '#cfe6ff', 'text-halo-color': '#020817', 'text-halo-width': 2 },
      },
      {
        id: 'label-water', type: 'symbol', source: 'osm', 'source-layer': 'water_name', minzoom: 3,
        layout: { 'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']], 'text-font': FONT, 'text-size': 18, 'text-letter-spacing': 0.2, 'text-transform': 'uppercase' },
        paint: { 'text-color': '#6cc3ff', 'text-halo-color': '#020817', 'text-halo-width': 1.5, 'text-opacity': 0.9 },
      },

      // Cluster badges sit above the place names so the number is never hidden behind a label.
      {
        id: 'incident-cluster-ring', type: 'circle', source: 'incidents', filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#fb923c', 'circle-opacity': 0.22, 'circle-stroke-width': 0,
          'circle-radius': ['step', ['get', 'point_count'], 30, 10, 36, 50, 42],
        },
      },
      {
        // A cluster is a plain orange badge with a white edge and the number of incidents in dark ink, so it reads on any imagery.
        id: 'incident-cluster', type: 'circle', source: 'incidents', filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#fb923c', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3,
          'circle-radius': ['step', ['get', 'point_count'], 20, 10, 26, 50, 32],
        },
      },
      {
        id: 'incident-cluster-count', type: 'symbol', source: 'incidents', filter: ['has', 'point_count'],
        layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': FONT, 'text-size': 18, 'text-allow-overlap': true },
        paint: { 'text-color': '#101d29' },
      },
    ],
  };
}

// A circle on the ground as a polygon ring of [lng, lat] points, `radiusM` metres from the centre.
export function circlePolygon(lat, lng, radiusM, steps = 48) {
  const ring = [];
  const dLat = radiusM / 111320;
  const dLng = radiusM / (111320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));
  for (let i = 0; i <= steps; i += 1) {
    const angle = (i / steps) * Math.PI * 2;
    ring.push([Number((lng + dLng * Math.cos(angle)).toFixed(6)), Number((lat + dLat * Math.sin(angle)).toFixed(6))]);
  }
  return [ring];
}

// Modelled impact radius per severity (the same figures the 2D map uses for its soft discs).
export const ZONE_RADIUS_M = { critical: 2600, high: 1900, medium: 1300, low: 950 };

// Leaflet zoom z is the same view as MapLibre zoom z - 1 (256 px against 512 px tiles).
export const toLeafletZoom = (glZoom) => glZoom + 1;
export const toGlZoom = (leafletZoom) => leafletZoom - 1;

// The area a map shows, from centre, zoom and canvas size, ignoring pitch (pitch stretches the visible ground).
export function flatViewport(center, glZoom, width, height) {
  const degPerPx = 360 / (512 * 2 ** glZoom);
  const halfLng = (width * degPerPx) / 2;
  const halfLat = (height * degPerPx * Math.cos((center.lat * Math.PI) / 180)) / 2;
  return { south: center.lat - halfLat, north: center.lat + halfLat, west: center.lng - halfLng, east: center.lng + halfLng };
}
