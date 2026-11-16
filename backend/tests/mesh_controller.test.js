const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");

// The controller is loaded with its three models replaced by small in-memory ones, so it can be tested without a database.
function loadController() {
    const devices = [];
    const messages = [];
    const make = (list) => ({
        findOne: (q) => { const hit = list.find((d) => Object.keys(q).every((k) => String(d[k]) === String(q[k]))); const p = Promise.resolve(hit || null); p.lean = () => Promise.resolve(hit || null); return p; },
        countDocuments: async (q) => list.filter((d) => Object.keys(q).every((k) => String(d[k]) === String(q[k]))).length,
        exists: async (q) => list.some((d) => Object.keys(q).every((k) => String(d[k]) === String(q[k]))),
        create: async (doc) => { if (!doc.userId) throw new Error("MeshDevice validation failed: userId: Path `userId` is required."); list.push(doc); return doc; },
        find: () => ({ sort: () => ({ limit: () => ({ lean: async () => [] }) }) }),
    });
    const fakes = {
        "../models/mesh_device": make(devices),
        "../models/mesh_message": make(messages),
        "../models/notification": make([]),
    };
    const controllerPath = require.resolve("../controllers/mesh_controller");
    delete require.cache[controllerPath];
    const originalLoad = Module._load;
    Module._load = function (request, parent, isMain) {
        const key = Object.keys(fakes).find((k) => request === k);
        if (key && parent && parent.filename === controllerPath) return fakes[key];
        return originalLoad.call(this, request, parent, isMain);
    };
    try {
        return { controller: require(controllerPath), devices, messages };
    } finally {
        Module._load = originalLoad;
    }
}

const mockRes = () => {
    const res = { code: 200, body: null };
    res.status = (c) => { res.code = c; return res; };
    res.json = (b) => { res.body = b; return res; };
    return res;
};
const loadPhone = () => import(require("node:url").pathToFileURL(path.join(__dirname, "../../frontend/src/services/mesh/protocol.js")).href);

// The sign-in middleware puts the decoded token on req.user, and the account id is in userId (not _id or id).
const asUser = (userId) => ({ user: { userId, sessionId: "s", role: "citizen" } });

test("registering a device records it under the signed-in account's userId", async () => {
    const P = await loadPhone();
    const { controller, devices } = loadController();
    const k = await P.generateDeviceKey();
    const res = mockRes();
    await controller.registerDevice({ ...asUser("user-7"), body: { publicKey: k.pub } }, res);
    assert.equal(res.code, 201);
    assert.equal(devices.length, 1);
    assert.equal(devices[0].userId, "user-7");
    assert.equal(devices[0].deviceId, k.id);
});

test("registering the same key again is fine, and a key owned by someone else is refused", async () => {
    const P = await loadPhone();
    const { controller } = loadController();
    const k = await P.generateDeviceKey();
    const first = mockRes();
    await controller.registerDevice({ ...asUser("user-1"), body: { publicKey: k.pub } }, first);
    const again = mockRes();
    await controller.registerDevice({ ...asUser("user-1"), body: { publicKey: k.pub } }, again);
    assert.equal(again.code, 200);
    const other = mockRes();
    await controller.registerDevice({ ...asUser("user-2"), body: { publicKey: k.pub } }, other);
    assert.equal(other.code, 409);
});

test("a bad key gets a 400, and a sixth device on one account is refused", async () => {
    const P = await loadPhone();
    const { controller } = loadController();
    const bad = mockRes();
    await controller.registerDevice({ ...asUser("u"), body: { publicKey: "nonsense" } }, bad);
    assert.equal(bad.code, 400);
    for (let i = 0; i < 5; i += 1) {
        const k = await P.generateDeviceKey();
        const ok = mockRes();
        await controller.registerDevice({ ...asUser("u"), body: { publicKey: k.pub } }, ok);
        assert.ok([200, 201].includes(ok.code));
    }
    const sixth = mockRes();
    await controller.registerDevice({ ...asUser("u"), body: { publicKey: (await P.generateDeviceKey()).pub } }, sixth);
    assert.equal(sixth.code, 400);
});

test("ingest stores a registered device's message with the carrier's userId", async () => {
    const P = await loadPhone();
    const { controller, messages } = loadController();
    const k = await P.generateDeviceKey();
    await controller.registerDevice({ ...asUser("alice"), body: { publicKey: k.pub } }, mockRes());
    const signer = { privateKey: await P.importPrivate(k.jwk), from: k.id, pub: k.pub };
    const now = Date.now();
    const env = await P.makeEnvelope({ kind: "location", body: { lat: 28.5, lng: 77.2, accuracy: 6 }, ts: now, exp: now + 3600000 }, signer);
    const res = mockRes();
    await controller.ingest({ ...asUser("carol"), body: { envelopes: [env] } }, res);
    assert.equal(res.code, 200);
    assert.deepEqual(res.body.data.accepted, [env.id]);
    assert.equal(messages[0].userId, "alice");
    assert.equal(messages[0].carrierUserId, "carol");
});
