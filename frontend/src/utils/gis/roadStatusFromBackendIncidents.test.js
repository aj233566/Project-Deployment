import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveRoadStatusFromBackendIncidents } from './roadStatusFromBackendIncidents.js';
test('derives road conditions from the backend incident schema', () => {
  const roads = deriveRoadStatusFromBackendIncidents([
    {
      _id: 'road-1',
      type: 'road_blockage',
      hazardSubtype: 'flood',
      severity: 'critical',
      status: 'verified',
      description: 'Approach road submerged',
      location: {
        latitude: 28.701,
        longitude: 77.277,
        address: 'Garhi Mandu, East Delhi',
      },
    },
    {
      _id: 'flood-1',
      type: 'flash_flood',
      hazardSubtype: 'flood',
      severity: 'moderate',
      status: 'submitted',
      location: {
        latitude: 28.781,
        longitude: 77.221,
        address: 'Palla, North Delhi',
      },
    },
  ]);
  assert.deepEqual(
    roads.map(({ name, status }) => ({ name, status })),
    [
      { name: 'Garhi Mandu', status: 'blocked' },
      { name: 'Palla', status: 'restricted' },
    ],
  );
});
test('does not lose road conditions when the backend uses hazardSubtype=flood', () => {
  const [road] = deriveRoadStatusFromBackendIncidents([
    {
      _id: 'infra-1',
      type: 'infrastructure_damage',
      hazardSubtype: 'flood',
      severity: 'high',
      status: 'verified',
      location: {
        latitude: 28.9,
        longitude: 77.1,
        address: 'Baghpat, Uttar Pradesh',
      },
    },
  ]);
  assert.equal(road.status, 'blocked');
});
test('accepts the wrapped success response shape used by the API client', () => {
  const roads = deriveRoadStatusFromBackendIncidents({
    success: true,
    data: [
      {
        _id: 'wrapped-road',
        type: 'road_blockage',
        severity: 'critical',
        status: 'verified',
        location: {
          latitude: 28.701,
          longitude: 77.277,
          address: 'Garhi Mandu, East Delhi',
        },
      },
    ],
  });
  assert.equal(roads.length, 1);
  assert.equal(roads[0].status, 'blocked');
});
