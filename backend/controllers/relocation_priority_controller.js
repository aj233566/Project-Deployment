const mongoose = require("mongoose");
const Habitation = require("../models/habitation");
const RelocationSite = require("../models/relocation_site");
const { assessRelocationPriority, sortPriorities } = require("../risk-intelligence/services/relocationPriorityEngine");
const getRelocationPriorities = async (req, res, next) => {
    try {
        const filter = req.params.habitationId
            ? { _id: req.params.habitationId, active: true }
            : { active: true, "risk.level": { $in: ["YELLOW", "ORANGE", "RED"] } };
        if (req.params.habitationId && !mongoose.isValidObjectId(req.params.habitationId)) {
            return res.status(400).json({ success: false, message: "Invalid habitation id." });
        }
        const [habitations, sites] = await Promise.all([
            Habitation.find(filter).sort({ "risk.score": -1 }).lean(),
            RelocationSite.find({ status: "ACTIVE" }).lean()
        ]);
        if (req.params.habitationId && habitations.length === 0) {
            return res.status(404).json({ success: false, message: "Habitation not found." });
        }
        const data = sortPriorities(habitations.map((habitation) =>
            assessRelocationPriority(habitation, sites)
        ));
        res.json({ success: true, count: data.length, data });
    } catch (error) {
        next(error);
    }
};
module.exports = { getRelocationPriorities };
