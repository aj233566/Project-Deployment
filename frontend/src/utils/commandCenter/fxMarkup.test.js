import test from 'node:test';
import assert from 'node:assert/strict';
import { FX_COLORS, GLYPHS, arrowMarkup, fxColor, glyphKey, headingDeg, pinMarkup, shade } from './fxMarkup.js';

test('the heading follows the screen direction and keeps the last one when standing still', () => {
  assert.equal(headingDeg(10, 0), 0);
  assert.equal(headingDeg(0, 10), 90);
  assert.equal(headingDeg(-10, 0), 180);
  assert.equal(headingDeg(0, 0, 33), 33);
  assert.equal(headingDeg(NaN, 1, 12), 12);
});

test('colours come only from the fixed severity palette, with a safe default', () => {
  assert.equal(fxColor('critical'), FX_COLORS.critical);
  assert.equal(fxColor('<script>'), FX_COLORS.high);
  assert.equal(fxColor(undefined), FX_COLORS.high);
});

test('shading mixes towards white or black, and leaves anything that is not a hex colour alone', () => {
  assert.equal(shade('#000000', 0.5), '#808080');
  assert.equal(shade('#ffffff', -0.5), '#808080');
  assert.equal(shade('#ff0000', 0), '#ff0000');
  assert.equal(shade('red', 0.5), 'red');
  assert.equal(shade('#ff3b4a', 5), '#ffffff', 'the amount is capped at 1');
});

test('each kind of incident gets its own symbol, from the hazard type first and the report type second', () => {
  assert.equal(glyphKey({ hazardSubtype: 'wildfire' }), 'fire');
  assert.equal(glyphKey({ hazardSubtype: 'cloudburst' }), 'flood');
  assert.equal(glyphKey({ type: 'flash_flood' }), 'flood');
  assert.equal(glyphKey({ hazardSubtype: 'earthquake', type: 'landslide' }), 'earthquake');
  assert.equal(glyphKey({ type: 'slope_crack' }), 'landslide');
  assert.equal(glyphKey({ type: 'road_blockage' }), 'road');
  assert.equal(glyphKey({ type: 'something new' }), 'dot');
  assert.equal(glyphKey(null), 'dot');
  for (const key of ['flood', 'fire', 'landslide', 'earthquake', 'road', 'dot']) assert.ok(GLYPHS[key]?.length > 0, key);
});

test('the pin is shaded from the severity colour and carries the chosen symbol; the arrow has two tones', () => {
  const pin = pinMarkup('#4ade80', 'flood');
  assert.match(pin, /fx-pin/);
  assert.match(pin, /linearGradient/);
  assert.ok(pin.includes(GLYPHS.flood[0]));
  assert.ok(pin.includes(shade('#4ade80', 0.4)), 'a lighter top');
  assert.ok(pin.includes(shade('#4ade80', -0.4)), 'a darker bottom');
  assert.ok(pinMarkup('#4ade80', 'nonsense').includes(GLYPHS.dot[0]), 'an unknown symbol falls back to the plain dot');
  const arrow = arrowMarkup('#ff3b4a');
  assert.match(arrow, /fx-arrow/);
  assert.ok(arrow.includes(shade('#ff3b4a', 0.35)) && arrow.includes(shade('#ff3b4a', -0.3)));
});
