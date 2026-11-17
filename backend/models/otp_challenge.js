const mongoose = require("mongoose");

const otpChallengeSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    purpose: {
        type: String,
        enum: ["login", "password_reset", "unlock", "revoke_sessions"],
        required: true
    },
    codeHash: { type: String, required: true },
    validUntil: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    sentAt: { type: Date, required: true },
    windowStartedAt: { type: Date, required: true },
    sendCount: { type: Number, default: 1 }
}, { timestamps: true });

otpChallengeSchema.index({ userId: 1, purpose: 1 }, { unique: true });
otpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("OtpChallenge", otpChallengeSchema);
