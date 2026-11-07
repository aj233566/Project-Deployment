function getApproxDistanceKm(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * 111.0;
  const dLon = (lon2 - lon1) * 111.0 * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLon * dLon);
}
export function calculateRiskHeatmapNodes(riskZones = [], incidents = [], weather = {}) {
  if (!Array.isArray(riskZones) || riskZones.length === 0) {
    return [];
  }
  const nodes = [];
  const defaultRainfall = numericNonNegative(weather?.rainfall24hMm);
  riskZones.forEach((zone) => {
    const rawRiskScore = Number.isFinite(zone.riskScore) && zone.riskScore >= 0 && zone.riskScore <= 100
      ? zone.riskScore
      : null;
    if (rawRiskScore === null) return;
    let centroidLat;
    let centroidLng;
    let radiusMeters;
    if (zone.geometryType === 'Circle' && Array.isArray(zone.center)
      && Number.isFinite(zone.center[0]) && Number.isFinite(zone.center[1])) {
      centroidLat = zone.center[0];
      centroidLng = zone.center[1];
      radiusMeters = Number.isFinite(zone.radius) && zone.radius > 0 ? zone.radius : 1200;
    } else if (zone.geometryType === 'Polygon' && Array.isArray(zone.coordinates) && zone.coordinates.length > 0) {
      if (zone.coordinates.some((point) => !Array.isArray(point)
        || !Number.isFinite(point[0]) || !Number.isFinite(point[1]))) return;
      const sumLat = zone.coordinates.reduce((acc, pt) => acc + pt[0], 0);
      const sumLng = zone.coordinates.reduce((acc, pt) => acc + pt[1], 0);
      centroidLat = sumLat / zone.coordinates.length;
      centroidLng = sumLng / zone.coordinates.length;
      radiusMeters = 1600;
    } else return;
    const normRisk = rawRiskScore / 100.0;
    const localIncidents = incidents.filter((inc) => {
      if (!inc.location || !Number.isFinite(inc.location.lat) || !Number.isFinite(inc.location.lng)) return false;
      const dist = getApproxDistanceKm(centroidLat, centroidLng, inc.location.lat, inc.location.lng);
      return dist <= (radiusMeters / 1000) * 1.5;                      
    });
    const normIncidents = Math.min(1.0, localIncidents.length / 2.0);                                  
    const zoneRainfall = numericNonNegative(zone.rainfall24hMm) ?? defaultRainfall;
    const normRainfall = zoneRainfall === null ? null : Math.min(1.0, zoneRainfall / 160.0);
    const weightedInputs = [
      { value: normRisk, weight: 0.45 },
      { value: normIncidents, weight: 0.30 },
      { value: normRainfall, weight: 0.25 },
    ].filter((item) => Number.isFinite(item.value));
    const availableWeight = weightedInputs.reduce((sum, item) => sum + item.weight, 0);
    const finalIntensity = Number((
      weightedInputs.reduce((sum, item) => sum + item.value * item.weight, 0) / availableWeight
    ).toFixed(3));
    let severity = 'Operational';
    if (finalIntensity >= 0.80) severity = 'Critical';
    else if (finalIntensity >= 0.60) severity = 'High';
    else if (finalIntensity >= 0.35) severity = 'Warning';
    nodes.push({
      id: `HEAT-${zone.id}-CORE`,
      zoneId: zone.id,
      name: zone.name,
      lat: centroidLat,
      lng: centroidLng,
      radiusMeters: radiusMeters,
      riskScore: rawRiskScore,
      incidentDensity: Number(normIncidents.toFixed(2)),
      rainfallSeverity: normRainfall === null ? null : Number(normRainfall.toFixed(2)),
      intensity: finalIntensity,
      severity,
      source: "SIMULATED",
      contributions: {
        risk: Number((normRisk * 0.45 / availableWeight).toFixed(3)),
        incidents: Number((normIncidents * 0.30 / availableWeight).toFixed(3)),
        rainfall: normRainfall === null ? null : Number((normRainfall * 0.25 / availableWeight).toFixed(3))
      }
    });
    if (zone.geometryType === 'Polygon' && Array.isArray(zone.coordinates)) {
      zone.coordinates.slice(0, 3).forEach((vertex, idx) => {
        const vertexIntensity = Number((finalIntensity * 0.78).toFixed(3));
        nodes.push({
          id: `HEAT-${zone.id}-PERIPHERY-${idx}`,
          zoneId: zone.id,
          name: `${zone.name} (Slope Flank ${idx + 1})`,
          lat: vertex[0],
          lng: vertex[1],
          radiusMeters: Math.round(radiusMeters * 0.65),
          riskScore: rawRiskScore,
          incidentDensity: Number(normIncidents.toFixed(2)),
          rainfallSeverity: normRainfall === null ? null : Number(normRainfall.toFixed(2)),
          intensity: vertexIntensity,
          severity: vertexIntensity >= 0.60 ? 'High' : 'Warning',
          source: "SIMULATED",
          isPeriphery: true
        });
      });
    }
  });
  return nodes;
}
function numericNonNegative(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}
