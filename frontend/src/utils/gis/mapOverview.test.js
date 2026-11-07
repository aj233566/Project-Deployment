import test from 'node:test';
import assert from 'node:assert/strict';
import { getMapScaleBar, getOverviewZoomForBounds } from './mapOverview.js';
const { shouldFitInitialBounds } = await import('./mapOverview.js');

test('overview zoom fits the main viewport into its own frame with context padding', () => {
  const viewportBounds = [[27, 77], [29, 79]];
  let fitArgs;
  const overviewMap = {
    getBoundsZoom(...args) {
      fitArgs = args;
      return 6;
    },
  };

  assert.equal(getOverviewZoomForBounds(overviewMap, viewportBounds), 6);
  assert.deepEqual(fitArgs, [viewportBounds, false, [32, 32]]);
});

test('overview zoom is clamped to available tile zooms', () => {
  const bounds = [[27, 77], [29, 79]];
  assert.equal(getOverviewZoomForBounds({ getBoundsZoom: () => 0 }, bounds), 1);
  assert.equal(getOverviewZoomForBounds({ getBoundsZoom: () => 24 }, bounds), 19);
});

test('scale bar reports a sensible distance for the current latitude and zoom', () => {
  const scale = getMapScaleBar(27, 12);
  assert.equal(scale.label, '2 km');
  assert.ok(scale.width > 0 && scale.width <= 120);
});

test('scale bar safely handles unavailable map coordinates', () => {
  assert.deepEqual(getMapScaleBar(null, null), { distanceMeters: 0, width: 0, label: '—' });
});

test('does not let late map data override a user zoom made before loading completed', () => {
  assert.equal(shouldFitInitialBounds({ pointCount: 4, hasFitted: false, userInteracted: true }), false);
});

test('fits initial operational points only once when the user has not moved the map', () => {
  assert.equal(shouldFitInitialBounds({ pointCount: 4, hasFitted: false, userInteracted: false }), true);
  assert.equal(shouldFitInitialBounds({ pointCount: 4, hasFitted: true, userInteracted: false }), false);
  assert.equal(shouldFitInitialBounds({ pointCount: 0, hasFitted: false, userInteracted: false }), false);
});
