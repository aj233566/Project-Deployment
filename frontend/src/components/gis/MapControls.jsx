import { useState, useId, memo } from 'react';
import { Link } from 'react-router-dom';
import { MAP_STYLE_OPTIONS } from '../../config/mapModes';
import { mapProviderLabel } from '../../config/mapProviderLabel';
function MapControls({
  layerVisibility = {},
  onToggleLayer = () => {},
  severityFilter = 'ALL',
  onSetSeverityFilter = () => {},
  mapStyle = 'tactical',
  onSetMapStyle = () => {},
  onResetView = () => {},
  hudMode = 'tactical',
  addPointMode = false,
  onToggleAddPoint = () => {},
  userPoints = [],
  onFocusPoint = () => {},
  onDeletePoint = () => {},
  relocationSites = [],
  selectedRelocationSite = null,
  onSelectRelocationSite = () => {},
  relocationSitesLoading = false,
  relocationSitesError = "",
  selectedIncident = null,
  onRouteToNearestFacility = () => {},
  routeRequestStatus = "idle",
  routeRequestError = "",
  routeSummary = null,
  arrivalMotionEnabled = true,
  onToggleArrivalMotion = () => {},
  // The 3D maps reuse this whole panel with their own layer lists and map displays.
  primaryLayers: primaryLayersProp = null,
  moreLayers: moreLayersProp = null,
  styleOptions = MAP_STYLE_OPTIONS,
  idPrefix = 'authority',
  authorityMapPanel = false,
}) {
  const instanceId = useId().replaceAll(':', '');
  const controlIdPrefix = `${idPrefix}-${instanceId}`;
  const arrivalTitleId = `${controlIdPrefix}-arrival-motion-title`;
  const arrivalToggleId = `${controlIdPrefix}-arrival-motion-toggle`;
  const destinationTitleId = `${controlIdPrefix}-destination-title`;
  const destinationSelectId = `${controlIdPrefix}-relocation-destination`;
  const routeTitleId = `${controlIdPrefix}-route-request-title`;
  const isMobileInitial = typeof window !== 'undefined' ? (window.innerWidth < 768 || window.innerHeight < 480) : false;
  const [isCollapsed, setIsCollapsed] = useState(hudMode === 'minimal' || isMobileInitial);
  const [showMore, setShowMore] = useState(false);
  const controlsCollapsed = isCollapsed || hudMode === 'minimal';
  const primaryLayers = primaryLayersProp || [
    { key: 'incidents', label: 'INC', title: 'Emergency Incidents' },
    { key: 'redZones', label: 'ZONE', title: 'SENTRY hazard classifications' },
    { key: 'areas', label: 'AREA', title: 'Affected areas and safe zones drawn by authorities' },
    { key: 'habitations', label: 'HAB', title: 'Registered habitations' },
    { key: 'relocationSites', label: 'SITE', title: 'Registered relocation sites' },
    { key: 'routes', label: 'ROUTE', title: 'Evacuation Routes' },
    { key: 'roads', label: 'ROAD', title: 'Road Network' },
    { key: 'hospitals', label: 'HOSP', title: 'Medical Facilities' },
    { key: 'shelters', label: 'SHEL', title: 'Relief Shelters' }
  ];
  const moreLayers = moreLayersProp || [
    { key: 'villages', label: 'VILL', title: 'Demo settlement markers' },
    { key: 'riskZones', label: 'RISK', title: 'Legacy demo risk overlays' },
    { key: 'alerts', label: 'ALERT', title: 'Active geo-targeted alerts' },
    { key: 'resources', label: 'ASSET', title: 'BRO Earthmovers & SAR' },
    { key: 'heatmap', label: 'HEAT', title: 'Risk Heatmap' },
    { key: 'quakes', label: 'QUAKE', title: 'LIVE USGS Earthquakes (last 24h)' },
    { key: 'liveMed', label: 'MED+', title: 'LIVE hospitals & clinics for this view (OpenStreetMap) — zoom in to load' },
    { key: 'fires', label: 'FIRE', title: 'LIVE active fires / thermal anomalies (NASA GIBS · VIIRS 375m)' },
    { key: 'bhuvan', label: 'ISRO', title: 'ISRO Bhuvan authoritative WMS overlay' }
  ];
  const renderLayerButton = (item) => {
    const isActive = layerVisibility[item.key] !== false;
    return (
      <div className="col" key={item.key}>
        <button
          type="button"
          className={`gis-btn-compact d-flex align-items-center gap-1 w-100 ${isActive ? 'active' : ''}`}
          onClick={() => onToggleLayer(item.key)}
          aria-pressed={isActive}
          title={item.title}
        >
          <span className="gis-indicator-dot" />
          <span>{item.label}</span>
        </button>
      </div>
    );
  };
  const activeMoreCount = moreLayers.filter((l) => layerVisibility[l.key] === true).length;
  return (
    <div className={`gis-controls-overlay ${authorityMapPanel ? 'icc-authority-map-controls' : ''} ${controlsCollapsed ? 'collapsed' : ''}`}>
      <div
        className="gis-panel-header d-flex align-items-center justify-content-between gap-2"
        onClick={() => setIsCollapsed(!controlsCollapsed)}
        role="button"
        tabIndex={0}
        aria-expanded={!controlsCollapsed}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setIsCollapsed(!controlsCollapsed);
          }
        }}
      >
        <div className="gis-panel-title d-flex align-items-center gap-1">
          <span style={{ color: 'var(--color-info)' }}>//</span>
          <span>CONTROLS</span>
        </div>
        <button
          className="gis-collapse-btn"
          aria-label={controlsCollapsed ? "Expand controls" : "Collapse controls"}
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(!controlsCollapsed);
          }}
        >
          {controlsCollapsed ? '+' : '−'}
        </button>
      </div>

      {!controlsCollapsed && (
        <div className="gis-panel-body d-flex flex-column gap-3">
          <section className="gis-controls-section gis-arrival-controls" aria-labelledby={arrivalTitleId}>
            <span id={arrivalTitleId} className="gis-section-subtitle">NEW REPORT ALERT</span>
            <div className="form-check form-switch mb-0">
              <input
                id={arrivalToggleId}
                className="form-check-input"
                type="checkbox"
                role="switch"
                checked={arrivalMotionEnabled}
                onChange={(event) => onToggleArrivalMotion(event.target.checked)}
              />
              <label className="form-check-label" htmlFor={arrivalToggleId}>
                Arrival motion {arrivalMotionEnabled ? 'ON' : 'OFF'}
              </label>
            </div>
            <small className="text-muted">Pulse the map when a citizen report reaches this dashboard.</small>
          </section>

          <section className="gis-controls-section gis-destination-controls" aria-labelledby={destinationTitleId}>
            <span id={destinationTitleId} className="gis-section-subtitle">RELOCATION DESTINATION</span>
            <label className="visually-hidden" htmlFor={destinationSelectId}>Choose a registered relocation site</label>
            <select
              id={destinationSelectId}
              className="form-select form-select-sm"
              value={selectedRelocationSite?._id || ''}
              onChange={(event) => onSelectRelocationSite(
                relocationSites.find((site) => site._id === event.target.value) || null
              )}
              disabled={relocationSitesLoading || Boolean(relocationSitesError) || relocationSites.length === 0}
            >
              <option value="">
                {relocationSitesLoading
                  ? 'Loading registered sites'
                  : relocationSitesError
                    ? 'Site data unavailable'
                    : relocationSites.length
                      ? 'Choose registered site'
                      : 'No registered sites'}
              </option>
              {relocationSites.map((site) => (
                <option key={site._id} value={site._id}>
                  {site.name}{site.district ? ` · ${site.district}` : ''}
                </option>
              ))}
            </select>
            {selectedRelocationSite ? (() => {
              const site = selectedRelocationSite;
              const blocked = site.roadAccess === 'BLOCKED';
              const capacity = site.capacity || {};
              return (
                <div className="gis-destination-detail" aria-live="polite">
                  <strong>{site.name}</strong>
                  <span>Available capacity: {Number.isFinite(capacity.available) ? capacity.available.toLocaleString() : 'Not recorded'}</span>
                  <span>Occupied: {Number.isFinite(capacity.occupied) ? capacity.occupied.toLocaleString() : 'Not recorded'} · Reserved: {Number.isFinite(capacity.reserved) ? capacity.reserved.toLocaleString() : 'Not recorded'}</span>
                  <span>Road access: {site.roadAccess || 'UNKNOWN'} · Suitability: {Number.isFinite(site.suitability) ? `${site.suitability}/100` : 'Not assessed'}</span>
                  <span>Hazard exposure: {site.hazardExposure?.length ? site.hazardExposure.join(', ') : 'Not recorded'}</span>
                  <span className="gis-destination-caveat">
                    Road estimates do not include live traffic or verified SENTRY closures.
                  </span>
                  {blocked ? <span role="status">Directions withheld: this site is marked as blocked.</span> : null}
                  {site._id ? <Link to={`/relocation-sites/${site._id}`}>Open site record</Link> : null}
                </div>
              );
            })() : (
              <p className="gis-point-empty mb-0">
                {relocationSitesLoading
                  ? 'Loading registered relocation sites.'
                  : relocationSitesError
                    ? 'Site data is unavailable; retry the operational feed.'
                    : relocationSites.length
                  ? 'Select a registered site to review capacity, access and hazards.'
                  : 'No registered relocation sites are currently available.'}
              </p>
            )}
          </section>

          <section className="gis-controls-section gis-route-request" aria-labelledby={routeTitleId}>
            <span id={routeTitleId} className="gis-section-subtitle">EMERGENCY ROAD ROUTE</span>
            <p className="gis-route-request__origin">
              {selectedIncident
                ? `From: ${selectedIncident.title || selectedIncident.type || "Selected incident"}`
                : "Select an incident marker to choose a route origin."}
            </p>
            <button
              type="button"
              className="gis-route-request__button"
              onClick={onRouteToNearestFacility}
              disabled={!selectedIncident || routeRequestStatus === "loading"}
              aria-busy={routeRequestStatus === "loading"}
            >
              {routeRequestStatus === "loading" ? "FINDING ROAD ROUTE…" : "ROUTE TO NEAREST FACILITY"}
            </button>
            {routeRequestError ? <span className="gis-route-request__error" role="alert">{routeRequestError}</span> : null}
            {routeRequestStatus === "success" && routeSummary ? (
              <div className="gis-route-request__summary" role="status">
                <strong>{routeSummary.destination?.name}</strong>
                <span>{routeSummary.distanceKm} km · about {routeSummary.travelTimeEtaMin || routeSummary.freeFlowEtaMin} min · {routeSummary.source === "LIVE_OSM" ? "OSM road estimate" : routeSummary.source}</span>
                <small>Nearest by straight-line proximity. Traffic and SENTRY road closures are not included.</small>
              </div>
            ) : null}
          </section>

          <div className="gis-controls-section gis-layer-controls d-flex flex-column gap-1">
            <span className="gis-section-subtitle">LAYERS</span>
            <div className="row row-cols-2 g-1">
              {primaryLayers.map(renderLayerButton)}
            </div>

            {moreLayers.length > 0 ? <button
              type="button"
              className={`gis-btn-more w-100 ${showMore ? 'open' : ''}`}
              onClick={() => setShowMore((v) => !v)}
              aria-expanded={showMore}
              title="Show secondary and live overlays"
            >
              <span>{showMore ? '▾ MORE LAYERS' : '▸ MORE LAYERS'}</span>
              {!showMore && activeMoreCount > 0 ? (
                <span className="gis-more-badge">{activeMoreCount} on</span>
              ) : null}
            </button> : null}

            {showMore && (
              <div className="row row-cols-2 g-1">
                {moreLayers.map(renderLayerButton)}
              </div>
            )}
          </div>

          <div className="gis-controls-section gis-severity-controls d-flex flex-column gap-1">
            <span className="gis-section-subtitle">SEVERITY FILTER</span>
            <div className="row row-cols-3 g-1">
              {['ALL', 'CRITICAL', 'HIGH_PLUS'].map((sev) => (
                <div className="col" key={sev}>
                  <button
                    type="button"
                    className={`gis-btn-filter w-100 ${severityFilter === sev ? 'active' : ''}`}
                    onClick={() => onSetSeverityFilter(sev)}
                    aria-pressed={severityFilter === sev}
                  >
                    {sev === 'HIGH_PLUS' ? 'HIGH+' : sev === 'CRITICAL' ? 'CRIT' : 'ALL'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="gis-controls-section gis-map-display d-flex flex-column gap-1">
            <span className="gis-section-subtitle d-flex align-items-center justify-content-between">
              MAP DISPLAY <span className="gis-cz-map-provider">{mapProviderLabel(mapStyle)}</span>
            </span>
            <div className="d-flex flex-wrap gap-1">
              {styleOptions.map((st) => (
                <button
                  type="button"
                  key={st.key}
                  className={`gis-style-pill flex-fill ${mapStyle === st.key ? 'active' : ''}`}
                  onClick={() => onSetMapStyle(st.key)}
                  aria-pressed={mapStyle === st.key}
                  title={`${st.label} · ${st.provider}`}
                >
                  {st.shortLabel}
                </button>
              ))}
            </div>
          </div>

          <div className="gis-controls-section gis-reset-controls">
            <button type="button" className="gis-btn-reset-full" onClick={onResetView} title="Reset the map back to the operational area">
              ⌖ RESET VIEW
            </button>
          </div>

          <div className="gis-controls-section gis-annotation-controls d-flex flex-column gap-1">
            <span className="gis-section-subtitle">
              ANNOTATIONS{userPoints.length > 0 ? ` · ${userPoints.length}` : ''}
            </span>
            <button
              type="button"
              className={`gis-btn-annotate w-100 ${addPointMode ? 'active' : ''}`}
              onClick={onToggleAddPoint}
              aria-pressed={addPointMode}
              title={addPointMode ? 'Cancel adding a point' : 'Click, then tap the map to drop a point'}
            >
              {addPointMode ? '✕ CANCEL' : '＋ ADD MAP POINT'}
            </button>

            {userPoints.length === 0 ? (
              <span className="gis-point-empty">No points yet — add one, then tap the map.</span>
            ) : (
              <div className="gis-point-list">
                {userPoints.map((p) => (
                  <div className="gis-point-item" key={p.id}>
                    <button
                      type="button"
                      className="gis-point-item-main"
                      onClick={() => onFocusPoint(p.id)}
                      title="Fly to this point"
                    >
                      <span className="gis-point-dot" />
                      <span className="gis-point-name">{p.name || 'Unnamed point'}</span>
                    </button>
                    <button
                      type="button"
                      className="gis-point-del"
                      onClick={() => onDeletePoint(p.id)}
                      title="Delete point"
                      aria-label="Delete point"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export default memo(MapControls);
