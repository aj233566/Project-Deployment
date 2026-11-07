import test from 'node:test';
import assert from 'node:assert/strict';
import { directKm, directionsUrl, freePlaces, nearestSites } from './safePlaces.js';

const site = (name, lng, lat, extra = {}) => ({ _id: name, name, location: { coordinates: [lng, lat] }, totalCapacity: 100, occupancy: 20, reservedCapacity: 10, roadAccess: 'OPEN', status: 'ACTIVE', ...extra });
const here = { lat: 28.6, lng: 77.2 };

test('direct distance is about right and free places never go below zero', () => {
  assert.ok(Math.abs(directKm(28.6, 77.2, 28.7, 77.2) - 11.1) < 0.3);
  assert.equal(freePlaces(site('a', 0, 0)), 70);
  assert.equal(freePlaces(site('b', 0, 0, { occupancy: 500 })), 0);
  assert.equal(freePlaces({}), null);
});

test('the nearest active sites come first and unusable ones are left out', () => {
  const list = nearestSites([
    site('far', 77.6, 28.9),
    site('near', 77.21, 28.61),
    site('off', 77.2, 28.6, { status: 'INACTIVE' }),
    { name: 'no place' },
    site('mid', 77.3, 28.7),
  ], here, 3);
  assert.deepEqual(list.map((item) => item.name), ['near', 'mid', 'far']);
  assert.equal(nearestSites([], here).length, 0);
  assert.equal(nearestSites([site('a', 77, 28)], null).length, 0);
});

test('a blocked road does not outrank an open one at about the same distance', () => {
  const list = nearestSites([site('blocked', 77.21, 28.61, { roadAccess: 'BLOCKED' }), site('open', 77.22, 28.62)], here, 2);
  assert.equal(list[0].name, 'open');
});

test('the directions link carries only the two places', () => {
  const url = directionsUrl(here, { lat: 28.7, lng: 77.3 });
  assert.match(url, /^https:\/\/www\.openstreetmap\.org\/directions\?/);
  assert.ok(url.includes('28.6%2C77.2%3B28.7%2C77.3'));
});
