const { getRiskLevel, round } = require("./riskEngine");
const INTERVENTIONS = {
    "flood-response": {
        label: "Flood Response",
        disasterTypes: ["flood", "landslide"],
        reductions: {
            rain: 0.00,
            dailyPrecipitation: 0.00,
            riverDischargeForecast: 0.00,
            drainageCapacity: 0.35,
            riverLevel: 0.20,
            roadBlockage: 0.20,
            fieldReports: 0.15,
            populationExposure: 0.12
        },
        responseTimeReduction: 0.20,
        explanation: "Drainage checks, pump staging, route planning, and local response readiness reduce estimated exposure and delay."
    },
    "slope-stabilization": {
        label: "Slope Stabilization",
        disasterTypes: ["landslide"],
        reductions: {
            slopeRisk: 0.35,
            soilMoisture: 0.20,
            fieldReports: 0.25,
            roadBlockage: 0.15,
            historicalEvents: 0.10
        },
        responseTimeReduction: 0.15,
        explanation: "Temporary stabilization, restricted access, and slope inspection reduce estimated vulnerability and exposure."
    },
    "storm-readiness": {
        label: "Storm / Cyclone Readiness",
        disasterTypes: ["storm", "flood"],
        reductions: {
            windSpeed: 0.00,
            windGusts: 0.00,
            weatherCode: 0.00,
            infrastructureStatus: 0.30,
            roadBlockage: 0.15,
            populationExposure: 0.12,
            fieldReports: 0.12
        },
        responseTimeReduction: 0.25,
        explanation: "Securing exposed assets, checking utilities, staging crews, and pre-positioning alerts reduce operational impact."
    },
    "heat-health-plan": {
        label: "Heat Health Action Plan",
        disasterTypes: ["heatwave", "drought"],
        reductions: {
            temperature: 0.00,
            humidity: 0.00,
            infrastructureStatus: 0.28,
            populationExposure: 0.30,
            fieldReports: 0.15
        },
        responseTimeReduction: 0.18,
        explanation: "Cooling centers, public-health alerts, water distribution, and field-team heat protocols reduce estimated impact."
    },
    "wildfire-containment": {
        label: "Wildfire Containment Readiness",
        disasterTypes: ["wildfire"],
        reductions: {
            dryness: 0.00,
            windSpeed: 0.00,
            windGusts: 0.00,
            fireHotspots: 0.10,
            infrastructureStatus: 0.18,
            populationExposure: 0.14,
            fieldReports: 0.16
        },
        responseTimeReduction: 0.22,
        explanation: "Hotspot verification, firebreak planning, alerting, and resource staging reduce estimated wildfire exposure."
    },
    "earthquake-rapid-assessment": {
        label: "Earthquake Rapid Assessment",
        disasterTypes: ["earthquake"],
        reductions: {
            earthquakeMagnitude: 0.00,
            earthquakeDistance: 0.00,
            earthquakeCount: 0.00,
            infrastructureStatus: 0.35,
            roadBlockage: 0.22,
            fieldReports: 0.20,
            populationExposure: 0.16
        },
        responseTimeReduction: 0.28,
        explanation: "Damage triage, bridge and utility checks, route clearance, and shelter readiness reduce estimated secondary impact."
    },
    "drought-water-management": {
        label: "Drought Water Management",
        disasterTypes: ["drought", "heatwave", "wildfire"],
        reductions: {
            dryness: 0.00,
            precipitationDeficit: 0.00,
            soilDryness: 0.10,
            infrastructureStatus: 0.22,
            historicalEvents: 0.08,
            populationExposure: 0.22
        },
        responseTimeReduction: 0.12,
        explanation: "Water-use controls, supply planning, tankering, and agriculture advisories reduce estimated drought impact."
    },
    "increased-monitoring": {
        label: "Increased Multi-Hazard Monitoring",
        disasterTypes: ["flood", "landslide", "storm", "heatwave", "wildfire", "earthquake", "drought"],
        reductions: {
            fieldReports: 0.12,
            roadBlockage: 0.08,
            infrastructureStatus: 0.08,
            populationExposure: 0.06
        },
        responseTimeReduction: 0.10,
        explanation: "More frequent monitoring improves readiness and reduces verification delay, but it does not change physical hazard conditions."
    }
};
function simulateIntervention(risk, scenarioKey = null) {
    const scenario = chooseScenario(risk, scenarioKey);
    const scenarioMatchesDisaster = scenario.disasterTypes.includes(risk.disasterType);
    const availableWeight = risk.factors
        .filter((factor) => factor.dataStatus !== "unavailable")
        .reduce((total, factor) => total + factor.weight, 0);
    let simulatedContribution = 0;
    const factors = risk.factors.map((factor) => {
        const available = factor.dataStatus !== "unavailable";
        const reductionRate = available ? (scenario.reductions[factor.key] || 0) : 0;
        const reduction = available ? round(factor.contribution * reductionRate, 1) : 0;
        const nextContribution = available ? round(factor.contribution - reduction, 1) : 0;
        simulatedContribution += nextContribution;
        return {
            ...factor,
            reductionRate,
            reduction,
            simulatedContribution: nextContribution
        };
    });
    const simulatedScore = availableWeight > 0
        ? Math.max(0, Math.min(100, round(simulatedContribution / availableWeight, 0)))
        : null;
    const estimatedReduction = simulatedScore === null
        ? null
        : Math.max(0, round(risk.score - simulatedScore, 0));
    return {
        scenarioKey: Object.keys(INTERVENTIONS).find((key) => INTERVENTIONS[key] === scenario),
        scenario: scenario.label,
        disasterType: risk.disasterType,
        scenarioMatchesDisaster,
        currentScore: risk.score,
        currentLevel: risk.level,
        simulatedScore,
        simulatedLevel: simulatedScore === null ? "UNAVAILABLE" : getRiskLevel(simulatedScore),
        estimatedReduction,
        estimatedImprovementPercent: risk.score > 0 && estimatedReduction !== null
            ? round((estimatedReduction / risk.score) * 100, 1)
            : null,
        simulationBasis: buildSimulationBasis(factors),
        factors,
        explanation: scenario.explanation,
        scenarioAssumptions: "Illustrative intervention-effectiveness factors are configured in the scenario rules. They are not measured treatment outcomes or operational response-time predictions.",
        disclaimer: "Scenario estimate only. API-backed observations and forecasts are used for the baseline; interventions estimate reduced exposure/readiness impact and do not change real weather, earthquake, river-discharge, or satellite observations."
    };
}
function chooseScenario(risk, scenarioKey) {
    if (scenarioKey && INTERVENTIONS[scenarioKey]) {
        return INTERVENTIONS[scenarioKey];
    }
    const matchingKey = Object.keys(INTERVENTIONS).find((key) => {
        return INTERVENTIONS[key].disasterTypes.includes(risk.disasterType);
    });
    return INTERVENTIONS[matchingKey] || INTERVENTIONS["increased-monitoring"];
}
function buildSimulationBasis(factors) {
    const apiBackedFactors = factors
        .filter((factor) => factor.sourceType === "api" && factor.dataStatus !== "unavailable")
        .map((factor) => factor.label);
    const adjustableFactors = factors
        .filter((factor) => factor.reductionRate > 0 && factor.dataStatus !== "unavailable")
        .map((factor) => factor.label);
    const fixedObservationFactors = factors
        .filter((factor) => factor.sourceType === "api" && factor.reductionRate === 0 && factor.dataStatus !== "unavailable")
        .map((factor) => factor.label);
    return {
        apiBackedFactors,
        adjustableFactors,
        fixedObservationFactors,
        method: "Weighted factor contributions are recalculated after applying intervention effectiveness only to adjustable impact/exposure factors."
    };
}
module.exports = {
    INTERVENTIONS,
    simulateIntervention
};
