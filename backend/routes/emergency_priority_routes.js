const express = require("express");
const { protect, optionalProtect, authorizeAuthorityOrAdmin } = require("../middlewares/auth_middleware");
const {
    getPrioritisedAreas,
    getPrioritisedAreaById,
    dispatchTeam
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
router.post(
    "/:id/dispatch",
    protect,
    authorizeAuthorityOrAdmin,
    dispatchTeam
);
module.exports = router;