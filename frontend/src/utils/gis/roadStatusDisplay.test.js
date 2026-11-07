import test from 'node:test';
import assert from 'node:assert/strict';
import { selectRoadStatusRows } from './roadStatusDisplay.js';
test('prefers map-derived road rows even when the citizen has not shared location', () => {
  const mapRows = [
    { id: 'r1', name: 'Garhi Mandu', status: 'blocked', condition: 'Road submerged' },
    { id: 'r2', name: 'Palla', status: 'restricted', condition: 'Flood access reduced' },
  ];
  assert.deepEqual(
    selectRoadStatusRows({ mapRows, incidentRows: [], locationAvailable: false }),
    mapRows,
  );
});
test('uses incident-derived rows while the map callback is still initializing', () => {
  const incidentRows = [
    {
      id: 'i1',
      type: 'Road Blockage',
      rawType: 'road_blockage',
      status: 'Verified',
      location: { lat: 28.701, lng: 77.277, address: 'Garhi Mandu, East Delhi' },
    },
  ];
  const rows = selectRoadStatusRows({ mapRows: [], incidentRows, locationAvailable: false });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, 'Garhi Mandu');
  assert.equal(rows[0].status, 'blocked');
});
test('does not replace a location-aware map result with a stale risk response', () => {
  const mapRows = [{ id: 'r1', name: 'Garhi Mandu', status: 'blocked' }];
  const staleIncidentRows = [{ id: 'i-old', name: 'Old route', status: 'restricted' }];
  assert.deepEqual(
    selectRoadStatusRows({ mapRows, incidentRows: staleIncidentRows, locationAvailable: true }),
    mapRows,
  );
});
