const test = require("node:test");
const assert = require("node:assert/strict");
const { audienceMatches } = require("../services/oauth_identity");

test("one configured app id works as before", () => {
  assert.equal(audienceMatches("app-1", "app-1"), true);
  assert.equal(audienceMatches("app-2", "app-1"), false);
});

test("several app ids can be configured, separated by commas", () => {
  const configured = " app-1 , app-2 ";
  assert.equal(audienceMatches("app-1", configured), true);
  assert.equal(audienceMatches("app-2", configured), true);
  assert.equal(audienceMatches("app-3", configured), false);
});

test("a token issued to a list of apps matches when one of them is configured", () => {
  assert.equal(audienceMatches(["x", "app-2"], "app-1,app-2"), true);
  assert.equal(audienceMatches(["x", "y"], "app-1,app-2"), false);
});

test("nothing configured, or nothing in the token, never matches", () => {
  assert.equal(audienceMatches("app-1", ""), false);
  assert.equal(audienceMatches("app-1", undefined), false);
  assert.equal(audienceMatches(undefined, "app-1"), false);
  assert.equal(audienceMatches("", ",,"), false);
});
