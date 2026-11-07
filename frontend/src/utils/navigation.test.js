import { test } from "node:test";
import assert from "node:assert/strict";
import { getAuthorityNavigationGroups } from "./navigation.js";

test("authority navigation makes the new command center primary and hides the old overview entry", () => {
  const groups = getAuthorityNavigationGroups({ role: "authority" });
  const links = groups.flatMap((group) => group.links || []);

  assert.equal(groups[0].label, "Command Center");
  assert.equal(links.some((link) => link.to === "/operations-overview"), false);
});
