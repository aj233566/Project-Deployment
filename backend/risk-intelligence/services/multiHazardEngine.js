const { aggregateHazardEvidence } = require("./hazardAggregator");
const { classifyRedZone } = require("./redZoneEngine");
const { explainRisk } = require("./riskExplanationService");
function analyzeMultiHazard(evidence) {
    const hazards = aggregateHazardEvidence(evidence);
    const explanation = explainRisk(hazards);
    return {
        hazards,
        compositeScore: explanation.score,
        redZone: explanation.score === null ? null : classifyRedZone(explanation.score),
        explanation: {
            summary: explanation.score === null
                ? "No hazard evidence is currently available for assessment."
                : `Deterministic multi-hazard index ${explanation.score}/100; classification is ${classifyRedZone(explanation.score)}.`,
            majorContributors: explanation.majorContributors,
            dataQuality: explanation.dataQuality
        },
        ruleVersion: "SENTRY-MULTI-HAZARD-v1"
    };
}
module.exports = { analyzeMultiHazard };
