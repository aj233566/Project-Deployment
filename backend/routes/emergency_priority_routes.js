const express = require("express");
const { protect, optionalProtect, authorizeAuthorityOrAdmin, authorizeVerifiedAuthority } = require("../middlewares/auth_middleware");
const {
    getPrioritisedAreas,
    getPrioritisedAreaById,
    dispatchTeam,
    completeDispatch,
    createManagedEmergencyArea,
    updateManagedEmergencyArea,
    deleteManagedEmergencyArea
} = require(
    "../controllers/emergency_priority_controller"
);
const router = express.Router();
router.get(
    "/",
    optionalProtect,
    getPrioritisedAreas
);
router.get(
    "/:id",
    optionalProtect,
    getPrioritisedAreaById
);
router.post("/managed", protect, authorizeVerifiedAuthority, createManagedEmergencyArea);
router.patch("/:id/managed", protect, authorizeVerifiedAuthority, updateManagedEmergencyArea);
router.delete("/:id/managed", protect, authorizeVerifiedAuthority, deleteManagedEmergencyArea);
router.post(
    "/:id/dispatch",
    protect,
    authorizeAuthorityOrAdmin,
    dispatchTeam
);
router.patch(
    "/:id/dispatch/complete",
    protect,
    authorizeVerifiedAuthority,
    completeDispatch
);
module.exports = router;
