const mongoose = require("mongoose");

// A message that reached the server through the nearby network (a report, a location update or an "I am safe"). It is deleted by the database
// when it expires, so old locations do not pile up.
const meshMessageSchema = new mongoose.Schema(
  {
    envId: { type: String, required: true, unique: true },
    kind: { type: String, enum: ["report", "location", "safe"], required: true },
    deviceId: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    carrierUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    ts: { type: Date, required: true },
    exp: { type: Date, required: true },
    body: { type: mongoose.Schema.Types.Mixed, required: true },
    receivedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);
meshMessageSchema.index({ exp: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("MeshMessage", meshMessageSchema);
