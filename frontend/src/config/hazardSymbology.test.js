import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ZONE_LEVELS,
  normalizeZoneLevel,
  zoneSymbologyFor,
  zoneMarkerSvg,
} from './hazardSymbology.js';
test('normalizeZoneLevel accepts case/whitespace and rejects the unknown', () => {
  assert.equal(normalizeZoneLevel('red'), 'RED');
  assert.equal(normalizeZoneLevel('  Orange '), 'ORANGE');
  assert.equal(normalizeZoneLevel('blue'), null);
  assert.equal(normalizeZoneLevel(''), null);
  assert.equal(normalizeZoneLevel(undefined), null);
});
test('every zone level maps to a distinct colour AND a distinct shape', () => {
  const colours = new Set();
  const shapes = new Set();
  for (const level of ZONE_LEVELS) {
    const sym = zoneSymbologyFor(level);
    assert.ok(sym, `${level} resolves`);
    colours.add(sym.color);
    shapes.add(sym.shape);
  }
  assert.equal(colours.size, 4);
  assert.equal(shapes.size, 4);
});
test('severity rank is ordered RED > ORANGE > YELLOW > GREEN', () => {
  const ranks = ZONE_LEVELS.map((l) => zoneSymbologyFor(l).rank);
  assert.deepEqual(ranks, [...ranks].sort((a, b) => b - a));
  assert.ok(zoneSymbologyFor('RED').rank > zoneSymbologyFor('GREEN').rank);
});
test('markers meet the 24px minimum touch-target size', () => {
  for (const level of ZONE_LEVELS) {
    assert.ok(zoneSymbologyFor(level).size >= 24, `${level} >= 24px`);
  }
});
test('zoneMarkerSvg renders the level colour and a sized svg; unknown => empty', () => {
  const red = zoneMarkerSvg('RED');
  assert.match(red, /<svg[^>]*width="38"/);
  assert.match(red, /#ef4444/);
  assert.match(red, /<path /);            
  assert.match(zoneMarkerSvg('YELLOW'), /<rect /);          
  assert.match(zoneMarkerSvg('GREEN'), /<circle /);          
  assert.equal(zoneMarkerSvg('unknown'), '');
});
