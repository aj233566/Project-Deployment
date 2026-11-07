import test from 'node:test';
import assert from 'node:assert/strict';
import { createTomTomKeyring, buildTomTomTrafficTiles, normalizeTomTomKeys } from './tomtom.js';
test('normalizes comma-separated TomTom keys without duplicates or placeholders', () => {
  assert.deepEqual(
    normalizeTomTomKeys(' first-key, your-tomtom-key, second-key, first-key '),
    ['first-key', 'second-key']
  );
});
test('keyring advances through configured TomTom keys and stops at the last key', () => {
  const keyring = createTomTomKeyring(['first-key', 'second-key']);
  assert.equal(keyring.current(), 'first-key');
  assert.equal(keyring.advance(), true);
  assert.equal(keyring.current(), 'second-key');
  assert.equal(keyring.advance(), false);
  assert.equal(keyring.current(), 'second-key');
});
test('traffic tile URLs use the selected key and encode it safely', () => {
  const tiles = buildTomTomTrafficTiles('key with space');
  assert.match(tiles.trafficFlow, /key=key%20with%20space/);
  assert.match(tiles.trafficIncidents, /incidents\/s3/);
});
