const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { resolvePort } = require("./config/runtime");
const connectDB = require("./config/db");
const Incident = require("./models/incident");
const authRoutes = require("./routes/auth_routes");
const adminRoutes = require("./routes/admin_routes");
const incidentRoutes = require("./routes/incident_routes");
const alertRoutes = require("./routes/alert_routes");
const notificationRoutes = require("./routes/notification_routes");
const {
    processRiskAlert
} = require("./services/alert_service");
const emergencyPriorityRoutes = require(
    "./routes/emergency_priority_routes"
);
const resourceRoutes = require(
    "./routes/resource_routes"
);
const habitationRoutes = require("./routes/habitation_routes");
const relocationSiteRoutes = require("./routes/relocation_site_routes");
const redZoneRoutes = require("./routes/red_zone_routes");
const feedRoutes = require("./routes/feed_routes");
const affectedAreaRoutes = require("./routes/affected_area_routes");
const presenceRoutes = require("./routes/presence_routes");
const nearbyRoutes = require("./routes/nearby_routes");
const relocationPriorityRoutes = require("./routes/relocation_priority_routes");
const {
    analyzeRisk
} = require("./risk-intelligence/services/riskEngine");
const { analyzeMultiHazard } = require("./risk-intelligence/services/multiHazardEngine");
const {
    getAiRiskAssessment
} = require("./risk-intelligence/services/aiRiskService");
const {
    generateRecommendations
} = require("./risk-intelligence/services/recommendationEngine");
const {
    simulateIntervention,
    INTERVENTIONS
} = require("./risk-intelligence/services/interventionSimulator");
const {
    getHazardContext
} = require("./risk-intelligence/services/hazardDataService");
const {
    getNewsContext
} = require("./risk-intelligence/services/newsService");
const {
    getWeatherByCoordinates
} = require("./risk-intelligence/services/weatherService");
const {
    normalizeRiskInput,
    validateCoordinates
} = require("./risk-intelligence/utils/validation");
const app = express();
connectDB();
app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "SENETRY API is running"
    });
});
app.use(
    "/api/auth",
    authRoutes
);
app.use(
    "/api/admin",
    adminRoutes
);
app.use(
    "/api/incidents",
    incidentRoutes
);
function buildFieldReportsFromIncidents(incidents = []) {
    const fieldReports = {
        cracks: false,
        slopeMovement: false,
        flooding: false,
        roadBlockage: false,
        buildingDamage: false,
        powerOutage: false,
        fireSmoke: false,
        medicalStress: false,
        waterShortage: false
    };
    for (const incident of incidents) {
        const type = String(
            incident.hazardSubtype || incident.type || ""
        ).toLowerCase();
        switch (type) {
            case "slope_crack":
                fieldReports.cracks = true;
                break;
            case "slope_movement":
            case "erosion":
                fieldReports.slopeMovement = true;
                break;
            case "flash_flood":
            case "flood":
            case "cloudburst":
                fieldReports.flooding = true;
                break;
            case "road_blockage":
                fieldReports.roadBlockage = true;
                break;
            case "infrastructure_damage":
            case "earthquake":
                fieldReports.buildingDamage = true;
                break;
            case "landslide":
                break;
            default:
                break;
        }
    }
    return fieldReports;
}
function calculateDistanceKm(
    lat1,
    lon1,
    lat2,
    lon2
) {
    const earthRadiusKm = 6371;
    const dLat =
        (lat2 - lat1) * Math.PI / 180;
    const dLon =
        (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) *
        Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );
    return earthRadiusKm * c;
}
app.use(
    "/api/alerts",
    alertRoutes
);
app.use(
    "/api/notifications",
    notificationRoutes
);
app.use(
    "/api/emergency-priority",
    emergencyPriorityRoutes
);
app.use(
    "/api/resources",
    resourceRoutes
);
app.use("/api/habitations", habitationRoutes);
app.use("/api/relocation-sites", relocationSiteRoutes);
app.use("/api/red-zones", redZoneRoutes);
app.use("/api/feeds", feedRoutes);
app.use("/api/affected-areas", affectedAreaRoutes);
app.use("/api/presence", presenceRoutes);
app.use("/api/nearby", nearbyRoutes);
app.use("/api/relocation-priority", relocationPriorityRoutes);
app.get("/api/weather/current", async (req, res, next) => {
    try {
        const validation = validateCoordinates(req.query.latitude, req.query.longitude);
        if (!validation.valid) {
            return res.status(400).json({ success: false, message: validation.message });
        }
        const data = await getWeatherByCoordinates(validation.latitude, validation.longitude);
        return res.json({ success: true, data });
    } catch (error) {
        return next(error);
    }
});
const riskAnalysisCache = new Map();
const RISK_CACHE_TTL_MS = 5 * 60 * 1000;
app.post("/api/risk/analyze", async (req, res, next) => {
    try {
        const input = normalizeRiskInput(req.body);
        const cacheKey = input.location
            ? `${Number(input.location.latitude).toFixed(4)},${Number(input.location.longitude).toFixed(4)},${input.disasterType}`
            : null;
        if (cacheKey) {
            const cached = riskAnalysisCache.get(cacheKey);
            if (cached && Date.now() - cached.ts < RISK_CACHE_TTL_MS) {
                return res.json({ success: true, cached: true, data: cached.data });
            }
        }
        let weather = input.weather;
        let hazardContext = input.hazardContext;
        if (input.location) {
            const validation = validateCoordinates(
                input.location.latitude,
                input.location.longitude
            );
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    message: validation.message
                });
            }
            const [weatherResult, hazardResult] = await Promise.all([
                weather
                    ? Promise.resolve(weather)
                    : getWeatherByCoordinates(validation.latitude, validation.longitude),
                hazardContext
                    ? Promise.resolve(hazardContext)
                    : getHazardContext(validation.latitude, validation.longitude, input.disasterType),
            ]);
            weather = weatherResult;
            hazardContext = hazardResult;
        }
        if (!weather) {
            return res.status(400).json({
                success: false,
                message:
                    "Provide either weather data or valid location coordinates."
            });
        }
        let incidents = [];
        let incidentDataAvailable = Boolean(input.location);
        let incidentDataError = null;
        try {
            const allIncidents = await Incident.find({ status: "verified" })
                .sort({
                    createdAt: -1
                })
                .lean();
            const RISK_RADIUS_KM = 100;
            incidents = input.location ? allIncidents.filter((incident) => {
                const incidentLat =
                    incident.location?.latitude;
                const incidentLon =
                    incident.location?.longitude;
                if (
                    typeof incidentLat !== "number" ||
                    typeof incidentLon !== "number"
                ) {
                    return false;
                }
                const distance = calculateDistanceKm(
                    input.location.latitude,
                    input.location.longitude,
                    incidentLat,
                    incidentLon
                );
                return distance <= RISK_RADIUS_KM;
            }) : [];
            incidentDataAvailable = Boolean(input.location);
        }
        catch (incidentError) {
            console.error(
                "Failed to retrieve incidents:",
                incidentError
            );
            incidents = [];
            incidentDataAvailable = false;
            incidentDataError = "Verified incident records could not be loaded.";
        }
        const fieldReports =
            buildFieldReportsFromIncidents(
                incidents
            );
        const normalizedInput = {
            ...input,
            weather,
            hazardContext,
            fieldReports,
            dataAvailability: {
                ...input.dataAvailability,
                fieldReports: incidentDataAvailable
            },
            historical: {
                ...(input.historical || {}),
                eventCount: input.historical.eventCount
            }
        };
        const risk = analyzeRisk({
            ...normalizedInput,
            disasterType: input.disasterType === "multi_hazard" ? "flood" : input.disasterType
        });
        const multiHazard = analyzeMultiHazard({
            weather,
            hazardContext,
            incidents,
            incidentsAvailable: incidentDataAvailable
        });
        const recommendations =
            generateRecommendations(
                risk
            );
        const newsContext = input.location
            ? await getNewsContext({
                latitude:
                    input.location.latitude,
                longitude:
                    input.location.longitude,
                disasterType:
                    input.disasterType,
                locationName:
                    input.newsQuery
            })
            : await getNewsContext({
                disasterType:
                    input.disasterType,
                locationName:
                    input.newsQuery
            });
        const aiAssessment =
            await getAiRiskAssessment({
                input:
                    normalizedInput,
                weather,
                hazardContext,
                risk,
                multiHazard,
                recommendations,
                newsContext
            });
        let generatedAlert = null;
        let generatedAlertError = null;
        try {
            generatedAlert =
                await processRiskAlert({
                    location: input.location,
                    multiHazard
                });
        } catch (alertError) {
            console.error(
                "Alert generation failed:",
                alertError
            );
            generatedAlertError = alertError.message || "Alert generation failed.";
        }
        const responseData = {
                location:
                    input.location,
                weather,
                hazardContext,
                newsContext,
                incidents: {
                    count: incidents.length,
                    dataAvailable: incidentDataAvailable,
                    error: incidentDataError,
                    fieldReports: buildFieldReportsFromIncidents(incidents),
                    nearby: incidents
                },
                multiHazard,
                risk,
                recommendations,
                aiAssessment,
                generatedAlert,
                generatedAlertError,
                generatedAt:
                    new Date().toISOString()
        };
        if (cacheKey) {
            riskAnalysisCache.set(cacheKey, { ts: Date.now(), data: responseData });
        }
        res.json({ success: true, data: responseData });
    }
    catch (error) {
        console.error(
            "Risk analysis failed:",
            error
        );
        next(error);
    }
});
function simulateRiskScenario(req, res) {
    const risk =
        req.body &&
        req.body.risk;
    const scenario =
        req.body &&
        req.body.scenario;
    if (
        !risk ||
        !Array.isArray(risk.factors) ||
        typeof risk.score !== "number"
    ) {
        return res.status(400).json({
            success: false,
            message:
                "Provide a valid risk object from /api/risk/analyze."
        });
        return;
    }
    res.json({
        success: true,
        data: simulateIntervention(
            risk,
            scenario
        )
    });
}
app.post("/api/risk/simulate", simulateRiskScenario);
app.post("/api/risk/scenario", simulateRiskScenario);
app.use((error, req, res, next) => {
    console.error("API Error:", error);
    const status = error.statusCode
        || (error.name === "ValidationError" || error.name === "CastError" ? 400 : 500);
    res.status(status).json({
        success: false,
        message:
            error.message ||
            "Internal server error"
    });
});
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});
const PORT = resolvePort();
app.listen(PORT, () => {
    console.log(
        `SENETRY server running on port ${PORT}`
    );
});
