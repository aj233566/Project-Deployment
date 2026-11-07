// Which 3D globe source the app can use, decided by the credentials present.
//   keyless        nothing                              -> Esri imagery on open terrain, OSM footprints on 3D MAP
//   ion-osm        a Cesium ion access token            -> adds Cesium OSM Buildings and Cesium World Terrain (free Community plan)
//   google-ion     a token AND VITE_ALLOW_GOOGLE_3D=1   -> Google Photorealistic 3D Tiles through ion (a quota, personal use only)
//   google-direct  a Google key AND VITE_ALLOW_GOOGLE_3D=1 -> the same tiles from Google (metered, billing required)
// Google is never used unless it is switched on explicitly, so adding an ion token cannot start Google charges or quota use.
//
// Keys put in a Vite variable are readable in the browser, so a Google key must be restricted to this site's address
// and to the Map Tiles API in the Google Cloud console.

export const CESIUM_VERSION = '1.146.0';
export const CESIUM_BASE_URL = `https://cdn.jsdelivr.net/npm/cesium@${CESIUM_VERSION}/Build/Cesium/`;
export const KEYLESS_TERRAIN_URL = 'https://terrain.reearth.land/cesium-mesh/ellipsoid';
export const ESRI_IMAGERY_URL = 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer';
export const ESRI_IMAGERY_TILE_URL = `${ESRI_IMAGERY_URL}/tile/{z}/{y}/{x}`;
export const ESRI_IMAGERY_MAX_NATIVE_ZOOM = 18;
// Cesium ion asset id of Google Photorealistic 3D Tiles.
export const ION_GOOGLE_ASSET_ID = 2275207;

export function createEsriImageryProvider(Cesium) {
  return new Cesium.UrlTemplateImageryProvider({
    url: ESRI_IMAGERY_TILE_URL,
    tilingScheme: new Cesium.WebMercatorTilingScheme(),
    maximumLevel: ESRI_IMAGERY_MAX_NATIVE_ZOOM,
    credit: 'Imagery © Esri, Maxar, Earthstar Geographics',
  });
}

const clean = (value) => String(value || '').trim();

export function selectGlobeRoute({ googleKey = '', ionToken = '', allowGoogle = false } = {}) {
  if (allowGoogle && clean(googleKey)) return 'google-direct';
  if (allowGoogle && clean(ionToken)) return 'google-ion';
  if (clean(ionToken)) return 'ion-osm';
  return 'keyless';
}

const DESCRIPTIONS = {
  'google-direct': { photoreal: true, label: 'Google Photorealistic 3D Tiles (direct key)', note: 'Metered by Google; the Google logo and attribution must stay visible; tiles may not be cached or analysed.' },
  'google-ion': { photoreal: true, label: 'Google Photorealistic 3D Tiles (through Cesium ion)', note: 'The free ion plan is for personal, non-commercial use and allows 1,000 root tiles a month.' },
  'ion-osm': { photoreal: false, label: 'Satellite globe with Cesium OSM Buildings and world terrain', note: 'Buildings are OpenStreetMap footprints with the heights OpenStreetMap has. The free Cesium plan is for non-commercial use and evaluation; an operational government deployment needs a paid plan.' },
  keyless: { photoreal: false, label: 'Satellite globe with open terrain (no 3D buildings on this tab)', note: 'The 3D MAP shows available OpenStreetMap footprints without an account; a Cesium ion token enables Cesium OSM Buildings on both map views.' },
};

export function describeGlobeRoute(route) {
  return DESCRIPTIONS[route] || DESCRIPTIONS.keyless;
}

// Camera distance (metres) that frames a region: its larger side in degrees, in kilometres, with margin.
export function cameraRangeFor(bounds) {
  const [[south, west], [north, east]] = bounds;
  const midLat = ((south + north) / 2) * (Math.PI / 180);
  const heightKm = (north - south) * 111;
  const widthKm = (east - west) * 111 * Math.cos(midLat);
  return Math.round(Math.max(heightKm, widthKm, 20) * 1000 * 1.7);
}
