import assert from "node:assert/strict";
import test from "node:test";
import { calculateRiskHeatmapNodes } from "./riskHeatmapCalculator.js";
const zone = {
  id: "z1",
  name: "Recorded zone",
  geometryType: "Circle",
  center: [27.3, 88.5],
  radius: 1000,
  riskScore: 80,
};
test("missing rainfall is not replaced with a fabricated baseline", () => {
  const [node] = calculateRiskHeatmapNodes([zone], []);
  assert.equal(node.rainfallSeverity, null);
  assert.equal(node.source, "SIMULATED");
  assert.equal(node.intensity, 0.48);
});
test("recorded zero rainfall remains zero", () => {
  const [node] = calculateRiskHeatmapNodes([{ ...zone, rainfall24hMm: 0 }], []);
  assert.equal(node.rainfallSeverity, 0);
  assert.equal(node.intensity, 0.36);
});
test("zones without risk values or geographic geometry are skipped", () => {
  assert.deepEqual(
    calculateRiskHeatmapNodes([
      { ...zone, riskScore: null },
      { ...zone, geometryType: "missing", center: undefined },
    ], []),
    [],
  );
});
