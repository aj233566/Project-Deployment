// Phone push through Firebase Cloud Messaging. When a notification is saved the server sends every registered phone a short silent message,
// "ask the server for your notifications". The phone then asks, exactly as it does for the live stream, so the push carries nothing private.
//
// It does nothing until the server has a Firebase service account in its environment (FIREBASE_SERVICE_ACCOUNT: the JSON text, or the same
// text in base64). Without it the app keeps its own connection open instead (/api/live), so alerts still arrive.
const PushToken = require("../models/push_token");

let messaging = null;
let tried = false;

function loadMessaging() {
  if (messaging || tried) return messaging;
  tried = true;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const text = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const { initializeApp, getApps, getApp, cert } = require("firebase-admin/app");
    const { getMessaging } = require("firebase-admin/messaging");
    const app = getApps().length ? getApp() : initializeApp({ credential: cert(JSON.parse(text)) });
    messaging = getMessaging(app);
  } catch (error) {
    console.warn("[push] Firebase is not set up correctly:", error.message);
    messaging = null;
  }
  return messaging;
}

const enabled = () => Boolean(loadMessaging());

// One push covers every notification saved in the same two seconds.
let timer = null;
function ping(options = {}) {
  const send = options.messaging || loadMessaging();
  if (!send) return;
  if (timer) return;
  timer = setTimeout(async () => {
    timer = null;
    try { await sendToAll(send, options); } catch (error) { console.warn("[push] send failed:", error.message); }
  }, options.delayMs ?? 2000);
  if (timer.unref) timer.unref();
}

async function sendToAll(m, { model = PushToken } = {}) {
  const rows = await model.find({}, { token: 1 }).lean();
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const result = await m.sendEachForMulticast({
      tokens: chunk.map((r) => r.token),
      data: { type: "notification" },
      android: { priority: "high", ttl: 6 * 3600 * 1000 },
    });
    const dead = [];
    result.responses.forEach((r, k) => {
      const code = r.error && r.error.code;
      if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") dead.push(chunk[k].token);
    });
    if (dead.length) await model.deleteMany({ token: { $in: dead } });
  }
}

function attach(notificationModel) {
  notificationModel.schema.post("save", () => { try { ping(); } catch { /* a failed push must never fail a save */ } });
}

module.exports = { enabled, ping, sendToAll, attach, _reset: () => { messaging = null; tried = false; if (timer) { clearTimeout(timer); timer = null; } } };
