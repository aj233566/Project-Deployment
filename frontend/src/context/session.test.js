import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hasActiveSession,
  clearSession,
  isAuthRoute,
  shouldRedirectToLogin,
} from "./session.js";
function makeStorage(initial = {}) {
  const store = { ...initial };
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    _store: store,
  };
}
test("hasActiveSession is true only with a non-empty token", () => {
  assert.equal(hasActiveSession(makeStorage({ token: "abc" })), true);
  assert.equal(hasActiveSession(makeStorage({ token: "  " })), false);
  assert.equal(hasActiveSession(makeStorage({})), false);
});
test("clearSession removes both token and user", () => {
  const s = makeStorage({ token: "abc", user: "{}", other: "keep" });
  clearSession(s);
  assert.equal(s.getItem("token"), null);
  assert.equal(s.getItem("user"), null);
  assert.equal(s.getItem("other"), "keep");
});
test("isAuthRoute recognizes generic and role-specific login routes", () => {
  assert.equal(isAuthRoute("/login"), true);
  assert.equal(isAuthRoute("/login/citizen"), true);
  assert.equal(isAuthRoute("/login/authority"), true);
  assert.equal(isAuthRoute("/signup"), true);
  assert.equal(isAuthRoute("/dashboard/citizen"), false);
  assert.equal(isAuthRoute("/dashboard/authority"), false);
});
test("shouldRedirectToLogin only on 401 away from auth routes", () => {
  assert.equal(shouldRedirectToLogin(401, "/dashboard/citizen"), true);
  assert.equal(shouldRedirectToLogin(401, "/dashboard/authority"), true);
  assert.equal(shouldRedirectToLogin(401, "/login"), false);                         
  assert.equal(shouldRedirectToLogin(500, "/dashboard/citizen"), false);
  assert.equal(shouldRedirectToLogin(undefined, "/dashboard/citizen"), false);
});
