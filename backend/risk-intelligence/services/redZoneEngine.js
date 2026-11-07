const { RED_ZONE_RULES } = require("../config/redZoneRules");
function classifyRedZone(score) {
    if (!Number.isFinite(score) || score < 0 || score > 100) {
        throw new TypeError("A finite risk score from 0 to 100 is required.");
    }
    return RED_ZONE_RULES.find((rule) => score >= rule.minimum).zone;
}
module.exports = { classifyRedZone };
