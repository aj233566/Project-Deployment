const mongoose = require("mongoose");

// A drawn outline on the map: either an affected area (with a severity) or a safe zone.
const affectedAreaSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 120 },
        kind: { type: String, enum: ["affected", "safe"], default: "affected" },
        severity: { type: String, enum: ["critical", "high", "medium", "low"], default: "medium" },
        hazardType: { type: String, trim: true, maxlength: 60, default: "" },
        notes: { type: String, trim: true, maxlength: 500, default: "" },
        status: { type: String, enum: ["active", "resolved"], default: "active" },
        geometry: {
            type: { type: String, enum: ["Polygon"], default: "Polygon" },
            coordinates: { type: [[[Number]]], required: true },
        },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

affectedAreaSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.models.AffectedArea || mongoose.model("AffectedArea", affectedAreaSchema);
