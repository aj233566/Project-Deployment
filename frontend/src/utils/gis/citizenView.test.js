import { test } from 'node:test';
import assert from 'node:assert/strict';
import { approxDistanceKm, selectCitizenFocus } from './citizenView.js';
test('approxDistanceKm is ~0 for identical points', () => {
  assert.ok(approxDistanceKm(27.25, 88.54, 27.25, 88.54) < 0.001);
});
test('approxDistanceKm grows with separation (monotonic)', () => {
  const near = approxDistanceKm(27.25, 88.54, 27.24, 88.53);
  const far = approxDistanceKm(27.25, 88.54, 27.10, 88.40);
  assert.ok(far > near);
});
const incidents = [
  { id: 'A', severity: 'Critical', status: 'Active', affectedPopulation: 3800, location: { lat: 27.25, lng: 88.54 } },
  { id: 'B', severity: 'High', status: 'Active', affectedPopulation: 1640, location: { lat: 27.24, lng: 88.51 } },
  { id: 'C', severity: 'Operational', status: 'Resolved', affectedPopulation: 450, location: { lat: 27.20, lng: 88.52 } }
];
const riskZones = [{ id: 'Z1', name: 'Dikchu Buffer', riskScore: 68, riskLevel: 'High', center: [27.375, 88.532] }];
const shelters = [
  { id: 'S1', name: 'Rangpo Relief', status: 'Operational', location: { lat: 27.178, lng: 88.528 } },
  { id: 'S2', name: 'Singtam Camp', status: 'Operational', location: { lat: 27.234, lng: 88.502 } }
];
const hospitals = [
  { id: 'H1', name: 'STNM Gangtok', status: 'Operational', location: { lat: 27.325, lng: 88.608 } },
  { id: 'H2', name: 'Singtam CHC', status: 'Operational', location: { lat: 27.238, lng: 88.495 } }
];
const routes = [
  { id: 'R1', name: 'Western Ridge', status: 'Recommended' },
  { id: 'R2', name: 'NH-10 Direct', status: 'Blocked' }
];
test('danger point is the top CRITICAL active incident', () => {
  const f = selectCitizenFocus({ incidents, riskZones, shelters, hospitals, routes, demoMode: true });
  assert.equal(f.dangerPoint.lat, 27.25);
  assert.equal(f.dangerPoint.lng, 88.54);
  assert.equal(f.dangerLevel, 'CRITICAL');
});
test('resolved incidents are never chosen as the danger point', () => {
  const onlyResolved = [{ id: 'C', severity: 'Critical', status: 'Resolved', location: { lat: 27.20, lng: 88.52 } }];
  const f = selectCitizenFocus({ incidents: onlyResolved, riskZones, shelters, hospitals, routes, demoMode: true });
  assert.notEqual(f.dangerPoint.lng, 88.52);
});
test('nearest shelter and hospital are measured from the danger point', () => {
  const f = selectCitizenFocus({ incidents, riskZones, shelters, hospitals, routes, demoMode: true });
  assert.equal(f.nearestShelter.id, 'S2');
  assert.equal(f.nearestHospital.id, 'H2');
  assert.ok(f.nearestShelter.distanceKm > 0);
  assert.ok(f.nearestHospital.distanceKm > 0);
});
test('primary safe route prefers a Recommended (non-blocked) route', () => {
  const f = selectCitizenFocus({ incidents, riskZones, shelters, hospitals, routes, demoMode: true });
  assert.equal(f.primaryRoute.id, 'R1');
});
test('falls back to highest-risk zone centre when there are no active incidents', () => {
  const f = selectCitizenFocus({ incidents: [], riskZones, shelters, hospitals, routes, demoMode: true });
  assert.equal(f.dangerPoint.lat, 27.375);
  assert.equal(f.dangerPoint.lng, 88.532);
});
test('degrades safely with empty inputs (no throw, null selections)', () => {
  const f = selectCitizenFocus({});
  assert.equal(f.dangerPoint, null);
  assert.equal(f.dangerLevel, 'UNKNOWN');
  assert.equal(f.nearestShelter, null);
  assert.equal(f.nearestHospital, null);
});
test('does not promote unclassified risk zones or unknown facilities to operational status', () => {
  const f = selectCitizenFocus({
    riskZones: [{ id: 'Z-unknown', center: [27.2, 88.5] }],
    shelters: [{ id: 'S-unknown', location: { lat: 27.2, lng: 88.5 } }],
    hospitals: [{ id: 'H-unknown', location: { lat: 27.2, lng: 88.5 } }],
    demoMode: true,
  });
  assert.equal(f.dangerPoint, null);
  assert.equal(f.dangerLevel, 'UNKNOWN');
  assert.equal(f.nearestShelter, null);
  assert.equal(f.nearestHospital, null);
});
test('known affected population ranks above an unknown population at equal severity', () => {
  const f = selectCitizenFocus({
    incidents: [
      { id: 'unknown-population', severity: 'High', status: 'Active', location: { lat: 27.2, lng: 88.5 } },
      { id: 'known-population', severity: 'High', affectedPopulation: 0, status: 'Active', location: { lat: 27.3, lng: 88.6 } },
    ],
  });
  assert.equal(f.dangerPoint.lat, 27.3);
});
test('a reference point (the citizen location) overrides danger for nearest facilities', () => {
  const ref = { lat: 27.325, lng: 88.607 };
  const fromDanger = selectCitizenFocus({ incidents, riskZones, shelters, hospitals, routes, demoMode: true });
  assert.equal(fromDanger.nearestHospital.id, 'H2');
  const fromRef = selectCitizenFocus({ incidents, riskZones, shelters, hospitals, routes, reference: ref, demoMode: true });
  assert.equal(fromRef.nearestHospital.id, 'H1');
  assert.equal(fromRef.dangerPoint.lat, 27.25);
});
