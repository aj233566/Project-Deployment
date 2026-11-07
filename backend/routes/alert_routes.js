const express = require("express");
const {
  getAlerts,
  getAlertById,
  updateAlertStatus,
} = require("../controllers/alert_controller");
const { protect, authorizeAuthorityOrAdmin } = require("../middlewares/auth_middleware");
const { createTargetedAlert } = require("../controllers/targeted_alert_controller");
const router = express.Router();
router.use(protect);
router.post("/targeted", authorizeAuthorityOrAdmin, createTargetedAlert);
router.get("/", getAlerts);
router.get("/:id", getAlertById);
router.patch("/:id/status", authorizeAuthorityOrAdmin, updateAlertStatus);
module.exports = router;