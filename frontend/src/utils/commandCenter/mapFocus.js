// "Map focus" presets for the 3D maps: the same four views as the Live Map's right-hand panel (Safety, Evacuation, Hazard context,
// Services), expressed as which of each map's layer groups to hide. Presets change what is drawn, never the records themselves.

import { GIS_LAYER_PRESETS } from '../gis/layerPresets.js';

export const FOCUS_PRESETS = Object.freeze(GIS_LAYER_PRESETS.map(({ id, label, description }) => ({ id, label, description })));

// Layer-group keys are those of LAYER_GROUPS (3D MAP) and GLOBE_LAYERS (3D GLOBE).
const HIDDEN = Object.freeze({
  map3d: {
    safety: ['heat', 'fires', 'hazards'],
    evacuation: ['heat', 'fires', 'hazards', 'states'],
    hazards: ['roads', 'buildings', 'habitations'],
    services: ['heat', 'fires', 'hazards', 'states'],
  },
  globe: {
    safety: ['hazards'],
    evacuation: ['hazards', 'states'],
    hazards: ['sites'],
    services: ['hazards', 'states'],
  },
});

export function hiddenForFocus(mapKind, presetId) {
  return new Set(HIDDEN[mapKind]?.[presetId] || []);
}
