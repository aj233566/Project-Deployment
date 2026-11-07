const express = require("express");
const {
    signup,
    login,
    oauthLogin,
    logout,
    resetPasswordPrototype
} = require("../controllers/auth_controller");
const { protect } = require("../middlewares/auth_middleware");
const router = express.Router();
router.post("/signup", signup);
router.post("/login", login);
router.post("/oauth", oauthLogin);
router.post("/logout", protect, logout);
router.post("/reset-password-prototype", resetPasswordPrototype);
module.exports = router;
