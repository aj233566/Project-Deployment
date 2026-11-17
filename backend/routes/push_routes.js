const express = require("express");
const PushToken = require("../models/push_token");
const push = require("../services/push_service");
const { protect } = require("../middlewares/auth_middleware");
const router = express.Router();

router.use(protect);

// POST /api/push/token { token } — the phone says where to push. The answer says whether the server can push at all, so the app only gives
// up its own connection when this server really will.
router.post("/token", async (req, res, next) => {
  try {
    const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
    if (token.length < 20 || token.length > 4096) return res.status(400).json({ success: false, message: "That is not a push token." });
    await PushToken.findOneAndUpdate({ token }, { userId: req.user.userId, platform: "android", seenAt: new Date() }, { upsert: true, setDefaultsOnInsert: true });
    res.json({ success: true, enabled: push.enabled() });
  } catch (error) { next(error); }
});

// DELETE /api/push/token { token } — signing out.
router.delete("/token", async (req, res, next) => {
  try {
    const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
    if (token) await PushToken.deleteOne({ token, userId: req.user.userId });
    res.json({ success: true });
  } catch (error) { next(error); }
});

module.exports = router;
