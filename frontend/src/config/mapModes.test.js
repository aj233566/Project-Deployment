import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_MAP_STYLE, MAP_STYLE_KEYS, MAP_STYLE_OPTIONS } from './mapModes.js';
test('offers dark OpenStreetMap (Sampad GIS) as the default basemap and no Google basemap', () => {
  assert.deepEqual(MAP_STYLE_KEYS, ['osm', 'osmdark', 'satellite', 'terrain', 'dark']);
  assert.equal(DEFAULT_MAP_STYLE, 'osmdark');
  assert.equal(MAP_STYLE_OPTIONS.some(({ provider }) => /google/i.test(provider)), false);
});
