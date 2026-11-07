import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveRoadStatusFromIncidents } from './roadStatusFromIncidents.js';
const roadBlock = {
  id: 'i1',
  type: 'Road Blockage',
  rawType: 'road_blockage',
  status: 'Verified',
  location: { lat: 28.701, lng: 77.277, address: 'Garhi Mandu, East Delhi' },
  description: 'Carriageway submerged',
};
const flashFlood = {
  id: 'i2',
  type: 'Flash Flood',
  rawType: 'flash_flood',
  status: 'In_progress',
  location: { lat: 28.781, lng: 77.221, address: 'Palla, North Delhi' },
};
const quake = {
  id: 'i3',
  type: 'Earthquake',
  rawType: 'earthquake',
  status: 'Verified',
  location: { lat: 28.9, lng: 77.0, address: 'Somewhere' },
};
test('road_blockage incident becomes a Blocked route named from its address', () => {
  const roads = deriveRoadStatusFromIncidents([roadBlock]);
  assert.equal(roads.length, 1);
  assert.equal(roads[0].name, 'Garhi Mandu');
  assert.equal(roads[0].status, 'blocked');
  assert.ok(roads[0].condition);
});
test('flood-type incident becomes a Restricted route', () => {
  const roads = deriveRoadStatusFromIncidents([flashFlood]);
  assert.equal(roads.length, 1);
  assert.equal(roads[0].status, 'restricted');
});
test('non-road hazards (e.g. earthquake) are excluded', () => {
  assert.equal(deriveRoadStatusFromIncidents([quake]).length, 0);
});
test('resolved incidents are excluded (route has reopened)', () => {
  const resolved = { ...roadBlock, status: 'Resolved' };
  assert.equal(deriveRoadStatusFromIncidents([resolved]).length, 0);
});
test('handles non-array / empty input safely', () => {
  assert.deepEqual(deriveRoadStatusFromIncidents(), []);
  assert.deepEqual(deriveRoadStatusFromIncidents(null), []);
  assert.deepEqual(deriveRoadStatusFromIncidents([]), []);
});
test('mixed batch keeps only road-affecting, unresolved incidents', () => {
  const roads = deriveRoadStatusFromIncidents([roadBlock, flashFlood, quake]);
  assert.equal(roads.length, 2);
  assert.deepEqual(
    roads.map((r) => r.status).sort(),
    ['blocked', 'restricted'],
  );
});
