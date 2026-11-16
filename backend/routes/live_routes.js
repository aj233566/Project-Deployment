const express = require("express");
const { protect } = require("../middlewares/auth_middleware");
const hub = require("../services/live_hub");
const router = express.Router();

// GET /api/live — one open request per phone. A line every 45 seconds keeps the connection alive without waking the phone's radio often.
router.get("/", protect, (req, res) => {
  res.status(200).set({ "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  res.flushHeaders && res.flushHeaders();
  res.write("retry: 3000\n\n");
  hub.add(res, req.user);
  const beat = setInterval(() => { try { res.write(": beat\n\n"); } catch { /* closed */ } }, 45000);
  res.on("close", () => clearInterval(beat));
});

module.exports = router;
