const mongoose = require("mongoose");
const RelocationSite = require("../models/relocation_site");
const { validPoint } = require("./habitation_controller");
const { calculateCarryingCapacity } = require("../risk-intelligence/services/carrying_capacity_engine");
function isNonNegativeNumber(value) {
    return value !== null
        && value !== undefined
        && value !== ""
        && Number.isFinite(Number(value))
        && Number(value) >= 0;
}
function validatePayload(body, creating) {
    if (creating && (!String(body.name || "").trim()
        || !isNonNegativeNumber(body.totalCapacity)
        || !isNonNegativeNumber(body.occupancy)
        || !isNonNegativeNumber(body.reservedCapacity)
        || !validPoint(body.location))) {
        return "Name, total capacity, occupancy, reserved capacity, and a valid GeoJSON Point are required.";
    }
    if (body.location !== undefined && !validPoint(body.location)) {
        return "Location must be a GeoJSON Point with [longitude, latitude] coordinates.";
    }
    for (const key of ["totalCapacity", "occupancy", "reservedCapacity"]) {
        if (body[key] !== undefined && !isNonNegativeNumber(body[key])) {
            return `${key} must be a non-negative number.`;
        }
    }
    const capacityValuesPresent = ["totalCapacity", "occupancy", "reservedCapacity"].every((key) => body[key] !== undefined && body[key] !== null);
    const total = Number(body.totalCapacity);
    const occupied = Number(body.occupancy);
    const reserved = Number(body.reservedCapacity);
    if (capacityValuesPresent && occupied + reserved > total) {
        return "Occupied and reserved capacity cannot exceed total capacity.";
    }
    if (body.suitability !== undefined && body.suitability !== null
        && (!Number.isFinite(Number(body.suitability)) || Number(body.suitability) < 0 || Number(body.suitability) > 100)) {
        return "Suitability must be between 0 and 100.";
    }
    return null;
}
const getRelocationSites = async (req, res, next) => {
    try {
        const data = await RelocationSite.find(req.query.active === "false" ? {} : { status: "ACTIVE" })
            .populate("linkedResources", "name category status")
            .sort({ name: 1 })
            .lean();
        res.json({
            success: true,
            count: data.length,
            data: data.map((site) => ({
                ...site,
                capacity: calculateCarryingCapacity(site)
            }))
        });
    } catch (error) {
        next(error);
    }
};
const getRelocationSiteById = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid relocation-site id." });
        }
        const site = await RelocationSite.findById(req.params.id)
            .populate("linkedResources", "name category status")
            .lean();
        if (!site) return res.status(404).json({ success: false, message: "Relocation site not found." });
        res.json({ success: true, data: { ...site, capacity: calculateCarryingCapacity(site) } });
    } catch (error) {
        next(error);
    }
};
const createRelocationSite = async (req, res, next) => {
    try {
        const validationError = validatePayload(req.body, true);
        if (validationError) return res.status(400).json({ success: false, message: validationError });
        const fields = ["name", "district", "state", "location", "totalCapacity", "occupancy", "reservedCapacity", "facilities", "roadAccess", "hazardExposure", "suitability", "status", "linkedResources"];
        const payload = Object.fromEntries(Object.entries(req.body).filter(([key]) => fields.includes(key)));
        const data = await RelocationSite.create({ ...payload, createdBy: req.user.userId, updatedBy: req.user.userId });
        res.status(201).json({ success: true, data: { ...data.toObject(), capacity: calculateCarryingCapacity(data) } });
    } catch (error) {
        next(error);
    }
};
const updateRelocationSite = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid relocation-site id." });
        }
        const current = await RelocationSite.findById(req.params.id);
        if (!current) return res.status(404).json({ success: false, message: "Relocation site not found." });
        const validationError = validatePayload({
            totalCapacity: req.body.totalCapacity ?? current.totalCapacity,
            occupancy: req.body.occupancy ?? current.occupancy,
            reservedCapacity: req.body.reservedCapacity ?? current.reservedCapacity,
            suitability: req.body.suitability
        }, false);
        if (validationError) return res.status(400).json({ success: false, message: validationError });
        const allowed = ["name", "district", "state", "location", "totalCapacity", "occupancy", "reservedCapacity", "facilities", "roadAccess", "hazardExposure", "suitability", "status", "linkedResources"];
        const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
        updates.updatedBy = req.user.userId;
        const site = await RelocationSite.findByIdAndUpdate(req.params.id, updates, { returnDocument: "after", runValidators: true });
        if (!site) return res.status(404).json({ success: false, message: "Relocation site not found." });
        res.json({ success: true, data: { ...site.toObject(), capacity: calculateCarryingCapacity(site) } });
    } catch (error) {
        next(error);
    }
};
module.exports = { getRelocationSites, getRelocationSiteById, createRelocationSite, updateRelocationSite };
