const Alert = require("../models/alert");
const Notification = require("../models/notification");
const mongoose = require("mongoose");
const getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({})
      .populate("affectedHabitations", "name location population district state")
      .sort({ createdAt: -1 })
      .lean();
    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    console.error("Get alerts error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch alerts.",
    });
  }
};
const getAlertById = async (req, res) => {
  try {
    const alert = await Alert.findById(
      req.params.id
    );
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found.",
      });
    }
    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch alert.",
    });
  }
};
const updateAlertStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = [
      "Active",
      "Acknowledged",
      "Resolved",
      "Escalated",
    ];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid alert status.",
      });
    }
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { status },
      { returnDocument: "after" }
    );
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found.",
      });
    }
    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    console.error(
      "Update alert status error:",
      error
    );
    res.status(500).json({
      success: false,
      message: "Failed to update alert.",
    });
  }
};
const updateAlertTelemetry = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid alert id." });
    }
    const allowed = ["rainfallMm", "soilMoisture", "slopeRisk", "roadStatus", "populationEstimate", "notes"];
    const input = req.body || {};
    if (!allowed.some((key) => Object.hasOwn(input, key))) {
      return res.status(400).json({ success: false, message: "Provide at least one operator telemetry field." });
    }
    const updates = {};
    for (const key of ["rainfallMm", "soilMoisture", "populationEstimate"]) {
      if (!Object.hasOwn(input, key)) continue;
      if (input[key] === null || input[key] === "") {
        updates[`operatorTelemetry.${key}`] = null;
        continue;
      }
      const number = Number(input[key]);
      const maximum = key === "soilMoisture" ? 100 : Infinity;
      if (!Number.isFinite(number) || number < 0 || number > maximum) {
        return res.status(400).json({ success: false, message: `${key} must be ${key === "soilMoisture" ? "between 0 and 100" : "a non-negative number"}.` });
      }
      updates[`operatorTelemetry.${key}`] = number;
    }
    if (Object.hasOwn(input, "slopeRisk")) {
      const value = String(input.slopeRisk || "UNKNOWN").toUpperCase();
      if (!["UNKNOWN", "LOW", "MODERATE", "HIGH", "CRITICAL"].includes(value)) {
        return res.status(400).json({ success: false, message: "slopeRisk must be UNKNOWN, LOW, MODERATE, HIGH, or CRITICAL." });
      }
      updates["operatorTelemetry.slopeRisk"] = value;
    }
    if (Object.hasOwn(input, "roadStatus")) {
      const value = String(input.roadStatus || "UNKNOWN").toUpperCase();
      if (!["UNKNOWN", "OPEN", "PARTIAL", "BLOCKED"].includes(value)) {
        return res.status(400).json({ success: false, message: "roadStatus must be UNKNOWN, OPEN, PARTIAL, or BLOCKED." });
      }
      updates["operatorTelemetry.roadStatus"] = value;
    }
    if (Object.hasOwn(input, "notes")) {
      const notes = String(input.notes || "").trim();
      if (notes.length > 1000) return res.status(400).json({ success: false, message: "Operator notes must be 1000 characters or fewer." });
      updates["operatorTelemetry.notes"] = notes;
    }
    updates["operatorTelemetry.updatedAt"] = new Date();
    updates["operatorTelemetry.updatedBy"] = req.user.userId;
    const alert = await Alert.findByIdAndUpdate(req.params.id, { $set: updates }, { returnDocument: "after", runValidators: true });
    if (!alert) return res.status(404).json({ success: false, message: "Alert not found." });
    return res.json({ success: true, data: alert });
  } catch (error) {
    return next(error);
  }
};
const deleteAlert = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid alert id." });
    }
    const alert = await Alert.findById(req.params.id).select("_id").lean();
    if (!alert) return res.status(404).json({ success: false, message: "Alert not found." });
    await Notification.updateMany({ alertId: alert._id }, { $set: { alertId: null } });
    await Alert.findByIdAndDelete(alert._id);
    return res.json({ success: true, message: "Alert deleted." });
  } catch (error) {
    return next(error);
  }
};
module.exports = {
  getAlerts,
  getAlertById,
  updateAlertStatus,
  updateAlertTelemetry,
  deleteAlert,
};
