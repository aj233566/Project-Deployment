// Checks what an authority sends as a broadcast notification, so a bad request is answered with 400 and a clear message instead of a
// server error, and nothing oversized or unexpected is saved.

const CHANNELS = ["in_app", "browser", "email", "sms"];
const TYPES = ["info", "warning", "critical"];
const TITLE_MAX = 200;
const MESSAGE_MAX = 2000;
const AUDIENCE_MAX = 60;

const text = (value, max) => (typeof value === "string" ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max) : "");
// A value is either a plain string or { en, hi }.
const pair = (value, max) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
        const en = text(value.en, max);
        return { en, hi: text(value.hi, max) || en };
    }
    const en = text(value, max);
    return { en, hi: en };
};

// Returns { ok: true, value } or { ok: false, message }.
function validateBroadcast(body) {
    const input = body && typeof body === "object" && !Array.isArray(body) ? body : {};
    const message = pair(input.message, MESSAGE_MAX);
    if (!message.en) return { ok: false, message: "A message is required." };
    const title = pair(input.title, TITLE_MAX);
    if (!title.en) title.en = title.hi = "Notification";
    const channel = input.channel === undefined ? "in_app" : input.channel;
    if (!CHANNELS.includes(channel)) return { ok: false, message: "Unknown channel." };
    const type = input.type === undefined ? "info" : input.type;
    if (!TYPES.includes(type)) return { ok: false, message: "Unknown notification type." };
    const targetAudience = text(input.targetAudience, AUDIENCE_MAX) || "General Public";
    return { ok: true, value: { channel, type, title, message, targetAudience } };
}

module.exports = { CHANNELS, TYPES, TITLE_MAX, MESSAGE_MAX, validateBroadcast };
