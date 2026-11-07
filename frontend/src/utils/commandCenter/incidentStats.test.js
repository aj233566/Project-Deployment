import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFilterChips,
  buildIncidentTrend,
  countBySeverity,
  countRecent,
  incidentGroup,
  incidentLocationLabel,
  incidentStatusLabel,
  incidentTypeLabel,
  normalizeSeverity,
  placesFromRecords,
  shortIncidentId,
  summarizePopulationAtRisk,
  summarizeResources,
  summarizeSites,
} from './incidentStats.js';

const NOW = Date.parse('2026-10-30T12:00:00Z');
const hoursAgo = (hours) => new Date(NOW - hours * 3600e3).toISOString();

test('severity names from the API map onto four command-center levels', () => {
  assert.equal(normalizeSeverity('critical'), 'critical');
  assert.equal(normalizeSeverity('High'), 'high');
  assert.equal(normalizeSeverity('moderate'), 'medium');
  assert.equal(normalizeSeverity('Warning'), 'medium');
  assert.equal(normalizeSeverity('operational'), 'low');
  assert.equal(normalizeSeverity(undefined), 'unknown');
  assert.equal(normalizeSeverity('banana'), 'unknown');
});

test('countBySeverity counts every incident exactly once', () => {
  const counts = countBySeverity([
    { severity: 'critical' }, { severity: 'critical' }, { severity: 'high' },
    { severity: 'moderate' }, { severity: 'low' }, { severity: 'low' }, { severity: 'low' }, {},
  ]);
  assert.deepEqual(counts, { critical: 2, high: 1, medium: 1, low: 3, unknown: 1, total: 8 });
  assert.deepEqual(countBySeverity(null), { critical: 0, high: 0, medium: 0, low: 0, unknown: 0, total: 0 });
});

test('countRecent only counts incidents reported inside the window', () => {
  const incidents = [
    { severity: 'critical', createdAt: hoursAgo(2) },
    { severity: 'high', createdAt: hoursAgo(23) },
    { severity: 'high', createdAt: hoursAgo(30) },
    { severity: 'low', createdAt: hoursAgo(-5) },
    { severity: 'low' },
  ];
  const recent = countRecent(incidents, 24 * 3600e3, NOW);
  assert.equal(recent.total, 2);
  assert.equal(recent.critical, 1);
  assert.equal(recent.high, 1);
});

test('type labels are readable and null-like subtypes are ignored', () => {
  assert.equal(incidentTypeLabel({ type: 'road_blockage' }), 'Road blockage');
  assert.equal(incidentTypeLabel({ type: 'rock_fall' }), 'Rock fall');
  assert.equal(incidentTypeLabel({}), 'Type not recorded');
  assert.equal(incidentTypeLabel({ type: 'null' }), 'Type not recorded');
});

test('incidents are grouped for the filter chips and only present groups get a chip', () => {
  assert.equal(incidentGroup({ type: 'slope_crack' }), 'landslide');
  assert.equal(incidentGroup({ type: 'road_blockage' }), 'road');
  assert.equal(incidentGroup({ type: 'mystery' }), 'other');
  const chips = buildFilterChips([{ type: 'landslide' }, { type: 'slope_crack' }, { type: 'road_blockage' }]);
  assert.deepEqual(chips, [
    { key: 'landslide', label: 'Landslide / slope', count: 2 },
    { key: 'road', label: 'Road', count: 1 },
  ]);
});

test('status and id labels', () => {
  assert.equal(incidentStatusLabel({ status: 'submitted' }), 'Reported');
  assert.equal(incidentStatusLabel({ status: 'in_progress' }), 'In progress');
  assert.equal(incidentStatusLabel({}), 'Status not recorded');
  assert.equal(shortIncidentId({ _id: '68f1a2b3c4d5e6f7a8b9c0d1' }), '#C0D1');
});

