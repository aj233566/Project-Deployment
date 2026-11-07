import test from "node:test";
import assert from "node:assert/strict";
import {
  applyLayerPreset,
  getLayerPreset,
  getLayerPresetVisualState,
  isLayerPresetActive,
} from "./layerPresets.js";
test("evacuation view enables response layers and disables unrelated overlays", () => {
  const result = applyLayerPreset({ fires: true, incidents: false }, "evacuation");
  assert.equal(result.incidents, true);
  assert.equal(result.redZones, true);
  assert.equal(result.relocationSites, true);
  assert.equal(result.roads, true);
  assert.equal(result.routes, true);
  assert.equal(result.shelters, true);
  assert.equal(result.resources, true);
  assert.equal(result.fires, false);
  assert.equal(result.heatmap, false);
});
test("unknown preset leaves the current layer configuration untouched", () => {
  const current = { incidents: true };
  assert.equal(applyLayerPreset(current, "unknown"), current);
});
test("preset active state requires all managed layer values to match", () => {
  const safety = applyLayerPreset({}, "safety");
  assert.equal(isLayerPresetActive(safety, "safety"), true);
  assert.equal(isLayerPresetActive({ ...safety, roads: false }, "safety"), false);
  assert.equal(isLayerPresetActive(safety, "unknown"), false);
});
test("named presets expose explicit visual suppression and elevation intent", () => {
  const evacuation = getLayerPreset("evacuation");
  const visualState = getLayerPresetVisualState("evacuation");
  assert.deepEqual(evacuation.elevatedLayers, [
    "incidents",
    "redZones",
    "relocationSites",
    "roads",
    "routes",
    "shelters",
    "resources",
    "alerts",
  ]);
  assert.ok(evacuation.suppressedLayers.includes("heatmap"));
  assert.equal(visualState.layerStyles.routes.opacity, 1);
  assert.equal(visualState.layerStyles.routes.zIndex > visualState.layerStyles.heatmap.zIndex, true);
  assert.equal(visualState.layerStyles.heatmap.opacity < 0.5, true);
  assert.equal(visualState.layerStyles.heatmap.visibility, "hidden");
});
test("applying a preset carries its visual state without changing source data", () => {
  const result = applyLayerPreset({ incidents: false, customFlag: "kept out" }, "hazards");
  assert.equal(result.incidents, true);
  assert.equal(result.fires, true);
  assert.equal(result.visualState.presetId, "hazards");
  assert.equal(result.visualState.layerStyles.redZones.opacity, 1);
  assert.equal(Object.hasOwn(result, "customFlag"), false);
});
