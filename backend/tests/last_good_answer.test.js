const test = require("node:test");
const assert = require("node:assert/strict");
const { remember, clear } = require("../risk-intelligence/utils/lastGoodAnswer");

test("a fresh answer is reused, so the outside service is asked once", async () => {
  clear();
  let calls = 0;
  const load = async () => { calls += 1; return { n: calls }; };
  const a = await remember("k1", load);
  const b = await remember("k1", load);
  assert.deepEqual(a, b);
  assert.equal(calls, 1);
});

test("when asking fails, the last good answer is returned, and an error only when nothing is remembered", async () => {
  clear();
  let t = 0;
  const now = () => t;
  const good = async () => "sunny";
  const bad = async () => { throw new Error("Open-Meteo returned status 429."); };
  await assert.rejects(remember("k2", bad, { now }), /429/);
  assert.equal(await remember("k2", good, { now }), "sunny");
  t = 11 * 60 * 1000; // older than the fresh time, so it asks again, fails, and falls back
  assert.equal(await remember("k2", bad, { now }), "sunny");
  t = 7 * 60 * 60 * 1000; // older than the fallback time
  await assert.rejects(remember("k2", bad, { now }), /429/);
});

test("two people asking at once share one request", async () => {
  clear();
  let calls = 0;
  const slow = () => new Promise((resolve) => setTimeout(() => { calls += 1; resolve("ok"); }, 20));
  const [a, b] = await Promise.all([remember("k3", slow), remember("k3", slow)]);
  assert.equal(a, "ok");
  assert.equal(b, "ok");
  assert.equal(calls, 1);
});
