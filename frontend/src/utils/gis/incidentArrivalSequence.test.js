import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getArrivingIncidentIds,
  getAnimatedCountDuration,
  getIncidentCalloutPosition,
  getIncidentSequenceDuration
} from './incidentArrivalSequence.js';

test('uses the initial incident set as a baseline without showing arrival motion', () => {
  assert.deepEqual(
    getArrivingIncidentIds(['a', 'b', 'c'], null),
    []
  );
});

test('does not treat an empty loading state as the incident baseline', () => {
  assert.deepEqual(getArrivingIncidentIds([], null), []);
  assert.deepEqual(getArrivingIncidentIds(['a', 'b'], null), []);
});

test('plays only incidents added after the live baseline', () => {
  assert.deepEqual(
    getArrivingIncidentIds(['a', 'b', 'c'], new Set(['a', 'b'])),
    ['c']
  );
});

test('keeps the incident count-up in time with the initial pin sequence', () => {
  assert.equal(getIncidentSequenceDuration(15), 7200);
  assert.equal(getIncidentSequenceDuration(0), 900);
});

test('keeps the long first count-up when React replays an unfinished effect', () => {
  assert.equal(getAnimatedCountDuration(false, 7200), 7200);
  assert.equal(getAnimatedCountDuration(false, 7200), 7200);
});

test('returns later count changes to the short live-update duration', () => {
  assert.equal(getAnimatedCountDuration(true, 7200), 900);
});

test('alternates active incident callouts around the same map point', () => {
  const viewport = { width: 400, height: 300 };
  const right = getIncidentCalloutPosition({ x: 200, y: 200 }, viewport, 0, { width: 100, height: 40 });
  const left = getIncidentCalloutPosition({ x: 200, y: 200 }, viewport, 1, { width: 100, height: 40 });

  assert.deepEqual(right, { left: 232, top: 180, side: 'right' });
  assert.deepEqual(left, { left: 68, top: 180, side: 'left' });
});

test('clamps incident callouts inside the map viewport', () => {
  assert.deepEqual(
    getIncidentCalloutPosition({ x: 390, y: 2 }, { width: 400, height: 300 }, 0, { width: 100, height: 40 }),
    { left: 292, top: 8, side: 'right' }
  );
});
