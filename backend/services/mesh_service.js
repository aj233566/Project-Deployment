"use strict";
// SENETRY nearby network, server side. The phone side is frontend/src/services/mesh/protocol.js; the two must agree byte for byte.
//
// - The server signs alerts, so a phone can pass an alert to another phone and the second phone can still know it came from SENETRY.
// - Phones sign their own reports, locations and "I am safe" messages with a key the server knows (registered while they had internet).
//   A phone with internet can hand a neighbour's message to the server. The server accepts it only if the signature checks out and the
//   key belongs to a registered device, and it never trusts who carried it.
const crypto = require("crypto");

const LIMITS = Object.freeze({
    maxBytes: 2048,
    maxHops: 6,
    maxLifetimeMs: 48 * 3600 * 1000,
    clockSkewMs: 5 * 60 * 1000,
    maxIngestBatch: 50,
    maxDevicesPerUser: 5,
});
const DEVICE_KINDS = ["report", "location", "safe"];
const LEVELS = ["critical", "high", "info"];

// Same text for the same value: keys sorted, no whitespace.
function canonical(value) {
    if (value === null) return "null";
    if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
    if (typeof value === "number") {
        if (!Number.isFinite(value)) throw new Error("number-not-finite");
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
    if (typeof value === "object") {
        return `{${Object.keys(value).sort().map((k) => {
            if (value[k] === undefined) throw new Error("undefined-value");
            return `${JSON.stringify(k)}:${canonical(value[k])}`;
        }).join(",")}}`;
    }
    throw new Error("unsupported-value");
}

function signedPart(env) {
    const part = { v: env.v, kind: env.kind, from: env.from, ts: env.ts, exp: env.exp, body: env.body };
    if (env.pub !== undefined) part.pub = env.pub;
    return part;
}

const envelopeId = (env) => crypto.createHash("sha256").update(canonical(signedPart(env))).digest("hex").slice(0, 32);

// ---- keys ----------------------------------------------------------------------------------------------------------------------

// A raw uncompressed P-256 public key (65 bytes, base64) as a KeyObject. Throws if it is not a real point on the curve.
function publicKeyFromRaw(base64) {
    const raw = Buffer.from(String(base64), "base64");
    if (raw.length !== 65 || raw[0] !== 4) throw new Error("bad-public-key");
    return crypto.createPublicKey({
        key: { kty: "EC", crv: "P-256", x: raw.subarray(1, 33).toString("base64url"), y: raw.subarray(33, 65).toString("base64url") },
        format: "jwk",
    });
}

function rawFromPublicKey(keyObject) {
    const jwk = keyObject.export({ format: "jwk" });
    return Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, "base64url"), Buffer.from(jwk.y, "base64url")]).toString("base64");
}

const deviceIdOf = (pubBase64) => crypto.createHash("sha256").update(Buffer.from(pubBase64, "base64")).digest("hex").slice(0, 32);

// The server's signing key. In production it comes from MESH_SIGNING_KEY (a PKCS8 PEM) so it survives restarts. Without one a key is made for
// this run only, which is fine for development: phones refresh the server's public key every time they fetch alerts.
function loadServerKey(env = process.env) {
    let privateKey;
    let ephemeral = false;
    if (env.MESH_SIGNING_KEY) {
        privateKey = crypto.createPrivateKey(String(env.MESH_SIGNING_KEY).replace(/\\n/g, "\n"));
    } else {
        privateKey = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" }).privateKey;
        ephemeral = true;
    }
    return { privateKey, publicKey: rawFromPublicKey(crypto.createPublicKey(privateKey)), ephemeral };
}

const sign = (privateKey, text) => crypto.sign("sha256", Buffer.from(text), { key: privateKey, dsaEncoding: "ieee-p1363" }).toString("base64");

// ---- alerts the server signs ---------------------------------------------------------------------------------------------------

const clip = (text, max) => String(text ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const textOf = (value) => (typeof value === "string" ? value : value?.en || value?.english || (value && Object.values(value)[0]) || "");

function levelFor(notification) {
    const raw = String(notification?.type || "").toLowerCase();
    if (raw === "critical") return "critical";
    if (raw === "warning" || raw === "high") return "high";
    return "info";
}

// One notification as a signed envelope, or null when it has no usable text.
function signAlert(notification, key, { now = Date.now(), ttlMs = 12 * 3600 * 1000 } = {}) {
    const title = clip(textOf(notification?.title), 120);
    const message = clip(textOf(notification?.message), 400);
    if (!title || !message) return null;
    const created = new Date(notification.createdAt || now).getTime();
    // An alert lives for ttlMs from when it was made, never longer, and is not signed after it has already run out.
    const ts = Math.min(Number.isFinite(created) ? created : now, now);
    const exp = Math.min(ts + ttlMs, now + ttlMs);
    if (exp <= now) return null;
    const env = {
        v: 1, kind: "alert", from: "server", ts, exp,
        body: { level: levelFor(notification), title, message, alertId: String(notification._id || notification.id || "").slice(0, 64) || undefined },
    };
    if (env.body.alertId === undefined) delete env.body.alertId;
    const id = envelopeId(env);
    return { ...env, id, sig: sign(key.privateKey, canonical(signedPart(env))), hops: LIMITS.maxHops };
}

function buildBundle(notifications, key, { now = Date.now(), max = 20 } = {}) {
    const alerts = (Array.isArray(notifications) ? notifications : [])
        .map((n) => signAlert(n, key, { now }))
        .filter(Boolean)
        .slice(0, max);
    return { serverPublicKey: key.publicKey, now, alerts };
}

// ---- what a phone sends us -----------------------------------------------------------------------------------------------------

const isStr = (v, max) => typeof v === "string" && v.length > 0 && v.length <= max;
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const validLat = (v) => isNum(v) && v >= -90 && v <= 90;
const validLng = (v) => isNum(v) && v >= -180 && v <= 180;

function bodyProblem(kind, body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) return "body-shape";
    if (kind === "report") {
        if (!isStr(body.incidentType, 40) || !isStr(body.severity, 16) || !validLat(body.lat) || !validLng(body.lng)) return "report-body";
        if (body.description !== undefined && !(typeof body.description === "string" && body.description.length <= 300)) return "report-body";
        return "";
    }
    if (kind === "location") return validLat(body.lat) && validLng(body.lng) && isNum(body.accuracy) && body.accuracy >= 0 ? "" : "location-body";
    if (kind === "safe") {
        if (body.lat !== undefined && !validLat(body.lat)) return "safe-body";
        if (body.lng !== undefined && !validLng(body.lng)) return "safe-body";
        return "";
    }
    return "kind";
}

