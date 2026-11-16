const Notification = require("../models/notification");
const MeshDevice = require("../models/mesh_device");
const MeshMessage = require("../models/mesh_message");
const mesh = require("../services/mesh_service");

// One key for this run of the server (see loadServerKey). Created on first use, so tests and tools that never touch it do not pay for it.
let serverKey = null;
const key = () => {
  if (!serverKey) {
    serverKey = mesh.loadServerKey();
    if (serverKey.ephemeral) console.warn("[mesh] MESH_SIGNING_KEY is not set. Using a key for this run only.");
  }
  return serverKey;
};

// Recent alerts, signed, for a phone to keep and pass to other phones. Citizens see only alerts meant for citizens.
const getBundle = async (req, res) => {
  try {
    const since = new Date(Date.now() - 12 * 3600 * 1000);
    const list = await Notification.find({ createdAt: { $gte: since } }).sort({ createdAt: -1 }).limit(40).lean();
    const forCitizens = list.filter((n) => {
      const audience = String(n.targetAudience || "").toLowerCase();
      return !audience || audience.includes("citizen") || audience.includes("public") || audience.includes("general") || audience.includes("all");
    });
    res.status(200).json({ success: true, data: mesh.buildBundle(forCitizens, key()) });
  } catch (error) {
    console.error("Error building mesh bundle:", error.message);
    res.status(500).json({ success: false, message: "Failed to build the alert bundle" });
  }
};

// A phone registers its public key. Safe to repeat: the same key gives the same device.
const registerDevice = async (req, res) => {
  try {
    const { deviceId } = mesh.checkNewDeviceKey(req.body?.publicKey);
    const existing = await MeshDevice.findOne({ deviceId });
    if (existing) {
      if (String(existing.userId) !== String(req.user.userId)) {
        return res.status(409).json({ success: false, message: "This device is already registered to another account." });
      }
      return res.status(200).json({ success: true, data: { deviceId } });
    }
    const count = await MeshDevice.countDocuments({ userId: req.user.userId });
    if (count >= mesh.LIMITS.maxDevicesPerUser) {
      return res.status(400).json({ success: false, message: "Too many devices on this account." });
    }
    await MeshDevice.create({ userId: req.user.userId, deviceId, publicKey: req.body.publicKey });
    res.status(201).json({ success: true, data: { deviceId } });
  } catch (error) {
    if (error.code === "bad-public-key") return res.status(400).json({ success: false, message: error.message });
    console.error("Error registering mesh device:", error.message);
    res.status(500).json({ success: false, message: "Failed to register the device" });
  }
};

// A phone with internet hands over messages that other phones made. Each one stands on its own signature and a registered device.
const ingest = async (req, res) => {
  try {
    const result = await mesh.ingestEnvelopes(req.body?.envelopes, {
      carrierUserId: req.user.userId,
      findDevice: async (deviceId) => {
        const device = await MeshDevice.findOne({ deviceId }).lean();
        return device ? { userId: device.userId, publicKey: device.publicKey } : null;
      },
      hasMessage: async (envId) => Boolean(await MeshMessage.exists({ envId })),
      saveMessage: (doc) => MeshMessage.create(doc),
    });
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Error ingesting mesh messages:", error.message);
    res.status(500).json({ success: false, message: "Failed to store the messages" });
  }
};

module.exports = { getBundle, registerDevice, ingest };
