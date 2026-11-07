const express = require("express");
const { protect, authorize, authorizeAuthorityOrAdmin } = require("../middlewares/auth_middleware");
const {
    getRelocationSites,
    getRelocationSiteById,
    createRelocationSite,
    updateRelocationSite
} = require("../controllers/relocation_site_controller");
const router = express.Router();
router.use(protect, authorize("citizen", "authority", "admin"));
router.get("/", getRelocationSites);
router.get("/:id", getRelocationSiteById);
router.post("/", authorizeAuthorityOrAdmin, createRelocationSite);
router.patch("/:id", authorizeAuthorityOrAdmin, updateRelocationSite);
module.exports = router;
