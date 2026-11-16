const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const mesh = require("../services/mesh_service");

// The phone side lives in the frontend. Loading the real file here means these tests prove the two sides agree, not just that each agrees with itself.
const loadPhone = () => import(pathToFileURL(path.join(__dirname, "../../frontend/src/services/mesh/protocol.js")).href);

const NOW = Date.UTC(2026, 10, 14, 9, 0, 0);
const hour = 3600000;

async function phone(P) {
    const k = await P.generateDeviceKey();
    return { id: k.id, pub: k.pub, signer: { privateKey: await P.importPrivate(k.jwk), from: k.id, pub: k.pub } };
}
const reportBody = () => ({ incidentType: "landslide", severity: "High", description: "Road is cracking.", lat: 28.5, lng: 77.2 });

function memoryDeps(devices = []) {
    const messages = new Map();
    return {
        messages,
        findDevice: async (id) => devices.find((d) => d.deviceId === id) || null,
        hasMessage: async (id) => messages.has(id),
        saveMessage: async (doc) => { messages.set(doc.envId, doc); },
    };
}

test("canonical text matches the phone's, including key order and numbers", async () => {
    const P = await loadPhone();
    const sample = { z: [1, 2.5, "é", null, true], a: { y: 0, b: "x" } };
    assert.equal(mesh.canonical(sample), P.canonical(sample));
    assert.throws(() => mesh.canonical({ a: undefined }));
    assert.throws(() => mesh.canonical({ a: Infinity }));
});

test("a phone's device id and the server's agree", async () => {
    const P = await loadPhone();
    const p = await phone(P);
    assert.equal(mesh.deviceIdOf(p.pub), p.id);
});

test("an alert signed by the server verifies on a phone with the server's public key", async () => {
    const P = await loadPhone();
    const key = mesh.loadServerKey({});
    const env = mesh.signAlert({ _id: "abc", type: "critical", title: { en: "Flood warning" }, message: { en: "Leave low ground now." }, createdAt: new Date(NOW - hour) }, key, { now: NOW });
    assert.equal(env.body.level, "critical");
    assert.equal(env.hops, mesh.LIMITS.maxHops);
    assert.deepEqual(await P.verifyEnvelope(env, { serverPub: key.publicKey, now: NOW }), { ok: true, reason: "" });
    const stranger = mesh.loadServerKey({});
    assert.equal((await P.verifyEnvelope(env, { serverPub: stranger.publicKey, now: NOW })).reason, "bad-signature");
});

test("alert levels follow the server's words, and an alert with no text or already expired is not signed", () => {
    const key = mesh.loadServerKey({});
    const make = (type) => mesh.signAlert({ type, title: "T", message: "M", createdAt: new Date(NOW) }, key, { now: NOW });
    assert.equal(make("critical").body.level, "critical");
    assert.equal(make("warning").body.level, "high");
    assert.equal(make("info").body.level, "info");
    assert.equal(make(undefined).body.level, "info");
    assert.equal(mesh.signAlert({ type: "critical", title: "", message: "M" }, key, { now: NOW }), null);
    assert.equal(mesh.signAlert({ type: "critical", title: "T", message: "M", createdAt: new Date(NOW - 20 * hour) }, key, { now: NOW }), null);
});

test("long alert text is cut to what fits, and the bundle is capped", () => {
    const key = mesh.loadServerKey({});
    const env = mesh.signAlert({ type: "info", title: "t".repeat(500), message: "m".repeat(2000), createdAt: new Date(NOW) }, key, { now: NOW });
    assert.equal(env.body.title.length, 120);
    assert.equal(env.body.message.length, 400);
    assert.ok(JSON.stringify(env).length <= mesh.LIMITS.maxBytes);
    const many = Array.from({ length: 50 }, (_, i) => ({ type: "info", title: `T${i}`, message: "M", createdAt: new Date(NOW) }));
    const bundle = mesh.buildBundle(many, key, { now: NOW });
    assert.equal(bundle.alerts.length, 20);
    assert.equal(bundle.serverPublicKey, key.publicKey);
});

