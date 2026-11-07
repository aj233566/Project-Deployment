import { useState, useEffect } from 'react';
import { ZONE_LEVELS, zoneSymbologyFor } from '../../config/hazardSymbology';
import { zonePinMarkup } from '../../utils/commandCenter/fxMarkup';
import { GIS_LAYER_PRESETS, isLayerPresetActive } from '../../utils/gis/layerPresets';
function layerIsVisible(layerVisibility, layerKey) {
  return layerVisibility == null || layerVisibility[layerKey] !== false;
}
function getDataStatusNote({ dataFreshness, demoMode, isSimActive }) {
  if (demoMode || dataFreshness === 'demo') {
    return 'Data state: demonstration values are illustrative and are not live observations.';
  }
  if (isSimActive) {
    return 'Scenario overlay active: scenario values are illustrative and do not replace source observations.';
  }
  if (dataFreshness === 'live') {
    return 'Data state: a live source is reported; freshness can differ by layer, so check each feature timestamp.';
  }
  if (dataFreshness === 'stale') {
    return 'Data state: stale. Confirm each feature timestamp and source before acting.';
  }
  if (dataFreshness === 'loading') {
    return 'Data state: loading. This key defines symbols; it does not confirm that records are available yet.';
  }
  if (dataFreshness === 'error') {
    return 'Data state: unavailable. This key does not confirm that a layer loaded or that an area is safe.';
  }
  return 'Data freshness is not asserted by this key; check the layer status and feature source before acting.';
}
function getActivePreset(layerVisibility, activePresetId) {
  if (activePresetId) {
    return GIS_LAYER_PRESETS.find((preset) => preset.id === activePresetId) || null;
  }
  if (!layerVisibility) return null;
  return GIS_LAYER_PRESETS.find((preset) => isLayerPresetActive(layerVisibility, preset.id)) || null;
}
export default function MapLegend({
  hudMode = 'tactical',
  demoMode = false,
  isSimActive = false,
  layerVisibility = null,
  activePresetId = null,
  dataFreshness = 'unknown',
  idPrefix = 'map',
}) {
  const isDesktop = () => typeof window !== 'undefined' && window.innerWidth >= 992;
  const [isCollapsed, setIsCollapsed] = useState(!isDesktop() && hudMode !== 'tactical');
  const panelId = `${idPrefix}-map-key-body`;
  const titleId = `${idPrefix}-map-key-title`;
  const activePreset = getActivePreset(layerVisibility, activePresetId);
  useEffect(() => {
    const apply = () => {
      if (isDesktop()) return setIsCollapsed(false);
      setIsCollapsed(hudMode !== 'tactical' || window.innerHeight < 480);
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, [hudMode]);
  const show = (layerKey) => layerIsVisible(layerVisibility, layerKey);
  const showSeverity = show('incidents') || show('alerts');
  const showHazardZones = show('redZones') || show('riskZones') || show('heatmap') || show('quakes') || show('zones') || show('fires') || show('bhuvan');
  const showHabitation = show('habitations');
  const showRelocation = show('relocationSites');
  const showFeatures = show('incidents') || showHabitation || showRelocation || show('villages') || show('hospitals') || show('shelters') || show('resources') || show('liveMed');
  const showRoads = show('roads') || show('routes');
  const scopedToLayers = layerVisibility != null;
  const noEnabledLayers = scopedToLayers && ![
    'incidents', 'alerts', 'redZones', 'riskZones', 'heatmap', 'quakes', 'zones', 'fires', 'bhuvan',
    'habitations', 'relocationSites', 'villages', 'hospitals', 'shelters', 'resources', 'liveMed', 'roads', 'routes',
  ].some(show);
  const scopeText = activePreset
    ? `${activePreset.label} focus is selected. The key below describes the layers in that focus; it does not indicate that records are present.`
    : scopedToLayers
      ? 'This key follows the currently enabled layer controls. A missing symbol is not proof that an area is safe.'
      : 'This key defines symbols that may appear on the map. It does not assert that every feature is present, current, or verified.';
  return (
    <section
      className={`gis-legend-overlay ${isCollapsed ? 'collapsed' : ''}`}
      aria-labelledby={titleId}
    >
      <div className="gis-panel-header d-flex align-items-center justify-content-between gap-2">
        <h2 id={titleId} className="gis-panel-title d-flex align-items-center gap-1">
          <span aria-hidden="true" style={{ color: 'var(--color-info)' }}>//</span>
          <span>MAP KEY</span>
        </h2>
        <button
          type="button"
          className="gis-collapse-btn"
          aria-label={isCollapsed ? 'Expand map key' : 'Collapse map key'}
          aria-expanded={!isCollapsed}
          aria-controls={panelId}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? '+' : '−'}
        </button>
      </div>

      {!isCollapsed && (
        <div id={panelId} className="gis-panel-body row row-cols-1 row-cols-sm-2 row-cols-md-1 g-3">
          <p className="gis-legend-context col">
            <strong>{scopeText}</strong>
            <span>{getDataStatusNote({ dataFreshness, demoMode, isSimActive })}</span>
          </p>

          {noEnabledLayers ? (
            <p className="gis-legend-empty col" role="status">
              No map layers are enabled. Enable a layer to see its symbol key; an empty map is not a safety assessment.
            </p>
          ) : null}

          {showSeverity ? (
            <div className="gis-legend-section col">
              <h3 className="gis-section-label">SEVERITY MARKERS</h3>
              <div className="gis-legend-items d-flex flex-column gap-1">
                <div className="gis-legend-row d-flex align-items-center gap-2">
                  <span className="gis-legend-dot critical-pulse" aria-hidden="true" />
                  <span>Critical incident or alert</span>
                </div>
                <div className="gis-legend-row d-flex align-items-center gap-2">
                  <span className="gis-legend-dot high" aria-hidden="true" />
                  <span>High-severity incident or alert</span>
                </div>
                <div className="gis-legend-row d-flex align-items-center gap-2">
                  <span className="gis-legend-dot warning" aria-hidden="true" />
                  <span>Warning-level incident or alert</span>
                </div>
                <div className="gis-legend-row d-flex align-items-center gap-2">
                  <span className="gis-legend-dot operational" aria-hidden="true" />
                  <span>Operational / lower-severity marker</span>
                </div>
              </div>
            </div>
          ) : null}

          {showHazardZones || showHabitation || showRelocation ? (
            <div className="gis-legend-section col">
              <h3 className="gis-section-label">HAZARD ZONES &amp; MARKERS</h3>
              <div className="gis-legend-items d-flex flex-column gap-1">
                {showHazardZones && ZONE_LEVELS.map((level) => {
                  const sym = zoneSymbologyFor(level);
                  return (
                    <div className="gis-legend-row d-flex align-items-center gap-2" key={level}>
                      <span
                        className="gis-zone-swatch"
                        aria-hidden="true"
                        dangerouslySetInnerHTML={{ __html: `<span class="zone-pin zone-pin-sm">${zonePinMarkup(sym.color, level)}</span>` }}
                      />
                      <span>{sym.description}</span>
                    </div>
                  );
                })}
                {showHabitation ? (
                  <div className="gis-legend-row d-flex align-items-center gap-2">
                    <span className="gis-legend-icon-badge village" aria-hidden="true">⌂</span>
                    <span>Registered habitation record</span>
                  </div>
                ) : null}
                {showRelocation ? (
                  <div className="gis-legend-row d-flex align-items-center gap-2">
                    <span className="gis-legend-icon-badge resource" aria-hidden="true">＋</span>
                    <span>Registered relocation site record</span>
                  </div>
                ) : null}
                <small className="gis-legend-note">
                  Zone colour and shape are paired for accessibility. A location without a stored assessment is unassessed, not verified safe.
                </small>
              </div>
            </div>
          ) : null}

          {showFeatures ? (
            <div className="gis-legend-section col">
              <h3 className="gis-section-label">FEATURES</h3>
              <div className="gis-legend-items d-flex flex-column gap-1">
                {show('incidents') ? (
                  <div className="gis-legend-row d-flex align-items-center gap-2">
                    <span className="gis-legend-icon-badge incident" aria-hidden="true">⚠</span>
                    <span>Reported hazard / incident</span>
                  </div>
                ) : null}
                {show('villages') ? (
                  <div className="gis-legend-row d-flex align-items-center gap-2">
                    <span className="gis-legend-icon-badge village" aria-hidden="true">⌂</span>
                    <span>Settlement / village marker</span>
                  </div>
                ) : null}
                {show('hospitals') || show('liveMed') ? (
                  <div className="gis-legend-row d-flex align-items-center gap-2">
                    <span className="gis-legend-icon-badge hospital" aria-hidden="true">+</span>
                    <span>Hospital / clinic record</span>
                  </div>
                ) : null}
                {show('shelters') ? (
                  <div className="gis-legend-row d-flex align-items-center gap-2">
                    <span className="gis-legend-icon-badge shelter" aria-hidden="true">⛺</span>
                    <span>Relief shelter record</span>
                  </div>
                ) : null}
                {show('resources') ? (
                  <div className="gis-legend-row d-flex align-items-center gap-2">
                    <span className="gis-legend-icon-badge resource" aria-hidden="true">⛟</span>
                    <span>Registered response resource</span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {demoMode ? (
            <div className="gis-legend-section col">
              <h3 className="gis-section-label">DEMO COMPOSITE INDEX (0-1)</h3>
              <div className="gis-legend-items d-flex flex-column gap-1">
                <div className="gis-legend-row d-flex align-items-center gap-2">
                  <span className="gis-legend-dot critical-pulse" aria-hidden="true" />
                  <span>Critical (≥0.80)</span>
                </div>
                <div className="gis-legend-row d-flex align-items-center gap-2">
                  <span className="gis-legend-dot high" aria-hidden="true" />
                  <span>High (≥0.60)</span>
                </div>
                <div className="gis-legend-row d-flex align-items-center gap-2">
                  <span className="gis-legend-dot warning" aria-hidden="true" />
                  <span>Warning (≥0.35)</span>
                </div>
                <small className="gis-legend-note">Illustrative composite of demo risk, incident, and precipitation inputs; not a calibrated probability.</small>
              </div>
            </div>
          ) : null}

          {showRoads ? (
            <div className="gis-legend-section col">
              <h3 className="gis-section-label">ROAD CONNECTIVITY</h3>
              <div className="gis-legend-items d-flex flex-column gap-1">
                {show('roads') ? (
                  <>
                    <div className="gis-legend-row d-flex align-items-center gap-2">
                      <span className="gis-legend-line connected" aria-hidden="true" />
                      <span>Reported open</span>
                    </div>
                    <div className="gis-legend-row d-flex align-items-center gap-2">
                      <span className="gis-legend-line restricted" aria-hidden="true" />
                      <span>Reported restricted / convoy</span>
                    </div>
                    <div className="gis-legend-row d-flex align-items-center gap-2">
                      <span className="gis-legend-line blocked" aria-hidden="true" />
                      <span>Reported blocked road</span>
                    </div>
                  </>
                ) : null}
                {show('routes') ? (
                  <div className="gis-legend-row d-flex align-items-center gap-2">
                    <span className="gis-legend-line primary-route" aria-hidden="true" />
                    <span>Reference route geometry (if provided)</span>
                  </div>
                ) : null}
                {showHazardZones ? (
                  <div className="gis-legend-row d-flex align-items-center gap-2">
                    <span className="gis-legend-poly risk-zone" aria-hidden="true" />
                    <span>Multi-hazard zone</span>
                  </div>
                ) : null}
                <small className="gis-legend-note">
                  Road status comes from the active source. A road or reference line is not a promise of safe passage or an ETA.
                </small>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
