const { DISASTER_PROFILES, FACTOR_RULES, RISK_LEVELS } = require("../config/riskRules");
const { clamp, normalizeRiskInput, toNumber } = require("../utils/validation");
function analyzeRisk(rawInput) {
    const input = normalizeRiskInput(rawInput);
    const weather = normalizeWeather(input.weather);
    const hazardContext = normalizeHazardContext(input.hazardContext);
    const profile = DISASTER_PROFILES[input.disasterType] || DISASTER_PROFILES.flood;
    const values = buildFactorValues(input, weather, hazardContext);
    const factors = Object.entries(profile.factors).map(([key, weight]) => {
        return calculateFactor(key, values[key], weight);
    });
    const availableWeight = factors
        .filter((factor) => factor.dataStatus === "available")
        .reduce((total, factor) => total + factor.weight, 0);
    const score = availableWeight > 0
        ? clamp(round(factors.reduce((total, factor) => total + factor.contribution, 0) / availableWeight, 0), 0, 100)
        : null;
    const level = score === null ? "UNAVAILABLE" : getRiskLevel(score);
    const majorContributors = factors
        .filter((factor) => factor.dataStatus === "available")
        .slice()
        .sort((a, b) => b.contribution - a.contribution)
        .slice(0, 3);
    return {
        disasterType: input.disasterType,
        disasterLabel: profile.label,
        score,
        level,
        factors,
        majorContributors,
        explanation: score === null
            ? "Risk assessment is unavailable because no configured factor has source data."
            : buildExplanation(profile.label, level, majorContributors),
        dataQuality: buildDataQuality(hazardContext, input.disasterType, factors),
        ruleVersion: "SENTRY-RISK-RULES-v3",
        note: "Deterministic decision-support index based only on available configured factors. Not a probability or official warning."
    };
}
function normalizeWeather(weather = {}) {
    weather = weather || {};
    const forecast = weather.forecast || {};
    const hasValue = (value) => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
    const availability = {
        rain: hasValue(weather.rain),
        dailyPrecipitation: hasValue(forecast.dailyPrecipitation),
        temperature: hasValue(weather.temperature) || hasValue(forecast.maxTemperature),
        humidity: hasValue(weather.humidity),
        windSpeed: hasValue(weather.windSpeed) || hasValue(forecast.maxWindSpeed),
        windGusts: hasValue(weather.windGusts) || hasValue(forecast.maxWindGusts),
        weatherCode: hasValue(weather.weatherCode) || hasValue(forecast.weatherCode),
        evapotranspiration: hasValue(forecast.evapotranspiration)
    };
    return {
        temperature: toNumber(weather.temperature, 0),
        humidity: clamp(toNumber(weather.humidity, 0), 0, 100),
        precipitation: Math.max(0, toNumber(weather.precipitation, 0)),
        rain: Math.max(0, toNumber(weather.rain, 0)),
        windSpeed: Math.max(0, toNumber(weather.windSpeed, 0)),
        windGusts: Math.max(0, toNumber(weather.windGusts, forecast.maxWindGusts || weather.windSpeed || 0)),
        weatherCode: Math.max(0, Math.round(toNumber(weather.weatherCode, 0))),
        updateTime: weather.updateTime || null,
        timezone: weather.timezone || null,
        coordinates: weather.coordinates || null,
        forecast: {
            dailyPrecipitation: Math.max(0, toNumber(forecast.dailyPrecipitation, 0)),
            maxTemperature: toNumber(forecast.maxTemperature, weather.temperature || 0),
            maxWindSpeed: Math.max(0, toNumber(forecast.maxWindSpeed, weather.windSpeed || 0)),
            maxWindGusts: Math.max(0, toNumber(forecast.maxWindGusts, weather.windGusts || weather.windSpeed || 0)),
            weatherCode: Math.max(0, Math.round(toNumber(forecast.weatherCode, weather.weatherCode || 0))),
            evapotranspiration: Math.max(0, toNumber(forecast.evapotranspiration, 0))
        },
        source: weather.source || "Provided by request",
        availability
    };
}
function normalizeHazardContext(hazardContext = {}) {
    hazardContext = hazardContext || {};
    const earthquakes = hazardContext.earthquakes || {};
    const fireHotspots = hazardContext.fireHotspots || {};
    const floodForecast = hazardContext.floodForecast || {};
    return {
        earthquakes: {
            status: earthquakes.status || "not_provided",
            eventCount: Math.max(0, Math.round(toNumber(earthquakes.eventCount, 0))),
            maxMagnitude: Math.max(0, toNumber(earthquakes.maxMagnitude, 0)),
            nearestDistanceKm: Math.max(0, toNumber(earthquakes.nearestDistanceKm, 999)),
            source: earthquakes.source || "USGS Earthquake Query API"
        },
        fireHotspots: {
            status: fireHotspots.status || "not_provided",
            hotspotCount: Math.max(0, Math.round(toNumber(fireHotspots.hotspotCount, 0))),
            highConfidenceCount: Math.max(0, Math.round(toNumber(fireHotspots.highConfidenceCount, 0))),
            maxFrp: Math.max(0, toNumber(fireHotspots.maxFrp, 0)),
            source: fireHotspots.source || "NASA FIRMS Area API"
        },
        floodForecast: {
            status: floodForecast.status || "not_provided",
            pressureIndex: clamp(toNumber(floodForecast.pressureIndex, 0), 0, 100),
            trendRatio: Math.max(0, toNumber(floodForecast.trendRatio, 0)),
            currentDischarge: Math.max(0, toNumber(floodForecast.currentDischarge, 0)),
            peakDischarge: Math.max(0, toNumber(floodForecast.peakDischarge, 0)),
            source: floodForecast.source || "Open-Meteo Global Flood API"
        }
    };
}
function buildFactorValues(input, weather, hazardContext) {
    const analysisTemperature = Math.max(weather.temperature, weather.forecast.maxTemperature);
    const dailyPrecipitation = weather.forecast.dailyPrecipitation;
    const windGusts = Math.max(weather.windGusts, weather.forecast.maxWindGusts);
    const earthquakeAvailable = hazardContext.earthquakes.status === "ok";
    const fireHotspotsAvailable = hazardContext.fireHotspots.status === "ok";
    const floodForecastAvailable = hazardContext.floodForecast.status === "ok";
    const drynessAvailable = weather.availability.temperature
        && weather.availability.humidity
        && weather.availability.windSpeed
        && weather.availability.dailyPrecipitation
        && weather.availability.evapotranspiration;
    const dryness = calculateDrynessIndex({
        temperature: analysisTemperature,
        humidity: weather.humidity,
        windSpeed: weather.windSpeed,
        dailyPrecipitation,
        evapotranspiration: weather.forecast.evapotranspiration
    });
    return {
        rain: metricValue(weather.rain, dataStatus(weather.availability.rain, "Current precipitation was not supplied.")),
        dailyPrecipitation: metricValue(dailyPrecipitation, dataStatus(weather.availability.dailyPrecipitation, "Forecast precipitation was not supplied.")),
        precipitationDeficit: metricValue(clamp(100 - dailyPrecipitation * 8, 0, 100), dataStatus(weather.availability.dailyPrecipitation, "Forecast precipitation was not supplied.")),
        windSpeed: metricValue(Math.max(weather.windSpeed, weather.forecast.maxWindSpeed), dataStatus(weather.availability.windSpeed, "Wind-speed observation/forecast was not supplied.")),
        windGusts: metricValue(windGusts, dataStatus(weather.availability.windGusts, "Wind-gust observation/forecast was not supplied.")),
        weatherCode: metricValue(Math.max(weather.weatherCode, weather.forecast.weatherCode || 0), dataStatus(weather.availability.weatherCode, "Weather-code observation/forecast was not supplied.")),
        temperature: metricValue(analysisTemperature, dataStatus(weather.availability.temperature, "Temperature observation/forecast was not supplied.")),
        humidity: metricValue(weather.humidity, dataStatus(weather.availability.humidity, "Humidity observation was not supplied.")),
        dryness: metricValue(dryness, dataStatus(drynessAvailable, "Dryness index requires temperature, humidity, wind, forecast precipitation, and evapotranspiration.")),
        soilMoisture: metricValue(input.sensor.soilMoisture, dataStatus(input.dataAvailability.soilMoisture, "No soil-moisture observation was supplied.")),
        soilDryness: metricValue(clamp(100 - input.sensor.soilMoisture, 0, 100), dataStatus(input.dataAvailability.soilMoisture, "No soil-moisture observation was supplied.")),
        slopeRisk: enumValue(input.terrain.slopeRisk, dataStatus(input.dataAvailability.slopeRisk, "No terrain assessment was supplied.")),
        roadBlockage: enumValue(input.operations.roadBlockage, dataStatus(input.dataAvailability.roadBlockage, "No road-status observation was supplied.")),
        infrastructureStatus: enumValue(input.operations.infrastructureStatus, dataStatus(input.dataAvailability.infrastructureStatus, "No infrastructure assessment was supplied.")),
        populationExposure: enumValue(input.operations.populationExposure, dataStatus(input.dataAvailability.populationExposure, "No population-exposure assessment was supplied.")),
        drainageCapacity: enumValue(input.operations.drainageCapacity, dataStatus(input.dataAvailability.drainageCapacity, "No drainage-capacity assessment was supplied.")),
        riverLevel: enumValue(input.operations.riverLevel, dataStatus(input.dataAvailability.riverLevel, "No river-level observation was supplied.")),
        riverDischargeForecast: metricValue(
            hazardContext.floodForecast.pressureIndex,
            dataStatus(floodForecastAvailable, "Open-Meteo Flood API data is unavailable for this request.")
        ),
        fieldReports: fieldReportValue(input.fieldReports, dataStatus(input.dataAvailability.fieldReports, "No verified field-report data was supplied.")),
        historicalEvents: metricValue(input.historical.eventCount, dataStatus(input.dataAvailability.historicalEvents, "No historical event dataset was supplied.")),
        earthquakeMagnitude: metricValue(
            hazardContext.earthquakes.maxMagnitude,
            dataStatus(earthquakeAvailable, "USGS earthquake data is unavailable for this request.")
        ),
        earthquakeDistance: metricValue(
            hazardContext.earthquakes.nearestDistanceKm,
            dataStatus(earthquakeAvailable, "USGS earthquake data is unavailable for this request.")
        ),
        earthquakeCount: metricValue(
            hazardContext.earthquakes.eventCount,
            dataStatus(earthquakeAvailable, "USGS earthquake data is unavailable for this request.")
        ),
        fireHotspots: metricValue(
            hazardContext.fireHotspots.hotspotCount,
            dataStatus(fireHotspotsAvailable, "NASA FIRMS fire hotspot data is unavailable for this request.")
        )
    };
}
function calculateDrynessIndex({ temperature, humidity, windSpeed, dailyPrecipitation, evapotranspiration }) {
    const heatStress = Math.max(0, temperature - 30) * 2.2;
    const lowHumidityStress = Math.max(0, 60 - humidity) * 0.55;
    const windStress = Math.max(0, windSpeed - 15) * 0.5;
    const evapStress = Math.max(0, evapotranspiration) * 4;
    const rainRelief = Math.max(0, dailyPrecipitation) * 1.5;
    return clamp(heatStress + lowHumidityStress + windStress + evapStress + 20 - rainRelief, 0, 100);
}
function calculateFactor(key, inputValue, weight) {
    const rule = FACTOR_RULES[key];
    if (!rule) {
        throw new Error(`No risk rule configured for factor ${key}.`);
    }
    if (inputValue.dataStatus === "unavailable") {
        return createUnavailableFactor(key, rule, inputValue, weight);
    }
    if (rule.scoreMap) {
        return calculateMappedFactor(key, rule, inputValue, weight);
    }
    const value = inputValue.numericValue;
    const thresholds = rule.thresholds || rule.inverseThresholds;
    const threshold = thresholds.find((item) => value <= item.max) || thresholds[thresholds.length - 1];
    return createFactor({
        key,
        label: rule.label,
        value: inputValue.displayValue,
        unit: rule.unit,
        weight,
        rawScore: threshold.score,
        level: threshold.level,
        reason: buildReason(threshold.reason, inputValue)
    });
}
function calculateMappedFactor(key, rule, inputValue, weight) {
    const normalized = rule.scoreMap[inputValue.displayValue] ? inputValue.displayValue : Object.keys(rule.scoreMap)[0];
    const mapped = rule.scoreMap[normalized];
    return createFactor({
        key,
        label: rule.label,
        value: normalized,
        unit: rule.unit,
        weight,
        rawScore: mapped.score,
        level: mapped.level,
        reason: buildReason(mapped.reason, inputValue)
    });
}
function fieldReportValue(fieldReports, availability) {
    const activeReports = Object.entries(fieldReports)
        .filter(([, value]) => Boolean(value))
        .map(([key]) => key);
    return {
        numericValue: activeReports.length,
        displayValue: activeReports.length,
        details: activeReports,
        ...availability
    };
}
function metricValue(value, options = {}) {
    return {
        numericValue: toNumber(value, 0),
        displayValue: toNumber(value, 0),
        details: [],
        dataStatus: options.dataStatus || "available",
        unavailableReason: options.unavailableReason || null
    };
}
function enumValue(value, availability = {}) {
    return {
        numericValue: 0,
        displayValue: value,
        details: [],
        dataStatus: availability.dataStatus || "available",
        unavailableReason: availability.unavailableReason || null
    };
}
function dataStatus(available, unavailableReason) {
    return available
        ? { dataStatus: "available" }
        : { dataStatus: "unavailable", unavailableReason };
}
function createFactor({ key, label, value, unit, weight, rawScore, level, reason }) {
    return {
        key,
        label,
        value,
        unit,
        sourceType: getFactorSourceType(key),
        dataStatus: "available",
        level,
        rawScore,
        weight,
        contribution: round(rawScore * weight, 1),
        reason
    };
}
function createUnavailableFactor(key, rule, inputValue, weight) {
    return {
        key,
        label: rule.label,
        value: null,
        unit: rule.unit,
        sourceType: getFactorSourceType(key),
        dataStatus: "unavailable",
        level: "UNAVAILABLE",
        rawScore: 0,
        weight,
        contribution: 0,
        reason: inputValue.unavailableReason || "Required external API data is unavailable for this factor."
    };
}
function buildReason(reason, inputValue) {
    if (inputValue.details && inputValue.details.length > 0) {
        return `${reason} Active reports: ${inputValue.details.join(", ")}.`;
    }
    return reason;
}
function getRiskLevel(score) {
    if (!Number.isFinite(score)) return "UNAVAILABLE";
    return RISK_LEVELS.find((level) => score >= level.min).level;
}
function buildExplanation(disasterLabel, level, majorContributors) {
    const names = majorContributors.map((factor) => factor.label).join(", ");
    return `${disasterLabel} risk is classified as ${level}. The largest contributors are ${names}.`;
}
function buildDataQuality(hazardContext, disasterType, factors) {
    const notes = [
        "Weather and forecast values come from Open-Meteo when location coordinates are supplied.",
        "Operator, sensor, and historical values are excluded unless supplied. Field reports must come from verified incidents.",
        `${factors.filter((factor) => factor.dataStatus === "available").length} of ${factors.length} configured factors have source data.`
    ];
    if (disasterType === "earthquake") {
        notes.push(`Earthquake context status: ${hazardContext.earthquakes.status}.`);
    }
    if (disasterType === "wildfire") {
        notes.push(`Fire hotspot context status: ${hazardContext.fireHotspots.status}.`);
    }
    if (disasterType === "flood") {
        notes.push(`River discharge forecast status: ${hazardContext.floodForecast.status}.`);
    }
    return notes;
}
function getFactorSourceType(key) {
    const apiFactors = [
        "rain",
        "dailyPrecipitation",
        "precipitationDeficit",
        "windSpeed",
        "windGusts",
        "weatherCode",
        "temperature",
        "humidity",
        "dryness",
        "riverDischargeForecast",
        "earthquakeMagnitude",
        "earthquakeDistance",
        "earthquakeCount",
        "fireHotspots"
    ];
    return apiFactors.includes(key) ? "api" : "operator";
}
function round(value, digits) {
    const multiplier = 10 ** digits;
    return Math.round(value * multiplier) / multiplier;
}
module.exports = {
    analyzeRisk,
    getRiskLevel,
    round
};