test("a key from the environment is used, and it gives the same public key every time", () => {
    const crypto = require("node:crypto");
    const pem = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" }).privateKey.export({ type: "pkcs8", format: "pem" });
    const a = mesh.loadServerKey({ MESH_SIGNING_KEY: pem });
    const b = mesh.loadServerKey({ MESH_SIGNING_KEY: pem.replace(/\n/g, "\\n") });
    assert.equal(a.publicKey, b.publicKey);
    assert.equal(a.ephemeral, false);
    assert.equal(mesh.loadServerKey({}).ephemeral, true);
});

test("a message a phone signed passes the server's check, and a changed one does not", async () => {
    const P = await loadPhone();
    const p = await phone(P);
    const env = await P.makeEnvelope({ kind: "report", body: reportBody(), ts: NOW, exp: NOW + 6 * hour }, p.signer);
    assert.equal(mesh.deviceEnvelopeProblem(env, NOW), "");
    assert.equal(mesh.deviceEnvelopeProblem({ ...env, body: { ...env.body, lat: 29 } }, NOW), "id-mismatch");
    const reId = { ...env, body: { ...env.body, lat: 29 } };
    reId.id = mesh.envelopeId(reId);
    assert.equal(mesh.deviceEnvelopeProblem(reId, NOW), "bad-signature");
    assert.equal(mesh.deviceEnvelopeProblem({ ...env, hops: 0 }, NOW), "", "hops are outside the signature, so a carrier lowering them is fine");
});

test("the server turns away bad shapes, times and sizes", async () => {
    const P = await loadPhone();
    const p = await phone(P);
    const mk = (extra = {}, body = reportBody()) => P.makeEnvelope({ kind: "report", body, ts: NOW, exp: NOW + 6 * hour, ...extra }, p.signer);
    assert.equal(mesh.deviceEnvelopeProblem(await mk(), NOW + 7 * hour), "expired");
    assert.equal(mesh.deviceEnvelopeProblem(await mk(), NOW - 10 * 60000), "future");
    assert.equal(mesh.deviceEnvelopeProblem(await mk({ exp: NOW + 30 * 24 * hour }), NOW), "lifetime");
    assert.equal(mesh.deviceEnvelopeProblem(await mk({}, { ...reportBody(), lat: 200 }), NOW), "report-body");
    assert.equal(mesh.deviceEnvelopeProblem(await mk({}, { ...reportBody(), description: "x".repeat(301) }), NOW), "report-body");
    assert.equal(mesh.deviceEnvelopeProblem(null, NOW), "shape");
    assert.equal(mesh.deviceEnvelopeProblem({ v: 1, kind: "alert" }, NOW), "kind", "a phone cannot send an alert");
});

test("a registered device's report is stored once, with the right owner, and a repeat is reported as a duplicate", async () => {
    const P = await loadPhone();
    const p = await phone(P);
    const deps = memoryDeps([{ deviceId: p.id, publicKey: p.pub, userId: "user-1" }]);
    const env = await P.makeEnvelope({ kind: "report", body: reportBody(), ts: NOW, exp: NOW + 6 * hour }, p.signer);
    const first = await mesh.ingestEnvelopes([env], { ...deps, carrierUserId: "carrier-9", now: NOW });
    assert.deepEqual(first.accepted, [env.id]);
    const stored = deps.messages.get(env.id);
    assert.equal(stored.userId, "user-1", "owned by the device's account, not by whoever carried it");
    assert.equal(stored.carrierUserId, "carrier-9");
    assert.equal(stored.kind, "report");
    const second = await mesh.ingestEnvelopes([env], { ...deps, carrierUserId: "carrier-9", now: NOW });
    assert.deepEqual(second.duplicate, [env.id]);
    assert.equal(deps.messages.size, 1);
});

