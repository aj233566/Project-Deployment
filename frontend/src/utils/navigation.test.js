import { test } from "node:test";
import assert from "node:assert/strict";
import { getAuthorityNavigationGroups } from "./navigation.js";

test("authority navigation makes the dashboard primary and hides the retired overview entry", () => {
  const groups = getAuthorityNavigationGroups({ role: "authority" });
  const links = groups.flatMap((group) => group.links || []);

  assert.equal(groups[0].label, "Dashboard");
  assert.equal(links.some((link) => link.to === "/operations-overview"), false);
});
