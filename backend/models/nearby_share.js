const mongoose = require("mongoose");

// One entry per person who is sharing their place with people nearby (see services/nearbyPeople.js). It removes itself when it is not
// refreshed for STATUS_TTL_SECONDS.
const nearbyShareSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
        firstName: { type: String, trim: true, maxlength: 30, default: "Neighbour" },
        role: { type: String, enum: ["citizen", "authority", "admin"], default: "citizen" },
        status: { type: String, enum: ["need-help", "can-help", "safe", "sharing"], default: "sharing" },
        // What an authority answered to a "need help" status; cleared when the person changes their status.
        response: { type: String, enum: ["on-the-way", "noted", null], default: null },
        respondedAt: { type: Date, default: null },
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        updatedAt: { type: Date, default: Date.now },
    },
    { versionKey: false }
);

nearbyShareSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 300 });
nearbyShareSchema.index({ lat: 1, lng: 1 });

module.exports = mongoose.models.NearbyShare || mongoose.model("NearbyShare", nearbyShareSchema);
