import test from 'node:test';
import assert from 'node:assert/strict';
import { areasToGeoJson, draftToGeoJson, sitesToGeoJson, hazardsToGeoJson, heatToGeoJson, habitationsToGeoJson, incidentsToGeoJson, statesToGeoJson, zonesToGeoJson } from './map3dData.js';

const incidents = [
  { _id: 'a', severity: 'critical', status: 'in_progress', type: 'landslide', location: { latitude: 28.6, longitude: 77.2 } },
  { _id: 'b', severity: 'low', status: 'resolved', location: { latitude: 28.7, longitude: 77.3 } },
  { _id: 'c', severity: 'moderate', location: {} },
  { _id: 'd', severity: 'weird', location: { latitude: 10, longitude: 76 } },
];

test('only unresolved incidents with a location become points, in [lng, lat] order', () => {
  const { features } = incidentsToGeoJson(incidents);
  assert.deepEqual(features.map((f) => f.properties.id), ['a', 'd']);
  assert.deepEqual(features[0].geometry.coordinates, [77.2, 28.6]);
  assert.equal(features[1].properties.sev, 'low', 'unrated incidents are shown as low rather than hidden');
});

test('zones are polygons sized by severity', () => {
  const { features } = zonesToGeoJson(incidents);
  assert.equal(features.length, 2);
  assert.equal(features[0].geometry.type, 'Polygon');
  const span = (f) => Math.max(...f.geometry.coordinates[0].map((p) => p[1])) - Math.min(...f.geometry.coordinates[0].map((p) => p[1]));
  assert.ok(span(features[0]) > span(features[1]));
});

test('habitations keep their risk level; bad coordinates are dropped', () => {
  const { features } = habitationsToGeoJson([
    { name: 'Palla', population: 100, risk: { level: 'orange' }, location: { coordinates: [77.2, 28.7] } },
    { name: 'Nowhere', location: {} },
  ]);
  assert.equal(features.length, 1);
  assert.equal(features[0].properties.level, 'ORANGE');
});

test('states carry their worst severity, or none', () => {
  const entries = [
    { code: 'IN-DL', state: { name: 'Delhi' }, polygons: [[[[0, 0], [1, 0], [1, 1], [0, 0]]]] },
    { code: 'IN-SK', state: { name: 'Sikkim' }, polygons: [[[[2, 2], [3, 2], [3, 3], [2, 2]]]] },
  ];
  const { features } = statesToGeoJson(entries, [{ code: 'IN-DL', topSeverity: 'critical', count: 4, critical: 2, high: 1 }]);
  assert.equal(features[0].properties.sev, 'critical');
  assert.equal(features[0].properties.count, 4);
  assert.equal(features[1].properties.sev, 'none');
  assert.equal(statesToGeoJson(null, null).features.length, 0);
});

test('heat points weight heavy rain and gales most, drop dry places, and add incidents', () => {
  const places = [
    { lat: 10, lng: 76, rain24h: 80, maxGust24h: 20 },
    { lat: 11, lng: 77, rain24h: 8, maxGust24h: 20 },
    { lat: 12, lng: 78, rain24h: 0, maxGust24h: 10 },
    { lat: 13, lng: 79, rain24h: 0, maxGust24h: 90 },
    { lat: Number.NaN, lng: 80, rain24h: 100 },
  ];
  const { features } = heatToGeoJson(places, incidents);
  const weather = features.filter((f) => f.properties.kind !== 'incident');
  assert.equal(weather.length, 3, 'the dry place and the broken one are dropped');
  assert.equal(weather[0].properties.w, 1, 'heavy rain is full weight');
  assert.ok(weather[1].properties.w > 0 && weather[1].properties.w < 0.2);
  assert.equal(weather[2].properties.kind, 'wind');
  assert.equal(features.filter((f) => f.properties.kind === 'incident').length, 2);
});

test('hazard icons: ongoing cyclone and flood events and M3+ earthquakes only', () => {
  const { features } = hazardsToGeoJson(
    [{ lat: 14, lng: 88, type: 'TC', name: 'Cyclone X', current: true }, { lat: 25, lng: 85, type: 'FL', name: 'Flood', current: true }, { lat: 1, lng: 1, type: 'TC', current: false }],
    [{ lat: 30, lng: 79, mag: 4.2, place: 'Uttarakhand' }, { lat: 31, lng: 80, mag: 2.6, place: 'small' }],
  );
  assert.deepEqual(features.map((f) => f.properties.icon), ['cyclone', 'flood', 'quake']);
  assert.equal(features[2].properties.name, 'M 4.2');
});

test('drawn areas keep their kind, severity and polygon; resolved or broken ones are skipped', () => {
  const ring = [[77.2, 28.6], [77.3, 28.6], [77.3, 28.7], [77.2, 28.6]];
  const { features } = areasToGeoJson([
    { _id: '1', name: 'Flooded colony', kind: 'affected', severity: 'high', geometry: { coordinates: [ring] } },
    { _id: '2', name: 'Camp', kind: 'safe', geometry: { coordinates: [ring] } },
    { _id: '3', status: 'resolved', geometry: { coordinates: [ring] } },
    { _id: '4', geometry: { coordinates: [[[1, 1]]] } },
  ]);
  assert.deepEqual(features.map((f) => [f.properties.kind, f.properties.sev]), [['affected', 'high'], ['safe', 'medium']]);
});

test('relocation sites become points with free places; blocked sites are left out', () => {
  const { features } = sitesToGeoJson([
    { name: 'A', roadAccess: 'OPEN', totalCapacity: 100, occupancy: 30, reservedCapacity: 10, location: { coordinates: [77, 28] } },
    { name: 'B', roadAccess: 'BLOCKED', totalCapacity: 50, location: { coordinates: [77, 29] } },
    { name: 'C', location: {} },
  ]);
  assert.equal(features.length, 1);
  assert.equal(features[0].properties.free, 60);
});

test('the draft grows from points to a line to a polygon', () => {
  assert.equal(draftToGeoJson([]).features.length, 0);
  assert.deepEqual(draftToGeoJson([[1, 1], [2, 2]]).features.map((f) => f.geometry.type), ['Point', 'Point', 'LineString']);
  const three = draftToGeoJson([[1, 1], [2, 2], [3, 1]]);
  assert.equal(three.features.at(-1).geometry.type, 'Polygon');
  assert.deepEqual(three.features.at(-1).geometry.coordinates[0].at(-1), [1, 1]);
});
