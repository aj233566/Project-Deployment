const jwt = require("jsonwebtoken");
const User = require("../models/user");
const invalidSession = (res) => res.status(401).json({
    success: false,
    code: "SESSION_INVALID",
    message: "This login session is no longer active. Please sign in again."
});
const authenticateToken = async (token, req, res) => {
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
        return false;
    }
    if (
        !decoded ||
        typeof decoded.userId !== "string" ||
        decoded.userId.length === 0 ||
        typeof decoded.sessionId !== "string" ||
        decoded.sessionId.length === 0
    ) {
        invalidSession(res);
        return false;
    }
    let user;
    try {
        user = await User.findById(decoded.userId);
    } catch (error) {
        if (error?.name === "CastError" || error?.name === "BSONError") {
            invalidSession(res);
        } else {
            console.error("Authentication database error:", error.message);
            res.status(500).json({
                success: false,
                message: "Unable to validate authentication session."
            });
        }
        return false;
    }
    if (!user || String(user.activeSessionId || "") !== decoded.sessionId) {
        invalidSession(res);
        return false;
    }
    if (user.accountStatus && user.accountStatus !== "active") {
        res.status(403).json({
            success: false,
            code: `ACCOUNT_${user.accountStatus.toUpperCase()}`,
            message: "This account is no longer active."
        });
        return false;
    }
    req.user = decoded;
    return true;
};
const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Authentication required"
        });
    }
    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Authentication required"
        });
    }
    try {
        if (await authenticateToken(token, req, res)) return next();
    } catch (error) {
        console.error("Authentication middleware error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to validate authentication session."
        });
    }
};
const optionalProtect = async (req, res, next) => {
    const authHeader = req.headers?.authorization;
    if (!authHeader) return next();
    if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Invalid authorization header"
        });
    }
    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Invalid authorization header"
        });
    }
    try {
        if (await authenticateToken(token, req, res)) return next();
    } catch (error) {
        console.error("Optional authentication middleware error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to validate authentication session."
        });
    }
};
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }
        next();
    };
};
const authorizeAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Admin access required",
        });
    }
    next();
};
const authorizeVerifiedAuthority = (req, res, next) => {
    if (!req.user || req.user.role !== "authority") {
        return res.status(403).json({
            success: false,
            message: "Authority access required."
        });
    }
    if (req.user.authorityStatus !== "verified") {
        return res.status(403).json({
            success: false,
            message: "Your authority account has not been approved."
        });
    }
    next();
};
const authorizeAuthorityOrAdmin = (req, res, next) => {
    if (req.user?.role === "admin") {
        return next();
    }
    if (req.user?.role === "authority" && req.user.authorityStatus === "verified") {
        return next();
    }
    return res.status(403).json({
        success: false,
        message: "Verified authority or admin access required."
    });
};
module.exports = {
    protect,
    optionalProtect,
    authorize,
    authorizeAdmin,
    authorizeVerifiedAuthority,
    authorizeAuthorityOrAdmin
};
