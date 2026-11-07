// India's population from the World Bank API (free, no key, browser access allowed). The newest year available is used.
// Source indicator SP.POP.TOTL, which the World Bank builds from UN Population Division estimates and national statistics.

const URL = 'https://api.worldbank.org/v2/country/IND/indicator/SP.POP.TOTL?format=json&per_page=6';

export function parseWorldBankPopulation(payload) {
  const rows = Array.isArray(payload) ? payload[1] : null;
  if (!Array.isArray(rows)) return null;
  const latest = rows
    .filter((row) => Number.isFinite(row?.value) && row.value > 0 && /^\d{4}$/.test(String(row.date)))
    .sort((a, b) => Number(b.date) - Number(a.date))[0];
  return latest ? { year: Number(latest.date), value: latest.value, updated: payload[0]?.lastupdated || null } : null;
}

export async function fetchIndiaPopulation({ signal } = {}) {
  const response = await fetch(URL, { signal });
  if (!response.ok) throw new Error(`World Bank returned HTTP ${response.status}`);
  const parsed = parseWorldBankPopulation(await response.json());
  if (!parsed) throw new Error('World Bank returned no population figure.');
  return parsed;
}
