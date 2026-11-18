const mongoose = require("mongoose");

// A phone's push address from Firebase Cloud Messaging. One row per phone token. The row says only who the phone belongs to; it holds nothing
// private. Rows the push service finds invalid (the app was removed) are deleted by it, and rows nobody refreshed for 90 days expire by themselves.
const pushTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    token: { type: String, required: true, unique: true },
    platform: { type: String, default: "android" },
    seenAt: { type: Date, default: Date.now, index: { expireAfterSeconds: 90 * 24 * 3600 } },
  },
  { timestamps: true }
);

module.exports = mongoose.models.PushToken || mongoose.model("PushToken", pushTokenSchema);
