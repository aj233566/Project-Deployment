const mongoose = require("mongoose");
const Habitation = require("../models/habitation");
const Incident = require("../models/incident");
const RiskAssessment = require("../models/risk_assessment");
const { getWeatherByCoordinates } = require("../risk-intelligence/services/weatherService");
const { getHazardContext } = require("../risk-intelligence/services/hazardDataService");
const { analyzeMultiHazard } = require("../risk-intelligence/services/multiHazardEngine");
function distanceKm(lat1, lon1, lat2, lon2) {
    const radians = (value) => value * Math.PI / 180;
    const dLat = radians(lat2 - lat1);
    const dLon = radians(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
async function findNearbyVerifiedIncidents(latitude, longitude, radiusKm = 25) {
    const incidents = await Incident.find({ status: "verified" }).sort({ createdAt: -1 }).limit(1000).lean();
    return incidents.filter((incident) => {
        const incidentLat = Number(incident.location?.latitude);
        const incidentLon = Number(incident.location?.longitude);
        return Number.isFinite(incidentLat)
            && Number.isFinite(incidentLon)
            && distanceKm(latitude, longitude, incidentLat, incidentLon) <= radiusKm;
    });
}
async function assessHabitation(habitation, assessedBy = null) {
    const [longitude, latitude] = habitation.location.coordinates;
    const [weatherResult, hazardResult, incidentsResult] = await Promise.allSettled([
        getWeatherByCoordinates(latitude, longitude),
        getHazardContext(latitude, longitude, "multi_hazard"),
        findNearbyVerifiedIncidents(latitude, longitude)
    ]);
    const weather = weatherResult.status === "fulfilled"
        ? weatherResult.value
        : null;
    const hazardContext = hazardResult.status === "fulfilled"
        ? hazardResult.value
        : {
            earthquakes: {
                status: "error",
                source: "USGS Earthquake Query API",
                message: "Hazard feeds could not be loaded."
            },
            floodForecast: {
                status: "error",
                source: "Open-Meteo Global Flood API",
                message: "Hazard feeds could not be loaded."
            }
        };
    const incidents = incidentsResult.status === "fulfilled"
        ? incidentsResult.value
        : [];
    const incidentsAvailable = incidentsResult.status === "fulfilled";
    if (weatherResult.status === "rejected") {
        console.error("Weather observations unavailable for habitation assessment:", weatherResult.reason);
    }
    if (hazardResult.status === "rejected") {
        console.error("Hazard feeds unavailable for habitation assessment:", hazardResult.reason);
    }
    if (incidentsResult.status === "rejected") {
        console.error("Verified incident data unavailable for habitation assessment:", incidentsResult.reason);
    }
    const result = analyzeMultiHazard({
        weather: weather || {
            source: "Open-Meteo Forecast API",
            message: "Weather observations could not be loaded."
        },
        hazardContext,
        incidents,
        incidentsAvailable
    });
    const snapshot = await RiskAssessment.create({
        habitation: habitation._id,
        location: habitation.location,
        hazards: result.hazards,
        compositeScore: result.compositeScore,
        redZone: result.redZone || "UNKNOWN",
        explanation: result.explanation,
        sources: [...new Set(result.hazards.flatMap((hazard) =>
            hazard.factors.filter((item) => item.status === "available").map((item) => item.source)
        ))],
        ruleVersion: result.ruleVersion,
        assessedBy: mongoose.isValidObjectId(assessedBy) ? assessedBy : null
    });
    habitation.risk = {
        score: result.compositeScore,
        level: result.redZone || "UNKNOWN",
        assessment: snapshot._id,
        assessedAt: snapshot.createdAt
    };
    const primaryHazard = result.hazards
        .filter((hazard) => Number.isFinite(hazard.score))
        .sort((a, b) => b.score - a.score)[0];
    habitation.primaryHazard = primaryHazard?.hazardType || null;
    await habitation.save();
    return { assessment: snapshot, result };
}
async function findNearestHabitation(latitude, longitude, maxDistanceMeters = 25000) {
    return Habitation.findOne({
        active: true,
        location: {
            $near: {
                $geometry: { type: "Point", coordinates: [longitude, latitude] },
                $maxDistance: maxDistanceMeters
            }
        }
    });
}
module.exports = { assessHabitation, findNearbyVerifiedIncidents, findNearestHabitation };
