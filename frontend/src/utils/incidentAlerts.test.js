import test from 'node:test';
import assert from 'node:assert/strict';
import { newNearbyIncidents, seriousIncidentIds } from './incidentAlerts.js';

const here = { lat: 28.6, lng: 77.2 };
const at = (id, severity, lat, lng, extra = {}) => ({ _id: id, severity, type: 'flash_flood', status: 'reported', location: { lat, lng, address: 'Somewhere' }, ...extra });

test('nothing is new on the first look', () => {
  assert.deepEqual(newNearbyIncidents([at('a', 'Critical', 28.6, 77.2)], null, here), []);
});

test('only new, serious, open, nearby incidents count, nearest first', () => {
  const seen = new Set(['old']);
  const list = [
    at('old', 'Critical', 28.6, 77.2),
    at('far', 'Critical', 19, 72.8),
    at('low', 'Low', 28.61, 77.21),
    at('done', 'High', 28.61, 77.21, { status: 'Resolved' }),
    at('nopl', 'High', undefined, undefined),
    at('b', 'High', 28.8, 77.3),
    at('a', 'Critical', 28.62, 77.21),
  ];
  const found = newNearbyIncidents(list, seen, here);
  assert.deepEqual(found.map((item) => item.id), ['a', 'b']);
  assert.equal(found[0].type, 'flash flood');
  assert.ok(found[0].km < found[1].km);
});

test('without a place for the person there is no alert; ids are collected for the next look', () => {
  assert.deepEqual(newNearbyIncidents([at('a', 'Critical', 28.6, 77.2)], new Set(), null), []);
  assert.deepEqual([...seriousIncidentIds([{ _id: 'x' }, { id: 'y' }, {}, null])], ['x', 'y']);
});
