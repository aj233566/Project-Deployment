const express = require("express");
const { protect, authorize } = require("../middlewares/auth_middleware");
const { getRelocationPriorities } = require("../controllers/relocation_priority_controller");
const router = express.Router();
router.use(protect, authorize("citizen", "authority", "admin"));
router.get("/", getRelocationPriorities);
router.get("/:habitationId", getRelocationPriorities);
module.exports = router;
