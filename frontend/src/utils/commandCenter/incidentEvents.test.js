import test from 'node:test';
import assert from 'node:assert/strict';
import { arcBetween, calloutFor, diffIncidentEvents } from './incidentEvents.js';
import { FOCUS_PRESETS, hiddenForFocus } from './mapFocus.js';
import { LAYER_GROUPS } from './map3dStyle.js';

const at = (id, severity, status, extra = {}) => ({
  _id: id, severity, status, type: 'landslide',
  location: { latitude: 28.6, longitude: 77.2, ...extra },
});

test('the first call only records what is already there: nothing is animated when the page opens', () => {
  const { events, next } = diffIncidentEvents(null, [at('a', 'low', 'reported'), at('b', 'high', 'reported'), at('r', 'low', 'resolved')]);
  assert.deepEqual(events, []);
  assert.equal(next.size, 2);
});

test('a new incident and a changed one are reported, an unchanged one is not', () => {
  const first = diffIncidentEvents(null, [at('a', 'low', 'reported'), at('b', 'low', 'reported')]);
  const second = diffIncidentEvents(first.next, [at('a', 'low', 'reported'), at('b', 'critical', 'reported'), at('c', 'medium', 'reported')]);
  assert.deepEqual(second.events.map((e) => [e.incident._id, e.kind]), [['b', 'updated'], ['c', 'new']]);
  assert.equal(diffIncidentEvents(second.next, [at('a', 'low', 'reported'), at('b', 'critical', 'reported'), at('c', 'medium', 'reported')]).events.length, 0);
});

test('incidents without a location are ignored, and a resolved one stops being tracked without coming back as new', () => {
  const first = diffIncidentEvents(null, [at('a', 'low', 'reported')]);
  const second = diffIncidentEvents(first.next, [at('a', 'low', 'resolved'), { _id: 'x', severity: 'low', status: 'reported', location: {} }]);
  assert.equal(second.events.length, 0);
  assert.equal(second.next.size, 0);
});

test('the callout says what, where and how serious, and whether it is new or changed', () => {
  assert.deepEqual(calloutFor({ kind: 'new', incident: at('a', 'critical', 'reported', { address: 'Rameshwar Park, Delhi' }) }),
    { tag: 'NEW', title: 'LANDSLIDE', place: 'Rameshwar Park, Delhi', severity: 'critical' });
  assert.equal(calloutFor({ kind: 'updated', incident: at('a', 'low', 'reported') }).tag, 'UPDATED');
  assert.match(calloutFor({ kind: 'new', incident: at('a', 'low', 'reported') }).place, /28\.600, 77\.200/);
});

test('an arc starts and ends at the two places and bows away from the straight line', () => {
  const arc = arcBetween([77, 28], [80, 22], 20);
  assert.deepEqual(arc[0], [77, 28]);
  assert.deepEqual(arc.at(-1), [80, 22]);
  assert.equal(arc.length, 21);
  const mid = arc[10];
  const line = [78.5, 25];
  assert.ok(Math.hypot(mid[0] - line[0], mid[1] - line[1]) > 0.3, 'the middle is off the straight line');
});

test('every map focus preset has a layer set for both 3D maps, and only names layers that exist', () => {
  assert.ok(FOCUS_PRESETS.length >= 4);
  const globeKeys = new Set(['states', 'areas', 'incidents', 'sites', 'hazards', 'buildings']);
  for (const preset of FOCUS_PRESETS) {
    const map3d = hiddenForFocus('map3d', preset.id);
    const globe = hiddenForFocus('globe', preset.id);
    assert.ok(map3d.size > 0 && globe.size > 0, preset.id);
    for (const key of map3d) assert.ok(LAYER_GROUPS[key], `3D map layer ${key}`);
    for (const key of globe) assert.ok(globeKeys.has(key), `globe layer ${key}`);
  }
  assert.equal(hiddenForFocus('map3d', 'nonsense').size, 0);
});

import { areaCentroid, areasToArrivalIncidents } from './incidentEvents.js';

const square = (id, kind, severity) => ({ _id: id, name: `Area ${id}`, kind, severity, status: 'active', geometry: { type: 'Polygon', coordinates: [[[77, 28], [78, 28], [78, 29], [77, 29], [77, 28]]] } });

test('a drawn area is turned into an incident-shaped record at the middle of its outline', () => {
  const center = areaCentroid(square('a', 'affected', 'high'));
  assert.ok(Math.abs(center.lng - 77.4) < 0.2 && Math.abs(center.lat - 28.4) < 0.2);
  const [affected, safe] = areasToArrivalIncidents([square('a', 'affected', 'high'), square('b', 'safe', 'critical')]);
  assert.equal(affected._id, 'area-a');
  assert.equal(affected.severity, 'high');
  assert.equal(safe.type, 'safe zone');
  assert.equal(safe.severity, 'low');
  assert.deepEqual(areasToArrivalIncidents([{ _id: 'x', geometry: {} }, null]), []);
});

test('a newly drawn area counts as an arrival, and one that was already there does not', () => {
  const first = diffIncidentEvents(null, areasToArrivalIncidents([square('a', 'affected', 'high')]));
  assert.deepEqual(first.events, []);
  const second = diffIncidentEvents(first.next, areasToArrivalIncidents([square('a', 'affected', 'high'), square('b', 'safe', 'low')]));
  assert.deepEqual(second.events.map((e) => [e.incident._id, e.kind]), [['area-b', 'new']]);
  assert.equal(calloutFor(second.events[0]).title, 'Safe Zone'.toUpperCase());
});
