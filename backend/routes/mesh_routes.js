const express = require("express");
const { getBundle, registerDevice, ingest } = require("../controllers/mesh_controller");
const { protect, authorize } = require("../middlewares/auth_middleware");
const router = express.Router();

// Every route needs a signed-in account. Alerts and registration are for citizens (and staff testing the app).
router.use(protect);
router.get("/bundle", authorize("citizen", "authority", "admin"), getBundle);
router.post("/device", authorize("citizen", "authority", "admin"), registerDevice);
router.post("/ingest", authorize("citizen", "authority", "admin"), ingest);

module.exports = router;
