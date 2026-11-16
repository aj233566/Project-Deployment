const mongoose = require("mongoose");
const Incident = require("../models/incident");
const Habitation = require("../models/habitation");
const RelocationSite = require("../models/relocation_site");
const { assessRelocationPriority } = require("../risk-intelligence/services/relocationPriorityEngine");
const EmergencyDispatchModel = require(
    "../models/emergency_dispatch"
);
const Resource = require("../models/resource");
const { calculateResourceStatus } = require("../services/resource_status");
const severityScore = {
    low: 25,
    moderate: 50,
    high: 75,
    critical: 95
};
const getRiskLevel = (severity) => {
    switch (severity) {
        case "critical":
            return "Critical";
        case "high":
            return "High";
        case "moderate":
            return "Moderate";
        case "low":
        default:
            return "Low";
    }
};
const getTypeWeight = (type) => {
    switch (type) {
        case "flash_flood":
            return 8;
        case "slope_movement":
            return 7;
        case "landslide":
            return 6;
        case "road_blockage":
            return 5;
        case "slope_crack":
            return 4;
        case "infrastructure_damage":
            return 3;
        default:
            return 0;
    }
};
const calculateRiskScore = (incident) => {
    const base =
        severityScore[incident.severity] || 50;
    const typeWeight =
        getTypeWeight(incident.type);
    const statusWeight =
        incident.status === "verified" ? 5 : 0;
    const score = Math.min(
        100,
        base + typeWeight + statusWeight
    );
    return score;
};
const calculatePriority = (
    riskScore,
    severity,
    nearbyIncidentCount
) => {
    if (
        severity === "critical" ||
        riskScore >= 85 ||
        (
            riskScore >= 75 &&
            nearbyIncidentCount >= 2
        )
    ) {
        return 1;
    }
    if (
        severity === "high" ||
        riskScore >= 55 ||
        (
            riskScore >= 45 &&
            nearbyIncidentCount >= 2
        )
    ) {
        return 2;
    }
    return 3;
};
const calculateDistanceKm = (
    lat1,
    lon1,
    lat2,
    lon2
) => {
    const earthRadius = 6371;
    const dLat =
        ((lat2 - lat1) * Math.PI) / 180;
    const dLon =
        ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) *
        Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );
    return earthRadius * c;
};
const getNearbyIncidentCount = (
    incident,
    allIncidents
) => {
    const latitude =
        incident.location?.latitude;
    const longitude =
        incident.location?.longitude;
    if (
        typeof latitude !== "number" ||
        typeof longitude !== "number"
    ) {
        return 0;
    }
    const radiusKm = 10;
    return allIncidents.filter((other) => {
        if (
            String(other._id) ===
            String(incident._id)
        ) {
            return false;
        }
        if (
            !other.location ||
            typeof other.location.latitude !==
            "number" ||
            typeof other.location.longitude !==
            "number"
        ) {
            return false;
        }
        const distance =
            calculateDistanceKm(
                latitude,
                longitude,
                other.location.latitude,
                other.location.longitude
            );
        return distance <= radiusKm;
    }).length;
};
const getResponseStatus = (
    incident,
    dispatch
) => {
    if (incident.status === "resolved") {
        return "Resolved";
    }
    if (dispatch) {
        switch (dispatch.status) {
            case "en_route":
                return "Dispatching";
            case "arrived":
                return "Under Response";
            case "completed":
                return "Resolved";
            case "cancelled":
                return "Awaiting Dispatch";
            case "dispatched":
            default:
                return "Dispatching";
        }
    }
    if (incident.status === "in_progress") {
        return "Under Response";
    }
    return "Awaiting Dispatch";
};
const formatEmergencyArea = (
    incident,
    nearbyIncidentCount,
    dispatch,
    relocationDecision = null
) => {
    const riskScore =
        calculateRiskScore(incident);
    const priority =
        calculatePriority(
            riskScore,
            incident.severity,
            nearbyIncidentCount
        );
    const risk =
        getRiskLevel(incident.severity);
    let roadStatus = "Unknown";
    if (
        incident.type === "road_blockage"
    ) {
        roadStatus = "Blocked";
    }
    const responseStatus =
        getResponseStatus(
            incident,
            dispatch
        );
    let location = "Unknown location";
    if (
        incident.location?.address &&
        incident.location.address.trim()
    ) {
        location =
            incident.location.address.trim();
    } else if (
        typeof incident.location?.latitude ===
        "number" &&
        typeof incident.location?.longitude ===
        "number"
    ) {
        location =
            `${incident.location.latitude.toFixed(4)}, ` +
            `${incident.location.longitude.toFixed(4)}`;
    }
    return {
        id: incident._id,
        _id: incident._id,
        incidentId: incident._id,
        location,
        address:
            incident.location?.address ||
            "",
        latitude:
            incident.location?.latitude,
        longitude:
            incident.location?.longitude,
        type:
            incident.type,
        description:
            incident.description,
        severity:
            incident.severity,
        riskScore,
        risk,
        riskLevel: risk,
        priority,
        priorityRank: priority,
        priorityQueue:
            `Priority ${priority}`,
        priorityLabel:
            `Priority ${priority}`,
        affectedPopulation: relocationDecision?.population ?? null,
        vulnerablePopulation: relocationDecision?.vulnerablePopulation ?? null,
        linkedHabitation: relocationDecision ? {
            id: relocationDecision.habitationId,
            name: relocationDecision.habitationName,
            riskScore: relocationDecision.score,
            riskLevel: relocationDecision.redZone,
            relocationStatus: relocationDecision.relocationStatus
        } : null,
        relocationDecision: relocationDecision ? {
            priority: relocationDecision.priority,
            capacityGap: relocationDecision.capacityGap,
            candidates: relocationDecision.candidates
        } : null,
        roadStatus,
        roadDetails:
            roadStatus === "Blocked"
                ? "Road blockage reported"
                : "Road access is not assessed by this incident record",
        nearestHospital: null,
        nearestShelter: null,
        availableResources: null,
        requiredResources: null,
        nearbyIncidentCount,
        responseStatus,
        assignedTeam:
            dispatch?.unitName || "",
        dispatchId: dispatch?._id || null,
        dispatchStatus: dispatch?.status || null,
        assignedUnits:
            dispatch ? 1 : 0,
        incidentStatus:
            incident.status,
        reportedBy:
            incident.reportedBy,
        reportedAt:
            incident.createdAt,
        lastUpdated:
            incident.updatedAt
    };
};
const getPrioritisedAreas = async (
    req,
    res
) => {
    try {
        const incidents =
            await Incident.find({
                status: {
                    $ne: "resolved"
                }
            })
                .sort({
                    createdAt: -1
                })
                .lean();
        const canIncludeSentryDecision = req.user?.role === "admin"
            || (req.user?.role === "authority" && req.user?.authorityStatus === "verified");
        const linkedHabitationIds = canIncludeSentryDecision ? [...new Set(
            incidents
                .map((incident) => incident.linkedHabitation)
                .filter(Boolean)
                .map(String)
        )] : [];
        const [linkedHabitations, activeSites] = linkedHabitationIds.length > 0
            ? await Promise.all([
                Habitation.find({ _id: { $in: linkedHabitationIds }, active: true }).lean(),
                RelocationSite.find({ status: "ACTIVE" }).lean()
            ])
            : [[], []];
        const habitationById = new Map(linkedHabitations.map((habitation) => [
            String(habitation._id),
            habitation
        ]));
        const incidentIds =
            incidents.map(
                (incident) => incident._id
            );
        const dispatches =
            incidentIds.length > 0
                ? await EmergencyDispatchModel.find({
                    incidentId: {
                        $in: incidentIds
                    },
                    status: {
                        $nin: [
                            "completed",
                            "cancelled"
                        ]
                    }
                })
                    .sort({
                        createdAt: -1
                    })
                    .lean()
                : [];
        const dispatchMap = new Map();
        dispatches.forEach((dispatch) => {
            const key =
                String(dispatch.incidentId);
            if (!dispatchMap.has(key)) {
                dispatchMap.set(
                    key,
                    dispatch
                );
            }
        });
        const emergencyAreas =
            incidents.map((incident) => {
                const nearbyCount =
                    getNearbyIncidentCount(
                        incident,
                        incidents
                    );
                const dispatch =
                    dispatchMap.get(
                        String(incident._id)
                    );
                const habitation = incident.linkedHabitation
                    ? habitationById.get(String(incident.linkedHabitation))
                    : null;
                const relocationDecision = habitation
                    ? {
                        ...assessRelocationPriority(habitation, activeSites),
                        habitationName: habitation.name,
                        relocationStatus: habitation.relocationStatus
                    }
                    : null;
                return formatEmergencyArea(
                    incident,
                    nearbyCount,
                    dispatch,
                    relocationDecision
                );
            });
        emergencyAreas.sort(
            (a, b) => {
                if (
                    a.priority !==
                    b.priority
                ) {
                    return (
                        a.priority -
                        b.priority
                    );
                }
                if (
                    a.riskScore !==
                    b.riskScore
                ) {
                    return (
                        b.riskScore -
                        a.riskScore
                    );
                }
                return (
                    b.nearbyIncidentCount -
                    a.nearbyIncidentCount
                );
            }
        );
        // The queue number (1, 2, 3) stays in `priority`; the rank is the place in this sorted list, so the cards read #1, #2, #3 ...
        emergencyAreas.forEach((area, index) => {
            area.priorityRank = index + 1;
        });
        res.status(200).json({
            success: true,
            count:
                emergencyAreas.length,
            data:
                emergencyAreas
        });
    } catch (error) {
        console.error(
            "Emergency priority error:",
            error
        );
        res.status(500).json({
            success: false,
            message:
                "Failed to calculate emergency priority."
        });
    }
};
const getPrioritisedAreaById =
    async (req, res) => {
        try {
            if (
                !mongoose.Types.ObjectId.isValid(
                    req.params.id
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid incident ID."
                });
            }
            const incident =
                await Incident.findById(
                    req.params.id
                ).lean();
            if (!incident) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Incident not found."
                });
            }
            const activeIncidents =
                await Incident.find({
                    status: {
                        $ne: "resolved"
                    }
                }).lean();
            const nearbyCount =
                getNearbyIncidentCount(
                    incident,
                    activeIncidents
                );
            const dispatch =
                await EmergencyDispatchModel.findOne({
                    incidentId:
                        incident._id,
                    status: {
                        $nin: [
                            "completed",
                            "cancelled"
                        ]
                    }
                })
                    .sort({
                        createdAt: -1
                    })
                    .lean();
            const area =
                formatEmergencyArea(
                    incident,
                    nearbyCount,
                    dispatch
                );
            res.status(200).json({
                success: true,
                data: area
            });
        } catch (error) {
            console.error(
                "Emergency area fetch error:",
                error
            );
            res.status(500).json({
                success: false,
                message:
                    "Failed to fetch emergency area."
            });
        }
    };
