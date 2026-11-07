import test from 'node:test';
import assert from 'node:assert/strict';
import { TomTomRoutingAdapter } from './tomtomRoutingAdapter.js';
const origin = { lat: 21.1458, lng: 79.0882, name: 'Control Room' };
const destination = { lat: 21.15, lng: 79.09, name: 'Hospital' };
test('does not retry another TomTom key after quota or rate limiting', async () => {
  const requests = [];
  const fetchImpl = async (url) => {
    requests.push(url);
    return { ok: false, status: 429, statusText: 'Too Many Requests' };
  };
  const adapter = new TomTomRoutingAdapter(['spent-key', 'working-key'], fetchImpl);
  await assert.rejects(
    adapter.calculateRoute({ origin, destination }),
    /quota or rate limit reached/
  );
  assert.equal(requests.length, 1);
  assert.match(requests[0], /key=spent-key/);
});
test('does not retry a malformed route request with every key', async () => {
  let requests = 0;
  const adapter = new TomTomRoutingAdapter(['first-key', 'second-key'], async () => {
    requests += 1;
    return { ok: false, status: 400, statusText: 'Bad Request', text: async () => 'invalid coordinates' };
  });
  await assert.rejects(
    adapter.calculateRoute({ origin, destination }),
    /HTTP 400/
  );
  assert.equal(requests, 1);
});
test('uses the configured TomTom keyring for auth and permission failures', async () => {
  const requests = [];
  const adapter = new TomTomRoutingAdapter(['first-key', 'second-key'], async (url) => {
    requests.push(url);
    if (requests.length === 1) {
      return { ok: false, status: 403, statusText: 'Forbidden' };
    }
    return {
      ok: true,
      json: async () => ({
        routes: [{
          summary: { lengthInMeters: 1500, travelTimeInSeconds: 300, trafficDelayInSeconds: 60 },
          legs: [{ points: [{ latitude: origin.lat, longitude: origin.lng }, { latitude: destination.lat, longitude: destination.lng }] }]
        }]
      })
    };
  });
  const route = await adapter.calculateRoute({ origin, destination });
  assert.equal(requests.length, 2);
  assert.match(requests[1], /key=second-key/);
  assert.equal(route.source, 'LIVE_TOMTOM');
});
