const Alert = require("../models/alert");
const getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({})
      .populate("affectedHabitations", "name location")
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
module.exports = {
  getAlerts,
  getAlertById,
  updateAlertStatus,
};