const test = require("node:test");
const assert = require("node:assert/strict");
const { PRESENCE_WINDOW_MS, onlineCutoff, createPresenceHandlers } = require("../services/presence");

const fakeRes = () => {
    const res = { code: null, body: null };
    res.status = (code) => { res.code = code; return res; };
    res.json = (body) => { res.body = body; return res; };
    return res;
};

test("a person counts as online only while their last heartbeat is inside the window", () => {
    const now = 1_000_000_000_000;
    assert.equal(onlineCutoff(now).getTime(), now - PRESENCE_WINDOW_MS);
    assert.ok(PRESENCE_WINDOW_MS >= 60 * 1000 && PRESENCE_WINDOW_MS <= 120 * 1000, "window is about a minute: long enough for one missed beat, short enough to drop quickly");
});

test("a heartbeat stamps the signed-in user, and leaving clears it", async () => {
    const calls = [];
    const User = { updateOne: async (filter, update) => { calls.push({ filter, update }); } };
    const { heartbeat, leave } = createPresenceHandlers(User);
    const res1 = fakeRes();
    await heartbeat({ user: { userId: "u1" } }, res1);
    assert.equal(res1.code, 200);
    assert.deepEqual(calls[0].filter, { _id: "u1" });
    assert.ok(calls[0].update.$set.lastSeenAt instanceof Date);
    const res2 = fakeRes();
    await leave({ user: { userId: "u1" } }, res2);
    assert.equal(calls[1].update.$set.lastSeenAt, null);
});

test("the summary counts only verified, active authorities seen recently, and shares no names", async () => {
    let seenQuery;
    const User = { countDocuments: async (query) => { seenQuery = query; return 3; } };
    const { summary } = createPresenceHandlers(User);
    const res = fakeRes();
    await summary({ user: { userId: "u1", role: "authority" } }, res);
    assert.equal(res.code, 200);
    assert.deepEqual(res.body.data, { authorities: 3, windowSeconds: PRESENCE_WINDOW_MS / 1000 });
    assert.equal(seenQuery.role, "authority");
    assert.equal(seenQuery.authorityStatus, "verified");
    assert.ok(seenQuery.lastSeenAt.$gte instanceof Date);
    assert.deepEqual(Object.keys(res.body.data).sort(), ["authorities", "windowSeconds"]);
});

test("a database failure gives a clean error, not a crash", async () => {
    const User = { updateOne: async () => { throw new Error("db down"); }, countDocuments: async () => { throw new Error("db down"); } };
    const { heartbeat, summary } = createPresenceHandlers(User);
    const a = fakeRes(); await heartbeat({ user: { userId: "u1" } }, a);
    const b = fakeRes(); await summary({ user: { userId: "u1" } }, b);
    assert.equal(a.code, 500);
    assert.equal(b.code, 500);
});
