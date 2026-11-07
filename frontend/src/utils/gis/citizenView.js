const SEVERITY_RANK = { critical: 4, high: 3, warning: 2, moderate: 2, operational: 1, low: 0 };
const SEVERITY_DOT = { critical: '🔴', high: '🟠', warning: '🟡', moderate: '🟡', operational: '⚪', low: '⚪' };
const OPERATIONAL_CENTER = { lat: 27.2850, lng: 88.5650 };
const OPERATIONAL_RADIUS_KM = 60;
export const SIMULATED_CITIZEN_LOCATION = { lat: 27.2320, lng: 88.5000, label: 'Singtam town' };
export function isWithinOperationalArea(point, maxKm = OPERATIONAL_RADIUS_KM) {
  if (!point || typeof point.lat !== 'number' || typeof point.lng !== 'number') return false;
  return approxDistanceKm(point.lat, point.lng, OPERATIONAL_CENTER.lat, OPERATIONAL_CENTER.lng) <= maxKm;
}
export function approxDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;                         
  const toRad = Math.PI / 180;
  const meanLat = ((lat1 + lat2) / 2) * toRad;
  const dLat = (lat2 - lat1) * toRad;
  const dLng = (lng2 - lng1) * toRad * Math.cos(meanLat);
  return Math.sqrt(dLat * dLat + dLng * dLng) * R;
}
function zonePoint(zone) {
  if (!zone) return null;
  if (Array.isArray(zone.center) && zone.center.length >= 2) {
    return { lat: zone.center[0], lng: zone.center[1] };
  }
  const coords = zone.coordinates;
  if (Array.isArray(coords) && coords.length > 0) {
    const sum = coords.reduce((a, c) => ({ lat: a.lat + c[0], lng: a.lng + c[1] }), { lat: 0, lng: 0 });
    return { lat: sum.lat / coords.length, lng: sum.lng / coords.length };
  }
  return null;
}
function pointOf(entity) {
  const loc = entity && entity.location;
  if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
    return { lat: loc.lat, lng: loc.lng };
  }
  return null;
}
function nearestTo(point, list) {
  if (!point || !Array.isArray(list) || list.length === 0) return null;
  let best = null;
  let bestKm = Infinity;
  for (const item of list) {
    const p = pointOf(item);
    if (!p) continue;
    const km = approxDistanceKm(point.lat, point.lng, p.lat, p.lng);
    if (km < bestKm) {
      bestKm = km;
      best = { ...item, distanceKm: Math.round(km * 10) / 10 };
    }
  }
  return best;
}
function isActive(inc) {
  const s = String(inc && inc.status ? inc.status : '').toLowerCase();
  return ['submitted', 'verified', 'in_progress', 'active', 'acknowledged'].includes(s);
}
function timeAgo(fromIso, nowMs) {
  const t = Date.parse(fromIso);
  if (!Number.isFinite(t)) return null;
  const mins = Math.max(0, Math.round((nowMs - t) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min ago` : `${h} h ago`;
}
function scenarioNow(incidents) {
  const times = (incidents || [])
    .map((i) => Date.parse(i && i.reportedAt))
    .filter((n) => Number.isFinite(n));
  if (times.length === 0) return Date.now();
  return Math.max(...times) + 4 * 60000;                         
}
function buildNearbyHazards({ incidents, origin, primaryId, nowMs, limit = 5 }) {
  if (!origin || typeof origin.lat !== 'number') return [];
  return (incidents || [])
    .filter(isActive)
    .map((inc) => {
      const p = pointOf(inc);
      if (!p) return null;
      const sev = String(inc.severity || 'unknown').toLowerCase();
      return {
        id: inc.id,
        type: inc.type || 'Hazard',
        severity: inc.severity || 'Unknown',
        dot: SEVERITY_DOT[sev] || '⚪',
        distanceKm: Math.round(approxDistanceKm(origin.lat, origin.lng, p.lat, p.lng) * 10) / 10,
        detectedAgo: timeAgo(inc.reportedAt, nowMs),
        isPrimary: inc.id === primaryId,
        location: { lat: p.lat, lng: p.lng }
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}
export function selectCitizenFocus({
  incidents = [],
  riskZones = [],
  shelters = [],
  hospitals = [],
  routes = [],
  roads = [],
  reference = null,
  demoMode = false
} = {}) {
  const activeIncidents = (incidents || []).filter(isActive);
  const topIncident = activeIncidents
    .slice()
    .sort((a, b) => {
      const sr = (SEVERITY_RANK[String(b.severity).toLowerCase()] || 0) -
        (SEVERITY_RANK[String(a.severity).toLowerCase()] || 0);
      if (sr !== 0) return sr;
      const populationA = Number.isFinite(a.affectedPopulation) && a.affectedPopulation >= 0 ? a.affectedPopulation : -1;
      const populationB = Number.isFinite(b.affectedPopulation) && b.affectedPopulation >= 0 ? b.affectedPopulation : -1;
      return populationB - populationA;
    })[0] || null;
  const assessedZones = (riskZones || []).filter((zone) =>
    Number.isFinite(zone.riskScore) ||
    (typeof zone.riskLevel === 'string' && zone.riskLevel.trim() && !['unknown', 'unavailable'].includes(zone.riskLevel.toLowerCase()))
  );
  const topZone = assessedZones
    .slice()
    .sort((a, b) => {
      const scoreA = Number.isFinite(a.riskScore) ? a.riskScore : -1;
      const scoreB = Number.isFinite(b.riskScore) ? b.riskScore : -1;
      return scoreB - scoreA;
    })[0] || null;
  let dangerPoint = null;
  let dangerLevel = 'UNKNOWN';
  let warning = null;
  let primaryId = null;
  if (topIncident) {
    const p = pointOf(topIncident);
    if (p) {
      dangerPoint = { ...p, label: topIncident.type || 'Active hazard', severity: topIncident.severity };
      dangerLevel = String(topIncident.severity || 'UNKNOWN').toUpperCase();
      warning = `${topIncident.severity ? `${topIncident.severity} ` : ""}${topIncident.type || 'Hazard'} reported — avoid the area and follow local safety instructions.`.trim();
      primaryId = topIncident.id;
    }
  }
  if (!dangerPoint && topZone) {
    const p = zonePoint(topZone);
    if (p) {
      dangerPoint = { ...p, label: topZone.name || 'High-risk zone', severity: topZone.riskLevel };
      dangerLevel = String(topZone.riskLevel || 'UNKNOWN').toUpperCase();
      warning = topZone.riskLevel
        ? `${topZone.name || 'A nearby area'} has a ${dangerLevel} hazard-risk advisory.`
        : `${topZone.name || 'A nearby area'} has a recorded risk index, but no classification is available.`;
    }
  }
  const hasGpsLocation =
    reference &&
    typeof reference.lat === "number" &&
    typeof reference.lng === "number";
  const myPoint = hasGpsLocation
    ? {
      lat: reference.lat,
      lng: reference.lng,
    }
    : demoMode ? {
      ...SIMULATED_CITIZEN_LOCATION,
    } : null;
  const locationMode =
    hasGpsLocation
      ? "live"
    : demoMode ? "demo" : "unknown";
  const originLabel =
    hasGpsLocation
      ? "your location"
      : demoMode ? SIMULATED_CITIZEN_LOCATION.label : null;
  const locationStatus =
    hasGpsLocation
      ? "LIVE · YOUR LOCATION"
      : demoMode ? "DEMO · SINGTAM · EAST SIKKIM" : "LOCATION NOT SHARED";
  const availableStatuses = new Set(['operational', 'open', 'active', 'available']);
  const openShelters = (shelters || []).filter((s) => availableStatuses.has(String(s.status || '').toLowerCase()));
  const openHospitals = (hospitals || []).filter((h) => availableStatuses.has(String(h.status || '').toLowerCase()));
  const nearestShelter =
    locationMode === "demo"
      ? nearestTo(
        myPoint,
        openShelters
      )
      : nearestTo(
        myPoint,
        openShelters.filter((s) => {
          const p = pointOf(s);
          if (!p) return false;
          return (
            approxDistanceKm(
              myPoint.lat,
              myPoint.lng,
              p.lat,
              p.lng
            ) <= 50
          );
        })
      );
  const nearestHospital =
    locationMode === "demo"
      ? nearestTo(
        myPoint,
        openHospitals
      )
      : nearestTo(
        myPoint,
        openHospitals.filter((h) => {
          const p = pointOf(h);
          if (!p) return false;
          return (
            approxDistanceKm(
              myPoint.lat,
              myPoint.lng,
              p.lat,
              p.lng
            ) <= 50
          );
        })
      );
  const nowMs = scenarioNow(incidents);
  const nearbyHazards = buildNearbyHazards({ incidents, origin: myPoint, primaryId, nowMs });
  const primaryRoute =
    (routes || []).find((r) => String(r.status).toLowerCase() === 'recommended') ||
    (routes || []).find((r) => String(r.status).toLowerCase() === 'available') ||
    null;
  const riskReason = topZone && topZone.primaryFactor ? topZone.primaryFactor : null;
  const roadStatus = (roads || [])
    .filter((r) => {
      const s = String(r.status || '').toLowerCase();
      return s === 'blocked' || s === 'restricted' || s === 'one-lane';
    })
    .map((r) => {
      const blocked = String(r.status || '').toLowerCase() === 'blocked';
      return {
        id: r.id,
        name: r.name || 'Road corridor',
        status: r.status,
        avoid: blocked,
        reason: r.blockageReason || r.restrictionReason ||
          (blocked ? 'Corridor severed' : 'Limited / single-lane access'),
        clearance: r.estimatedClearance || null
      };
    })
    .sort((a, b) => (b.avoid ? 1 : 0) - (a.avoid ? 1 : 0));
  const weakInfrastructure = (incidents || [])
    .filter(isActive)
    .filter((i) => /infrastructure/i.test(String(i.type || '')))
    .map((i) => ({
      id: i.id,
      type: i.type || 'Infrastructure damage',
      title: i.title || i.type || 'Damaged infrastructure',
      severity: i.severity || 'Operational',
      address: (i.location && i.location.address) || null,
      location: pointOf(i)
    }));
  return {
    dangerPoint,
    dangerLevel,
    nearestShelter,
    nearestHospital,
    primaryRoute,
    warning,
    riskReason,
    nearbyHazards,
    roadStatus,
    weakInfrastructure,
    myPoint,
    locationMode,
    locationStatus,
    originLabel
  };
}
