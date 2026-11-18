import api from '../api';

// India's population from the World Bank API (free, no key). The newest year available is used.
// Source indicator SP.POP.TOTL, which the World Bank builds from UN Population Division estimates and national statistics.

export function parseWorldBankPopulation(payload) {
  const rows = Array.isArray(payload) ? payload[1] : null;
  if (!Array.isArray(rows)) return null;
  const latest = rows
    .filter((row) => Number.isFinite(row?.value) && row.value > 0 && /^\d{4}$/.test(String(row.date)))
    .sort((a, b) => Number(b.date) - Number(a.date))[0];
  return latest ? { year: Number(latest.date), value: latest.value, updated: payload[0]?.lastupdated || null } : null;
}

export async function fetchIndiaPopulation({ signal } = {}) {
  const response = await api.get('/feeds/india-population', { signal });
  const parsed = parseWorldBankPopulation(response.data);
  if (!parsed) throw new Error('World Bank returned no population figure.');
  return { ...parsed, stale: response.headers['x-feed-stale'] === 'true' };
}
