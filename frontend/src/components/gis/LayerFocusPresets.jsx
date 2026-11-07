import { memo, useState } from "react";
import {
  GIS_LAYER_PRESETS,
  isLayerPresetActive,
} from "../../utils/gis/layerPresets";
// `activeId` lets a map whose layers are not the Live Map's say which preset is on; otherwise it is worked out from layerVisibility.
function LayerFocusPresets({ layerVisibility = {}, onApplyPreset = () => {}, idPrefix = "map", activeId }) {
  const [announcement, setAnnouncement] = useState("");
  const layersControlId = `${idPrefix}-layers`;
  const applyPreset = (preset) => {
    onApplyPreset(preset.id);
    setAnnouncement(`${preset.label} map view applied. ${preset.intent} Source data and records were not altered.`);
  };
  return (
    <section className="gis-focus-presets" aria-labelledby={`${idPrefix}-focus-title`}>
      <span id={`${idPrefix}-focus-title`} className="gis-section-subtitle">MAP FOCUS</span>
      <p className="gis-focus-help gis-focus-intro">
        Presets change layer visibility and visual priority only; they do not filter, edit, or verify source data.
      </p>
      <div className="gis-focus-presets-list" role="group" aria-label="Choose operational map view">
        {GIS_LAYER_PRESETS.slice(0, 3).map((preset) => (
          (() => {
            const isActive = activeId === undefined ? isLayerPresetActive(layerVisibility, preset.id) : activeId === preset.id;
            const detailsId = `${idPrefix}-focus-${preset.id}-details`;
            return (
              <button
                key={preset.id}
                type="button"
                className={`gis-focus-preset ${isActive ? "active" : ""}`}
                onClick={() => applyPreset(preset)}
                aria-pressed={isActive}
                aria-controls={layersControlId}
                aria-describedby={detailsId}
                title={`${preset.label}: ${preset.intent}`}
              >
                <span className="gis-focus-preset-label">{preset.label}</span>
                <span id={detailsId} className="gis-focus-preset-intent">{preset.intent}</span>
              </button>
            );
          })()
        ))}
      </div>
      <label className="gis-focus-select-label" htmlFor={`${idPrefix}-focus-select`}>All map focus views</label>
      <select
        id={`${idPrefix}-focus-select`}
        className="gis-focus-select"
        value={activeId || ""}
        onChange={(event) => {
          const preset = GIS_LAYER_PRESETS.find(({ id }) => id === event.target.value);
          if (preset) applyPreset(preset);
        }}
      >
        <option value="" disabled>Select a map focus</option>
        {GIS_LAYER_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
      </select>
      <span className="gis-focus-help">
        Elevated layers are drawn with stronger opacity and pane priority; suppressed layers are hidden or muted.
      </span>
      <span className="visually-hidden" role="status" aria-live="polite">{announcement}</span>
    </section>
  );
}
export default memo(LayerFocusPresets);
