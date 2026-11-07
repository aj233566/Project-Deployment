import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCommandCenterRegion,
  partitionIncidentsByRegion,
  summarizeIncidents,
} from './commandCenterRegions.js';

test('defines India and Delhi NCR focus bounds and weather points', () => {
  assert.deepEqual(getCommandCenterRegion('india').bounds, [[5, 66], [39, 100]]);
  assert.deepEqual(getCommandCenterRegion('ncr').bounds, [[27, 76.4], [29.3, 78]]);
  assert.deepEqual(getCommandCenterRegion('ncr').weatherPoint, [28.6139, 77.209]);
  assert.equal(getCommandCenterRegion('unknown').id, 'india');
});

test('partitions regional incidents without losing reports that have no coordinates', () => {
  const rows = [
    { _id: 'delhi', location: { latitude: 28.6, longitude: 77.2 } },
    { _id: 'guwahati', location: { lat: 26.1, lng: 91.7 } },
    { _id: 'unmapped', location: {} },
  ];
  const result = partitionIncidentsByRegion(rows, 'ncr');
  assert.deepEqual(result.inRegion.map((row) => row._id), ['delhi']);
  assert.deepEqual(result.unmapped.map((row) => row._id), ['unmapped']);
});

test('summarizes real severity and hazard values without counting unknown severity as low', () => {
  const result = summarizeIncidents([
    { severity: 'CRITICAL', type: 'Flood' },
    { severity: 'high', hazardSubtype: 'Road Blockage' },
    { severity: 'moderate', type: 'Flood' },
    { severity: 'unrecorded', type: 'Other' },
  ]);
  assert.deepEqual(result.severity, { critical: 1, high: 1, warning: 1, low: 0, unknown: 1 });
  assert.deepEqual(result.hazards, [{ label: 'Flood', count: 2 }, { label: 'Other', count: 1 }, { label: 'Road Blockage', count: 1 }]);
});

import { createStateIndex } from '../commandCenter/stateIndex.js';
import indiaStates from '../../data/gis/indiaStates.js';
import indiaPolygons from '../../data/gis/indiaStatePolygons.js';
import { listViewOptions, regionContains } from './commandCenterRegions.js';

const stateIndex = createStateIndex(indiaPolygons, indiaStates);

test('every state and union territory becomes a usable view with weather, forecast places and bounds', () => {
  const up = getCommandCenterRegion('IN-UP');
  assert.equal(up.kind, 'state');
  assert.equal(up.label, 'UTTAR PRADESH');
  const lucknow = indiaStates.find((state) => state.code === 'IN-UP').capital;
  assert.deepEqual(up.weatherPoint, [lucknow.lat, lucknow.lng], 'weather is read at the capital');
  assert.ok(up.forecastPlaces.length >= 5);
  assert.ok(up.riverPoints.some((point) => point.river === 'Ganga'), 'rivers are limited to those inside the state');
  for (const option of listViewOptions()) {
    const region = getCommandCenterRegion(option.id);
    assert.equal(region.id, option.id === 'IN-DL' ? 'ncr' : option.id);
    assert.ok(region.forecastPlaces.length >= 1, option.label);
    assert.ok(region.weatherPoint.every(Number.isFinite), option.label);
  }
});

test('Delhi is shown as the Delhi NCR view, and the view menu lists India, NCR, then states A to Z', () => {
  assert.equal(getCommandCenterRegion('IN-DL').id, 'ncr');
  const options = listViewOptions();
  assert.deepEqual(options.slice(0, 2).map((option) => option.id), ['india', 'ncr']);
  assert.equal(options.length, 2 + 35, 'Delhi is not listed twice');
  const names = options.slice(2).map((option) => option.label);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
});

test('state views use boundaries, not the bounding box, to decide which incidents belong to them', () => {
  const haryana = getCommandCenterRegion('IN-HR');
  const delhiPoint = [28.6139, 77.209];
  assert.equal(regionContains(haryana, ...delhiPoint, null), true, 'the bounding box of Haryana wraps around Delhi');
  assert.equal(regionContains(haryana, ...delhiPoint, stateIndex), false, 'the boundary lookup knows Delhi is not Haryana');
  assert.equal(regionContains(haryana, 28.4595, 77.0266, stateIndex), true, 'Gurugram is in Haryana');
  const rows = [
    { _id: 'delhi', location: { latitude: 28.6139, longitude: 77.209 } },
    { _id: 'gurugram', location: { latitude: 28.4595, longitude: 77.0266 } },
    { _id: 'noida', location: { latitude: 28.5355, longitude: 77.391 } },
    { _id: 'nowhere', location: {} },
  ];
  const result = partitionIncidentsByRegion(rows, 'IN-HR', stateIndex);
  assert.deepEqual(result.inRegion.map((row) => row._id), ['gurugram']);
  assert.deepEqual(result.unmapped.map((row) => row._id), ['nowhere']);
  assert.deepEqual(partitionIncidentsByRegion(rows, 'IN-UP', stateIndex).inRegion.map((row) => row._id), ['noida']);
});
