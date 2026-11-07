const express = require("express");
const { protect, authorize } = require("../middlewares/auth_middleware");
const AffectedArea = require("../models/affected_area");
const { normalizePolygon } = require("../services/affected_area_geometry");

const router = express.Router();
router.use(protect);

const KINDS = ["affected", "safe"];
const SEVERITIES = ["critical", "high", "medium", "low"];
const text = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");

// Everyone signed in can see the areas on the map.
router.get("/", authorize("citizen", "authority", "admin"), async (req, res) => {
    try {
        const status = req.query.status === "resolved" ? "resolved" : "active";
        const areas = await AffectedArea.find({ status }).sort({ createdAt: -1 }).limit(500).lean();
        return res.json({ success: true, data: areas });
    } catch (error) {
        console.error("Affected area list error:", error.message);
        return res.status(500).json({ success: false, message: "Could not load affected areas." });
    }
});

router.post("/", authorize("authority", "admin"), async (req, res) => {
    try {
        const name = text(req.body.name, 120);
        if (!name) return res.status(400).json({ success: false, message: "A name is required." });
        const kind = KINDS.includes(req.body.kind) ? req.body.kind : "affected";
        if (req.body.severity !== undefined && !SEVERITIES.includes(req.body.severity)) {
            return res.status(400).json({ success: false, message: `Severity must be one of ${SEVERITIES.join(", ")}.` });
        }
        const ring = normalizePolygon(req.body.geometry?.coordinates);
        const area = await AffectedArea.create({
            name,
            kind,
            severity: req.body.severity || "medium",
            hazardType: text(req.body.hazardType, 60),
            notes: text(req.body.notes, 500),
            geometry: { type: "Polygon", coordinates: [ring] },
            createdBy: req.user?._id,
        });
        return res.status(201).json({ success: true, data: area });
    } catch (error) {
        if (error.statusCode === 400) return res.status(400).json({ success: false, message: error.message });
        console.error("Affected area create error:", error.message);
        return res.status(500).json({ success: false, message: "Could not save the area." });
    }
});

// Change severity, notes or status. Areas are marked resolved, never deleted.
router.patch("/:id", authorize("authority", "admin"), async (req, res) => {
    try {
        const update = {};
        if (req.body.severity !== undefined) {
            if (!SEVERITIES.includes(req.body.severity)) return res.status(400).json({ success: false, message: `Severity must be one of ${SEVERITIES.join(", ")}.` });
            update.severity = req.body.severity;
        }
        if (req.body.status !== undefined) {
            if (!["active", "resolved"].includes(req.body.status)) return res.status(400).json({ success: false, message: "Status must be active or resolved." });
            update.status = req.body.status;
        }
        if (req.body.notes !== undefined) update.notes = text(req.body.notes, 500);
        const area = await AffectedArea.findByIdAndUpdate(req.params.id, update, { returnDocument: "after", runValidators: true });
        if (!area) return res.status(404).json({ success: false, message: "Area not found." });
        return res.json({ success: true, data: area });
    } catch (error) {
        if (error.name === "CastError") return res.status(400).json({ success: false, message: "Invalid area id." });
        console.error("Affected area update error:", error.message);
        return res.status(500).json({ success: false, message: "Could not update the area." });
    }
});

module.exports = router;
