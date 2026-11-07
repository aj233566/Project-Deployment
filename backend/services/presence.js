// Who is on the page right now. A browser that is showing a SENETRY page sends a heartbeat every ~30 s; a person counts as online
// while their last heartbeat is newer than PRESENCE_WINDOW_MS. Closing the tab, logging out or hiding the tab stops the heartbeat,
// so the count drops by itself. Only counts are ever shared, never names.

const PRESENCE_WINDOW_MS = 75 * 1000;

const onlineCutoff = (now = Date.now()) => new Date(now - PRESENCE_WINDOW_MS);

function createPresenceHandlers(User) {
    const heartbeat = async (req, res) => {
        try {
            await User.updateOne({ _id: req.user.userId }, { $set: { lastSeenAt: new Date() } });
            return res.status(200).json({ success: true });
        } catch (error) {
            console.error("Presence heartbeat error:", error.message);
            return res.status(500).json({ success: false, message: "Could not record presence." });
        }
    };
    const leave = async (req, res) => {
        try {
            await User.updateOne({ _id: req.user.userId }, { $set: { lastSeenAt: null } });
            return res.status(200).json({ success: true });
        } catch (error) {
            console.error("Presence leave error:", error.message);
            return res.status(500).json({ success: false, message: "Could not record presence." });
        }
    };
    const summary = async (req, res) => {
        try {
            const authorities = await User.countDocuments({
                role: "authority",
                authorityStatus: "verified",
                accountStatus: { $in: ["active", null] },
                lastSeenAt: { $gte: onlineCutoff() },
            });
            return res.status(200).json({ success: true, data: { authorities, windowSeconds: PRESENCE_WINDOW_MS / 1000 } });
        } catch (error) {
            console.error("Presence summary error:", error.message);
            return res.status(500).json({ success: false, message: "Could not read presence." });
        }
    };
    return { heartbeat, leave, summary };
}

module.exports = { PRESENCE_WINDOW_MS, onlineCutoff, createPresenceHandlers };