test("a message from a device the server does not know, or with a swapped key, is rejected", async () => {
    const P = await loadPhone();
    const known = await phone(P);
    const stranger = await phone(P);
    const deps = memoryDeps([{ deviceId: known.id, publicKey: known.pub, userId: "user-1" }]);
    const fromStranger = await P.makeEnvelope({ kind: "safe", body: {}, ts: NOW, exp: NOW + hour }, stranger.signer);
    const r1 = await mesh.ingestEnvelopes([fromStranger], { ...deps, now: NOW });
    assert.deepEqual(r1.rejected, [{ id: fromStranger.id, reason: "unknown-device" }]);
    assert.equal(deps.messages.size, 0);
    const other = memoryDeps([{ deviceId: known.id, publicKey: stranger.pub, userId: "user-1" }]);
    const fromKnown = await P.makeEnvelope({ kind: "safe", body: {}, ts: NOW, exp: NOW + hour }, known.signer);
    assert.equal((await mesh.ingestEnvelopes([fromKnown], { ...other, now: NOW })).rejected[0].reason, "key-mismatch");
});

test("one bad envelope in a batch does not stop the good ones, and batches are capped", async () => {
    const P = await loadPhone();
    const p = await phone(P);
    const deps = memoryDeps([{ deviceId: p.id, publicKey: p.pub, userId: "u" }]);
    const good = await P.makeEnvelope({ kind: "location", body: { lat: 28, lng: 77, accuracy: 8 }, ts: NOW, exp: NOW + hour }, p.signer);
    const result = await mesh.ingestEnvelopes([{ junk: true }, good, null], { ...deps, now: NOW });
    assert.deepEqual(result.accepted, [good.id]);
    assert.equal(result.rejected.length, 2);
    const flood = await mesh.ingestEnvelopes(Array.from({ length: 51 }, () => good), { ...deps, now: NOW });
    assert.equal(flood.error, "too-many");
    assert.equal((await mesh.ingestEnvelopes("nope", { ...deps, now: NOW })).error, "envelopes-not-a-list");
});

test("registering a device key accepts a real key, and refuses junk and points that are not on the curve", async () => {
    const P = await loadPhone();
    const p = await phone(P);
    assert.equal(mesh.checkNewDeviceKey(p.pub).deviceId, p.id);
    for (const bad of [undefined, "", "AAAA", Buffer.alloc(65, 1).toString("base64"), Buffer.alloc(64).toString("base64")]) {
        assert.throws(() => mesh.checkNewDeviceKey(bad), (e) => e.code === "bad-public-key");
    }
});

test("the raw key export and import round trip", async () => {
    const crypto = require("node:crypto");
    const { publicKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    const raw = mesh.rawFromPublicKey(publicKey);
    assert.equal(Buffer.from(raw, "base64").length, 65);
    assert.equal(mesh.rawFromPublicKey(mesh.publicKeyFromRaw(raw)), raw);
});

test("two carriers uploading the same message at the same moment is not an error: the second is a duplicate", async () => {
    const P = await loadPhone();
    const p = await phone(P);
    const messages = new Map();
    const deps = {
        findDevice: async (id) => (id === p.id ? { deviceId: p.id, publicKey: p.pub, userId: "u" } : null),
        // both uploads checked "is it stored?" before either saved, so both reach saveMessage; the database refuses the second
        hasMessage: async () => false,
        saveMessage: async (doc) => {
            if (messages.has(doc.envId)) { const e = new Error("E11000 duplicate key"); e.code = 11000; throw e; }
            messages.set(doc.envId, doc);
        },
    };
    const env = await P.makeEnvelope({ kind: "safe", body: {}, ts: NOW, exp: NOW + hour }, p.signer);
    const [a, b] = await Promise.all([mesh.ingestEnvelopes([env], { ...deps, now: NOW }), mesh.ingestEnvelopes([env], { ...deps, now: NOW })]);
    assert.equal(a.accepted.length + b.accepted.length, 1);
    assert.equal(a.duplicate.length + b.duplicate.length, 1);
    assert.equal(messages.size, 1);
    // any other storage error is still an error, not a silent duplicate
    const broken = { ...deps, saveMessage: async () => { throw new Error("disk full"); } };
    const env2 = await P.makeEnvelope({ kind: "safe", body: { lat: 1, lng: 2 }, ts: NOW, exp: NOW + hour }, p.signer);
    await assert.rejects(() => mesh.ingestEnvelopes([env2], { ...broken, now: NOW }), /disk full/);
});
