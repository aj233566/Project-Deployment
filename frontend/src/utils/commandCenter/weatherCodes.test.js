import test from 'node:test';
import assert from 'node:assert/strict';
import { compassPoint, describeWeather, formatVisibility } from './weatherCodes.js';

test('weather codes map to a description and an icon key', () => {
  assert.deepEqual(describeWeather(0), { text: 'Clear sky', icon: 'clear' });
  assert.deepEqual(describeWeather(63), { text: 'Rain', icon: 'rain' });
  assert.deepEqual(describeWeather(95), { text: 'Thunderstorm', icon: 'storm' });
  assert.deepEqual(describeWeather(45), { text: 'Fog', icon: 'fog' });
  assert.equal(describeWeather(1234).text, 'Conditions unavailable');
  assert.equal(describeWeather(null).text, 'Conditions unavailable');
});

test('compass points and visibility formatting', () => {
  assert.equal(compassPoint(0), 'N');
  assert.equal(compassPoint(90), 'E');
  assert.equal(compassPoint(225), 'SW');
  assert.equal(compassPoint(359), 'N');
  assert.equal(compassPoint(-90), 'W');
  assert.equal(compassPoint(undefined), '');
  assert.equal(formatVisibility(3980), '4.0 km');
  assert.equal(formatVisibility(20000), '20 km');
  assert.equal(formatVisibility(450), '450 m');
  assert.equal(formatVisibility(null), '—');
});
