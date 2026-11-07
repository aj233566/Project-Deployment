// Driving time and distance by road from the public OSRM server (the same service the emergency route uses). Only the two places'
// coordinates are sent. Returns null when the service cannot be reached, and the page then keeps showing the straight-line distance.

const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

export function parseOsrmRoute(payload) {
  const route = payload?.routes?.[0];
  if (payload?.code !== 'Ok' || !route || !Number.isFinite(route.duration) || !Number.isFinite(route.distance)) return null;
  return { minutes: Math.max(1, Math.round(route.duration / 60)), km: Number((route.distance / 1000).toFixed(1)) };
}

export async function fetchDriveEta(from, to, { signal, fetchImpl = globalThis.fetch } = {}) {
  try {
    const url = `${OSRM_URL}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
    const response = await fetchImpl(url, { signal });
    if (!response.ok) return null;
    return parseOsrmRoute(await response.json());
  } catch {
    return null;
  }
}
