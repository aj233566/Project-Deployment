import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBackendIncident } from "./incidentNormalizer.js";
test("incident normalization preserves a recorded zero affected population", () => {
  const incident = normalizeBackendIncident({
    _id: "incident-1",
    type: "landslide",
    hazardSubtype: "cloudburst",
    severity: "moderate",
    status: "verified",
    affectedPopulation: 0,
    location: { latitude: 27.2, longitude: 88.5 },
  });
  assert.equal(incident.affectedPopulation, 0);
  assert.equal(incident.type, "Cloudburst");
});
test("incident normalization preserves unknown severity rather than implying low risk", () => {
  const incident = normalizeBackendIncident({
    _id: "incident-2",
    type: "landslide",
    severity: null,
    location: { latitude: 27.2, longitude: 88.5 },
  });
  assert.equal(incident.severity, "Unknown");
  assert.equal(incident.affectedPopulation, null);
});
