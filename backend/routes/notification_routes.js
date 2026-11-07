const express = require("express");
const {
    getNotifications,
    markAsRead,
    markAllAsRead,
    sendBroadcast,
} = require("../controllers/notification_controller");
const { protect, authorize, authorizeAuthorityOrAdmin } = require("../middlewares/auth_middleware");
const router = express.Router();
// Every route needs a signed-in account. Before, anyone could read the notifications, send a broadcast to all citizens and mark
// everything as read without signing in. Only authority and admin accounts may broadcast.
router.use(protect);
router.get("/", authorize("citizen", "authority", "admin"), getNotifications);
router.post("/broadcast", authorizeAuthorityOrAdmin, sendBroadcast);
router.patch("/:id/read", authorize("citizen", "authority", "admin"), markAsRead);
router.patch("/read-all", authorize("citizen", "authority", "admin"), markAllAsRead);
module.exports = router;
