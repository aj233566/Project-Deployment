import { test } from "node:test";
import assert from "node:assert/strict";
import { getLoginPath } from "./loginRouting.js";

test("all unauthenticated roles use the shared login page", () => {
  assert.equal(getLoginPath("/dashboard/citizen"), "/login");
  assert.equal(getLoginPath("/citizen/incidents"), "/login");
  assert.equal(getLoginPath("/dashboard/authority"), "/login");
  assert.equal(getLoginPath("/incidents"), "/login");
  assert.equal(getLoginPath("/admin"), "/login");
  assert.equal(getLoginPath("/login"), "/login");
});