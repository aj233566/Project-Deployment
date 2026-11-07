import test from 'node:test';
import assert from 'node:assert/strict';
import { drawableEvents, eventStyle, trackPoints } from './naturalEvents.js';
import { GLYPHS } from './fxMarkup.js';
import { parseEonetEvents } from '../../services/commandCenter/eonetFeed.js';

test('every kind of event gets a symbol that exists and a colour', () => {
  const kinds = [{ type: 'TC' }, { type: 'FL' }, ...['wildfires', 'severeStorms', 'volcanoes', 'floods', 'landslides', 'drought', 'dustHaze', 'snow', 'tempExtremes'].map((category) => ({ type: 'EV', category })), { type: 'EV', category: 'new' }, null];
  for (const event of kinds) {
    const style = eventStyle(event);
    assert.ok(GLYPHS[style.glyph]?.length > 0, `${event?.category || event?.type}: ${style.glyph}`);
    assert.match(style.color, /^#[0-9a-f]{6}$/i);
  }
  assert.equal(eventStyle({ type: 'EV', category: 'wildfires' }).glyph, 'fire');
});

test('only current events with a place are drawn', () => {
  const list = [{ lat: 1, lng: 2, current: true }, { lat: 1, lng: 2, current: false }, { lat: NaN, lng: 2 }, null, { lat: 3, lng: 4 }];
  assert.equal(drawableEvents(list).length, 2);
  assert.deepEqual(drawableEvents(undefined), []);
});

test('a track needs two real points and a cyclone from EONET carries its earlier positions', () => {
  assert.deepEqual(trackPoints({ track: [[1, 2]] }), []);
  assert.deepEqual(trackPoints({ track: [[1, 2], [3, 4], ['x', 1]] }), [[1, 2], [3, 4]]);
  const [cyclone] = parseEonetEvents({ events: [{ id: 'A', title: 'TC', categories: [{ id: 'severeStorms' }], geometry: [
    { date: '2026-10-27T00:00:00Z', type: 'Point', coordinates: [80, 15] }, { date: '2026-10-28T00:00:00Z', type: 'Point', coordinates: [81, 16] }] }] });
  assert.deepEqual(cyclone.track, [[15, 80], [16, 81]]);
});
