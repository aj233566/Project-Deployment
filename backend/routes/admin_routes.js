const express = require("express");
const router = express.Router();
const {
    getAdminStats,
    getPendingAuthorities,
    getAllAuthorities,
    approveAuthority,
    rejectAuthority,
    getOwnSessionLimit,
    getManagedAccounts,
    forceLogoutAccount,
    setManagedAccountStatus,
    setSessionLimit,
    permanentlyDeleteAccount
} = require("../controllers/admin_controller");
const {
    protect,
    authorizeAdmin
} = require("../middlewares/auth_middleware");
router.get(
    "/stats",
    protect,
    authorizeAdmin,
    getAdminStats
);
router.get(
    "/authorities/pending",
    protect,
    authorizeAdmin,
    getPendingAuthorities
);
router.get(
    "/authorities",
    protect,
    authorizeAdmin,
    getAllAuthorities
);
router.get("/accounts", protect, authorizeAdmin, getManagedAccounts);
router.get("/accounts/me/session-limit", protect, authorizeAdmin, getOwnSessionLimit);
router.patch("/accounts/:id/session-limit", protect, authorizeAdmin, setSessionLimit);
router.post("/accounts/:id/force-logout", protect, authorizeAdmin, forceLogoutAccount);
router.patch("/accounts/:id/status", protect, authorizeAdmin, setManagedAccountStatus);
router.delete("/accounts/:id", protect, authorizeAdmin, permanentlyDeleteAccount);
router.patch(
    "/authorities/:id/approve",
    protect,
    authorizeAdmin,
    approveAuthority
);
router.patch(
    "/authorities/:id/reject",
    protect,
    authorizeAdmin,
    rejectAuthority
);
module.exports = router;