test('location label prefers a recorded address, then the nearest registered place, then coordinates', () => {
  const places = placesFromRecords({
    habitations: [{ name: 'Loni Khadar', location: { coordinates: [77.29, 28.75] } }],
    relocationSites: [{ name: 'Far Away Camp', location: { coordinates: [88.5, 27.3] } }],
  });
  assert.equal(incidentLocationLabel({ location: { address: ' Sector 9 ', latitude: 28.7, longitude: 77.3 } }, places), 'Sector 9');
  assert.match(incidentLocationLabel({ location: { address: '', latitude: 28.76, longitude: 77.3 } }, places), /^Near Loni Khadar · \d+\.\d km$/);
  assert.equal(incidentLocationLabel({ location: { latitude: 10.5, longitude: 76.25 } }, places), '10.50°N 76.25°E');
  assert.equal(incidentLocationLabel({}, places), 'Location not recorded');
});

test('7-day trend puts each incident in the right IST day and keeps severity splits', () => {
  const incidents = [
    { severity: 'critical', createdAt: hoursAgo(1) },
    { severity: 'high', createdAt: hoursAgo(2) },
    { severity: 'low', createdAt: hoursAgo(50) },
    { severity: 'low', createdAt: hoursAgo(24 * 9) },
  ];
  const trend = buildIncidentTrend(incidents, '7d', NOW);
  assert.equal(trend.buckets.length, 7);
  assert.equal(trend.totals.total, 3, 'the 9-day-old incident falls outside the window');
  assert.equal(trend.totals.critical, 1);
  assert.equal(trend.buckets.reduce((sum, bucket) => sum + bucket.total, 0), 3);
  const last = trend.buckets.at(-1);
  assert.ok(last.start <= NOW && NOW < last.end, 'the final bucket contains "now"');
  assert.equal(trend.max, Math.max(...trend.buckets.map((bucket) => bucket.total)));
});

test('24-hour trend uses hourly buckets', () => {
  const trend = buildIncidentTrend([{ severity: 'high', createdAt: hoursAgo(0.2) }], '24h', NOW);
  assert.equal(trend.buckets.length, 24);
  assert.equal(trend.totals.total, 1);
  assert.equal(trend.buckets.at(-1).high, 1);
});

test('population at risk groups people by assessed zone level', () => {
  const summary = summarizePopulationAtRisk([
    { _id: 'a', name: 'Palla', district: 'North Delhi', population: 8200, risk: { level: 'ORANGE', score: 73 } },
    { _id: 'b', name: 'Loni Khadar', population: 12100, risk: { level: 'orange', score: 67 } },
    { _id: 'c', name: 'Baghpat Riverside', population: 7300, risk: { level: 'YELLOW', score: 32 } },
    { _id: 'd', name: 'delhi center', population: 40, risk: { level: 'UNKNOWN', score: null } },
    { _id: 'e', name: 'No population', risk: { level: 'RED' } },
  ]);
  assert.equal(summary.atRisk, 20300);
  assert.equal(summary.watch, 7300);
  assert.equal(summary.levels.UNASSESSED, 40);
  assert.equal(summary.rows[0].name, 'Loni Khadar', 'highest level then largest population first');
  assert.equal(summary.rows.length, 4);
});

test('resources and relocation sites are summarised from registered records only', () => {
  const resources = summarizeResources([
    { name: 'Ambulance Unit', category: 'Medical', total: 15, available: 11, deployed: 4, location: 'Sikkim' },
    { name: 'Earthmover Unit', total: 6, available: 4, deployed: 2 },
    { name: 'Broken record' },
  ]);
  assert.equal(resources.total, 21);
  assert.equal(resources.available, 15);
  assert.equal(resources.deployed, 6);
  assert.equal(resources.rows.length, 2);

  const sites = summarizeSites([
    { name: 'A', status: 'ACTIVE', roadAccess: 'OPEN', capacity: { total: 1500, occupied: 240, available: 1110 } },
    { name: 'B', status: 'ACTIVE', roadAccess: 'RESTRICTED', capacity: { total: 900, occupied: 700, available: 80 } },
  ]);
  assert.equal(sites.open, 1);
  assert.equal(sites.rows[1].available, 80);
});
