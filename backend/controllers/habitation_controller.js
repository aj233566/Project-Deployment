const mongoose = require("mongoose");
const Habitation = require("../models/habitation");
const RiskAssessment = require("../models/risk_assessment");
const { assessHabitation } = require("../services/risk_assessment_service");
function validPoint(location) {
    return location
        && location.type === "Point"
        && Array.isArray(location.coordinates)
        && location.coordinates.length === 2
        && location.coordinates.every(Number.isFinite)
        && location.coordinates[0] >= -180 && location.coordinates[0] <= 180
        && location.coordinates[1] >= -90 && location.coordinates[1] <= 90;
}
function isNonNegativeNumber(value) {
    return value !== null
        && value !== undefined
        && value !== ""
        && Number.isFinite(Number(value))
        && Number(value) >= 0;
}
function validatePayload(body, creating) {
    if (creating && (!String(body.name || "").trim() || !isNonNegativeNumber(body.population) || !validPoint(body.location))) {
        return "Name, a non-negative population, and a valid GeoJSON Point are required.";
    }
    if (body.location !== undefined && !validPoint(body.location)) {
        return "Location must be a GeoJSON Point with [longitude, latitude] coordinates.";
    }
    if (body.population !== undefined && !isNonNegativeNumber(body.population)) {
        return "Population must be a non-negative number.";
    }
    if (body.relocationStatus !== undefined
        && !["UNKNOWN", "NOT_REQUIRED", "MONITOR", "PLANNED", "IN_PROGRESS", "RELOCATED"].includes(body.relocationStatus)) {
        return "A valid relocationStatus is required.";
    }
    if (body.vulnerableGroups !== undefined) {
        if (!body.vulnerableGroups || typeof body.vulnerableGroups !== "object" || Array.isArray(body.vulnerableGroups)) {
            return "Vulnerable group counts must be a named object.";
        }
        const counts = Object.values(body.vulnerableGroups);
        if (counts.some((count) => !isNonNegativeNumber(count))) {
            return "Vulnerable group counts must be non-negative numbers.";
        }
    }
    const groups = body.vulnerableGroups || {};
    const counts = Object.values(groups);
    const allGroupCountsKnown = counts.length > 0 && counts.every((count) => isNonNegativeNumber(count));
    if (body.population !== undefined && allGroupCountsKnown
        && counts.reduce((sum, count) => sum + Number(count), 0) > Number(body.population)) {
        return "Vulnerable group counts cannot exceed the recorded population.";
    }
    return null;
}
const getHabitations = async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.active === "true") filter.active = true;
        if (req.query.active === "false") filter.active = false;
        if (["GREEN", "YELLOW", "ORANGE", "RED", "UNKNOWN"].includes(req.query.zone)) {
            filter["risk.level"] = req.query.zone;
        }
        const data = await Habitation.find(filter).sort({ name: 1 }).lean();
        res.json({ success: true, count: data.length, data });
    } catch (error) {
        next(error);
    }
};
const getHabitationById = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid habitation id." });
        }
        const data = await Habitation.findById(req.params.id).populate("risk.assessment").lean();
        if (!data) return res.status(404).json({ success: false, message: "Habitation not found." });
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};
const createHabitation = async (req, res, next) => {
    try {
        const validationError = validatePayload(req.body, true);
        if (validationError) return res.status(400).json({ success: false, message: validationError });
        const fields = ["name", "district", "state", "location", "population", "vulnerableGroups", "exposure", "primaryAccessRoad"];
        const payload = Object.fromEntries(Object.entries(req.body).filter(([key]) => fields.includes(key)));
        const data = await Habitation.create({ ...payload, createdBy: req.user.userId, updatedBy: req.user.userId });
        res.status(201).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};
const updateHabitation = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid habitation id." });
        }
        const validationError = validatePayload(req.body, false);
        if (validationError) return res.status(400).json({ success: false, message: validationError });
        if (req.body.population !== undefined || req.body.vulnerableGroups !== undefined) {
            const current = await Habitation.findById(req.params.id).lean();
            if (!current) return res.status(404).json({ success: false, message: "Habitation not found." });
            const population = Number(req.body.population ?? current.population);
            const groups = { ...(current.vulnerableGroups || {}), ...(req.body.vulnerableGroups || {}) };
            const counts = Object.values(groups);
            if (counts.length > 0 && counts.every((count) => isNonNegativeNumber(count))
                && counts.reduce((sum, count) => sum + Number(count), 0) > population) {
                return res.status(400).json({ success: false, message: "Vulnerable group counts cannot exceed the recorded population." });
            }
        }
        const allowed = ["name", "district", "state", "location", "population", "vulnerableGroups", "exposure", "relocationStatus", "primaryAccessRoad", "active"];
        const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
        updates.updatedBy = req.user.userId;
        const data = await Habitation.findByIdAndUpdate(req.params.id, updates, { returnDocument: "after", runValidators: true });
        if (!data) return res.status(404).json({ success: false, message: "Habitation not found." });
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};
const getRedZones = async (req, res, next) => {
    try {
        const data = await Habitation.find({
            active: true,
            "risk.level": { $in: ["YELLOW", "ORANGE", "RED"] }
        }).sort({ "risk.score": -1 }).lean();
        res.json({ success: true, count: data.length, data });
    } catch (error) {
        next(error);
    }
};
const getRedZoneById = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid zone id." });
        }
        const habitation = await Habitation.findById(req.params.id).lean();
        if (!habitation) return res.status(404).json({ success: false, message: "Red zone not found." });
        const assessment = habitation.risk.assessment
            ? await RiskAssessment.findById(habitation.risk.assessment).lean()
            : null;
        res.json({ success: true, data: { habitation, assessment } });
    } catch (error) {
        next(error);
    }
};
const recalculateRedZone = async (req, res, next) => {
    try {
        const id = req.body.habitationId;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "A valid habitationId is required." });
        }
        const habitation = await Habitation.findById(id);
        if (!habitation) return res.status(404).json({ success: false, message: "Habitation not found." });
        const data = await assessHabitation(habitation, req.user.userId);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};
module.exports = {
    createHabitation,
    getHabitations,
    getHabitationById,
    updateHabitation,
    getRedZones,
    getRedZoneById,
    recalculateRedZone,
    validPoint
};
