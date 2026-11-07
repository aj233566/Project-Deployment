import { test } from "node:test";
import assert from "node:assert/strict";
import { getLoginPath } from "./loginRouting.js";
test("role-specific protected paths choose the matching login page", () => {
  assert.equal(getLoginPath("/dashboard/citizen"), "/login/citizen");
  assert.equal(getLoginPath("/citizen/incidents"), "/login/citizen");
  assert.equal(getLoginPath("/dashboard/authority"), "/login/authority");
  assert.equal(getLoginPath("/incidents"), "/login/authority");
  assert.equal(getLoginPath("/login"), "/login");
});
