// Remembers the last good answer for a key, so a busy or rate-limited outside service (HTTP 429, a timeout) does not turn into an error for the
// person. A fresh answer is reused for `freshMs` (so the outside service is asked less often). If asking fails, an older answer is still
// returned for up to `staleMs`. Only when there is nothing remembered does the error pass through.
const store = new Map();
const inFlight = new Map();
const MAX_ENTRIES = 500;

async function remember(key, load, { freshMs = 10 * 60 * 1000, staleMs = 6 * 60 * 60 * 1000, now = Date.now } = {}) {
  const hit = store.get(key);
  if (hit && now() - hit.at < freshMs) return hit.value;
  if (inFlight.has(key)) return inFlight.get(key);
  const job = (async () => {
    try {
      const value = await load();
      if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value);
      store.set(key, { value, at: now() });
      return value;
    } catch (error) {
      if (hit && now() - hit.at < staleMs) return hit.value;
      throw error;
    } finally {
      inFlight.delete(key);
    }
  })();
  inFlight.set(key, job);
  return job;
}

function clear() { store.clear(); inFlight.clear(); }

module.exports = { remember, clear };
