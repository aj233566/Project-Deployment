const OSM_TILES = Object.freeze({
  type: 'raster',
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; OpenStreetMap contributors',
  subdomains: '',
  maxNativeZoom: 19,
  maxZoom: 19,
});

export const MAP_TILE_SOURCES = Object.freeze({
  osmdark: OSM_TILES,
  osm: OSM_TILES,
  dark: Object.freeze({
    type: 'raster',
    url: 'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxNativeZoom: 16,
    maxZoom: 19,
    labels: 'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    labelsMaxNativeZoom: 16,
  }),
  satellite: Object.freeze({
    type: 'raster',
    url: 'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
    maxNativeZoom: 18,
    maxZoom: 19,
    labels: 'https://services.arcgisonline.com/arcgis/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    labelsMaxNativeZoom: 18,
  }),
  terrain: Object.freeze({
    type: 'raster',
    url: 'https://services.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri, HERE, Garmin, USGS, NGA',
    maxNativeZoom: 17,
    maxZoom: 19,
  }),
});
