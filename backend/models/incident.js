const mongoose = require("mongoose");
const incidentSchema = new mongoose.Schema(
    {
        clientReportId: {
            type: String,
            trim: true,
            maxlength: 100,
            unique: true,
            sparse: true
        },
        type: {
            type: String,
            required: [true, "Incident type is required"],
            enum: [
                "landslide",
                "road_blockage",
                "flash_flood",
                "slope_crack",
                "slope_movement",
                "infrastructure_damage"
            ]
        },
        hazardSubtype: {
            type: String,
            enum: ["landslide", "flood", "earthquake", "erosion", "cloudburst", "storm", "heatwave", "wildfire", "drought"],
            default: null
        },
        description: {
            type: String,
            required: [true, "Description is required"],
            trim: true
        },
        severity: {
            type: String,
            enum: ["low", "moderate", "high", "critical"],
            default: "moderate"
        },
        location: {
            latitude: {
                type: Number,
                required: [true, "Latitude is required"],
                min: -90,
                max: 90
            },
            longitude: {
                type: Number,
                required: [true, "Longitude is required"],
                min: -180,
                max: 180
            },
            address: {
                type: String,
                default: ""
            }
        },
        linkedHabitation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Habitation",
            default: null,
            index: true
        },
        status: {
            type: String,
            enum: [
                "submitted",
                "verified",
                "in_progress",
                "resolved"
            ],
            default: "submitted"
        },
        reportedBy: {
            type: String,
            default: "anonymous"
        },
        images: [
            {
                type: String
            }
        ],
        videos: [
            {
                type: String
            }
        ]
    },
    {
        timestamps: true
    }
);
const Incident = mongoose.model(
    "Incident",
    incidentSchema
);
module.exports = Incident;