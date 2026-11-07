import { useState, useEffect, memo } from 'react';
import AnimatedCount from './AnimatedCount';
import { getIncidentSequenceDuration } from '../../utils/gis/incidentArrivalSequence';
function TacticalTelemetryHUD({
  incidentCount = null,
  criticalCount = null,
  blockedRoadCount = null,
  isolatedVillagesCount = null,
  currentPrecipitation = 'Data unavailable',
  precipitationStatus = 'UNAVAILABLE',
  maxRiskScore = null,
  hospitalAccessCount = 'Data unavailable',
  activeResourcesCount = null,
  hudMode = 'tactical',
  weatherSource = 'No source data'
}) {
  const formatCount = (value) => Number.isFinite(value)
    ? String(value).padStart(2, "0")
    : "—";
  const incidentCountDuration = getIncidentSequenceDuration(incidentCount);
  const hasNoData = (v) => v == null || /unavailable|no (source|weather)|^—$/i.test(String(v));
  const shownValue = (v) => (hasNoData(v) ? "—" : v);
  const riskScoreClass = (score) => {
    if (!Number.isFinite(score)) return "muted";
    if (score >= 67) return "critical";
    if (score >= 34) return "warning";
    return "operational";
  };
  const countClass = (value) => value === null || value === undefined
    ? "gis-hud-val"
    : value > 0 ? "gis-hud-val critical" : "gis-hud-val operational";
  const isDesktop = () => typeof window !== 'undefined' && window.innerWidth >= 992;
  const [isCollapsed, setIsCollapsed] = useState(!isDesktop() && hudMode === 'minimal');
  useEffect(() => {
    const apply = () => {
      if (isDesktop()) return setIsCollapsed(false);
      setIsCollapsed(hudMode === 'minimal' || window.innerHeight < 480);
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, [hudMode]);
  return (
    <div className={`gis-telemetry-hud ${isCollapsed ? 'collapsed' : ''}`}>
      <div
        className="gis-panel-header d-flex align-items-center justify-content-between gap-2"
        onClick={() => setIsCollapsed(!isCollapsed)}
        role="button"
        tabIndex={0}
        aria-expanded={!isCollapsed}
      >
        <div className="gis-hud-title d-flex align-items-center gap-1">
          <span style={{ color: 'var(--color-info)' }}>//</span>
          <span>SITUATION</span>
          {isCollapsed && (
            <span className="gis-hud-collapsed-summary">
              {incidentCount ?? "—"} INC {criticalCount > 0 ? `• ${criticalCount} CRIT` : ''}
            </span>
          )}
        </div>
        <button
          className="gis-collapse-btn"
          aria-label={isCollapsed ? 'Expand situation HUD' : 'Collapse situation HUD'}
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(!isCollapsed);
          }}
        >
          {isCollapsed ? '+' : '−'}
        </button>
      </div>

      {!isCollapsed && (
        <div className="gis-panel-body d-flex flex-column gap-1">
          <div className="gis-hud-row d-flex align-items-center justify-content-between">
            <span className="gis-hud-label">ACTIVE INCIDENTS</span>
            <span className={countClass(incidentCount)}>
              <AnimatedCount value={incidentCount} format={formatCount} initialDuration={incidentCountDuration} easing="linear" />
            </span>
          </div>

          <div className="gis-hud-row d-flex align-items-center justify-content-between">
            <span className="gis-hud-label">CRITICAL ALERTS</span>
            <span className={countClass(criticalCount)}><AnimatedCount value={criticalCount} format={formatCount} /></span>
          </div>

          <div className="gis-hud-row d-flex align-items-center justify-content-between">
            <span className="gis-hud-label">BLOCKED CORRIDORS</span>
            <span className={countClass(blockedRoadCount)}>
              <AnimatedCount value={blockedRoadCount} format={formatCount} />
            </span>
          </div>

          <div className="gis-hud-row d-flex align-items-center justify-content-between">
            <span className="gis-hud-label">ISOLATED VILLAGES</span>
            <span className={countClass(isolatedVillagesCount)}>
              <AnimatedCount value={isolatedVillagesCount} format={formatCount} />
            </span>
          </div>

          <div className="gis-hud-row d-flex align-items-center justify-content-between">
            <span className="gis-hud-label">CURRENT PRECIP</span>
            <span className={`gis-hud-val ${hasNoData(currentPrecipitation) ? "muted" : ["LIVE", "DEMO"].includes(precipitationStatus) ? "warning" : ""}`}>{shownValue(currentPrecipitation)}</span>
          </div>

          <div className="gis-hud-row d-flex align-items-center justify-content-between">
            <span className="gis-hud-label">MAX RISK SCORE</span>
            <span className={`gis-hud-val ${riskScoreClass(maxRiskScore)}`}>{Number.isFinite(maxRiskScore) ? `${maxRiskScore}/100` : '—'}</span>
          </div>

          <div className="gis-hud-row d-flex align-items-center justify-content-between">
            <span className="gis-hud-label">HOSPITALS</span>
            <span className={`gis-hud-val ${hasNoData(hospitalAccessCount) ? "muted" : ""}`}>
              {shownValue(hospitalAccessCount)}
            </span>
          </div>

          <div className="gis-hud-row d-flex align-items-center justify-content-between">
            <span className="gis-hud-label">REGISTERED RESOURCES</span>
            <span className="gis-hud-val operational">{Number.isFinite(activeResourcesCount) ? String(activeResourcesCount).padStart(2, '0') : '—'}</span>
          </div>

          <div className="gis-hud-footer">
            <span>PROVENANCE: {weatherSource}</span>
          </div>
        </div>
      )}
    </div>
  );
}
export default memo(TacticalTelemetryHUD);
