const express = require("express");
const {
    getResources,
    getResourceById,
    createResource,
    updateResource
} = require(
    "../controllers/resource_controller"
);
const { protect, authorize, authorizeAuthorityOrAdmin } = require("../middlewares/auth_middleware");
const router = express.Router();
// Everything here needs a signed-in account. Reading is open to every role; creating and changing resources is for authority and admin
// accounts only (before, anyone on the network could do all four without signing in).
router.use(protect);
router.get(
    "/",
    authorize("citizen", "authority", "admin"),
    getResources
);
router.get(
    "/:id",
    authorize("citizen", "authority", "admin"),
    getResourceById
);
router.post(
    "/",
    authorizeAuthorityOrAdmin,
    createResource
);
router.patch(
    "/:id",
    authorizeAuthorityOrAdmin,
    updateResource
);
module.exports = router;
