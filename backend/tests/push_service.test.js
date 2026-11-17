const test = require("node:test");
const assert = require("node:assert/strict");
const push = require("../services/push_service");

const fakeModel = (rows) => ({ deleted: [], find() { return { lean: async () => rows }; }, async deleteMany(q) { this.deleted.push(...q.token.$in); } });

test("without Firebase set up, nothing is sent and the server says so", () => {
  push._reset();
  delete process.env.FIREBASE_SERVICE_ACCOUNT;
  assert.equal(push.enabled(), false);
  push.ping({ delayMs: 1 }); // must not throw
});

test("every phone gets one silent high-priority message that carries nothing private", async () => {
  const calls = [];
  const m = { sendEachForMulticast: async (msg) => { calls.push(msg); return { responses: msg.tokens.map(() => ({})) }; } };
  await push.sendToAll(m, { model: fakeModel([{ token: "a".repeat(30) }, { token: "b".repeat(30) }]) });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].data, { type: "notification" });
  assert.equal(calls[0].android.priority, "high");
  assert.equal(calls[0].notification, undefined);
});

test("phones that no longer exist are forgotten, others are kept", async () => {
  const gone = "g".repeat(30), kept = "k".repeat(30);
  const m = { sendEachForMulticast: async () => ({ responses: [{ error: { code: "messaging/registration-token-not-registered" } }, {}] }) };
  const model = fakeModel([{ token: gone }, { token: kept }]);
  await push.sendToAll(m, { model });
  assert.deepEqual(model.deleted, [gone]);
});

test("more than 500 phones are sent in groups of 500", async () => {
  const rows = Array.from({ length: 1100 }, (_, i) => ({ token: String(i).padStart(30, "t") }));
  const sizes = [];
  const m = { sendEachForMulticast: async (msg) => { sizes.push(msg.tokens.length); return { responses: msg.tokens.map(() => ({})) }; } };
  await push.sendToAll(m, { model: fakeModel(rows) });
  assert.deepEqual(sizes, [500, 500, 100]);
});

test("several notifications saved together cause one push", async () => {
  let sent = 0;
  const m = { sendEachForMulticast: async (msg) => { sent += 1; return { responses: msg.tokens.map(() => ({})) }; } };
  push._reset();
  push.ping({ messaging: m, delayMs: 20, model: fakeModel([{ token: "z".repeat(30) }]) });
  push.ping({ messaging: m, delayMs: 20, model: fakeModel([{ token: "z".repeat(30) }]) });
  push.ping({ messaging: m, delayMs: 20, model: fakeModel([{ token: "z".repeat(30) }]) });
  await new Promise((r) => setTimeout(r, 120));
  assert.ok(sent <= 1);
});