const ACTIVE_DISPATCH_STATUSES = ["dispatched", "en_route", "arrived"];
const findResourceForDispatch = async (unitName) => {
    const escapedName = unitName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return Resource.findOne({ name: { $regex: `^${escapedName}$`, $options: "i" } });
};
const reserveResourceUnit = async (resourceId) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
        const resource = await Resource.findById(resourceId).lean();
        if (!resource || !(resource.available > 0)) return false;
        const filter = { _id: resource._id, available: resource.available };
        let update;
        const deployed = Number.isFinite(resource.deployed) ? resource.deployed : 0;
        if (Number.isFinite(resource.deployed)) {
            filter.deployed = resource.deployed;
            update = { $inc: { available: -1, deployed: 1 } };
        } else {
            filter.$or = [{ deployed: null }, { deployed: { $exists: false } }];
            update = { $inc: { available: -1 }, $set: { deployed: 1 } };
        }
        const updated = await Resource.findOneAndUpdate(filter, update, { returnDocument: "after" });
        if (updated) {
            const nextAvailable = resource.available - 1;
            const nextDeployed = deployed + 1;
            await Resource.updateOne(
                { _id: resource._id, available: nextAvailable, deployed: nextDeployed },
                { $set: { status: calculateResourceStatus(resource.total, nextAvailable, nextDeployed) } }
            );
            return true;
        }
    }
    return false;
};
const releaseResourceUnit = async (dispatch) => {
    const resource = dispatch.resourceRef
        ? await Resource.findById(dispatch.resourceRef)
        : await findResourceForDispatch(dispatch.unitName);
    if (!resource) return;
    const total = Number(resource.total);
    const reserved = Number.isFinite(resource.reserved) ? resource.reserved : 0;
    const deployed = Number.isFinite(resource.deployed) ? resource.deployed : null;
    const available = Math.min(total - reserved, Number(resource.available) + 1);
    const remainingDeployed = deployed === null ? 0 : Math.max(0, deployed - 1);
    await Resource.updateOne({ _id: resource._id }, {
        $set: {
            available,
            deployed: remainingDeployed,
            status: calculateResourceStatus(total, available, remainingDeployed)
        }
    });
};
const completeDispatch = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid incident ID." });
        }
        const activeDispatch = await EmergencyDispatchModel.findOne({
            incidentId: req.params.id,
            status: { $in: ACTIVE_DISPATCH_STATUSES }
        }).sort({ createdAt: -1 }).lean();
        if (!activeDispatch) {
            return res.status(404).json({ success: false, message: "No active resource task was found for this incident." });
        }
        const completed = await EmergencyDispatchModel.findOneAndUpdate(
            { _id: activeDispatch._id, status: { $in: ACTIVE_DISPATCH_STATUSES } },
            { $set: { status: "completed" } },
            { returnDocument: "after" }
        );
        if (!completed) {
            return res.status(409).json({ success: false, message: "This resource task was already updated." });
        }
        try {
            await releaseResourceUnit(completed);
        } catch (error) {
            await EmergencyDispatchModel.updateOne(
                { _id: completed._id, status: "completed" },
                { $set: { status: activeDispatch.status } }
            );
            throw error;
        }
        await Incident.updateOne({ _id: req.params.id }, { $set: { status: "resolved" } });
        return res.status(200).json({
            success: true,
            message: "Task marked complete and the resource returned to available inventory.",
            data: { dispatchId: completed._id, status: completed.status }
        });
    } catch (error) {
        console.error("Emergency dispatch completion error:", error);
        return res.status(500).json({ success: false, message: "Failed to complete emergency task." });
    }
};
const createManagedEmergencyArea = async (req, res) => {
    try {
        const { type, severity, description, latitude, longitude, address = "" } = req.body;
        const lat = Number(latitude);
        const lng = Number(longitude);
        if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
            return res.status(400).json({ success: false, message: "Enter valid latitude and longitude." });
        }
        const incident = await Incident.create({
            type, severity, description: String(description || "").trim(),
            location: { latitude: lat, longitude: lng, address: String(address).trim() },
            status: "verified", reportedBy: String(req.user.userId)
        });
        return res.status(201).json({ success: true, data: incident });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message || "Unable to create emergency area." });
    }
};
const updateManagedEmergencyArea = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: "Invalid incident ID." });
        const { type, severity, description, latitude, longitude, address } = req.body;
        const lat = Number(latitude);
        const lng = Number(longitude);
        if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
            return res.status(400).json({ success: false, message: "Enter valid latitude and longitude." });
        }
        const incident = await Incident.findOneAndUpdate(
            { _id: req.params.id, status: { $ne: "resolved" } },
            { $set: { type, severity, description: String(description || "").trim(), location: { latitude: lat, longitude: lng, address: String(address || "").trim() } } },
            { new: true, runValidators: true }
        );
        if (!incident) return res.status(404).json({ success: false, message: "Active emergency area not found." });
        return res.json({ success: true, data: incident });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message || "Unable to update emergency area." });
    }
};
const deleteManagedEmergencyArea = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: "Invalid incident ID." });
        const activeDispatch = await EmergencyDispatchModel.exists({ incidentId: req.params.id, status: { $in: ACTIVE_DISPATCH_STATUSES } });
        if (activeDispatch) return res.status(409).json({ success: false, message: "Mark the assigned task done before deleting this emergency area." });
        const deleted = await Incident.findOneAndDelete({ _id: req.params.id, status: { $ne: "resolved" } });
        if (!deleted) return res.status(404).json({ success: false, message: "Active emergency area not found." });
        return res.json({ success: true, message: "Emergency area deleted." });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Unable to delete emergency area." });
    }
};
const dispatchTeam = async (
    req,
    res
) => {
    try {
        const {
            unitName,
            notes = ""
        } = req.body;
        if (
            !unitName ||
            !unitName.trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Response unit name is required."
            });
        }
        if (
            !mongoose.Types.ObjectId.isValid(
                req.params.id
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid incident ID."
            });
        }
        const incident =
            await Incident.findById(
                req.params.id
            );
        if (!incident) {
            return res.status(404).json({
                success: false,
                message:
                    "Incident not found."
            });
        }
        if (
            incident.status ===
            "resolved"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Cannot dispatch to a resolved incident."
            });
        }
        const activeDispatch = await EmergencyDispatchModel.findOne({
            incidentId: incident._id,
            status: { $nin: ["completed", "cancelled"] }
        }).sort({ createdAt: -1 }).lean();
        if (activeDispatch) {
            return res.status(409).json({
                success: false,
                message: "An active response unit is already assigned to this incident.",
                data: activeDispatch
            });
        }
        const automateInventory = req.user?.role === "authority";
        let resource = null;
        let resourceReserved = false;
        let dispatch;
        try {
            dispatch = await EmergencyDispatchModel.create({
                incidentId:
                    incident._id,
                unitName:
                    unitName.trim(),
                resourceRef: null,
                status:
                    "dispatched",
                notes:
                    typeof notes === "string"
                        ? notes.trim()
                        : ""
            });
        } catch (error) {
            if (error?.code !== 11000) throw error;
            const existingDispatch = await EmergencyDispatchModel.findOne({
                incidentId: incident._id,
                status: { $nin: ["completed", "cancelled"] }
            }).sort({ createdAt: -1 }).lean();
            return res.status(409).json({
                success: false,
                message: "An active response unit is already assigned to this incident.",
                data: existingDispatch
            });
        }
        try {
            if (automateInventory) {
                resource = await findResourceForDispatch(unitName.trim());
                if (resource) {
                    resourceReserved = await reserveResourceUnit(resource._id);
                    if (!resourceReserved) {
                        await EmergencyDispatchModel.deleteOne({ _id: dispatch._id, status: "dispatched" });
                        return res.status(409).json({
                            success: false,
                            message: "This resource has no available units to assign."
                        });
                    }
                    await EmergencyDispatchModel.updateOne(
                        { _id: dispatch._id, status: "dispatched" },
                        { $set: { resourceRef: resource._id } }
                    );
                }
            }
        } catch (error) {
            await EmergencyDispatchModel.deleteOne({ _id: dispatch._id, status: "dispatched" });
            if (resourceReserved && resource) {
                await releaseResourceUnit({ resourceRef: resource._id, unitName: unitName.trim() });
            }
            throw error;
        }
        incident.status =
            "in_progress";
        if (automateInventory) {
          try {
            await incident.save();
          } catch (error) {
            await EmergencyDispatchModel.deleteOne({ _id: dispatch._id, status: "dispatched" });
            if (resourceReserved && resource) await releaseResourceUnit(dispatch);
            throw error;
          }
        } else {
            await incident.save();
        }
        if (!automateInventory) {
            try {
                const legacyResource = await findResourceForDispatch(unitName.trim());
                if (legacyResource && legacyResource.available > 0) {
                    legacyResource.available -= 1;
                    if (Number.isFinite(legacyResource.deployed)) legacyResource.deployed += 1;
                    legacyResource.status = calculateResourceStatus(
                        legacyResource.total,
                        legacyResource.available,
                        legacyResource.deployed
                    );
                    await legacyResource.save();
                }
            } catch (resourceError) {
                console.warn("Resource update skipped:", resourceError.message);
            }
        }
        res.status(201).json({
            success: true,
            message:
                "Emergency response unit dispatched successfully.",
            data: {
                dispatchId:
                    dispatch._id,
                incidentId:
                    incident._id,
                unitName:
                    dispatch.unitName,
                status:
                    dispatch.status,
                incidentStatus:
                    incident.status,
                dispatchedAt:
                    dispatch.dispatchedAt
            }
        });
    } catch (error) {
        console.error(
            "Emergency dispatch error:",
            error
        );
        res.status(500).json({
            success: false,
            message:
                "Failed to dispatch emergency unit.",
            error:
                process.env.NODE_ENV ===
                    "development"
                    ? error.message
                    : undefined
        });
    }
};
module.exports = {
    getPrioritisedAreas,
    getPrioritisedAreaById,
    dispatchTeam,
    completeDispatch,
    createManagedEmergencyArea,
    updateManagedEmergencyArea,
    deleteManagedEmergencyArea,
    formatEmergencyArea
};
