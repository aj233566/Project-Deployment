const mongoose = require("mongoose");
const Alert = require("../models/alert");
const Habitation = require("../models/habitation");
const HAZARD_TYPES = ["landslide", "flood", "earthquake", "erosion", "cloudburst", "storm", "heatwave", "wildfire", "drought"];
const ZONE_TYPES = ["GREEN", "YELLOW", "ORANGE", "RED"];
async function createTargetedAlert(req, res, next) {
    try {
        const {
            hazardType,
            zoneType,
            targetType,
            location,
            radiusKm,
            affectedHabitations = [],
            action,
            expiresAt,
            riskScore,
            riskLevel,
            recommendations = []
        } = req.body;
        if (!HAZARD_TYPES.includes(hazardType) || !ZONE_TYPES.includes(zoneType)) {
            return res.status(400).json({ success: false, message: "A supported hazardType and zoneType are required." });
        }
        if (!["zone", "radius", "habitations"].includes(targetType)) {
            return res.status(400).json({ success: false, message: "targetType must be zone, radius, or habitations." });
        }
        if (!location || !Number.isFinite(Number(location.latitude)) || Number(location.latitude) < -90 || Number(location.latitude) > 90
            || !Number.isFinite(Number(location.longitude)) || Number(location.longitude) < -180 || Number(location.longitude) > 180) {
            return res.status(400).json({ success: false, message: "A valid target location is required." });
        }
        if (targetType === "radius" && (!Number.isFinite(Number(radiusKm)) || Number(radiusKm) <= 0 || Number(radiusKm) > 500)) {
            return res.status(400).json({ success: false, message: "Radius must be greater than 0 and no more than 500 km." });
        }
        if (targetType === "habitations" && (!Array.isArray(affectedHabitations) || affectedHabitations.length === 0
            || affectedHabitations.some((id) => !mongoose.isValidObjectId(id)))) {
            return res.status(400).json({ success: false, message: "A non-empty list of valid habitation ids is required." });
        }
        if (!String(action || "").trim()) {
            return res.status(400).json({ success: false, message: "An action message is required." });
        }
        const expiry = new Date(expiresAt);
        if (!expiresAt || !Number.isFinite(expiry.getTime()) || expiry <= new Date()) {
            return res.status(400).json({ success: false, message: "expiresAt must be a future date." });
        }
        if (riskScore === null || riskScore === undefined || riskScore === ""
            || !Number.isFinite(Number(riskScore)) || Number(riskScore) < 0 || Number(riskScore) > 100
            || !["LOW", "MODERATE", "HIGH", "CRITICAL"].includes(riskLevel)) {
            return res.status(400).json({ success: false, message: "A valid riskScore and riskLevel are required." });
        }
        const point = {
            type: "Point",
            coordinates: [Number(location.longitude), Number(location.latitude)]
        };
        let targetedHabitationIds = [];
        if (targetType === "habitations") {
            const matches = await Habitation.find({
                _id: { $in: affectedHabitations },
                active: true
            }).select("_id").lean();
            if (matches.length !== affectedHabitations.length) {
                return res.status(400).json({ success: false, message: "Every target must be an active registered habitation." });
            }
            targetedHabitationIds = matches.map((item) => item._id);
        } else if (targetType === "zone") {
            targetedHabitationIds = (await Habitation.find({
                active: true,
                "risk.level": zoneType
            }).select("_id").lean()).map((item) => item._id);
            if (targetedHabitationIds.length === 0) {
                return res.status(400).json({ success: false, message: `No active habitations are registered in the ${zoneType} zone.` });
            }
        } else {
            targetedHabitationIds = (await Habitation.find({
                active: true,
                location: {
                    $near: {
                        $geometry: point,
                        $maxDistance: Number(radiusKm) * 1000
                    }
                }
            }).select("_id").lean()).map((item) => item._id);
            if (targetedHabitationIds.length === 0) {
                return res.status(400).json({ success: false, message: "No registered habitations were found inside this radius." });
            }
        }
        const fingerprint = `targeted:${hazardType}:${point.coordinates.join(":")}:${Date.now()}`;
        const alert = await Alert.create({
            fingerprint,
            disasterType: hazardType,
            hazardType,
            zoneType,
            targetType,
            targetLocation: point,
            radiusKm: targetType === "radius" ? Number(radiusKm) : null,
            affectedHabitations: targetedHabitationIds,
            action: String(action).trim(),
            expiresAt: expiry,
            location: {
                name: String(location.name || "Target area").trim(),
                latitude: Number(location.latitude),
                longitude: Number(location.longitude)
            },
            riskScore: Number(riskScore),
            riskLevel,
            recommendations,
            status: "Active",
            source: "authority_geo_targeted"
        });
        return res.status(201).json({
            success: true,
            data: {
                alert,
                affectedHabitationCount: targetedHabitationIds.length,
                residentDelivery: "Not configured; the geo-targeted alert is saved for operational review."
            }
        });
    } catch (error) {
        return next(error);
    }
}
module.exports = { createTargetedAlert };
