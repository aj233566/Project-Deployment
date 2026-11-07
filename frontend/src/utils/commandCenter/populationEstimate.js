// State populations estimated from the live national figure: national total x the state's share of the 2011 census.
// This assumes every state kept its 2011 share, so fast-growing states (Bihar, Uttar Pradesh) are somewhat under-counted and
// slow-growing ones (Kerala, Tamil Nadu) over-counted. It is an estimate, and callers must say so.

export function estimateStatePopulations(national, censusByCode) {
  if (!Number.isFinite(national) || national <= 0 || !censusByCode) return {};
  const total = Object.values(censusByCode).reduce((sum, value) => sum + value, 0);
  if (!(total > 0)) return {};
  return Object.fromEntries(Object.entries(censusByCode).map(([code, value]) => [code, Math.round((value / total) * national)]));
}

// Most populous states first, each with the SENTRY at-risk people in it and that as a share of the estimate.
export function rankEstimatedStates(estimates, registry, atRiskRows = []) {
  const atRisk = new Map(atRiskRows.map((row) => [row.code, row.atRisk]));
  return (registry || [])
    .filter((state) => Number.isFinite(estimates?.[state.code]))
    .map((state) => {
      const population = estimates[state.code];
      const risk = atRisk.get(state.code) || 0;
      return { code: state.code, name: state.name, population, atRisk: risk, share: risk / population };
    })
    .sort((a, b) => b.population - a.population);
}
