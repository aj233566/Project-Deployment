const mongoose = require("mongoose");
const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
        },
        oauthIdentities: {
            type: [{
                provider: { type: String, enum: ["google", "microsoft"], required: true },
                subject: { type: String, required: true }
            }],
            default: []
        },
        activeSessionId: {
            type: String,
            default: null,
        },
        // Last time this person's browser said "I am here" while the page was open (presence heartbeat). Null when they left or logged out.
        lastSeenAt: {
            type: Date,
            default: null,
        },
        accountStatus: {
            type: String,
            enum: ["active", "locked", "blocked", "banned", "deleted"],
            default: "active",
            index: true,
        },
        failedLoginAttempts: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },
        accountStatusReason: {
            type: String,
            default: "",
            trim: true,
            maxlength: 500,
        },
        accountStatusUpdatedAt: {
            type: Date,
            default: null,
        },
        accountStatusUpdatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        phone: {
            type: String,
            required: true,
            trim: true,
        },
        role: {
            type: String,
            enum: ["citizen", "authority", "admin"],
            default: "citizen",
        },
        location: {
            state: {
                type: String,
                required: true,
                trim: true,
            },
            district: {
                type: String,
                required: true,
                trim: true,
            },
        },
        department: {
            type: String,
            default: "",
            trim: true,
        },
        designation: {
            type: String,
            default: "",
            trim: true,
        },
        employeeId: {
            type: String,
            default: "",
            trim: true,
        },
        authorityStatus: {
            type: String,
            enum: [
                "not_applicable",
                "pending",
                "verified",
                "rejected",
            ],
            default: "not_applicable",
        },
        verifiedAt: {
            type: Date,
            default: null,
        },
        rejectedAt: {
            type: Date,
            default: null,
        },
        rejectionReason: {
            type: String,
            default: "",
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);
module.exports = mongoose.model("User", userSchema);
