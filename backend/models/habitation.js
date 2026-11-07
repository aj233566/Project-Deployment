const mongoose = require("mongoose");
const habitationSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 160 },
        district: { type: String, trim: true, default: "" },
        state: { type: String, trim: true, default: "" },
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
        population: { type: Number, required: true, min: 0 },
        vulnerableGroups: {
            elderly: { type: Number, min: 0, default: null },
            children: { type: Number, min: 0, default: null },
            peopleWithDisabilities: { type: Number, min: 0, default: null },
            pregnantPeople: { type: Number, min: 0, default: null },
            other: { type: Number, min: 0, default: null }
        },
        exposure: {
            type: String,
            enum: ["LOW", "MODERATE", "HIGH", "CRITICAL", "UNKNOWN"],
            default: "UNKNOWN"
        },
        risk: {
            score: { type: Number, min: 0, max: 100, default: null },
            level: { type: String, enum: ["GREEN", "YELLOW", "ORANGE", "RED", "UNKNOWN"], default: "UNKNOWN" },
            assessment: { type: mongoose.Schema.Types.ObjectId, ref: "RiskAssessment", default: null },
            assessedAt: { type: Date, default: null }
        },
        primaryHazard: {
            type: String,
            enum: ["landslide", "flood", "earthquake", "erosion", "cloudburst"],
            default: null
        },
        relocationStatus: {
            type: String,
            enum: ["UNKNOWN", "NOT_REQUIRED", "MONITOR", "PLANNED", "IN_PROGRESS", "RELOCATED"],
            default: "UNKNOWN"
        },
        primaryAccessRoad: { type: String, trim: true, default: "" },
        active: { type: Boolean, default: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
    },
    { timestamps: true }
);
habitationSchema.index({ location: "2dsphere" });
habitationSchema.index({ "risk.level": 1, active: 1 });
module.exports = mongoose.models.Habitation || mongoose.model("Habitation", habitationSchema);
