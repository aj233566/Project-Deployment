const mongoose = require("mongoose");
const emergencyDispatchSchema = new mongoose.Schema(
    {
        incidentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Incident",
            required: true,
            index: true
        },
        unitName: {
            type: String,
            required: [true, "Response unit is required"],
            trim: true
        },
        status: {
            type: String,
            enum: [
                "dispatched",
                "en_route",
                "arrived",
                "completed",
                "cancelled"
            ],
            default: "dispatched"
        },
        dispatchedAt: {
            type: Date,
            default: Date.now
        },
        dispatchedBy: {
            type: String,
            default: "authority"
        },
        notes: {
            type: String,
            default: "",
            trim: true
        }
    },
    {
        timestamps: true
    }
);
emergencyDispatchSchema.index(
    { incidentId: 1 },
    {
        unique: true,
        partialFilterExpression: {
            status: { $in: ["dispatched", "en_route", "arrived"] }
        },
        name: "one_active_dispatch_per_incident"
    }
);
module.exports =
    mongoose.models.EmergencyDispatch ||
    mongoose.model(
        "EmergencyDispatch",
        emergencyDispatchSchema
    );