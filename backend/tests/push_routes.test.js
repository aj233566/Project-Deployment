const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const express = require("express");

// A signed-in phone, as the real login middleware describes it: req.user is the decoded token, and the account id is req.user.userId.
const middleware = path.resolve(__dirname, "../middlewares/auth_middleware.js");
const model = path.resolve(__dirname, "../models/push_token.js");
const calls = { update: [], remove: [] };
const stub = (file, exports) => { require.cache[file] = { id: file, filename: file, loaded: true, exports }; };
stub(middleware, { protect: (req, res, next) => { req.user = { userId: "account-1", role: "citizen", sessionId: "s" }; next(); } });
stub(model, {
  findOneAndUpdate: async (...args) => { calls.update.push(args); return {}; },
  deleteOne: async (...args) => { calls.remove.push(args); return {}; },
});
delete require.cache[path.resolve(__dirname, "../routes/push_routes.js")];
const router = require("../routes/push_routes");

const start = () => new Promise((resolve) => {
  const app = express();
  app.use(express.json());
  app.use("/api/push", router);
  const server = app.listen(0, () => resolve({ server, base: `http://127.0.0.1:${server.address().port}/api/push/token` }));
});
const send = (base, method, body) => fetch(base, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

test("a signed-in phone saves its push address under its own account", async () => {
  const { server, base } = await start();
  try {
    const res = await send(base, "POST", { token: "t".repeat(40) });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(typeof body.enabled, "boolean");
    const [filter, update] = calls.update.at(-1);
    assert.equal(filter.token, "t".repeat(40));
    assert.equal(update.userId, "account-1", "the account id comes from req.user.userId");
  } finally { server.close(); }
});

test("a push address that is not one is refused and nothing is saved", async () => {
  const { server, base } = await start();
  try {
    const before = calls.update.length;
    assert.equal((await send(base, "POST", { token: "short" })).status, 400);
    assert.equal((await send(base, "POST", {})).status, 400);
    assert.equal(calls.update.length, before);
  } finally { server.close(); }
});

test("signing out removes only that account's push address", async () => {
  const { server, base } = await start();
  try {
    assert.equal((await send(base, "DELETE", { token: "t".repeat(40) })).status, 200);
    const [filter] = calls.remove.at(-1);
    assert.deepEqual(filter, { token: "t".repeat(40), userId: "account-1" });
  } finally { server.close(); }
});
