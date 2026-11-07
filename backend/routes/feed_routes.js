const express = require("express");
const { protect, authorize } = require("../middlewares/auth_middleware");
const { createSachetFeed } = require("../services/sachet_feed");

const router = express.Router();
const sachetFeed = createSachetFeed();

router.use(protect, authorize("authority", "admin"));

// GET /api/feeds/sachet           -> All India alerts
// GET /api/feeds/sachet?state=IN-KL -> that state's alerts ({ supported: false } when NDMA publishes no feed for it)
router.get("/sachet", async (req, res) => {
    const requested = req.query.state;
    if (requested !== undefined && !(typeof requested === "string" && /^IN-[A-Za-z]{2}$/.test(requested))) {
        return res.status(400).json({ success: false, message: "state must be a state code such as IN-KL." });
    }
    try {
        const result = requested === undefined
            ? await sachetFeed.getAlerts()
            : await sachetFeed.getStateAlerts(requested.toUpperCase());
        return res.json({ success: true, data: result });
    } catch (error) {
        console.error("SACHET feed error:", error.message);
        return res.status(502).json({
            success: false,
            message: "The NDMA SACHET alert feed is unavailable right now."
        });
    }
});

module.exports = router;
