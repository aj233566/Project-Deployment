const mongoose = require("mongoose");
const alertSchema = new mongoose.Schema(
  {
    fingerprint: {
      type: String,
      required: true,
      index: true,
    },
    disasterType: {
      type: String,
      required: true,
      trim: true,
    },
    hazardType: {
      type: String,
      enum: ["landslide", "flood", "earthquake", "erosion", "cloudburst", "storm", "heatwave", "wildfire", "drought"],
      default: null,
    },
    zoneType: {
      type: String,
      enum: ["GREEN", "YELLOW", "ORANGE", "RED"],
      default: null,
    },
    targetType: {
      type: String,
      enum: ["zone", "radius", "habitations"],
      default: null,
    },
    targetLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: undefined,
      },
      coordinates: {
        type: [Number],
        default: undefined,
      },
    },
    radiusKm: {
      type: Number,
      min: 0,
      default: null,
    },
    affectedHabitations: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Habitation",
    }],
    action: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    location: {
      name: {
        type: String,
        required: true,
      },
      latitude: {
        type: Number,
        required: true,
      },
      longitude: {
        type: Number,
        required: true,
      },
    },
    riskScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    riskLevel: {
      type: String,
      enum: ["LOW", "MODERATE", "HIGH", "CRITICAL"],
      required: true,
    },
    aiConfidence: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    majorContributors: [
      {
        key: String,
        label: String,
        level: String,
        contribution: Number,
        reason: String,
      },
    ],
    recommendations: [
      {
        type: String,
      },
    ],
    status: {
      type: String,
      enum: ["Active", "Acknowledged", "Resolved", "Escalated"],
      default: "Active",
    },
    source: {
      type: String,
      default: "risk_engine",
    },
  },
  {
    timestamps: true,
  }
);
alertSchema.index({ targetLocation: "2dsphere" });
alertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $type: "date" } } });
module.exports = mongoose.model("Alert", alertSchema);