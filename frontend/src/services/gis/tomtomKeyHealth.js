import { createKeyHealth, getKeyHealthStorage, DEFAULT_COOLDOWN_MS } from './keyHealth.js';
const health = createKeyHealth('sentry.tomtom.key-health.v1');
export const STORAGE_KEY = health.STORAGE_KEY;
export const { readKeyHealth, markKeyUnhealthy, orderKeysByHealth } = health;
export { getKeyHealthStorage, DEFAULT_COOLDOWN_MS };
