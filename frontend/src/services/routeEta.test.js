import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchDriveEta, parseOsrmRoute } from './routeEta.js';

test('a route answer becomes minutes and kilometres; anything else is null', () => {
  assert.deepEqual(parseOsrmRoute({ code: 'Ok', routes: [{ duration: 1500, distance: 18400 }] }), { minutes: 25, km: 18.4 });
  assert.deepEqual(parseOsrmRoute({ code: 'Ok', routes: [{ duration: 10, distance: 50 }] }), { minutes: 1, km: 0.1 });
  assert.equal(parseOsrmRoute({ code: 'NoRoute', routes: [] }), null);
  assert.equal(parseOsrmRoute(null), null);
  assert.equal(parseOsrmRoute({ code: 'Ok', routes: [{ duration: 'x', distance: 1 }] }), null);
});

test('the request carries longitude then latitude, and a failure gives null instead of an error', async () => {
  let asked = '';
  const eta = await fetchDriveEta({ lat: 28.6, lng: 77.2 }, { lat: 28.7, lng: 77.3 }, { fetchImpl: async (url) => { asked = url; return { ok: true, json: async () => ({ code: 'Ok', routes: [{ duration: 600, distance: 5000 }] }) }; } });
  assert.match(asked, /77\.2,28\.6;77\.3,28\.7/);
  assert.equal(eta.minutes, 10);
  assert.equal(await fetchDriveEta({ lat: 1, lng: 2 }, { lat: 3, lng: 4 }, { fetchImpl: async () => { throw new Error('offline'); } }), null);
  assert.equal(await fetchDriveEta({ lat: 1, lng: 2 }, { lat: 3, lng: 4 }, { fetchImpl: async () => ({ ok: false }) }), null);
});
