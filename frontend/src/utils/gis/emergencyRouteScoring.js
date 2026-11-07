export const ROAD_PENALTIES = {
  BLOCKED: Infinity,
  FLOODED: 5.0,                                                    
  RESTRICTED: 1.8,
  CONNECTED: 1.0,
  OPEN: 1.0,
  OPERATIONAL: 1.0
};
export const TRAFFIC_LEVEL_WEIGHTS = {
  NORMAL: 1.0,
  MODERATE: 1.15,
  HEAVY: 1.5,
  SEVERE: 2.2
};
export function scoreEmergencyRoute(route, context = {}) {
  if (!route) return { score: Infinity, isPassable: false, recommendationStatus: "Invalid Route" };
  const roads = context.roads || [];
  const associatedRoad = roads.find((r) => route.roadSegmentId === r.id || (r.status === 'Blocked' && (route.traversesR17 || route.traversesKm32)));
  const normalizedRouteRoadStatus = (route.roadStatus || '').toUpperCase();
  const normalizedAssociatedStatus = associatedRoad ? (associatedRoad.status || '').toUpperCase() : '';
  const knownRoadStatuses = new Set(['OPEN', 'CONNECTED', 'OPERATIONAL', 'RESTRICTED', 'BLOCKED', 'FLOODED']);
  const routeRoadStatusKnown = knownRoadStatuses.has(normalizedRouteRoadStatus);
  const associatedRoadStatusKnown = knownRoadStatuses.has(normalizedAssociatedStatus);
  const roadStatusKnown = routeRoadStatusKnown || associatedRoadStatusKnown;
  if (!roadStatusKnown) {
    return {
      score: Infinity,
      isPassable: false,
      recommendationStatus: "UNCONFIRMED / ROAD STATUS UNAVAILABLE",
      penaltyBreakdown: {
        baseEta: Number.isFinite(route.trafficAwareEtaMin) ? route.trafficAwareEtaMin : null,
        roadCondition: "UNKNOWN",
        trafficCondition: route.trafficLevel || "UNKNOWN",
        totalScore: null
      }
    };
  }
  const isPhysicallyBlocked = normalizedRouteRoadStatus === 'BLOCKED' || normalizedAssociatedStatus === 'BLOCKED';
  const isPhysicallyRestricted = normalizedRouteRoadStatus === 'RESTRICTED' || normalizedAssociatedStatus === 'RESTRICTED';
  if (isPhysicallyBlocked) {
    return {
      score: Infinity,
      isPassable: false,
      recommendationStatus: "IMPASSABLE / BLOCKED",
      penaltyBreakdown: {
        baseEta: route.trafficAwareEtaMin || 99,
        roadCondition: "BLOCKED (Landslide rockfall / infrastructure severance)",
        trafficCondition: route.trafficLevel || "NORMAL",
        totalScore: Infinity
      }
    };
  }
  const baseEta = route.trafficAwareEtaMin || (parseInt(route.eta) || 25);
  const roadState = isPhysicallyRestricted
    ? 'RESTRICTED'
    : routeRoadStatusKnown ? normalizedRouteRoadStatus : normalizedAssociatedStatus;
  const roadMultiplier = ROAD_PENALTIES[roadState] || 1.0;
  const trafficMultiplier = TRAFFIC_LEVEL_WEIGHTS[(route.trafficLevel || 'NORMAL').toUpperCase()] || 1.0;
  const finalScore = Number((baseEta * roadMultiplier * trafficMultiplier).toFixed(2));
  return {
    score: finalScore,
    isPassable: isFinite(roadMultiplier),
    recommendationStatus: finalScore <= 30 ? "RECOMMENDED (Optimal)" : "ALTERNATIVE (Suboptimal)",
    penaltyBreakdown: {
      baseEta,
      roadState,
      trafficCondition: route.trafficLevel || "NORMAL",
      roadMultiplier,
      trafficMultiplier,
      totalScore: finalScore
    }
  };
}
export function rankEmergencyRoutes(candidateRoutes = [], context = {}) {
  if (!Array.isArray(candidateRoutes) || candidateRoutes.length === 0) {
    return [];
  }
  const scoredRoutes = candidateRoutes.map((route) => {
    const evaluation = scoreEmergencyRoute(route, context);
    return {
      ...route,
      disasterScore: evaluation.score,
      isPassable: evaluation.isPassable,
      penaltyBreakdown: evaluation.penaltyBreakdown
    };
  });
  const passableRoutes = scoredRoutes.filter((r) => r.isPassable && isFinite(r.disasterScore));
  passableRoutes.sort((a, b) => a.disasterScore - b.disasterScore);
  return scoredRoutes.map((route) => {
    if (!route.isPassable) {
      return {
        ...route,
        type: route.roadStatus?.toUpperCase() === "BLOCKED" ? "Affected" : route.type,
        status: route.roadStatus?.toUpperCase() === "BLOCKED" ? "Blocked" : "Unconfirmed"
      };
    }
    const isTopChoice = passableRoutes.length > 0 && passableRoutes[0].id === route.id;
    return {
      ...route,
      type: isTopChoice ? "Primary" : "Alternative",
      status: isTopChoice ? "Recommended" : "Available"
    };
  });
}
