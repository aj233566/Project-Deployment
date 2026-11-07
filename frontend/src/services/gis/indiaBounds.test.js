import test from 'node:test';
import assert from 'node:assert/strict';
import { isWithinIndia } from './indiaBounds.js';
const INSIDE = [
  ['Delhi', 77.21, 28.64],
  ['Mumbai', 72.88, 19.08],
  ['Chennai', 80.27, 13.08],
  ['Kolkata', 88.36, 22.57],
  ['Guwahati (Assam)', 91.74, 26.14],
  ['Leh (Ladakh)', 77.58, 34.15],
  ['Srinagar (J&K)', 74.80, 34.08],
  ['Kanyakumari (south tip)', 77.54, 8.09],
  ['Jaisalmer (W Rajasthan)', 70.90, 26.91],
  ['Itanagar (Arunachal)', 93.60, 27.08],
  ['Garhi Mandu (seed incident)', 77.277, 28.701],
];
const OUTSIDE = [
  ['Hindu Kush, Afghanistan', 71.0, 36.5],
  ['Tibet plateau', 90.0, 33.0],
  ['Deep Indian Ocean (south)', 77.0, 4.5],
  ['Karachi, Pakistan', 67.0, 24.86],
  ['Kathmandu, Nepal', 85.32, 27.70],
];
test('Indian territory (mainland, Himalaya, NE, islands-of-data) is inside', () => {
  for (const [name, lng, lat] of INSIDE) {
    assert.equal(isWithinIndia(lat, lng), true, `${name} should be inside India`);
  }
});
test('the floating quake locations and neighbouring countries are excluded', () => {
  for (const [name, lng, lat] of OUTSIDE) {
    assert.equal(isWithinIndia(lat, lng), false, `${name} should be outside India`);
  }
});
test('invalid coordinates are rejected', () => {
  assert.equal(isWithinIndia(undefined, undefined), false);
  assert.equal(isWithinIndia(NaN, 77), false);
  assert.equal(isWithinIndia('28', '77'), false);
});
