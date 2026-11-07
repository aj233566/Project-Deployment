const express = require("express");
const { protect, authorize, authorizeAuthorityOrAdmin } = require("../middlewares/auth_middleware");
const {
    createHabitation,
    getHabitations,
    getHabitationById,
    updateHabitation
} = require("../controllers/habitation_controller");
const router = express.Router();
router.use(protect, authorize("citizen", "authority", "admin"));
router.get("/", getHabitations);
router.get("/:id", getHabitationById);
router.post("/", authorizeAuthorityOrAdmin, createHabitation);
router.patch("/:id", authorizeAuthorityOrAdmin, updateHabitation);
module.exports = router;
