export const MAP_STYLE_OPTIONS = [
  { key: 'osm', label: 'OpenStreetMap', shortLabel: 'OSM', provider: 'OpenStreetMap' },
  { key: 'osmdark', label: 'Sampad GIS', shortLabel: 'GIS', provider: 'OpenStreetMap' },
  { key: 'satellite', label: 'Satellite', shortLabel: 'SAT', provider: 'Esri' },
];
export const MAP_STYLE_KEYS = MAP_STYLE_OPTIONS.map(({ key }) => key);
export const DEFAULT_MAP_STYLE = 'osmdark';
