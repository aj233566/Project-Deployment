import { memo } from 'react';
function FloatingCommandDock({
  mapStyle = 'tactical',
  onSetMapStyle = () => {},
  simScenario = 'BASELINE',
  onSetScenario = () => {},
  hudMode = 'tactical',
  onSetHudMode = () => {},
  onResetView = () => {},
  cursorReadout = '—',
  cursorMapsHref = null
}) {
  const mapStyles = [
    { key: 'osm', label: 'OSM' },
    { key: 'osmdark', label: 'GIS' },
    { key: 'satellite', label: 'SAT' }
  ];
  const hudModes = [
    { key: 'tactical', label: 'TAC' },
    { key: 'operator', label: 'OPS' },
    { key: 'minimal', label: 'MIN' }
  ];
  return (
    <footer className="gis-floating-dock d-flex align-items-center flex-wrap gap-2" role="region" aria-label="Tactical Command Console">
      <div className="gis-dock-section gis-dock-meta-section d-flex align-items-center gap-2">
        <div className="gis-dock-telemetry-text d-flex align-items-center gap-2">
          <span className="gis-dock-sector-badge">SIKKIM/NH-10</span>
          <span className="gis-dock-coords gis-coord-readout d-none d-sm-inline">
            <span className="gis-dock-coords-label">CUR</span>{' '}
            {cursorMapsHref ? (
              <a
                className="gis-coord-link"
                href={cursorMapsHref}
                target="_blank"
                rel="noopener noreferrer"
                title="Open cursor position in OpenStreetMap (WGS-84)"
              >
                {cursorReadout}
              </a>
            ) : cursorReadout}
          </span>
          <span className="gis-dock-status-dot-pulse" title="Telemetry Stream Active" />
        </div>
      </div>

      <div className="gis-dock-section gis-dock-sim-section d-flex align-items-center gap-2 flex-wrap">
        <span className="gis-dock-section-title">SCENARIO:</span>
        <div className="gis-dock-button-group d-flex align-items-center flex-wrap gap-1">
          <button
            className={`gis-dock-btn ${simScenario === 'BASELINE' ? 'is-active' : ''}`}
            onClick={() => onSetScenario('BASELINE')}
            title="Synthetic multi-hazard demo baseline"
          >
            BASELINE
          </button>
          <button
            className={`gis-dock-btn ${simScenario === 'TRAFFIC_SPIKE' ? 'is-active' : ''}`}
            onClick={() => onSetScenario('TRAFFIC_SPIKE')}
            title="Evacuation Convoy Surge (Western Ridge Delayed)"
          >
            TRAFFIC SURGE
          </button>
          <button
            className={`gis-dock-btn ${simScenario === 'CLEAR_RING_ROAD_R17' ? 'is-active-sim' : ''}`}
            onClick={() => onSetScenario('CLEAR_RING_ROAD_R17')}
            title="BRO Clearance Complete (NH-10 Restored)"
          >
            NH-10 CLEARED
          </button>
        </div>
      </div>

      <div className="gis-dock-section gis-dock-controls-section d-flex align-items-center flex-wrap gap-2">
        <div className="gis-dock-button-group gis-dock-style-group d-flex align-items-center flex-wrap gap-1">
          {mapStyles.map((st) => (
            <button
              key={st.key}
              className={`gis-dock-btn ${mapStyle === st.key ? 'is-active' : ''}`}
              onClick={() => onSetMapStyle(st.key)}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div className="gis-dock-button-group gis-dock-hud-group d-flex align-items-center flex-wrap gap-1">
          {hudModes.map((m) => (
            <button
              key={m.key}
              className={`gis-dock-btn ${hudMode === m.key ? 'is-active' : ''}`}
              onClick={() => onSetHudMode(m.key === 'TAC' ? 'tactical' : m.key === 'OPS' ? 'operator' : m.key.toLowerCase())}
            >
              {m.label}
            </button>
          ))}
        </div>

        <button
          className="gis-dock-btn gis-dock-btn-reset"
          onClick={onResetView}
          title="Reset View Reticle"
        >
          ⌖ RESET
        </button>
      </div>
    </footer>
  );
}
export default memo(FloatingCommandDock);
