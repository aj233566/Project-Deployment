const DEFAULT_BASE_URL = "https://router.project-osrm.org/route/v1/driving";
export class OsrmRoutingAdapter {
  constructor({ baseUrl = DEFAULT_BASE_URL, fetchImpl = globalThis.fetch, timeoutMs = 10000 } = {}) {
    this.baseUrl = baseUrl;
    // Browsers refuse window.fetch called as a method of another object ("Illegal invocation"), so the default is wrapped.
    this.fetchImpl = fetchImpl === globalThis.fetch && typeof fetchImpl === 'function' ? (...args) => globalThis.fetch(...args) : fetchImpl;
    this.timeoutMs = timeoutMs;
  }
  isConfigured() {
    return typeof this.fetchImpl === 'function';
  }
  async calculateRoute({ origin, destination, routeId = "ROUTE-OSM-01", routeType = "Primary" }) {
    if (!this.isConfigured()) {
      throw new Error("OSM routing is unavailable: fetch is not supported in this environment.");
    }
    if (!origin || !destination || typeof origin.lat !== 'number' || typeof destination.lat !== 'number') {
      throw new Error("Valid origin and destination coordinates are required for route calculation.");
    }
    const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const url = `${this.baseUrl}/${coords}?overview=full&geometries=geojson&steps=false`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(response.status === 429
          ? 'OSM routing rate limit reached (HTTP 429); live routing is unavailable.'
          : `OSM routing error HTTP ${response.status}.`);
      }
      const data = await response.json();
      const route = data?.routes?.[0];
      if (data?.code !== 'Ok' || !route?.geometry?.coordinates?.length) {
        throw new Error("OSM routing returned no valid route between the points.");
      }
      return this.normalizeRoute(route, { origin, destination, routeId, routeType });
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(`OSM routing request timed out (${this.timeoutMs / 1000}s limit exceeded).`, { cause: err });
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }
  normalizeRoute(route, { origin, destination, routeId, routeType }) {
    const distanceKm = Number((route.distance / 1000).toFixed(1));
    const etaMin = Math.max(1, Math.round(route.duration / 60));
    return {
      id: routeId,
      name: `${origin.name || 'Origin Hub'} to ${destination.name || 'District Hospital'} Corridor`,
      type: routeType,
      status: "Available",
      riskLevel: "Operational",
      origin: { name: origin.name || "Origin Hub", lat: origin.lat, lng: origin.lng },
      destination: { name: destination.name || "District General Hospital", lat: destination.lat, lng: destination.lng },
      coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      distanceKm,
      distance: `${distanceKm} km`,
      freeFlowEtaMin: etaMin,
      travelTimeEtaMin: etaMin,
      eta: `${etaMin} mins`,
      trafficLevel: 'UNKNOWN',
      roadStatus: "UNKNOWN",
      source: "LIVE_OSM",
      lastUpdated: new Date().toISOString(),
      hazardsAvoided: null
    };
  }
}
