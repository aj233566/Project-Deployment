import test from 'node:test';
import assert from 'node:assert/strict';
import { OsrmRoutingAdapter } from './osrmRoutingAdapter.js';
const origin = { lat: 28.6139, lng: 77.209, name: 'Delhi Base' };
const destination = { lat: 26.9124, lng: 75.7873, name: 'Jaipur Hospital' };
test('requests lon,lat order and returns lat,lng road geometry from OSM routing', async () => {
  const urls = [];
  const adapter = new OsrmRoutingAdapter({
    fetchImpl: async (url) => {
      urls.push(url);
      return {
        ok: true,
        json: async () => ({
          code: 'Ok',
          routes: [{ distance: 285000, duration: 13000, geometry: { coordinates: [[77.209, 28.6139], [76.5, 27.8], [75.7873, 26.9124]] } }]
        })
      };
    }
  });
  const route = await adapter.calculateRoute({ origin, destination });
  assert.match(urls[0], /77\.209,28\.6139;75\.7873,26\.9124/);
  assert.deepEqual(route.coordinates[0], [28.6139, 77.209]);
  assert.equal(route.distanceKm, 285);
  assert.equal(route.travelTimeEtaMin, 217);
  assert.equal(route.eta, '217 mins');
  // OSRM has no live traffic, so the route must not claim a traffic-aware ETA.
  assert.equal(route.trafficAwareEtaMin, undefined);
  assert.equal(route.trafficLevel, 'UNKNOWN');
  assert.equal(route.source, 'LIVE_OSM');
});
test('rejects when OSM routing finds no route', async () => {
  const adapter = new OsrmRoutingAdapter({ fetchImpl: async () => ({ ok: true, json: async () => ({ code: 'NoRoute', routes: [] }) }) });
  await assert.rejects(adapter.calculateRoute({ origin, destination }), /no valid route/);
});
test('surfaces HTTP 429 without retrying', async () => {
  let calls = 0;
  const adapter = new OsrmRoutingAdapter({ fetchImpl: async () => { calls += 1; return { ok: false, status: 429 }; } });
  await assert.rejects(adapter.calculateRoute({ origin, destination }), /rate limit/);
  assert.equal(calls, 1);
});

test('the default fetch works when called as a method of the adapter (browsers throw "Illegal invocation" otherwise)', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = function guarded() {
    if (this !== undefined && this !== globalThis) throw new TypeError("Illegal invocation");
    return Promise.resolve({ ok: true, json: async () => ({ code: 'Ok', routes: [{ distance: 1000, duration: 120, geometry: { coordinates: [[77, 28], [77.01, 28.01]] } }] }) });
  };
  try {
    const adapter = new OsrmRoutingAdapter();
    const route = await adapter.calculateRoute({ origin: { lat: 28, lng: 77 }, destination: { lat: 28.01, lng: 77.01 } });
    assert.ok(route);
  } finally {
    globalThis.fetch = original;
  }
});
