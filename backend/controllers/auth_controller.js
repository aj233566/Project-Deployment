const { checkPrototypeReset } = require("../services/passwordResetPolicy");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/user");
const { verifyIdentityToken } = require("../services/oauth_identity");
const accountStatusMessage = (status) => ({
    locked: "This account is locked after too many incorrect passwords. Contact an administrator to unlock it.",
    blocked: "This account is locked. Contact an administrator to unlock it.",
    banned: "This account is banned and cannot sign in.",
    deleted: "This account is no longer available."
}[status] || "This account cannot sign in.");

const recordFailedPasswordAttempt = async (userId) => {
    const activeStatus = {
        $or: [
            { accountStatus: "active" },
            { accountStatus: { $exists: false } }
        ]
    };
    const incremented = await User.findOneAndUpdate(
        {
            _id: userId,
            $and: [
                activeStatus,
                {
                    $or: [
                        { failedLoginAttempts: { $lt: 4 } },
                        { failedLoginAttempts: { $exists: false } }
                    ]
                }
            ]
        },
        { $inc: { failedLoginAttempts: 1 } },
        { returnDocument: "after" }
    );
    if (incremented) return { locked: false };

    const locked = await User.findOneAndUpdate(
        {
            _id: userId,
            $and: [activeStatus, { failedLoginAttempts: { $gte: 4 } }]
        },
        {
            $set: {
                accountStatus: "locked",
                accountStatusReason: "Locked automatically after 5 consecutive incorrect passwords.",
                accountStatusUpdatedAt: new Date(),
                accountStatusUpdatedBy: null,
                activeSessionId: null
            },
            $inc: { failedLoginAttempts: 1 }
        },
        { returnDocument: "after" }
    );
    if (locked) return { locked: true };

    const latestUser = await User.findById(userId);
    return { locked: latestUser?.accountStatus === "locked" || latestUser?.accountStatus === "blocked" };
};

