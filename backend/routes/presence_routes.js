const express = require("express");
const { protect, authorize } = require("../middlewares/auth_middleware");
const User = require("../models/user");
const { createPresenceHandlers } = require("../services/presence");

const router = express.Router();
const { heartbeat, leave, summary } = createPresenceHandlers(User);

router.use(protect);
// Anyone signed in can say "I am here" or "I left"; only authority and admin accounts can read how many authorities are online.
router.post("/heartbeat", authorize("citizen", "authority", "admin"), heartbeat);
router.post("/leave", authorize("citizen", "authority", "admin"), leave);
router.get("/summary", authorize("authority", "admin"), summary);

module.exports = router;
