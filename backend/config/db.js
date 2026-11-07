const mongoose = require("mongoose");
const dns = require("dns");
const { initializeGridFS } = require("./gridfs");
const MONGO_URI = process.env.MONGO_URI;
function configureMongoDns(dnsModule = dns, environment = process.env) {
  const rawServers = environment.MONGO_DNS_SERVERS || (
    String(environment.MONGO_URI || "").startsWith("mongodb+srv://")
      ? "8.8.8.8,1.1.1.1"
      : ""
  );
  if (!rawServers) return false;
  const servers = rawServers
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean);
  if (servers.length === 0) return false;
  dnsModule.setServers(servers);
  return true;
}
const connectDB = async () => {
  try {
    if (!MONGO_URI) {
      throw new Error("MONGO_URI is not defined in .env");
    }
    configureMongoDns();
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");
    initializeGridFS();
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};
module.exports = connectDB;
module.exports.configureMongoDns = configureMongoDns;
