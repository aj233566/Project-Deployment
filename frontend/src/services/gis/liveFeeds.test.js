import test from 'node:test';
import assert from 'node:assert/strict';
import { filterIndiaEarthquakes } from './liveFeeds.js';
test('filters foreign quake points again at the feed boundary', () => {
  const visible = filterIndiaEarthquakes([
    { id: 'delhi', lat: 28.64, lng: 77.21 },
    { id: 'afghanistan', lat: 36.5, lng: 71.0 },
    { id: 'tibet', lat: 33.0, lng: 90.0 },
    { id: 'ocean', lat: 4.5, lng: 77.0 },
  ]);
  assert.deepEqual(visible.map((quake) => quake.id), ['delhi']);
});
test('rejects malformed quake arrays without throwing', () => {
  assert.deepEqual(filterIndiaEarthquakes(null), []);
  assert.deepEqual(filterIndiaEarthquakes([{ id: 'bad', lat: '28', lng: 77 }]), []);
});
