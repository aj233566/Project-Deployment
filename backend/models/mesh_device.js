const mongoose = require("mongoose");

// A phone's public key, registered while it had internet. The server accepts a nearby-network message only from a key it knows here.
const meshDeviceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    deviceId: { type: String, required: true, unique: true },
    publicKey: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MeshDevice", meshDeviceSchema);
