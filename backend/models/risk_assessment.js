const mongoose = require("mongoose");
const hazardResultSchema = new mongoose.Schema(
    {
        hazardType: {
            type: String,
            enum: ["landslide", "flood", "earthquake", "erosion", "cloudburst"],
            required: true
        },
        score: { type: Number, min: 0, max: 100, default: null },
        evidenceCount: { type: Number, min: 0, required: true },
        factors: [{
            key: { type: String, required: true },
            label: { type: String, required: true },
            score: { type: Number, min: 0, max: 100, default: null },
            weight: { type: Number, min: 0, max: 1, required: true },
            source: { type: String, default: "unknown" },
            status: { type: String, enum: ["available", "unavailable"], required: true },
            reason: { type: String, default: "" }
        }]
    },
    { _id: false }
);
const riskAssessmentSchema = new mongoose.Schema(
    {
        habitation: { type: mongoose.Schema.Types.ObjectId, ref: "Habitation", default: null, index: true },
        location: {
            type: { type: String, enum: ["Point"], default: "Point" },
            coordinates: {
                type: [Number],
                required: true,
                validate: {
                    validator(value) {
                        return Array.isArray(value)
                            && value.length === 2
                            && value[0] >= -180 && value[0] <= 180
                            && value[1] >= -90 && value[1] <= 90;
                    },
                    message: "Location must be [longitude, latitude] within valid bounds."
                }
            }
        },
        hazards: { type: [hazardResultSchema], required: true },
        compositeScore: { type: Number, min: 0, max: 100, default: null },
        redZone: {
            type: String,
            enum: ["GREEN", "YELLOW", "ORANGE", "RED", "UNKNOWN"],
            required: true,
            default: "UNKNOWN"
        },
        explanation: {
            summary: { type: String, required: true },
            majorContributors: [{ hazardType: String, factor: String, score: Number, source: String, reason: String }],
            dataQuality: {
                availableFactors: { type: Number, min: 0, required: true },
                totalFactors: { type: Number, min: 0, required: true },
                coveragePercent: { type: Number, min: 0, max: 100, required: true },
                notes: [String]
            }
        },
        sources: [{ type: String }],
        ruleVersion: { type: String, required: true },
        assessedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
    },
    { timestamps: true }
);
riskAssessmentSchema.index({ location: "2dsphere" });
riskAssessmentSchema.index({ redZone: 1, createdAt: -1 });
module.exports = mongoose.models.RiskAssessment || mongoose.model("RiskAssessment", riskAssessmentSchema);
