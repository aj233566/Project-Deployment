import { MAP_STYLE_OPTIONS } from './mapModes.js';
export function mapProviderLabel(style) {
  const match = MAP_STYLE_OPTIONS.find(({ key }) => key === style);
  return (match ? match.provider : 'OpenStreetMap').toUpperCase();
}
