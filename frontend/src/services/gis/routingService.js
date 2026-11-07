import { DEMO_ROUTES } from '../../data/gis/demoGisData';
import { TomTomRoutingAdapter } from './tomtomRoutingAdapter';
import { OsrmRoutingAdapter } from './osrmRoutingAdapter.js';
import { rankEmergencyRoutes } from '../../utils/gis/emergencyRouteScoring';
class DemoRoutingAdapter {
  constructor() {
    this.source = "SIMULATED";
  }
  async getRoutes(context = {}) {
    return Promise.resolve(rankEmergencyRoutes(DEMO_ROUTES, context));
  }
  async calculateRoute({ origin, destination, context = {} }) {
    if (!origin || !destination) {
      throw new Error("Origin and Destination coordinates are required.");
    }
    const routes = rankEmergencyRoutes(DEMO_ROUTES, context);
    const primary = routes.find((r) => r.type === 'Primary') || routes[0];
    return Promise.resolve(primary);
  }
}
export class RoutingService {
  constructor({ osrmAdapter = new OsrmRoutingAdapter(), tomtomAdapter = new TomTomRoutingAdapter(), demoAdapter = new DemoRoutingAdapter() } = {}) {
    this.osrmAdapter = osrmAdapter;
    this.tomtomAdapter = tomtomAdapter;
    this.demoAdapter = demoAdapter;
    this.cache = new Map();
    this.cacheTtlMs = 60 * 1000;
    this.activeSource = this.osrmAdapter.isConfigured() ? "LIVE_OSM" : (this.tomtomAdapter.isConfigured() ? "LIVE_TOMTOM" : "SIMULATED");
    this.lastError = null;
  }
  getActiveSource() {
    return this.activeSource;
  }
  isLiveTomTom() {
    return this.activeSource === "LIVE_TOMTOM";
  }
  async calculateRoute({ origin, destination, routeId = "ROUTE-LIVE-01" }) {
    const validPoint = (point) => Number.isFinite(point?.lat) && Number.isFinite(point?.lng);
    if (!validPoint(origin) || !validPoint(destination)) {
      throw new Error("Valid origin and destination coordinates are required for route calculation.");
    }
    const cacheKey = `route:${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}>${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      this.activeSource = cached.source;
      return cached.data;
    }
    const liveAdapters = [
      { adapter: this.osrmAdapter, source: "LIVE_OSM", label: "OSM" },
      { adapter: this.tomtomAdapter, source: "LIVE_TOMTOM", label: "TomTom" },
    ].filter(({ adapter }) => adapter.isConfigured());
    for (const { adapter, source, label } of liveAdapters) {
      try {
        const route = await adapter.calculateRoute({ origin, destination, routeId, routeType: "Primary" });
        this.cache.set(cacheKey, { timestamp: Date.now(), data: route, source });
        this.activeSource = source;
        this.lastError = null;
        return route;
      } catch (err) {
        this.lastError = err.message;
        console.warn(`[RoutingService] ${label} live routing unavailable, trying next source:`, err.message);
      }
    }
    this.activeSource = "UNAVAILABLE";
    throw new Error(this.lastError || "No live road-routing provider is available.");
  }
  async getRoutes(context = {}) {
    const liveAdapters = [
      { adapter: this.osrmAdapter, source: "LIVE_OSM", label: "OSM" },
      { adapter: this.tomtomAdapter, source: "LIVE_TOMTOM", label: "TomTom" }
    ].filter(({ adapter }) => adapter.isConfigured());
    const cacheKey = `routes-${JSON.stringify(context.roads?.map((r) => r.status)) || 'default'}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      this.activeSource = cached.source;
      return cached.data;
    }
    const primaryDemo = DEMO_ROUTES.find((r) => r.type === 'Primary') || DEMO_ROUTES[0];
    for (const { adapter, source, label } of liveAdapters) {
      try {
        const livePrimary = await adapter.calculateRoute({
          origin: primaryDemo.origin,
          destination: primaryDemo.destination,
          routeId: primaryDemo.id,
          routeType: "Primary"
        });
        const candidateRoutes = [livePrimary, ...DEMO_ROUTES.filter((r) => r.id !== primaryDemo.id)];
        const ranked = rankEmergencyRoutes(candidateRoutes, context);
        this.cache.set(cacheKey, { timestamp: Date.now(), data: ranked, source });
        this.activeSource = source;
        this.lastError = null;
        return ranked;
      } catch (err) {
        console.warn(`[RoutingService] ${label} live routing unavailable, trying next source:`, err.message);
        this.lastError = err.message;
      }
    }
    this.activeSource = "SIMULATED";
    return this.demoAdapter.getRoutes(context);
  }
  clearCache() {
    this.cache.clear();
  }
}
export const routingService = new RoutingService();
