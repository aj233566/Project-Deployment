const express = require("express");
const mongoose = require("mongoose");
const { protect, authorize } = require("../middlewares/auth_middleware");
const NearbyShare = require("../models/nearby_share");
const User = require("../models/user");
const people = require("../services/nearbyPeople");

const router = express.Router();
router.use(protect, authorize("citizen", "authority", "admin"));

const isStaff = (user) => user?.role === "authority" || user?.role === "admin";

// Start sharing, or refresh the place (the browser calls this about every 30 seconds while sharing is on).
router.put("/me", async (req, res) => {
    try {
        const checked = people.validateShare(req.body);
        if (!checked.ok) return res.status(400).json({ success: false, message: checked.message });
        const user = await User.findById(req.user.userId).select("name role").lean();
        const before = await NearbyShare.findOne({ user: req.user.userId }).select("status").lean();
        const statusChanged = !before || before.status !== checked.value.status;
        await NearbyShare.updateOne(
            { user: req.user.userId },
            {
                $set: {
                    firstName: people.firstName(user?.name),
                    role: user?.role || req.user.role || "citizen",
                    status: checked.value.status,
                    lat: checked.value.location.lat,
                    lng: checked.value.location.lng,
                    updatedAt: new Date(),
                    ...(statusChanged ? { response: null, respondedAt: null } : {}),
                },
            },
            { upsert: true }
        );
        return res.json({ success: true });
    } catch (error) {
        console.error("Nearby share error:", error.message);
        return res.status(500).json({ success: false, message: "Could not share your location." });
    }
});

// Stop sharing.
router.delete("/me", async (req, res) => {
    try {
        await NearbyShare.deleteOne({ user: req.user.userId });
        return res.json({ success: true });
    } catch (error) {
        console.error("Nearby stop error:", error.message);
        return res.status(500).json({ success: false, message: "Could not stop sharing." });
    }
});

// An authority answers a person who asked for help. The person sees the answer on their own screen.
router.patch("/:id/response", authorize("authority", "admin"), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ success: false, message: "Person not found." });
        const value = people.RESPONSES.includes(req.body?.value) ? req.body.value : null;
        if (!value) return res.status(400).json({ success: false, message: "Choose a valid answer." });
        const result = await NearbyShare.updateOne({ _id: req.params.id, status: "need-help" }, { $set: { response: value, respondedAt: new Date() } });
        if (!result.matchedCount) return res.status(404).json({ success: false, message: "This person is no longer asking for help." });
        return res.json({ success: true });
    } catch (error) {
        console.error("Nearby respond error:", error.message);
        return res.status(500).json({ success: false, message: "Could not send the answer." });
    }
});

// People who are sharing. A citizen sees others only while sharing themselves (it goes both ways); authority and admin accounts always
// see everyone, within lat/lng/radiusKm when given and across the whole country when not.
router.get("/", async (req, res) => {
    try {
        const staff = isStaff(req.user);
        const mine = await NearbyShare.findOne({ user: req.user.userId }).lean();
        if (!staff && (!mine || !people.isFresh(mine))) {
            return res.json({ success: true, sharing: false, data: [] });
        }
        const originInput = people.approximateLocation(req.query.lat, req.query.lng);
        const origin = originInput || (mine ? { lat: mine.lat, lng: mine.lng } : null);
        if (!staff && !origin) return res.status(400).json({ success: false, message: "lat and lng are required." });
        const filter = { user: { $ne: req.user.userId }, updatedAt: { $gt: new Date(Date.now() - people.FRESH_MS) } };
        const radiusKm = people.clampRadius(req.query.radiusKm);
        if (origin && (!staff || originInput)) {
            const dLat = radiusKm / 110.574;
            const dLng = radiusKm / (111.32 * Math.max(0.2, Math.cos((origin.lat * Math.PI) / 180)));
            filter.lat = { $gte: origin.lat - dLat, $lte: origin.lat + dLat };
            filter.lng = { $gte: origin.lng - dLng, $lte: origin.lng + dLng };
        }
        const entries = await NearbyShare.find(filter).limit(people.MAX_RESULTS).lean();
        const data = entries
            .map((entry) => people.publicPerson(entry, origin))
            .filter((person) => !origin || (!staff || originInput ? person.distanceKm <= radiusKm : true))
            .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
        return res.json({ success: true, sharing: Boolean(mine), mine: mine ? { status: mine.status, response: mine.response || null } : null, data, radiusKm });
    } catch (error) {
        console.error("Nearby list error:", error.message);
        return res.status(500).json({ success: false, message: "Could not load nearby people." });
    }
});

module.exports = router;
