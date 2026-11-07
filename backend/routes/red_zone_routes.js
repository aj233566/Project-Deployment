const express = require("express");
const { protect, authorize, authorizeAuthorityOrAdmin } = require("../middlewares/auth_middleware");
const {
    getRedZones,
    getRedZoneById,
    recalculateRedZone
} = require("../controllers/habitation_controller");
const router = express.Router();
router.use(protect, authorize("citizen", "authority", "admin"));
router.get("/", getRedZones);
router.post("/recalculate", authorizeAuthorityOrAdmin, recalculateRedZone);
router.get("/:id", getRedZoneById);
module.exports = router;
