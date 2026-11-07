import test from 'node:test';
import assert from 'node:assert/strict';
import { mapProviderLabel } from './mapProviderLabel.js';
test('citizen map display identifies the selected provider', () => {
  assert.equal(mapProviderLabel('osm'), 'OPENSTREETMAP');
  assert.equal(mapProviderLabel('satellite'), 'ESRI');
  assert.equal(mapProviderLabel('unknown'), 'OPENSTREETMAP');
});
