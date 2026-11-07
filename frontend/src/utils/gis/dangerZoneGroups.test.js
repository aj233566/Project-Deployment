import test from 'node:test';
import assert from 'node:assert/strict';
import { groupDangerZones } from './dangerZoneGroups.js';

const at = (lat, lng, severity, status) => ({ id: `${lat}-${lng}-${severity}`, severity, status, location: { lat, lng } });

test('incidents in the same place become one zone using the most serious one', () => {
  const zones = groupDangerZones([at(28.5, 77.2, 'Warning'), at(28.505, 77.205, 'Critical'), at(28.5, 77.2, 'High')]);
  assert.equal(zones.length, 1);
  assert.equal(zones[0].count, 3);
  assert.equal(zones[0].incident.severity, 'Critical');
});

test('far-apart incidents keep their own zones; resolved or unplaced ones are ignored', () => {
  const zones = groupDangerZones([at(28.5, 77.2, 'High'), at(29.5, 78.2, 'Warning'), at(28.5, 77.2, 'Critical', 'Resolved'), { severity: 'High' }, null]);
  assert.equal(zones.length, 2);
  assert.deepEqual(zones.map((zone) => zone.count), [1, 1]);
  assert.deepEqual(groupDangerZones(undefined), []);
});
