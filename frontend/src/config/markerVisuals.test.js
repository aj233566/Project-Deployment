import test from 'node:test';
import assert from 'node:assert/strict';
import { markerSurfaceStyle, roadMarkerVisual } from './markerVisuals.js';
test('GIS markers use coloured circular surfaces instead of legacy black squares', () => {
  const style = markerSurfaceStyle('#D64545');
  assert.match(style, /background-color: #D64545/);
  assert.match(style, /border-radius: 50%/);
  assert.match(style, /border-color: #ffffff/);
  assert.doesNotMatch(style, /#1D2427/i);
});
test('blocked-road markers have their own clear warning visual', () => {
  assert.deepEqual(roadMarkerVisual('Blocked'), {
    color: '#D64545',
    glyph: '⛔',
    label: 'Road closed',
  });
});
