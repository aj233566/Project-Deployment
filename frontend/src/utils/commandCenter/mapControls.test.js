import test from 'node:test';
import assert from 'node:assert/strict';
import { filterBySeverity, nearestOf, readUserPoints, routableSites } from './mapControls.js';

const list = [{ severity: 'critical' }, { severity: 'high' }, { severity: 'moderate' }, { severity: 'low' }];

test('the severity filter keeps everything, only critical, or critical and high', () => {
  assert.equal(filterBySeverity(list, 'ALL').length, 4);
  assert.deepEqual(filterBySeverity(list, 'CRITICAL').map((i) => i.severity), ['critical']);
  assert.deepEqual(filterBySeverity(list, 'HIGH_PLUS').map((i) => i.severity), ['critical', 'high']);
  assert.deepEqual(filterBySeverity(null, 'CRITICAL'), []);
});

test('saved points are read back, and damaged storage gives an empty list', () => {
  const store = (value) => ({ getItem: () => value });
  assert.equal(readUserPoints(store(JSON.stringify([{ id: 'a', lat: 1, lng: 2 }, { id: 'b', lat: 'x' }]))).length, 1);
  assert.deepEqual(readUserPoints(store('{not json')), []);
  assert.deepEqual(readUserPoints(store(null)), []);
});

test('a route only ends at an open registered site with room, and the nearest one wins', () => {
  const sites = [
    { _id: '1', name: 'Blocked', roadAccess: 'BLOCKED', location: { coordinates: [77.2, 28.6] } },
    { _id: '2', name: 'Full', capacity: { available: 0 }, location: { coordinates: [77.21, 28.61] } },
    { _id: '3', name: 'Far', location: { coordinates: [78, 29] } },
    { _id: '4', name: 'Near', location: { coordinates: [77.25, 28.65] } },
  ];
  const usable = routableSites(sites);
  assert.deepEqual(usable.map((s) => s.name), ['Far', 'Near']);
  assert.equal(nearestOf({ lat: 28.6, lng: 77.2 }, usable).name, 'Near');
  assert.equal(nearestOf({ lat: 0, lng: 0 }, []), null);
});

import { getChangedIncidentIds } from '../gis/incidentArrivalSequence.js';

test('the Live Map animates new incidents and changed ones, but not what was already there', () => {
  assert.deepEqual(getChangedIncidentIds([['a', 'low|reported']], null), []);
  const before = new Map([['a', 'low|reported'], ['b', 'high|reported']]);
  assert.deepEqual(getChangedIncidentIds([['a', 'low|reported'], ['b', 'critical|reported'], ['c', 'low|reported']], before), ['b', 'c']);
  assert.deepEqual(getChangedIncidentIds([['a', 'low|reported'], ['b', 'high|reported']], before), []);
});
