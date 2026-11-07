import test from 'node:test';
import assert from 'node:assert/strict';
import { withRoutingFallback } from './routingFallback.js';
test('HTTP 429 from live routing returns simulated routes and does not retry live routing', async () => {
  let liveAttempts = 0;
  let activeSource = 'LIVE_TOMTOM';
  let lastError = null;
  const routes = await withRoutingFallback(
    async () => {
      liveAttempts += 1;
      throw new Error('TomTom Routing API quota or rate limit reached (HTTP 429)');
    },
    (error) => {
      lastError = error.message;
      activeSource = 'SIMULATED';
    },
    async () => [{ id: 'simulated-fallback', source: 'SIMULATED' }]
  );
  assert.equal(liveAttempts, 1);
  assert.equal(lastError, 'TomTom Routing API quota or rate limit reached (HTTP 429)');
  assert.equal(activeSource, 'SIMULATED');
  assert.deepEqual(routes, [{ id: 'simulated-fallback', source: 'SIMULATED' }]);
});
