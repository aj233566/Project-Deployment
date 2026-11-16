const Resource = require("../models/resource");
const EmergencyDispatch = require("../models/emergency_dispatch");
const { calculateResourceStatus } = require("../services/resource_status");
const formatResource = (resource) => {
    const quantity = (value) => {
        if (value === null || value === undefined || value === "") return null;
        const number = Number(value);
        return Number.isFinite(number) && number >= 0 ? number : null;
    };
    const total = quantity(resource.total);
    const available = quantity(resource.available);
    const deployed = quantity(resource.deployed);
    const reserved = quantity(resource.reserved);
    const percentage = total !== null && total > 0 && available !== null
        ? Math.round((available / total) * 100)
        : null;
    return {
        id: resource._id,
        _id: resource._id,
        resourceId:
            resource.resourceId,
        name:
            resource.name,
        category:
            resource.category,
        description:
            resource.description,
        total,
        available,
        deployed,
        reserved,
        totalUnits:
            total,
        availableUnits:
            available,
        deployedUnits:
            deployed,
        percentage,
        status:
            resource.status,
        location:
            resource.location,
        updatedBy:
            resource.updatedBy,
        createdAt:
            resource.createdAt,
        updatedAt:
            resource.updatedAt
    };
};
const getResources = async (
    req,
    res
) => {
    try {
        const resources =
            await Resource.find({})
                .sort({
                    category: 1,
                    name: 1
                })
                .lean();
        const data =
            resources.map(
                formatResource
            );
        res.status(200).json({
            success: true,
            count:
                data.length,
            data
        });
    } catch (error) {
        console.error(
            "Resource fetch error:",
            error
        );
        res.status(500).json({
            success: false,
            message:
                "Failed to fetch resources."
        });
    }
};
const getResourceById =
    async (req, res) => {
        try {
            const resource =
                await Resource.findById(
                    req.params.id
                ).lean();
            if (!resource) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Resource not found."
                });
            }
            res.status(200).json({
                success: true,
                data:
                    formatResource(
                        resource
                    )
            });
        } catch (error) {
            console.error(
                "Resource fetch error:",
                error
            );
            res.status(500).json({
                success: false,
                message:
                    "Failed to fetch resource."
            });
        }
    };
