import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatLatLon } from './formatCoords.js';
test('formats a northern/eastern coordinate with 4 decimals and hemisphere letters', () => {
  assert.equal(formatLatLon(27.285, 88.565), '27.2850°N 88.5650°E');
});
test('uses S and W for negative latitude/longitude', () => {
  assert.equal(formatLatLon(-27.285, -88.565), '27.2850°S 88.5650°W');
});
test('treats zero as N/E (not negative)', () => {
  assert.equal(formatLatLon(0, 0), '0.0000°N 0.0000°E');
});
test('returns an em-dash placeholder when either value is missing', () => {
  assert.equal(formatLatLon(null, 88.565), '—');
  assert.equal(formatLatLon(27.285, undefined), '—');
  assert.equal(formatLatLon(NaN, 5), '—');
});
test('honors a custom decimals argument', () => {
  assert.equal(formatLatLon(12.3456, 65.4321, 2), '12.35°N 65.43°E');
});
