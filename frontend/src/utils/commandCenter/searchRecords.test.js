import test from 'node:test';
import assert from 'node:assert/strict';
import { searchRecords } from './searchRecords.js';

const data = {
  incidents: [
    { _id: 'aaaa1111', type: 'landslide', hazardSubtype: 'earthquake', severity: 'critical', location: { latitude: 28.75, longitude: 77.29, address: '' } },
    { _id: 'bbbb2222', type: 'road_blockage', severity: 'low', location: { latitude: 28.9, longitude: 77.0, address: 'NH-44 near Sonipat' } },
    { _id: 'cccc3333', type: 'landslide', severity: 'high', location: {} },
  ],
  habitations: [
    { _id: 'h1', name: 'Loni Khadar', district: 'Ghaziabad', state: 'Uttar Pradesh', location: { coordinates: [77.29, 28.75] } },
    { _id: 'h2', name: 'Palla', district: 'North Delhi', state: 'Delhi', location: { coordinates: [77.22, 28.83] } },
  ],
  sites: [
    { _id: 's1', name: 'Govt College Sonipat (Relief Centre)', district: 'Sonipat', state: 'Haryana', location: { coordinates: [77.0, 28.99] } },
  ],
};
const places = [{ name: 'Loni Khadar', lat: 28.75, lng: 77.29 }];

test('queries shorter than two characters return nothing', () => {
  assert.deepEqual(searchRecords('', data), []);
  assert.deepEqual(searchRecords('l', data), []);
  assert.deepEqual(searchRecords(undefined, data), []);
});

test('finds habitations, sites and incidents with coordinates the map can fly to', () => {
  const sonipat = searchRecords('sonipat', { ...data, places });
  assert.deepEqual(sonipat.map((row) => row.kind).sort(), ['incident', 'site']);
  const site = sonipat.find((row) => row.kind === 'site');
  assert.equal(site.lat, 28.99);
  assert.equal(site.lng, 77.0);
  const loni = searchRecords('loni', { ...data, places });
  assert.ok(loni.some((row) => row.kind === 'habitation' && row.title === 'Loni Khadar'));
  assert.ok(loni.some((row) => row.kind === 'incident' && /Near Loni Khadar/.test(row.sub)), 'incident matched through its nearest registered place');
});

test('prefix matches rank above substring matches and incidents without coordinates are skipped', () => {
  const rows = searchRecords('pal', { ...data, places });
  assert.equal(rows[0].title, 'Palla');
  assert.equal(searchRecords('landslide', data).length, 1, 'the landslide with no location cannot be shown on the map');
  assert.equal(searchRecords('nothing-matches-this', data).length, 0);
});
