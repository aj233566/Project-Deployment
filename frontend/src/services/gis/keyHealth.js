export const DEFAULT_COOLDOWN_MS = 6 * 60 * 60 * 1000;
export function createKeyHealth(storageKey, { cooldownMs = DEFAULT_COOLDOWN_MS } = {}) {
  function readKeyHealth(storage) {
    if (!storage) return {};
    try {
      const raw = storage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  function markKeyUnhealthy(key, { storage, now = Date.now() } = {}) {
    const trimmed = String(key || '').trim();
    if (!trimmed || !storage) return;
    try {
      const health = readKeyHealth(storage);
      health[trimmed] = now;
      storage.setItem(storageKey, JSON.stringify(health));
    } catch { void 0; }
  }
  function orderKeysByHealth(keys, { storage, now = Date.now(), cooldownMs: cm = cooldownMs } = {}) {
    const list = [...new Set((keys || []).map((k) => String(k).trim()).filter(Boolean))];
    const health = readKeyHealth(storage);
    const healthy = [];
    const cooling = [];
    for (const key of list) {
      const failedAt = Number(health[key]);
      if (Number.isFinite(failedAt) && now - failedAt >= 0 && now - failedAt < cm) {
        cooling.push(key);
      } else {
        healthy.push(key);
      }
    }
    return [...healthy, ...cooling];
  }
  return { STORAGE_KEY: storageKey, readKeyHealth, markKeyUnhealthy, orderKeysByHealth };
}
export function getKeyHealthStorage(windowRef = typeof window !== 'undefined' ? window : undefined) {
  try {
    return windowRef?.localStorage ?? null;
  } catch {
    return null;
  }
}
