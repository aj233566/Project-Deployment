const PRESET_DEFINITIONS = {
  safety: {
    label: "Safety",
    description: "Prioritizes reported incidents, assessed zones, and affected places.",
    intent: "Elevates incidents, zones, habitations, relocation sites, and alerts; mutes secondary overlays.",
    layers: [
      "incidents",
      "redZones",
      "habitations",
      "relocationSites",
      "roads",
      "routes",
      "hospitals",
      "shelters",
      "alerts",
    ],
    elevatedLayers: ["incidents", "redZones", "habitations", "relocationSites", "alerts"],
    suppressedLayers: ["heatmap", "quakes", "fires", "bhuvan", "zones", "liveMed", "villages", "resources"],
  },
  evacuation: {
    label: "Evacuation",
    description: "Prioritizes relocation sites, reported road status, and response context.",
    intent: "Elevates relocation, road, route, shelter, resource, incident, zone, and alert layers; mutes background hazard feeds.",
    layers: [
      "incidents",
      "redZones",
      "habitations",
      "relocationSites",
      "roads",
      "routes",
      "shelters",
      "resources",
      "alerts",
    ],
    elevatedLayers: [
      "incidents",
      "redZones",
      "relocationSites",
      "roads",
      "routes",
      "shelters",
      "resources",
      "alerts",
    ],
    suppressedLayers: ["heatmap", "quakes", "fires", "bhuvan", "zones", "liveMed", "villages", "hospitals"],
  },
  hazards: {
    label: "Hazard context",
    description: "Prioritizes assessed zones and external hazard observations.",
    intent: "Elevates hazard and incident context; suppresses service and route layers that are not the current focus.",
    layers: [
      "incidents",
      "redZones",
      "habitations",
      "riskZones",
      "heatmap",
      "quakes",
      "zones",
      "fires",
      "bhuvan",
      "alerts",
    ],
    elevatedLayers: ["incidents", "redZones", "riskZones", "heatmap", "quakes", "zones", "fires", "bhuvan", "alerts"],
    suppressedLayers: ["roads", "routes", "hospitals", "shelters", "resources", "relocationSites", "liveMed", "villages"],
  },
  services: {
    label: "Services",
    description: "Prioritizes facilities, registered sites, resources, and access context.",
    intent: "Elevates services and access layers; mutes hazard context so facilities remain easier to find.",
    layers: [
      "roads",
      "villages",
      "hospitals",
      "shelters",
      "resources",
      "relocationSites",
      "liveMed",
      "zones",
    ],
    elevatedLayers: ["roads", "villages", "hospitals", "shelters", "resources", "relocationSites", "liveMed"],
    suppressedLayers: ["incidents", "redZones", "riskZones", "heatmap", "quakes", "fires", "bhuvan", "alerts", "routes"],
  },
};
const MANAGED_LAYERS = [...new Set(Object.values(PRESET_DEFINITIONS).flatMap(({ layers }) => layers))];
function createVisualState(presetId, preset) {
  const enabledLayers = new Set(preset.layers);
  const elevatedLayers = new Set(preset.elevatedLayers);
  const suppressedLayers = new Set(preset.suppressedLayers);
  return {
    presetId,
    elevatedLayers: [...preset.elevatedLayers],
    suppressedLayers: [...preset.suppressedLayers],
    layerStyles: Object.fromEntries(
      MANAGED_LAYERS.map((layer) => {
        const enabled = enabledLayers.has(layer);
        const elevated = elevatedLayers.has(layer);
        const suppressed = suppressedLayers.has(layer);
        return [layer, {
          opacity: enabled ? (elevated ? 1 : suppressed ? 0.28 : 0.72) : 0,
          zIndex: elevated ? 470 : suppressed ? 390 : 420,
          visibility: enabled ? "visible" : "hidden",
        }];
      }),
    ),
  };
}
const LAYER_PRESETS = Object.fromEntries(
  Object.entries(PRESET_DEFINITIONS).map(([id, preset]) => [
    id,
    {
      ...preset,
      visualState: createVisualState(id, preset),
    },
  ]),
);
function cloneVisualState(visualState) {
  return {
    presetId: visualState.presetId,
    elevatedLayers: [...visualState.elevatedLayers],
    suppressedLayers: [...visualState.suppressedLayers],
    layerStyles: Object.fromEntries(
      Object.entries(visualState.layerStyles).map(([layer, style]) => [layer, { ...style }]),
    ),
  };
}
export function getLayerPreset(presetId) {
  return LAYER_PRESETS[presetId] || null;
}
export function getLayerPresetVisualState(presetId) {
  const preset = getLayerPreset(presetId);
  return preset ? cloneVisualState(preset.visualState) : null;
}
export function applyLayerPreset(currentVisibility, presetId) {
  const preset = getLayerPreset(presetId);
  if (!preset) return currentVisibility;
  const enabledLayers = new Set(preset.layers);
  return {
    ...Object.fromEntries(
      MANAGED_LAYERS.map((layer) => [layer, enabledLayers.has(layer)]),
    ),
    visualState: cloneVisualState(preset.visualState),
  };
}
export function isLayerPresetActive(currentVisibility = {}, presetId) {
  const preset = getLayerPreset(presetId);
  if (!preset) return false;
  const enabledLayers = new Set(preset.layers);
  return MANAGED_LAYERS.every(
    (layer) => (currentVisibility[layer] !== false) === enabledLayers.has(layer),
  );
}
export const GIS_LAYER_PRESETS = Object.entries(LAYER_PRESETS).map(([id, preset]) => ({
  id,
  label: preset.label,
  description: preset.description,
  intent: preset.intent,
  layers: [...preset.layers],
  elevatedLayers: [...preset.elevatedLayers],
  suppressedLayers: [...preset.suppressedLayers],
  visualState: cloneVisualState(preset.visualState),
}));
export const GIS_MANAGED_LAYERS = [...MANAGED_LAYERS];
