export async function loadGisOperationalData(api, liveIncidents = null) {
  const [incidentResponse, habitationResponse, zoneResponse, siteResponse] = await Promise.all([
    Array.isArray(liveIncidents) ? Promise.resolve(null) : api.getActiveIncidents(),
    api.getHabitations({ active: true }),
    api.getRedZones(),
    api.getRelocationSites(),
  ]);
  return {
    incidents: incidentResponse?.data ?? null,
    habitations: habitationResponse.data,
    redZones: zoneResponse.data,
    relocationSites: siteResponse.data,
  };
}
