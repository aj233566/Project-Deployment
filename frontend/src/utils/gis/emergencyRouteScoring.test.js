import assert from "node:assert/strict";
import test from "node:test";
import { rankEmergencyRoutes, scoreEmergencyRoute } from "./emergencyRouteScoring.js";
test("a route without recorded physical road status is not recommended", () => {
  const route = {
    id: "route-unknown",
    trafficAwareEtaMin: 12,
    trafficLevel: "NORMAL",
    roadStatus: "UNKNOWN",
  };
  const score = scoreEmergencyRoute(route);
  const [ranked] = rankEmergencyRoutes([route]);
  assert.equal(score.isPassable, false);
  assert.match(score.recommendationStatus, /ROAD STATUS UNAVAILABLE/);
  assert.equal(ranked.status, "Unconfirmed");
});
test("a blocked route remains excluded and a recorded open route can be ranked", () => {
  const [blocked, open] = rankEmergencyRoutes([
    { id: "blocked", trafficAwareEtaMin: 8, roadStatus: "BLOCKED" },
    { id: "open", trafficAwareEtaMin: 12, roadStatus: "OPEN" },
  ]);
  assert.equal(blocked.status, "Blocked");
  assert.equal(open.status, "Recommended");
});
