import test from 'node:test';
import assert from 'node:assert/strict';
import registry from '../../data/gis/indiaStates.js';
import polygonsByCode from '../../data/gis/indiaStatePolygons.js';
import { createStateIndex } from './stateIndex.js';
import { countByHazardGroup, groupIncidentsByState, summarizePopulationByState } from './stateStats.js';

const index = createStateIndex(polygonsByCode, registry);
const at = (lat, lng, severity, type = 'landslide') => ({ severity, type, location: { latitude: lat, longitude: lng } });

test('incidents are grouped by state, most affected first, and every incident is accounted for', () => {
  const incidents = [
    at(28.6139, 77.209, 'critical'), at(28.62, 77.2, 'low'),
    at(26.85, 80.95, 'high'), at(26.9, 80.9, 'moderate'), at(27.0, 81.0, 'low'),
    at(27.34, 88.6, 'critical'),
    at(15, 68, 'high'),
    { severity: 'low', type: 'flood', location: {} },
  ];
  const { rows, outside } = groupIncidentsByState(incidents, index);
  assert.deepEqual(rows.map((row) => `${row.code}:${row.count}`), ['IN-UP:3', 'IN-DL:2', 'IN-SK:1']);
  assert.equal(outside, 2, 'one offshore and one without coordinates');
  assert.equal(rows.reduce((sum, row) => sum + row.count, 0) + outside, incidents.length);
  const delhi = rows.find((row) => row.code === 'IN-DL');
  assert.equal(delhi.critical, 1);
  assert.equal(delhi.topSeverity, 'critical');
  assert.equal(rows.find((row) => row.code === 'IN-UP').topSeverity, 'high');
  assert.ok(Array.isArray(delhi.center) && delhi.center.length === 2);
});

test('with no boundary index every incident is counted as outside rather than guessed', () => {
  const { rows, outside } = groupIncidentsByState([at(28.6, 77.2, 'high')], null);
  assert.equal(rows.length, 0);
  assert.equal(outside, 1);
});

test('hazard groups keep a stable shape with zero counts', () => {
  const groups = countByHazardGroup([{ type: 'landslide' }, { type: 'slope_crack' }, { type: 'road_blockage' }, { type: 'odd' }]);
  assert.deepEqual(groups.map((group) => group.key), ['landslide', 'road', 'flood', 'fire', 'quake', 'other']);
  assert.deepEqual(groups.map((group) => group.count), [2, 1, 0, 0, 0, 1]);
});

test('population by state counts red and orange as at risk and yellow as watch', () => {
  const rows = summarizePopulationByState([
    { population: 12100, risk: { level: 'ORANGE' }, location: { coordinates: [77.29, 28.75] } },
    { population: 8200, risk: { level: 'ORANGE' }, location: { coordinates: [77.221, 28.781] } }, // Palla, North Delhi
    { population: 7300, risk: { level: 'YELLOW' }, location: { coordinates: [77.0, 28.99] } },
    { population: 6400, risk: { level: 'GREEN' }, location: { coordinates: [77.277, 28.701] } }, // Garhi Mandu, East Delhi
    { population: 40, risk: { level: 'UNKNOWN' }, location: { coordinates: [77.2, 28.6] } },
    { risk: { level: 'RED' }, location: { coordinates: [77.2, 28.6] } },
  ], index);
  const byCode = Object.fromEntries(rows.map((row) => [row.code, row]));
  assert.equal(byCode['IN-DL'].atRisk, 8200);
  assert.equal(byCode['IN-DL'].total, 6400 + 8200 + 40);
  assert.equal(byCode['IN-UP'].atRisk, 12100);
  assert.equal(byCode['IN-HR'].watch, 7300);
  assert.equal(rows[0].code, 'IN-UP', 'largest population at risk first');
});
