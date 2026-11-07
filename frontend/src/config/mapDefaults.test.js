import test from 'node:test';
import assert from 'node:assert/strict';
import { CITIZEN_INITIAL_MAP_STYLE } from './mapDefaults.js';
test('citizen safety map defaults to dark OpenStreetMap (Sampad GIS)', () => {
  assert.equal(CITIZEN_INITIAL_MAP_STYLE, 'osmdark');
});
