const express = require("express");
const {
    createIncident,
    getIncidents,
    getIncidentById,
    updateIncidentStatus,
    getIncidentEvidence
} = require("../controllers/incident_controller");
const Incident = require("../models/incident");
const { protect, authorize, authorizeAuthorityOrAdmin } = require("../middlewares/auth_middleware");
const uploadEvidence = require("../middlewares/uploadEvidence");
const router = express.Router();
router.use(protect, authorize("citizen", "authority", "admin"));
router.get("/evidence/:fileId", getIncidentEvidence);
router
    .route("/")
    .get(getIncidents)
    .post(
        uploadEvidence.fields([
            { name: "images", maxCount: 5 },
            { name: "videos", maxCount: 2 }
        ]),
        createIncident
    );
router.get("/active", async (req, res, next) => {
    try {
        const data = await Incident.find({ status: { $ne: "resolved" } })
            .sort({ createdAt: -1 })
            .limit(1000)
            .lean();
        res.status(200).json({ success: true, count: data.length, data });
    } catch (error) {
        next(error);
    }
});
router
    .route("/:id")
    .get(getIncidentById)
    .patch(authorizeAuthorityOrAdmin, updateIncidentStatus);
module.exports = router;
