const Incident = require("../models/incident");
const { getGridFSBucket } = require("../config/gridfs");
const mongoose = require("mongoose");
const riskAssessmentService = require("../services/risk_assessment_service");
const INCIDENT_STATUSES = ["submitted", "verified", "in_progress", "resolved"];
const createIncident = async (req, res) => {
    let clientReportId = "";
    let bucket = null;
    const uploadedFileIds = [];
    try {
        clientReportId = String(req.body.clientReportId || "").trim();
        const reporterId = String(req.user.userId);
        if (clientReportId && !/^[A-Za-z0-9_-]{1,100}$/.test(clientReportId)) {
            return res.status(400).json({
                success: false,
                message: "clientReportId must contain only letters, numbers, underscores, or hyphens."
            });
        }
        if (clientReportId) {
            const existing = await Incident.findOne({ clientReportId });
            if (existing) {
                if (String(existing.reportedBy) !== reporterId) {
                    return res.status(409).json({
                        success: false,
                        message: "This report identifier is already in use."
                    });
                }
                return res.status(200).json({
                    success: true,
                    duplicate: true,
                    message: "This report was already received.",
                    data: existing
                });
            }
        }
        const images = req.files?.images || [];
        const videos = req.files?.videos || [];
        if (images.length === 0 && videos.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Photo or video evidence is required."
            });
        }
        const latitude = Number(req.body.latitude);
        const longitude = Number(req.body.longitude);
        if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
            || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
            return res.status(400).json({
                success: false,
                message: "Valid latitude and longitude are required."
            });
        }
        const nearestHabitation = await riskAssessmentService.findNearestHabitation(latitude, longitude);
        bucket = getGridFSBucket();
        const uploadFile = (file) => {
            return new Promise((resolve, reject) => {
                const uploadStream = bucket.openUploadStream(
                    file.originalname,
                    {
                        contentType: file.mimetype,
                        metadata: {
                            originalName: file.originalname,
                            uploadedBy: req.body.reportedBy || "anonymous",
                            evidenceType: file.mimetype.startsWith("image/")
                                ? "image"
                                : "video"
                        }
                    }
                );
                uploadStream.on("error", reject);
                uploadStream.on("finish", () => {
                    resolve(uploadStream.id.toString());
                });
                uploadStream.end(file.buffer);
            });
        };
        const imageIds = [];
        for (const file of images) {
            const fileId = await uploadFile(file);
            imageIds.push(fileId);
            uploadedFileIds.push(fileId);
        }
        const videoIds = [];
        for (const file of videos) {
            const fileId = await uploadFile(file);
            videoIds.push(fileId);
            uploadedFileIds.push(fileId);
        }
        const incident = await Incident.create({
            clientReportId: clientReportId || undefined,
            type: req.body.type,
            hazardSubtype: req.body.hazardSubtype || null,
            description: req.body.description,
            severity: req.body.severity,
            location: {
                latitude,
                longitude,
                address: req.body.address || ""
            },
            linkedHabitation: nearestHabitation?._id || null,
            status: "submitted",
            reportedBy: String(req.user.userId),
            images: imageIds,
            videos: videoIds
        });
        res.status(201).json({
            success: true,
            message: "Incident reported successfully",
            data: incident
        });
    }
    catch (error) {
        if (error.code === 11000 && clientReportId) {
            try {
                const existing = await Incident.findOne({ clientReportId });
                if (existing) {
                    if (
                        String(existing.reportedBy) ===
                        String(req.user.userId)
                    ) {
                        if (uploadedFileIds.length > 0 && bucket) {
                            await Promise.allSettled(
                                uploadedFileIds.map((id) =>
                                    bucket.delete(
                                        new mongoose.Types.ObjectId(id)
                                    )
                                )
                            );
                        }
                        return res.status(200).json({
                            success: true,
                            duplicate: true,
                            message: "This incident was already submitted.",
                            data: existing
                        });
                    }
                    return res.status(409).json({
                        success: false,
                        duplicate: true,
                        message:
                            "This report ID has already been used. Please submit a new report."
                    });
                }
            } catch (lookupError) {
                console.error(
                    "Could not verify duplicate incident:",
                    lookupError.message
                );
            }
        }
        if (uploadedFileIds.length > 0 && bucket) {
            const cleanup = await Promise.allSettled(
                uploadedFileIds.map((id) =>
                    bucket.delete(new mongoose.Types.ObjectId(id))
                )
            );
            cleanup
                .filter((result) => result.status === "rejected")
                .forEach((result) => {
                    console.error(
                        "Failed to clean up unreferenced incident evidence:",
                        result.reason
                    );
                });
        }
        console.error("Incident creation failed:", error.message);
        return res.status(500).json({
            success: false,
            message:
                "Unable to submit the incident. Please try again."
        });
    }
}
const getIncidents = async (req, res) => {
    try {
        const filter = req.user.role === "citizen"
            ? { reportedBy: String(req.user.userId) }
            : { status: { $ne: "resolved" } };
        const incidents = await Incident.find(filter)
            .sort({ createdAt: -1 })
            .limit(1000);
        res.status(200).json({
            success: true,
            count: incidents.length,
            data: incidents
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
const getIncidentById = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid incident ID."
            });
        }
        const incident = await Incident.findById(req.params.id);
        if (!incident || (
            req.user.role === "citizen"
            && String(incident.reportedBy) !== String(req.user.userId)
        )) {
            return res.status(404).json({
                success: false,
                message: "Incident not found"
            });
        }
        res.status(200).json({
            success: true,
            data: incident
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
const updateIncidentStatus = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid incident ID."
            });
        }
        if (!INCIDENT_STATUSES.includes(req.body.status)) {
            return res.status(400).json({
                success: false,
                message: "A valid incident status is required."
            });
        }
        const incident = await Incident.findByIdAndUpdate(
            req.params.id,
            {
                status: req.body.status
            },
            {
                returnDocument: "after",
                runValidators: true
            }
        );
        if (!incident) {
            return res.status(404).json({
                success: false,
                message: "Incident not found"
            });
        }
        let riskRecalculation = null;
        if (
            incident.status === "verified"
            && ["high", "critical"].includes(String(incident.severity).toLowerCase())
        ) {
            try {
                const habitation = incident.linkedHabitation
                    ? await mongoose.model("Habitation").findById(incident.linkedHabitation)
                    : await riskAssessmentService.findNearestHabitation(incident.location.latitude, incident.location.longitude);
                if (habitation) {
                    await riskAssessmentService.assessHabitation(habitation, req.user?.userId || null);
                    riskRecalculation = { status: "completed", habitationId: String(habitation._id) };
                } else {
                    riskRecalculation = { status: "skipped", reason: "No registered habitation within 25 km." };
                }
            } catch (recalculationError) {
                console.error("Verified incident risk recalculation failed:", recalculationError);
                riskRecalculation = { status: "failed", message: recalculationError.message };
            }
        }
        res.status(200).json({
            success: true,
            message: "Incident status updated",
            data: incident,
            ...(riskRecalculation ? { riskRecalculation } : {})
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
const getIncidentEvidence = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.fileId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid evidence ID."
            });
        }
        const fileId = new mongoose.Types.ObjectId(
            req.params.fileId
        );
        const incidentFilter = {
            $or: [{ images: fileId.toString() }, { videos: fileId.toString() }]
        };
        if (req.user.role === "citizen") {
            incidentFilter.reportedBy = String(req.user.userId);
        }
        const incident = await Incident.exists(incidentFilter);
        if (!incident) {
            return res.status(404).json({
                success: false,
                message: "Evidence not found"
            });
        }
        const bucket = getGridFSBucket();
        const files = await bucket
            .find({ _id: fileId })
            .toArray();
        if (!files.length) {
            return res.status(404).json({
                success: false,
                message: "Evidence not found"
            });
        }
        const file = files[0];
        res.set(
            "Content-Type",
            file.contentType || "application/octet-stream"
        );
        res.set(
            "Content-Disposition",
            `inline; filename="${file.filename}"`
        );
        bucket
            .openDownloadStream(fileId)
            .pipe(res);
    } catch (error) {
        console.error("Evidence retrieval error:", error);
        res.status(400).json({
            success: false,
            message: "Unable to retrieve evidence"
        });
    }
};
module.exports = {
    createIncident,
    getIncidents,
    getIncidentById,
    updateIncidentStatus,
    getIncidentEvidence
};
