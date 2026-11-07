const HAZARD_TYPES = ["landslide", "flood", "earthquake", "erosion", "cloudburst"];
const RAIN_THRESHOLDS = [
    { maximum: 2, score: 5 },
    { maximum: 25, score: 30 },
    { maximum: 65, score: 60 },
    { maximum: 100, score: 85 },
    { maximum: Infinity, score: 100 }
];
function rainfallScore(value) {
    if (!Number.isFinite(value) || value < 0) return null;
    return RAIN_THRESHOLDS.find((threshold) => value <= threshold.maximum).score;
}
function aggregateHazardEvidence({
    weather = null,
    hazardContext = {},
    incidents = [],
    incidentsAvailable = false
} = {}) {
    const forecast = weather && weather.forecast;
    const rain = numericValue(weather?.rain);
    const dailyRain = numericValue(forecast?.dailyPrecipitation);
    const context = hazardContext || {};
    const earthquakes = context.earthquakes || {};
    const flood = context.floodForecast || {};
    const verifiedIncidents = incidentsAvailable && Array.isArray(incidents)
        ? incidents.filter((incident) => incident.status === "verified")
        : null;
    const countIncident = (...types) => verifiedIncidents.filter((incident) =>
        types.includes(String(incident.hazardSubtype || incident.type || "").toLowerCase())
    ).length;
    const floodReports = verifiedIncidents ? countIncident("flood", "flash_flood") : null;
    const slopeReports = verifiedIncidents ? countIncident("landslide", "slope_crack", "slope_movement") : null;
    const earthquakeReports = verifiedIncidents ? countIncident("earthquake", "infrastructure_damage") : null;
    const erosionReports = verifiedIncidents ? countIncident("erosion", "slope_crack", "slope_movement") : null;
    const cloudburstReports = verifiedIncidents ? countIncident("cloudburst", "flash_flood") : null;
    const eventCount = numericValue(earthquakes.eventCount);
    const magnitude = numericValue(earthquakes.maxMagnitude);
    const nearestDistance = numericValue(earthquakes.nearestDistanceKm);
    const earthquakeEvidence = [];
    if (earthquakes.status === "ok" && eventCount === 0) {
        earthquakeEvidence.push(0);
    } else if (earthquakes.status === "ok" && eventCount > 0) {
        if (magnitude !== null && magnitude >= 0) {
            earthquakeEvidence.push(Math.min(100, magnitude * 12));
        }
        if (nearestDistance !== null && nearestDistance >= 0) {
            earthquakeEvidence.push(Math.max(0, 80 - nearestDistance / 2));
        }
    }
    const earthquakeScore = earthquakeEvidence.length > 0
        ? Math.max(...earthquakeEvidence)
        : null;
    const floodPressureIndex = numericValue(flood.pressureIndex);
    const floodScore = flood.status === "ok"
        && floodPressureIndex !== null
        && floodPressureIndex >= 0
        && floodPressureIndex <= 100
        ? floodPressureIndex
        : null;
    const weatherReason = weather?.message || "Weather observation is unavailable.";
    const forecastReason = weather?.message || "Weather forecast is unavailable.";
    const incidentReason = (count) => count === null
        ? "Verified incident records are unavailable."
        : `${count} verified reports`;
    const definitions = {
        landslide: [
            factor("forecast_rain", "Forecast precipitation", rainfallScore(dailyRain), 0.5, weather?.source || "weather", dailyRain === null ? forecastReason : ""),
            factor("current_rain", "Current precipitation", rainfallScore(rain), 0.2, weather?.source || "weather", rain === null ? weatherReason : ""),
            factor("verified_reports", "Verified slope/landslide reports", reportScore(slopeReports), 0.3, "verified_incidents", incidentReason(slopeReports))
        ],
        flood: [
            factor("forecast_rain", "Forecast precipitation", rainfallScore(dailyRain), 0.4, weather?.source || "weather", dailyRain === null ? forecastReason : ""),
            factor("river_pressure", "River discharge pressure", floodScore, 0.4, flood.source || "flood_api", flood.message || (floodScore === null ? "River discharge pressure is unavailable." : "")),
            factor("verified_reports", "Verified flood reports", reportScore(floodReports), 0.2, "verified_incidents", incidentReason(floodReports))
        ],
        earthquake: [
            factor("recent_earthquakes", "Recent earthquake activity", earthquakeScore, 0.8, earthquakes.source || "USGS", earthquakes.message || (earthquakeScore === null ? "Earthquake evidence is unavailable." : "")),
            factor("verified_reports", "Verified earthquake/damage reports", reportScore(earthquakeReports), 0.2, "verified_incidents", incidentReason(earthquakeReports))
        ],
        erosion: [
            factor("forecast_rain", "Forecast precipitation (proxy)", rainfallScore(dailyRain), 0.4, weather?.source || "weather", dailyRain === null ? `${forecastReason} Precipitation is a proxy; no direct erosion feed is configured.` : "Precipitation is a proxy; no direct erosion feed is configured."),
            factor("verified_reports", "Verified erosion/slope reports", reportScore(erosionReports), 0.6, "verified_incidents", incidentReason(erosionReports))
        ],
        cloudburst: [
            factor("forecast_rain", "Forecast precipitation", rainfallScore(dailyRain), 0.7, weather?.source || "weather", dailyRain === null ? `${forecastReason} Rule-based precipitation indicator; not a cloudburst forecast.` : "Rule-based precipitation indicator; not a cloudburst forecast."),
            factor("verified_reports", "Verified intense-rain/flood reports", reportScore(cloudburstReports), 0.3, "verified_incidents", incidentReason(cloudburstReports))
        ]
    };
    return HAZARD_TYPES.map((hazardType) => scoreHazard(hazardType, definitions[hazardType]));
}
function factor(key, label, score, weight, source, reason = "") {
    const validScore = Number.isFinite(score) && score >= 0 && score <= 100
        ? score
        : null;
    return {
        key,
        label,
        score: validScore,
        weight,
        source,
        status: validScore === null ? "unavailable" : "available",
        reason: reason || (validScore === null ? "Source data unavailable." : "Scored using the configured deterministic rule.")
    };
}
function numericValue(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}
function reportScore(count) {
    if (count === null) return null;
    return Math.min(100, count * 25);
}
function scoreHazard(hazardType, factors) {
    const available = factors.filter((item) => item.status === "available" && Number.isFinite(item.score));
    const totalWeight = available.reduce((sum, item) => sum + item.weight, 0);
    const score = totalWeight === 0
        ? null
        : Math.round(available.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight);
    return {
        hazardType,
        score,
        evidenceCount: available.length,
        factors
    };
}
module.exports = { HAZARD_TYPES, aggregateHazardEvidence, rainfallScore };
