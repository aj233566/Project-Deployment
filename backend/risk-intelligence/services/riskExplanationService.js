function explainRisk(hazards) {
    const assessed = hazards.filter((hazard) => Number.isFinite(hazard.score));
    const factors = hazards.flatMap((hazard) => hazard.factors);
    const availableFactors = factors.filter((item) => item.status === "available");
    const contributors = hazards.flatMap((hazard) =>
        hazard.factors
            .filter((item) => item.status === "available")
            .map((item) => ({ hazardType: hazard.hazardType, factor: item.label, score: item.score, source: item.source, reason: item.reason }))
    ).sort((a, b) => b.score - a.score).slice(0, 5);
    const score = assessed.length === 0
        ? null
        : Math.round(assessed.reduce((total, hazard) => total + hazard.score, 0) / assessed.length);
    const coveragePercent = factors.length === 0 ? 0 : Math.round(availableFactors.length / factors.length * 100);
    return {
        score,
        majorContributors: contributors,
        dataQuality: {
            availableFactors: availableFactors.length,
            totalFactors: factors.length,
            coveragePercent,
            notes: [
                "Scores are deterministic decision-support indices, not probabilities or official warnings.",
                "Only available source data and verified incident reports contribute to hazard scores.",
                "Erosion and cloudburst indicators use precipitation/report proxies; no dedicated forecast feed is configured."
            ]
        }
    };
}
module.exports = { explainRisk };
