import { createTomTomKeyring, getTomTomApiKeys } from '../../config/tomtom.js';
export class TomTomRoutingAdapter {
  constructor(apiKeys = null, fetchImpl = globalThis.fetch) {
    const configuredKeys = apiKeys === null
      ? getTomTomApiKeys()
      : (Array.isArray(apiKeys) ? apiKeys : [apiKeys]);
    this.keyring = createTomTomKeyring(configuredKeys);
    this.fetchImpl = fetchImpl;
    this.baseUrl = "https://api.tomtom.com/routing/1/calculateRoute";
  }
  isConfigured() {
    return Boolean(
      this.keyring.current() &&
      typeof this.fetchImpl === 'function'
    );
  }
  async calculateRoute({ origin, destination, routeId = "ROUTE-TOMTOM-01", routeType = "Primary" }) {
    if (!this.isConfigured()) {
      throw new Error("TomTom API keys are not configured in VITE_TOMTOM_API_KEYS.");
    }
    if (!origin || !destination || typeof origin.lat !== 'number' || typeof destination.lat !== 'number') {
      throw new Error("Valid origin and destination coordinates are required for route calculation.");
    }
    const locString = `${origin.lat},${origin.lng}:${destination.lat},${destination.lng}`;
    while (this.keyring.current()) {
      const apiKey = this.keyring.current();
      const url = `${this.baseUrl}/${locString}/json?key=${encodeURIComponent(apiKey)}&traffic=true&travelMode=car&routeType=fastest&computeBestOrder=false`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await this.fetchImpl(url, { signal: controller.signal });
        if (!response.ok) {
          const error = response.status === 429
            ? new Error('TomTom Routing API quota or rate limit reached (HTTP 429); live routing is unavailable.')
            : new Error(`TomTom Routing API error HTTP ${response.status}.`);
          if ([401, 403].includes(response.status) && this.keyring.advance()) {
            continue;
          }
          throw error;
        }
        const data = await response.json();
        if (!data.routes || data.routes.length === 0) {
          throw new Error("TomTom Routing API returned no valid route candidates between points.");
        }
        return this.normalizeRoute(data.routes[0], { origin, destination, routeId, routeType });
      } catch (err) {
        if (err.name === 'AbortError') {
          throw new Error("TomTom Routing API request timed out (8s limit exceeded).", { cause: err });
        }
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
    }
    throw new Error('TomTom Routing API has no usable configured key.');
  }
  normalizeRoute(tomtomRoute, { origin, destination, routeId, routeType }) {
    const summary = tomtomRoute.summary || {};
    const distanceMeters = summary.lengthInMeters || 0;
    const travelTimeSec = summary.travelTimeInSeconds || 0;
    const trafficDelaySec = summary.trafficDelayInSeconds || 0;
    const freeFlowSec = summary.noTrafficTravelTimeInSeconds || Math.max(0, travelTimeSec - trafficDelaySec);
    const distanceKm = Number((distanceMeters / 1000).toFixed(1));
    const trafficAwareEtaMin = Math.max(1, Math.round(travelTimeSec / 60));
    const freeFlowEtaMin = Math.max(1, Math.round(freeFlowSec / 60));
    const trafficDelayMin = Math.round(trafficDelaySec / 60);
    let trafficLevel = 'NORMAL';
    const delayRatio = freeFlowSec > 0 ? trafficDelaySec / freeFlowSec : 0;
    if (delayRatio >= 0.75 || trafficDelayMin >= 8) {
      trafficLevel = 'SEVERE';
    } else if (delayRatio >= 0.30 || trafficDelayMin >= 4) {
      trafficLevel = 'HEAVY';
    } else if (delayRatio >= 0.10 || trafficDelayMin >= 1) {
      trafficLevel = 'MODERATE';
    }
    const coordinates = [];
    if (Array.isArray(tomtomRoute.legs)) {
      for (const leg of tomtomRoute.legs) {
        if (Array.isArray(leg.points)) {
          for (const pt of leg.points) {
            coordinates.push([pt.latitude, pt.longitude]);
          }
        }
      }
    }
    return {
      id: routeId,
      name: `${origin.name || 'Origin Hub'} to ${destination.name || 'District Hospital'} Corridor`,
      type: routeType,
      status: "Available",
      riskLevel: "Operational",
      origin: {
        name: origin.name || "Origin Hub",
        lat: origin.lat,
        lng: origin.lng
      },
      destination: {
        name: destination.name || "District General Hospital",
        lat: destination.lat,
        lng: destination.lng
      },
      coordinates: coordinates.length > 0 ? coordinates : [[origin.lat, origin.lng], [destination.lat, destination.lng]],
      distanceKm,
      distance: `${distanceKm} km`,
      freeFlowEtaMin,
      trafficAwareEtaMin,
      trafficDelayMin,
      eta: `${trafficAwareEtaMin} mins`,
      trafficLevel,                                                                     
      roadStatus: "UNKNOWN",
      source: "LIVE_TOMTOM",
      lastUpdated: new Date().toISOString(),
      hazardsAvoided: null
    };
  }
}
