import test from 'node:test';
import assert from 'node:assert/strict';
import {
  orderKeysByHealth,
  markKeyUnhealthy,
  readKeyHealth,
  STORAGE_KEY,
  DEFAULT_COOLDOWN_MS,
} from './tomtomKeyHealth.js';
function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}
test('TomTom key health uses its own storage key, isolated from Google', () => {
  assert.equal(STORAGE_KEY, 'sentry.tomtom.key-health.v1');
});
test('orderKeysByHealth keeps original order when nothing has failed', () => {
  const storage = memoryStorage();
  assert.deepEqual(orderKeysByHealth(['a', 'b', 'c'], { storage }), ['a', 'b', 'c']);
});
test('a recently rate-limited key is moved to the back of the attempt order', () => {
  const storage = memoryStorage();
  const now = 1_000_000;
  markKeyUnhealthy('a', { storage, now });
  assert.deepEqual(
    orderKeysByHealth(['a', 'b', 'c'], { storage, now: now + 1000 }),
    ['b', 'c', 'a'],
  );
});
test('a key that failed longer ago than the cooldown is treated as healthy again', () => {
  const storage = memoryStorage();
  const now = 1_000_000;
  markKeyUnhealthy('a', { storage, now });
  assert.deepEqual(
    orderKeysByHealth(['a', 'b', 'c'], { storage, now: now + DEFAULT_COOLDOWN_MS + 1 }),
    ['a', 'b', 'c'],
  );
});
test('markKeyUnhealthy persists the failure and readKeyHealth returns it', () => {
  const storage = memoryStorage();
  markKeyUnhealthy('k1', { storage, now: 42 });
  assert.equal(readKeyHealth(storage).k1, 42);
});
test('orderKeysByHealth de-duplicates and ignores blanks', () => {
  const storage = memoryStorage();
  assert.deepEqual(orderKeysByHealth(['a', 'a', '', '  ', 'b'], { storage }), ['a', 'b']);
});
test('missing storage never throws — in-session rotation still works', () => {
  assert.deepEqual(orderKeysByHealth(['a', 'b'], { storage: null }), ['a', 'b']);
  assert.doesNotThrow(() => markKeyUnhealthy('a', { storage: null }));
});
