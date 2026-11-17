const User = require("../models/user");
const Incident = require("../models/incident");
const getAdminStats = async (req, res) => {
    try {
        const [
            totalCitizens,
            totalAuthorities,
            pendingAuthorities,
            verifiedAuthorities,
            rejectedAuthorities
        ] = await Promise.all([
            User.countDocuments({
                role: "citizen",
                accountStatus: { $ne: "deleted" }
            }),
            User.countDocuments({
                role: "authority",
                accountStatus: { $ne: "deleted" }
            }),
            User.countDocuments({
                role: "authority",
                authorityStatus: "pending",
                accountStatus: { $nin: ["locked", "blocked", "banned", "deleted"] }
            }),
            User.countDocuments({
                role: "authority",
                authorityStatus: "verified",
                accountStatus: { $ne: "deleted" }
            }),
            User.countDocuments({
                role: "authority",
                authorityStatus: "rejected",
                accountStatus: { $ne: "deleted" }
            })
        ]);
        return res.status(200).json({
            success: true,
            stats: {
                totalCitizens,
                totalAuthorities,
                pendingAuthorities,
                verifiedAuthorities,
                rejectedAuthorities
            }
        });
    } catch (error) {
        console.error(
            "Admin stats error:",
            error
        );
        return res.status(500).json({
            success: false,
            message:
                "Unable to load admin statistics."
        });
    }
};
const getPendingAuthorities = async (req, res) => {
    try {
        const authorities =
            await User.find({
                role: "authority",
                authorityStatus: "pending",
                accountStatus: { $nin: ["locked", "blocked", "banned", "deleted"] }
            })
            .select("-password -activeSessionId")
            .sort({
                createdAt: -1
            });
        return res.status(200).json({
            success: true,
            authorities
        });
    } catch (error) {
        console.error(
            "Pending authorities error:",
            error
        );
        return res.status(500).json({
            success: false,
            message:
                "Unable to load pending authorities."
        });
    }
};
const getAllAuthorities = async (req, res) => {
    try {
        const authorities =
            await User.find({
                role: "authority",
                accountStatus: { $ne: "deleted" }
            })
            .select("-password -activeSessionId")
            .sort({
                createdAt: -1
            });
        return res.status(200).json({
            success: true,
            authorities
        });
    } catch (error) {
        console.error(
            "All authorities error:",
            error
        );
        return res.status(500).json({
            success: false,
            message:
                "Unable to load authorities."
        });
    }
};
const approveAuthority = async (req, res) => {
    try {
        const authority =
            await User.findOne({
                _id: req.params.id,
                role: "authority",
                accountStatus: { $ne: "deleted" }
            });
        if (!authority) {
            return res.status(404).json({
                success: false,
                message:
                    "Authority account not found."
            });
        }
        authority.authorityStatus =
            "verified";
        authority.verifiedAt =
            new Date();
        authority.rejectedAt =
            null;
        authority.rejectionReason =
            "";
        await authority.save();
        return res.status(200).json({
            success: true,
            message:
                "Authority approved successfully."
        });
    } catch (error) {
        console.error(
            "Approve authority error:",
            error
        );
        return res.status(500).json({
            success: false,
            message:
                "Unable to approve authority."
        });
    }
};
const rejectAuthority = async (req, res) => {
    try {
        const {
            reason
        } = req.body;
        if (!reason || !reason.trim()) {
            return res.status(400).json({
                success: false,
                message:
                    "Rejection reason is required."
            });
        }
        const authority =
            await User.findOne({
                _id: req.params.id,
                role: "authority",
                accountStatus: { $ne: "deleted" }
            });
        if (!authority) {
            return res.status(404).json({
                success: false,
                message:
                    "Authority account not found."
            });
        }
        authority.authorityStatus =
            "rejected";
        authority.rejectedAt =
            new Date();
        authority.rejectionReason =
            reason.trim();
        await authority.save();
        return res.status(200).json({
            success: true,
            message:
                "Authority application rejected."
        });
    } catch (error) {
        console.error(
            "Reject authority error:",
            error
        );
        return res.status(500).json({
            success: false,
            message:
                "Unable to reject authority."
        });
    }
};
const MANAGEABLE_ROLES = ["citizen", "authority"];
const CONTROLLED_ROLES = [...MANAGEABLE_ROLES, "admin"];
const ACCOUNT_STATUSES = ["active", "locked", "banned"];
const activeSessionCountOf = (user) => {
    const sessions = Array.isArray(user.activeSessionIds) ? user.activeSessionIds : [];
    return sessions.length + (user.activeSessionId && !sessions.includes(user.activeSessionId) ? 1 : 0);
};
const safeAccount = (user) => {
    const account = user.toObject ? user.toObject() : { ...user };
    delete account.password;
    delete account.activeSessionId;
    delete account.activeSessionIds;
    account.activeSessionCount = activeSessionCountOf(user);
    account.maxConcurrentSessions = user.maxConcurrentSessions || (user.role === "admin" ? 3 : 1);
    return account;
};
const getOwnSessionLimit = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select("role maxConcurrentSessions activeSessionId activeSessionIds");
        if (!user) return res.status(404).json({ success: false, message: "Administrator account not found." });
        return res.status(200).json({
            success: true,
            maxConcurrentSessions: user.maxConcurrentSessions || 3,
            activeSessionCount: activeSessionCountOf(user)
        });
    } catch (error) {
        console.error("Admin session settings error:", error.message);
        return res.status(500).json({ success: false, message: "Unable to load session settings." });
    }
};
const getManagedAccounts = async (req, res) => {
    try {
        const { status } = req.query;
        if (status && !ACCOUNT_STATUSES.includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid account status filter." });
        }
        const filter = {
            role: { $in: CONTROLLED_ROLES },
            _id: { $ne: req.user.userId }
        };
        if (status === "active") {
            filter.$or = [
                { accountStatus: "active" },
                { accountStatus: { $exists: false } }
            ];
        } else if (status === "locked") {
            filter.accountStatus = { $in: ["locked", "blocked"] };
        } else {
            filter.accountStatus = status || { $ne: "deleted" };
        }
        const accounts = await User.find(filter)
            .select("-password")
            .sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            accounts: accounts.map(safeAccount)
        });
    } catch (error) {
        console.error("Managed accounts error:", error.message);
        return res.status(500).json({ success: false, message: "Unable to load accounts." });
    }
};
const forceLogoutAccount = async (req, res) => {
    try {
        const user = await User.findOneAndUpdate(
            {
                _id: { $eq: req.params.id, $ne: req.user.userId },
                role: { $in: CONTROLLED_ROLES },
                accountStatus: { $ne: "deleted" }
            },
            { $set: { activeSessionId: null, activeSessionIds: [] } },
            { returnDocument: "after", projection: "-password -activeSessionId" }
        );
        if (!user) {
            return res.status(404).json({ success: false, message: "Account not found." });
        }
        return res.status(200).json({ success: true, message: "Account was logged out." });
    } catch (error) {
        console.error("Admin force logout error:", error.message);
        return res.status(error.name === "CastError" ? 404 : 500).json({
            success: false,
            message: error.name === "CastError" ? "Account not found." : "Unable to log out account."
        });
    }
};
const setManagedAccountStatus = async (req, res) => {
    try {
        const { status, reason = "" } = req.body || {};
        if (!ACCOUNT_STATUSES.includes(status) || typeof reason !== "string" || reason.length > 500) {
            return res.status(400).json({ success: false, message: "Provide a valid status and a reason under 500 characters." });
        }
        const user = await User.findOneAndUpdate(
            {
                _id: { $eq: req.params.id, $ne: req.user.userId },
                role: { $in: CONTROLLED_ROLES },
                accountStatus: { $ne: "deleted" }
            },
            {
                $set: {
                    accountStatus: status,
                    accountStatusReason: reason.trim(),
                    accountStatusUpdatedAt: new Date(),
                    accountStatusUpdatedBy: req.user.userId,
                    activeSessionId: null,
                    activeSessionIds: [],
                    ...(status === "active" ? { failedLoginAttempts: 0 } : {})
                }
            },
            { returnDocument: "after", projection: "-password -activeSessionId" }
        );
        if (!user) {
            return res.status(404).json({ success: false, message: "Account not found." });
        }
        return res.status(200).json({
            success: true,
            message: status === "active"
                ? "Account access restored. The user must sign in again."
                : `Account ${status} and its active session was ended.`,
            account: safeAccount(user)
        });
    } catch (error) {
        console.error("Admin account status error:", error.message);
        return res.status(error.name === "CastError" ? 404 : 500).json({
            success: false,
            message: error.name === "CastError" ? "Account not found." : "Unable to update account status."
        });
    }
};
const setSessionLimit = async (req, res) => {
    try {
        const maxConcurrentSessions = Number(req.body?.maxConcurrentSessions);
        if (!Number.isInteger(maxConcurrentSessions) || maxConcurrentSessions < 1 || maxConcurrentSessions > 20) {
            return res.status(400).json({ success: false, message: "Choose a whole-number device limit from 1 to 20." });
        }
        const targetId = req.params.id === "me" ? req.user.userId : req.params.id;
        const user = await User.findOneAndUpdate({
            _id: targetId,
            role: { $in: CONTROLLED_ROLES },
            accountStatus: { $ne: "deleted" }
        }, { $set: { maxConcurrentSessions } }, {
            returnDocument: "after",
            projection: "-password -activeSessionId -activeSessionIds"
        });
        if (!user) {
            return res.status(404).json({ success: false, message: "Account not found." });
        }
        return res.status(200).json({
            success: true,
            message: `Simultaneous device limit set to ${maxConcurrentSessions}.`,
            account: safeAccount(user)
        });
    } catch (error) {
        console.error("Admin session limit error:", error.message);
        return res.status(error.name === "CastError" ? 404 : 500).json({
            success: false,
            message: error.name === "CastError" ? "Account not found." : "Unable to update device limit."
        });
    }
};
const permanentlyDeleteAccount = async (req, res) => {
    try {
        const deleted = await User.findOneAndDelete({
            _id: { $eq: req.params.id, $ne: req.user.userId },
            role: { $in: CONTROLLED_ROLES }
        });
        if (!deleted) return res.status(404).json({ success: false, message: "Account not found or cannot delete your own administrator account." });
        return res.status(200).json({
            success: true,
            message: "Account permanently deleted. Operational records linked to this account were preserved."
        });
    } catch (error) {
        console.error("Admin account deletion error:", error.message);
        return res.status(error.name === "CastError" ? 404 : 500).json({
            success: false,
            message: error.name === "CastError" ? "Account not found." : "Unable to permanently delete account."
        });
    }
};
module.exports = {
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
};
