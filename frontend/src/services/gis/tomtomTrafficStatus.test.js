import test from 'node:test';
import assert from 'node:assert/strict';
import {
  reportTomTomTileFailure,
  tomtomTrafficStatusMessage,
} from './tomtomTrafficStatus.js';
test('TomTom tile failure exposes unavailable traffic status', () => {
  let status = 'ready';
  reportTomTomTileFailure((nextStatus) => {
    status = nextStatus;
  });
  assert.equal(status, 'unavailable');
  assert.equal(
    tomtomTrafficStatusMessage(status),
    'Live TomTom traffic unavailable — congestion data is not current'
  );
});
