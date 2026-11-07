const test = require("node:test");
const assert = require("node:assert/strict");
const { HAZARD_TYPES } = require("../risk-intelligence/services/hazardAggregator");
const { analyzeMultiHazard } = require("../risk-intelligence/services/multiHazardEngine");
test("assessment reports all five hazards and a deterministic explainable index", () => {
    const result = analyzeMultiHazard({
        weather: {
            rain: 5,
            forecast: { dailyPrecipitation: 30 },
            source: "test-weather"
        },
        hazardContext: {
            earthquakes: { status: "ok", eventCount: 0, source: "test-earthquake-feed" },
            floodForecast: { status: "ok", pressureIndex: 50, source: "test-flood-feed" }
        },
        incidents: [],
        incidentsAvailable: true
    });
    assert.deepEqual(result.hazards.map((hazard) => hazard.hazardType), HAZARD_TYPES);
    assert.deepEqual(result.hazards.map((hazard) => hazard.score), [36, 44, 0, 24, 42]);
    assert.equal(result.compositeScore, 29);
    assert.equal(result.redZone, "YELLOW");
    assert.match(result.explanation.summary, /Deterministic multi-hazard index/);
    assert.ok(result.explanation.majorContributors.length > 0);
    assert.ok(result.hazards.every((hazard) =>
        hazard.factors.every((factor) => ["available", "unavailable"].includes(factor.status))
    ));
});
test("assessment preserves UNKNOWN when every source is unavailable", () => {
    const result = analyzeMultiHazard({
        weather: { message: "weather feed unavailable" },
        hazardContext: {
            earthquakes: { status: "error", message: "earthquake feed unavailable" },
            floodForecast: { status: "error", message: "flood feed unavailable" }
        },
        incidents: [],
        incidentsAvailable: false
    });
    assert.equal(result.compositeScore, null);
    assert.equal(result.redZone, null);
    assert.ok(result.hazards.every((hazard) => hazard.score === null));
    assert.equal(result.explanation.dataQuality.availableFactors, 0);
    assert.match(result.explanation.summary, /No hazard evidence/);
});
test("erosion and cloudburst precipitation proxies disclose their limits", () => {
    const result = analyzeMultiHazard({
        weather: { forecast: { dailyPrecipitation: 40 }, source: "test-weather" },
        hazardContext: {},
        incidents: [],
        incidentsAvailable: true
    });
    const erosionProxy = result.hazards.find((hazard) => hazard.hazardType === "erosion")
        .factors.find((factor) => factor.key === "forecast_rain");
    const cloudburstProxy = result.hazards.find((hazard) => hazard.hazardType === "cloudburst")
        .factors.find((factor) => factor.key === "forecast_rain");
    assert.match(erosionProxy.reason, /proxy/i);
    assert.match(cloudburstProxy.reason, /not a cloudburst forecast/i);
});
