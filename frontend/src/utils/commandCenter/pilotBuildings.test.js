import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_HEIGHT_M, FLOOR_HEIGHT_M, buildInstances, colorFor, heightOf, pilotForPosition } from './pilotBuildings.js';

const ring = [[77.2, 28.6], [77.201, 28.6], [77.201, 28.601], [77.2, 28.601], [77.2, 28.6]];
const feature = (props) => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, properties: props });

test('heights are labelled by how they are known and never invented', () => {
  assert.deepEqual(heightOf({ h: 24.5 }), { top: 24.5, base: 0, kind: 'recorded' });
  assert.deepEqual(heightOf({ h: null, f: 4 }), { top: 4 * FLOOR_HEIGHT_M, base: 0, kind: 'estimated' });
  assert.deepEqual(heightOf({ h: null, f: null }), { top: DEFAULT_HEIGHT_M, base: 0, kind: 'default' });
  assert.equal(heightOf({ h: 30, f: 5 }).kind, 'recorded', 'a recorded height wins over a floor count');
  assert.equal(heightOf({ h: 0, f: 0 }).kind, 'default');
  assert.equal(heightOf({ h: 12, m: 4 }).base, 4);
});

test('the three kinds get different colours, so estimates are visible as estimates', () => {
  const key = (kind) => colorFor(kind, 20).join(',');
  assert.equal(new Set([key('recorded'), key('estimated'), key('default')]).size, 3);
  assert.ok(colorFor('recorded', 80)[0] > colorFor('recorded', 5)[0], 'taller buildings are paler');
});

test('a building that has parts is replaced by its parts', () => {
  const { instances, counts } = buildInstances({ features: [
    feature({ t: 'b', h: 20, p: 1 }),
    feature({ t: 'p', h: 8, m: 0 }),
    feature({ t: 'p', h: 40, m: 8 }),
    feature({ t: 'b', h: null, f: 3, p: 0 }),
    feature({ t: 'b', h: null, f: null, p: 0 }),
  ] });
  assert.equal(instances.length, 4);
  assert.equal(counts.skippedWithParts, 1);
  assert.equal(counts.parts, 2);
  assert.deepEqual([counts.recorded, counts.estimated, counts.default], [2, 1, 1]);
  assert.equal(instances.find((i) => i.top === 40).base, 8);
});

test('broken geometry and zero-height parts are dropped', () => {
  const { instances } = buildInstances({ features: [
    { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[1, 1]]] }, properties: { t: 'b', h: 10 } },
    feature({ t: 'p', h: 5, m: 5 }),
    {},
  ] });
  assert.equal(instances.length, 0);
  assert.equal(buildInstances(null).instances.length, 0);
});

test('a camera inside a pilot area finds it, and the nearest wins', () => {
  assert.equal(pilotForPosition(77.2167, 28.6315).key, 'connaught-place');
  assert.equal(pilotForPosition(77.2884, 28.7515).key, 'loni');
  assert.equal(pilotForPosition(77.089, 28.495).key, 'gurugram');
  assert.equal(pilotForPosition(80.95, 26.85), null);
});
