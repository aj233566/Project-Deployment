const mongoose = require("mongoose");
const resourceSchema = new mongoose.Schema(
    {
        resourceId: {
            type: String,
            unique: true,
            sparse: true,
            trim: true
        },
        name: {
            type: String,
            required: [true, "Resource name is required"],
            trim: true
        },
        category: {
            type: String,
            required: [true, "Resource category is required"],
            trim: true
        },
        description: {
            type: String,
            default: "",
            trim: true
        },
        total: {
            type: Number,
            required: true,
            min: 0
        },
        available: {
            type: Number,
            required: true,
            min: 0
        },
        deployed: {
            type: Number,
            min: 0,
            default: null
        },
        reserved: {
            type: Number,
            min: 0,
            default: null
        },
        location: {
            type: String,
            default: "",
            trim: true
        },
        status: {
            type: String,
            enum: [
                "Available",
                "Limited",
                "Deployed",
                "Unavailable"
            ],
            default: "Available"
        },
        updatedBy: {
            type: String,
            default: "system"
        }
    },
    {
        timestamps: true
    }
);
module.exports =
    mongoose.models.Resource ||
    mongoose.model("Resource", resourceSchema);