const signup = async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            password,
            state,
            district,
            role,
            department,
            designation,
            employeeId
        } = req.body;
        if (
            !name ||
            !email ||
            !phone ||
            !password ||
            !state ||
            !district
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Name, email, phone, password, state and district are required."
            });
        }
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must contain at least 6 characters."
            });
        }
        const selectedRole =
            role === "authority" ? "authority" : "citizen";
        if (selectedRole === "authority") {
            if (
                !department ||
                !designation ||
                !employeeId
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Department, designation and employee/authority ID are required for authority accounts."
                });
            }
        }
        const normalizedEmail =
            email.trim().toLowerCase();
        const existingUser = await User.findOne({
            email: normalizedEmail
        });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message:
                    "An account with this email already exists."
            });
        }
        const hashedPassword =
            await bcrypt.hash(password, 10);
        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            phone: phone.trim(),
            password: hashedPassword,
            role: selectedRole,
            location: {
                state: state.trim(),
                district: district.trim()
            },
            department:
                selectedRole === "authority"
                    ? department.trim()
                    : "",
            designation:
                selectedRole === "authority"
                    ? designation.trim()
                    : "",
            employeeId:
                selectedRole === "authority"
                    ? employeeId.trim()
                    : "",
            authorityStatus:
                selectedRole === "authority"
                    ? "pending"
                    : "not_applicable"
        });
        return res.status(201).json({
            success: true,
            message:
                selectedRole === "authority"
                    ? "Authority account created successfully. Your account is waiting for admin approval."
                    : "Account created successfully.",
            requiresApproval: selectedRole === "authority",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                authorityStatus: user.authorityStatus
            }
        });
    } catch (error) {
        console.error("Signup error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while creating account."
        });
    }
};
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }
        const normalizedEmail =
            email.trim().toLowerCase();
        const user = await User.findOne({
            email: normalizedEmail
        });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }
        const accountStatus = user.accountStatus || "active";
        if (accountStatus !== "active") {
            return res.status(403).json({
                success: false,
                code: `ACCOUNT_${accountStatus.toUpperCase()}`,
                message: accountStatusMessage(accountStatus)
            });
        }
        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );
        if (!passwordMatch) {
            const attempt = await recordFailedPasswordAttempt(user._id);
            if (attempt.locked) {
                return res.status(403).json({
                    success: false,
                    code: "ACCOUNT_LOCKED",
                    message: accountStatusMessage("locked")
                });
            }
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }
        if (
            user.role === "authority" &&
            user.authorityStatus !== "verified"
        ) {
            if (user.authorityStatus === "rejected") {
                return res.status(403).json({
                    success: false,
                    message:
                        user.rejectionReason
                            ? `Your authority application was rejected: ${user.rejectionReason}`
                            : "Your authority application was rejected.",
                    authorityStatus: "rejected"
                });
            }
            return res.status(403).json({
                success: false,
                message:
                    "Your authority account is awaiting admin approval.",
                authorityStatus: "pending"
            });
        }
        const sessionId = crypto.randomBytes(32).toString("hex");
        const claimedUser = await User.findOneAndUpdate(
            {
                _id: user._id,
                $and: [
                    {
                        $or: [
                            { activeSessionId: null },
                            { activeSessionId: { $exists: false } }
                        ]
                    },
                    {
                        $or: [
                            { accountStatus: "active" },
                            { accountStatus: { $exists: false } }
                        ]
                    }
                ]
            },
            { $set: { activeSessionId: sessionId, failedLoginAttempts: 0 } },
            { returnDocument: "after" }
        );
        if (!claimedUser) {
            const latestUser = await User.findById(user._id);
            if (latestUser?.accountStatus && latestUser.accountStatus !== "active") {
                return res.status(403).json({
                    success: false,
                    code: `ACCOUNT_${latestUser.accountStatus.toUpperCase()}`,
                    message: accountStatusMessage(latestUser.accountStatus)
                });
            }
            return res.status(409).json({
                success: false,
                code: "ACCOUNT_ALREADY_LOGGED_IN",
                message: "This account is already logged in on another device. Please log out from that device or use another account."
            });
        }
        const token = jwt.sign(
            {
                userId: claimedUser._id,
                role: claimedUser.role,
                authorityStatus: claimedUser.authorityStatus,
                sessionId
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );
        return res.status(200).json({
            success: true,
            message: "Login successful.",
            token,
            user: {
                id: claimedUser._id,
                name: claimedUser.name,
                email: claimedUser.email,
                phone: claimedUser.phone,
                role: claimedUser.role,
                location: claimedUser.location,
                department: claimedUser.department,
                designation: claimedUser.designation,
                employeeId: claimedUser.employeeId,
                authorityStatus: claimedUser.authorityStatus
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while logging in."
        });
    }
};
const oauthLogin = async (req, res) => {
    const provider = req.body?.provider;
    try {
        const { credential, phone, state, district } = req.body || {};
        if (!["google", "microsoft"].includes(provider)) {
            return res.status(400).json({ success: false, message: "Unsupported sign-in provider." });
        }
        const identity = await verifyIdentityToken(provider, credential);
        let user = await User.findOne({
            oauthIdentities: { $elemMatch: { provider, subject: identity.subject } }
        });
        if (!user) {
            const existingEmail = await User.findOne({ email: identity.email });
            if (existingEmail) {
                if (provider === "google") {
                    existingEmail.oauthIdentities = existingEmail.oauthIdentities || [];
                    existingEmail.oauthIdentities.push({ provider, subject: identity.subject });
                    await existingEmail.save();
                    user = existingEmail;
                } else {
                    return res.status(409).json({
                        success: false,
                        code: "OAUTH_ACCOUNT_LINK_REQUIRED",
                        message: "An account already uses this email. Microsoft cannot be linked to an existing account automatically; sign in with that account's current method."
                    });
                }
            }
            if (!user && (!phone || !String(phone).trim() || !state || !String(state).trim()
                || !district || !String(district).trim())) {
                return res.status(200).json({
                    success: true,
                    profileRequired: true,
                    profile: { name: identity.name, email: identity.email }
                });
            }
            if (!user) {
                const randomPassword = await bcrypt.hash(crypto.randomBytes(48).toString("hex"), 10);
                user = await User.create({
                    name: identity.name,
                    email: identity.email,
                    phone: String(phone).trim(),
                    password: randomPassword,
                    oauthIdentities: [{ provider, subject: identity.subject }],
                    role: "citizen",
                    location: { state: String(state).trim(), district: String(district).trim() },
                    authorityStatus: "not_applicable"
                });
            }
        }
        const accountStatus = user.accountStatus || "active";
        if (accountStatus !== "active") {
            return res.status(403).json({
                success: false,
                code: `ACCOUNT_${accountStatus.toUpperCase()}`,
                message: accountStatusMessage(accountStatus)
            });
        }
        if (user.role === "authority" && user.authorityStatus !== "verified") {
            return res.status(403).json({
                success: false,
                message: user.authorityStatus === "rejected"
                    ? (user.rejectionReason ? `Your authority application was rejected: ${user.rejectionReason}` : "Your authority application was rejected.")
                    : "Your authority account is awaiting admin approval.",
                authorityStatus: user.authorityStatus
            });
        }
        const sessionId = crypto.randomBytes(32).toString("hex");
        const claimedUser = await User.findOneAndUpdate(
            {
                _id: user._id,
                $and: [
                    { $or: [{ activeSessionId: null }, { activeSessionId: { $exists: false } }] },
                    { $or: [{ accountStatus: "active" }, { accountStatus: { $exists: false } }] }
                ]
            },
            { $set: { activeSessionId: sessionId } },
            { returnDocument: "after" }
        );
        if (!claimedUser) {
            return res.status(409).json({
                success: false,
                code: "ACCOUNT_ALREADY_LOGGED_IN",
                message: "This account is already logged in on another device. Please log out from that device or use another account."
            });
        }
        const token = jwt.sign({
            userId: claimedUser._id,
            role: claimedUser.role,
            authorityStatus: claimedUser.authorityStatus,
            sessionId
        }, process.env.JWT_SECRET, { expiresIn: "7d" });
        return res.status(200).json({
            success: true,
            message: "Login successful.",
            token,
            user: {
                id: claimedUser._id,
                name: claimedUser.name,
                email: claimedUser.email,
                phone: claimedUser.phone,
                role: claimedUser.role,
                location: claimedUser.location,
                department: claimedUser.department,
                designation: claimedUser.designation,
                employeeId: claimedUser.employeeId,
                authorityStatus: claimedUser.authorityStatus
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "An account already exists for this provider email. Please sign in again."
            });
        }
        const status = error.status || 401;
        if (error.code?.startsWith("TOKEN_")) {
            console.warn(`OAuth token rejected (${provider}): ${error.code}`);
        } else if (status >= 500) {
            console.error("OAuth sign-in error:", error.message);
        }
        const tokenMessages = {
            TOKEN_AUDIENCE_MISMATCH: `The ${provider} token belongs to a different app. Make sure its client ID is the same in frontend/.env and backend/.env, then restart both servers.`,
            TOKEN_ISSUER_MISMATCH: `The ${provider} account type is not allowed by this app registration. Check the provider's supported account types.`,
            TOKEN_EMAIL_MISSING_OR_UNVERIFIED: `The ${provider} account did not provide a verified email address. Try an account with an email or use the other sign-in option.`,
            TOKEN_SIGNING_KEY_NOT_FOUND: `Could not find the current ${provider} signing key. Please try again.`,
            TOKEN_SIGNATURE_INVALID: `The ${provider} token signature did not verify. Check the provider setup and try again.`,
        };
        return res.status(status).json({
            success: false,
            message: status === 503
                ? error.message
                : tokenMessages[error.code] || "Unable to verify the provider sign-in. Please try again."
        });
    }
};
const logout = async (req, res) => {
    try {
        const user = await User.findOneAndUpdate(
            {
                _id: req.user.userId,
                activeSessionId: req.user.sessionId
            },
            { $set: { activeSessionId: null, lastSeenAt: null } },
            { returnDocument: "after" }
        );
        if (!user) {
            return res.status(401).json({
                success: false,
                code: "SESSION_INVALID",
                message: "This login session is no longer active. Please sign in again."
            });
        }
        return res.status(200).json({
            success: true,
            message: "Logged out successfully."
        });
    } catch (error) {
        console.error("Logout error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error while logging out."
        });
    }
};
const resetPasswordPrototype = async (req, res) => {
    try {
        const email = String(req.body.email || "")
            .trim()
            .toLowerCase();
        const newPassword = String(req.body.newPassword || "");
        if (!email || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Email and new password are required."
            });
        }
        if (newPassword.length < 6 || newPassword.length > 128) {
            return res.status(400).json({
                success: false,
                message: "Password must be between 6 and 128 characters."
            });
        }
        const switchedOff = checkPrototypeReset({});
        if (!switchedOff.allowed) {
            return res.status(switchedOff.status).json({
                success: false,
                message: switchedOff.message
            });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "No account was found with that email address."
            });
        }
        const policy = checkPrototypeReset({ user });
        if (!policy.allowed) {
            return res.status(policy.status).json({
                success: false,
                message: policy.message
            });
        }
        user.password = await bcrypt.hash(newPassword, 10);
        // Anyone signed in with the old password is signed out.
        user.activeSessionId = null;
        await user.save();
        return res.status(200).json({
            success: true,
            message: "Password updated successfully."
        });
    } catch (error) {
        console.error("Password reset error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to reset password. Please try again."
        });
    }
};
module.exports = {
    signup,
    login,
    oauthLogin,
    logout,
    resetPasswordPrototype
};