// Checks one device envelope: shape, time, size, id, key, signature. Returns "" when it is genuine, else a reason.
// It does NOT check the device is registered; the caller does that with the id this returns on success.
function deviceEnvelopeProblem(env, now = Date.now()) {
    if (!env || typeof env !== "object") return "shape";
    if (env.v !== 1) return "version";
    if (!DEVICE_KINDS.includes(env.kind)) return "kind";
    if (!isStr(env.id, 64) || !isStr(env.from, 64) || !isStr(env.sig, 200) || !isStr(env.pub, 128)) return "shape";
    if (!isNum(env.ts) || !isNum(env.exp)) return "time";
    if (env.ts > now + LIMITS.clockSkewMs) return "future";
    if (env.exp <= now) return "expired";
    if (env.exp <= env.ts || env.exp - env.ts > LIMITS.maxLifetimeMs) return "lifetime";
    if (JSON.stringify(env).length > LIMITS.maxBytes) return "too-big";
    const body = bodyProblem(env.kind, env.body);
    if (body) return body;
    try {
        if (env.id !== envelopeId(env)) return "id-mismatch";
        if (env.from !== deviceIdOf(env.pub)) return "from-mismatch";
        const ok = crypto.verify("sha256", Buffer.from(canonical(signedPart(env))), { key: publicKeyFromRaw(env.pub), dsaEncoding: "ieee-p1363" }, Buffer.from(env.sig, "base64"));
        return ok ? "" : "bad-signature";
    } catch {
        return "bad-signature";
    }
}

// Takes what a phone with internet hands over. `deps`: findDevice(deviceId) -> { userId, publicKey } | null, hasMessage(id) -> bool,
// saveMessage(doc). Nothing here trusts the carrier: each envelope stands on its own signature and a registered device.
async function ingestEnvelopes(envelopes, { findDevice, hasMessage, saveMessage, carrierUserId, now = Date.now() }) {
    const out = { accepted: [], duplicate: [], rejected: [] };
    if (!Array.isArray(envelopes)) return { ...out, error: "envelopes-not-a-list" };
    if (envelopes.length > LIMITS.maxIngestBatch) return { ...out, error: "too-many" };
    for (const env of envelopes) {
        const id = typeof env?.id === "string" ? env.id : "";
        const problem = deviceEnvelopeProblem(env, now);
        if (problem) { out.rejected.push({ id, reason: problem }); continue; }
        if (await hasMessage(env.id)) { out.duplicate.push(env.id); continue; } // already ours: tell the carrier so it stops carrying it
        const device = await findDevice(env.from);
        if (!device) { out.rejected.push({ id, reason: "unknown-device" }); continue; }
        if (device.publicKey !== env.pub) { out.rejected.push({ id, reason: "key-mismatch" }); continue; }
        try {
            await saveMessage({
                envId: env.id, kind: env.kind, deviceId: env.from, userId: device.userId, carrierUserId: carrierUserId || null,
                ts: new Date(env.ts), exp: new Date(env.exp), body: env.body, receivedAt: new Date(now),
            });
            out.accepted.push(env.id);
        } catch (error) {
            // Two phones can hand over the same message at the same moment. The database's unique key lets only one in; the other is a duplicate.
            if (error && error.code === 11000) out.duplicate.push(env.id); else throw error;
        }
    }
    return out;
}

// A phone registering its public key. Returns { deviceId } or throws a coded error.
function checkNewDeviceKey(publicKey) {
    try {
        publicKeyFromRaw(publicKey);
    } catch {
        const error = new Error("That is not a valid device key.");
        error.code = "bad-public-key";
        throw error;
    }
    return { deviceId: deviceIdOf(publicKey) };
}

module.exports = {
    LIMITS, LEVELS, DEVICE_KINDS, canonical, signedPart, envelopeId, deviceIdOf, publicKeyFromRaw, rawFromPublicKey,
    loadServerKey, signAlert, buildBundle, deviceEnvelopeProblem, ingestEnvelopes, checkNewDeviceKey,
};
