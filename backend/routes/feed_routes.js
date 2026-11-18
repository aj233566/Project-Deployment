const express = require("express");
const { protect, authorize } = require("../middlewares/auth_middleware");
const { createSachetFeed } = require("../services/sachet_feed");

const router = express.Router();
const sachetFeed = createSachetFeed();
const POPULATION_URL = "https://api.worldbank.org/v2/country/IND/indicator/SP.POP.TOTL?format=json&per_page=6";
const GDACS_URL = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH";
const DAY_MS = 24 * 60 * 60 * 1000;
let populationCache = {
    // Last confirmed World Bank value (2025), used only if its API is unavailable.
    payload: [{ lastupdated: "2026-11-11" }, [{ date: "2025", value: 1463865525 }]],
    updatedAt: 0,
    stale: true,
};
const gdacsCache = new Map();

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

// The World Bank endpoint does not consistently allow browser CORS requests,
// so fetch it from the API and return the same JSON payload to the dashboard.
router.get("/india-population", async (req, res) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
        const response = await fetch(
            POPULATION_URL,
            { signal: controller.signal, headers: { Accept: "application/json" } }
        );
        if (!response.ok) {
            throw new Error(`World Bank returned HTTP ${response.status}`);
        }
        const payload = await response.json();
        if (!Array.isArray(payload?.[1]) || !payload[1].some((row) => Number.isFinite(row?.value) && row.value > 0)) {
            throw new Error("World Bank returned no population figure.");
        }
        populationCache = { payload, updatedAt: Date.now(), stale: false };
        res.set("Cache-Control", "private, max-age=86400");
        return res.json(payload);
    } catch (error) {
        console.warn("World Bank population feed unavailable; serving cached estimate:", error.message);
        res.set("X-Feed-Stale", "true");
        res.set("Cache-Control", "private, max-age=3600");
        return res.json(populationCache.payload);
    } finally {
        clearTimeout(timeout);
    }
});

// Keep the GDACS request server-side: some browsers or networks block its CORS response.
router.get("/gdacs", async (req, res) => {
    const { fromdate, todate } = req.query;
    const validDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
        && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
    if (!validDate(fromdate) || !validDate(todate) || fromdate > todate) {
        return res.status(400).json({ success: false, message: "Valid fromdate and todate values are required." });
    }

    const key = `${fromdate}:${todate}`;
    const now = Date.now();
    const cached = gdacsCache.get(key);
    if (cached && cached.expiresAt > now) {
        res.set("Cache-Control", "private, max-age=600");
        return res.json(cached.payload);
    }

    try {
        const types = ["TC", "FL", "TS", "DR"];
        const results = await Promise.allSettled(types.map(async (type) => {
            const url = new URL(GDACS_URL);
            url.search = new URLSearchParams({
                eventlist: type,
                fromdate,
                todate,
                alertlevel: "Green;Orange;Red",
            }).toString();
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
            try {
                const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
                if (!response.ok) throw new Error(`GDACS returned HTTP ${response.status}`);
                const payload = await response.json();
                return Array.isArray(payload?.features) ? payload.features : [];
            } finally {
                clearTimeout(timeout);
            }
        }));
        const succeeded = results.filter((result) => result.status === "fulfilled");
        if (succeeded.length === 0) throw results[0].reason;
        const payload = { features: succeeded.flatMap((result) => result.value) };
        gdacsCache.set(key, { payload, expiresAt: now + 10 * 60 * 1000 });
        res.set("Cache-Control", "private, max-age=600");
        if (succeeded.length < results.length) res.set("X-Feed-Partial", "true");
        return res.json(payload);
    } catch (error) {
        console.warn("GDACS feed unavailable:", error.message);
        if (cached) {
            res.set("X-Feed-Stale", "true");
            return res.json(cached.payload);
        }
        return res.status(502).json({ success: false, message: "GDACS alerts are unavailable right now." });
    }
});

module.exports = router;
