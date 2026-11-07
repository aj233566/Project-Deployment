import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lonLatToTileXY, tileRangeForBounds, tilesForBounds, buildTileUrl } from './tileMath.js';
test('lonLatToTileXY collapses everything to tile 0,0 at zoom 0', () => {
  assert.deepEqual(lonLatToTileXY(88.5, 27.3, 0), { x: 0, y: 0 });
  assert.deepEqual(lonLatToTileXY(-120, -40, 0), { x: 0, y: 0 });
});
test('lonLatToTileXY splits the world into quadrants at zoom 1', () => {
  assert.deepEqual(lonLatToTileXY(-1, 1, 1), { x: 0, y: 0 });
  assert.deepEqual(lonLatToTileXY(1, -1, 1), { x: 1, y: 1 });
});
test('tileRangeForBounds covering the world at zoom 1 spans the full 2x2 grid', () => {
  const r = tileRangeForBounds({ west: -179, south: -85, east: 179, north: 85 }, 1);
  assert.deepEqual(r, { minX: 0, maxX: 1, minY: 0, maxY: 1 });
});
test('tilesForBounds enumerates every tile in the range', () => {
  const tiles = tilesForBounds({ west: -179, south: -85, east: 179, north: 85 }, 1);
  assert.equal(tiles.length, 4);
  assert.ok(tiles.some((t) => t.x === 0 && t.y === 0 && t.z === 1));
  assert.ok(tiles.some((t) => t.x === 1 && t.y === 1 && t.z === 1));
});
test('buildTileUrl fills z/x/y and rotates the {s} subdomain', () => {
  const tpl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  assert.equal(buildTileUrl(tpl, 5, 23, 13, 'b'), 'https://b.tile.openstreetmap.org/5/23/13.png');
});
test('buildTileUrl leaves a template without {s} unchanged aside from coords', () => {
  const tpl = 'https://services.arcgisonline.com/.../MapServer/tile/{z}/{y}/{x}';
  assert.equal(buildTileUrl(tpl, 4, 9, 6, 'a'), 'https://services.arcgisonline.com/.../MapServer/tile/4/6/9');
});
