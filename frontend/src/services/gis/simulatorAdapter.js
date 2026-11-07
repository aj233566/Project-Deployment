import { rankEmergencyRoutes } from '../../utils/gis/emergencyRouteScoring';
export function normalizeSimulatorDelta(rawPayload, currentMapState = {}) {
  if (!rawPayload || typeof rawPayload !== 'object') {
    return {
      roads: currentMapState.roads || [],
      hospitals: currentMapState.hospitals || [],
      shelters: currentMapState.shelters || [],
      resources: currentMapState.resources || [],
      riskZones: currentMapState.riskZones || [],
      routes: currentMapState.routes || [],
      highlightedId: null
    };
  }
  const deltas = rawPayload.deltas || rawPayload;
  const baseRoads = currentMapState.roads || [];
  const roadDeltas = Array.isArray(deltas.roads) ? deltas.roads : [];
  const updatedRoads = baseRoads.map((road) => {
    const delta = roadDeltas.find((d) => d && d.id === road.id);
    if (!delta) return road;
    return {
      ...road,
      status: delta.status || road.status,
      reason: delta.reason || road.reason,
      estimatedClearance: delta.estimatedClearance || road.estimatedClearance
    };
  });
  const baseHospitals = currentMapState.hospitals || [];
  const hospitalDeltas = Array.isArray(deltas.hospitals) ? deltas.hospitals : [];
  const updatedHospitals = baseHospitals.map((hosp) => {
    const delta = hospitalDeltas.find((d) => d && d.id === hosp.id);
    if (!delta) return hosp;
    return {
      ...hosp,
      roadAccess: delta.roadAccess || hosp.roadAccess,
      status: delta.status || hosp.status,
      availableBeds: delta.availableBeds !== undefined ? delta.availableBeds : hosp.availableBeds
    };
  });
  const baseRiskZones = currentMapState.riskZones || [];
  const riskDeltas = Array.isArray(deltas.riskZones) ? deltas.riskZones : [];
  const updatedRiskZones = baseRiskZones.map((zone) => {
    const delta = riskDeltas.find((d) => d && d.id === zone.id);
    if (!delta) return zone;
    return {
      ...zone,
      riskScore: delta.riskScore !== undefined ? delta.riskScore : zone.riskScore,
      riskLevel: delta.riskLevel || zone.riskLevel,
      status: delta.status || zone.status
    };
  });
  let updatedRoutes = currentMapState.routes ? [...currentMapState.routes] : [];
  if (Array.isArray(deltas.routes)) {
    updatedRoutes = deltas.routes;
  } else if (deltas.replacementRoute && typeof deltas.replacementRoute === 'object') {
    const rep = deltas.replacementRoute;
    if (rep.id && Array.isArray(rep.coordinates)) {
      updatedRoutes = updatedRoutes.map((r) => (r.type === 'Primary' ? rep : r));
    }
  }
  const rankedRoutes = rankEmergencyRoutes(updatedRoutes, {
    roads: updatedRoads,
    riskZones: updatedRiskZones,
    incidents: currentMapState.incidents || []
  });
  const highlightedId = deltas.highlightedResourceId || deltas.highlightedId || null;
  return {
    roads: updatedRoads,
    hospitals: updatedHospitals,
    shelters: currentMapState.shelters || [],
    resources: currentMapState.resources || [],
    riskZones: updatedRiskZones,
    routes: rankedRoutes,
    highlightedId
  };
}
