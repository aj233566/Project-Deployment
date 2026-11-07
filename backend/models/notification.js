const mongoose = require("mongoose");
const notificationSchema = new mongoose.Schema(
  {
    alertId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Alert",
      default: null,
    },
    channel: {
      type: String,
      enum: ["in_app", "browser", "email", "sms"],
      default: "in_app",
    },
    type: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "info",
    },
    title: {
      en: {
        type: String,
        required: true,
      },
      hi: {
        type: String,
      },
    },
    message: {
      en: {
        type: String,
        required: true,
      },
      hi: {
        type: String,
      },
    },
    targetAudience: {
      type: String,
      default: "Authority",
    },
    read: {
      type: Boolean,
      default: false,
    },
    delivered: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model(
  "Notification",
  notificationSchema
);