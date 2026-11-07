const mongoose = require("mongoose");
const relocationSiteSchema = new mongoose.Schema(
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
        totalCapacity: { type: Number, required: true, min: 0 },
        occupancy: { type: Number, required: true, min: 0 },
        reservedCapacity: { type: Number, required: true, min: 0 },
        facilities: [{ type: String, trim: true }],
        roadAccess: { type: String, enum: ["OPEN", "RESTRICTED", "BLOCKED", "UNKNOWN"], default: "UNKNOWN" },
        hazardExposure: [{
            type: String,
            enum: ["landslide", "flood", "earthquake", "erosion", "cloudburst"]
        }],
        suitability: { type: Number, min: 0, max: 100, default: null },
        status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
        linkedResources: [{ type: mongoose.Schema.Types.ObjectId, ref: "Resource" }],
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
    },
    { timestamps: true }
);
relocationSiteSchema.index({ location: "2dsphere" });
relocationSiteSchema.index({ status: 1, totalCapacity: 1, occupancy: 1 });
module.exports = mongoose.models.RelocationSite || mongoose.model("RelocationSite", relocationSiteSchema);