const createResource = async (
    req,
    res
) => {
    try {
        const {
            resourceId,
            name,
            category,
            description = "",
            total,
            available,
            deployed,
            reserved,
            location = "",
            updatedBy = "system"
        } = req.body;
        if (
            !name ||
            !name.trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Resource name is required."
            });
        }
        if (
            !category ||
            !category.trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Resource category is required."
            });
        }
        let recordedAvailable = available;
        if (req.user?.role === "authority") {
            const calculatedAvailable = Number(total) - Number(deployed || 0) - Number(reserved || 0);
            if (!Number.isFinite(calculatedAvailable) || calculatedAvailable < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Total units must cover deployed and reserved units."
                });
            }
            recordedAvailable = calculatedAvailable;
        }
        const invalidRequiredQuantity = ["total", "available"].find((key) => {
            const value = key === "available" ? recordedAvailable : req.body[key];
            return value === null
                || value === undefined
                || value === ""
                || !Number.isFinite(Number(value))
                || Number(value) < 0;
        });
        if (invalidRequiredQuantity) {
            return res.status(400).json({
                success: false,
                message: `A recorded non-negative ${invalidRequiredQuantity} quantity is required.`
            });
        }
        const invalidOptionalQuantity = ["deployed", "reserved"].find((key) => {
            const value = req.body[key];
            return value !== null
                && value !== undefined
                && value !== ""
                && (!Number.isFinite(Number(value)) || Number(value) < 0);
        });
        if (invalidOptionalQuantity) {
            return res.status(400).json({
                success: false,
                message: `${invalidOptionalQuantity} must be a non-negative number when supplied.`
            });
        }
        if (
            Number(recordedAvailable) > Number(total)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Available resources cannot exceed the recorded total."
            });
        }
        const resource =
            await Resource.create({
                resourceId,
                name:
                    name.trim(),
                category:
                    category.trim(),
                description,
                total,
                available: recordedAvailable,
                deployed,
                reserved,
                location,
                updatedBy,
                status:
                    calculateResourceStatus(
                        total,
                        recordedAvailable,
                        deployed
                    )
            });
        res.status(201).json({
            success: true,
            message:
                "Resource created successfully.",
            data:
                formatResource(
                    resource.toObject()
                )
        });
    } catch (error) {
        console.error(
            "Resource creation error:",
            error
        );
        if (req.user?.role === "authority" && error?.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "That resource ID is already registered."
            });
        }
        res.status(500).json({
            success: false,
            message:
                "Failed to create resource."
        });
    }
};
const updateResource = async (
    req,
    res
) => {
    try {
        const allowedFields = [
            "name",
            "category",
            "description",
            "total",
            "available",
            "deployed",
            "reserved",
            "location",
            "updatedBy"
        ];
        const updates = {};
        allowedFields.forEach(
            (field) => {
                if (
                    req.body[field] !==
                    undefined
                ) {
                    updates[field] =
                        req.body[field];
                }
            }
        );
        const current =
            await Resource.findById(
                req.params.id
            );
        if (!current) {
            return res.status(404).json({
                success: false,
                message:
                    "Resource not found."
            });
        }
        if (req.user?.role === "authority" && updates.name && updates.name.trim().toLowerCase() !== current.name.toLowerCase()) {
            const escapedCurrentName = String(current.name || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const activeAssignment = await EmergencyDispatch.findOne({
                status: { $in: ["dispatched", "en_route", "arrived"] },
                $or: [
                    { resourceRef: current._id },
                    { unitName: { $regex: `^${escapedCurrentName}$`, $options: "i" } }
                ]
            }).lean();
            if (activeAssignment) {
                return res.status(409).json({
                    success: false,
                    message: "Complete the active resource task before changing this resource name."
                });
            }
        }
        const total = updates.total ?? current.total;
        const deployed = updates.deployed ?? current.deployed ?? 0;
        const reserved = updates.reserved ?? current.reserved ?? 0;
        const recalculatesAvailability = req.user?.role === "authority"
            && ["total", "deployed", "reserved", "available"].some((key) => updates[key] !== undefined);
        if (recalculatesAvailability) {
            const calculatedAvailable = Number(total) - Number(deployed || 0) - Number(reserved || 0);
            if (calculatedAvailable < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Total units must cover deployed and reserved units."
                });
            }
            updates.available = calculatedAvailable;
        }
        const available = updates.available ?? current.available;
        const quantities = { total, available, deployed, reserved };
        const invalidRequiredQuantity = ["total", "available"].find((key) =>
            quantities[key] === null
            || quantities[key] === undefined
            || quantities[key] === ""
            || !Number.isFinite(Number(quantities[key]))
            || Number(quantities[key]) < 0
        );
        if (invalidRequiredQuantity) {
            return res.status(400).json({
                success: false,
                message:
                    "Total and available quantities must be recorded non-negative numbers."
            });
        }
        const invalidOptionalQuantity = ["deployed", "reserved"].find((key) =>
            quantities[key] !== null
            && quantities[key] !== undefined
            && quantities[key] !== ""
            && (!Number.isFinite(Number(quantities[key])) || Number(quantities[key]) < 0)
        );
        if (invalidOptionalQuantity) {
            return res.status(400).json({
                success: false,
                message:
                    `${invalidOptionalQuantity} must be a non-negative number when supplied.`
            });
        }
        if (
            Number(available) > Number(total)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Available resources cannot exceed the recorded total."
            });
        }
        updates.status =
            calculateResourceStatus(
                total,
                available,
                deployed
            );
        const resource =
            await Resource.findByIdAndUpdate(
                req.params.id,
                updates,
                {
                    returnDocument: "after",
                    runValidators: true
                }
            ).lean();
        res.status(200).json({
            success: true,
            message:
                "Resource updated successfully.",
            data:
                formatResource(
                    resource
                )
        });
    } catch (error) {
        console.error(
            "Resource update error:",
            error
        );
        res.status(500).json({
            success: false,
            message:
                "Failed to update resource."
        });
    }
};
const deleteResource = async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);
        if (!resource) {
            return res.status(404).json({ success: false, message: "Resource not found." });
        }
        const escapedName = String(resource.name || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const activeAssignment = await EmergencyDispatch.findOne({
            status: { $in: ["dispatched", "en_route", "arrived"] },
            $or: [
                { resourceRef: resource._id },
                { unitName: { $regex: `^${escapedName}$`, $options: "i" } }
            ]
        }).lean();
        if (activeAssignment) {
            return res.status(409).json({
                success: false,
                message: "This resource has an active assignment. Mark the task done before deleting it."
            });
        }
        await Resource.deleteOne({ _id: resource._id });
        return res.status(200).json({ success: true, message: "Resource deleted successfully." });
    } catch (error) {
        console.error("Resource deletion error:", error);
        return res.status(500).json({ success: false, message: "Failed to delete resource." });
    }
};
module.exports = {
    getResources,
    getResourceById,
    createResource,
    updateResource,
    deleteResource
};
