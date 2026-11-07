import { memo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
const INCIDENT_TYPES = [
  { value: 'landslide', label: 'Landslide' },
  { value: 'flash_flood', label: 'Flash flood' },
  { value: 'road_blockage', label: 'Road blocked' },
  { value: 'slope_crack', label: 'Slope crack' },
  { value: 'slope_movement', label: 'Slope movement' },
  { value: 'infrastructure_damage', label: 'Building / infra damage' }
];
const HAZARD_TYPES = [
  { value: 'landslide', label: 'Landslide' },
  { value: 'flood', label: 'Flood' },
  { value: 'earthquake', label: 'Earthquake' },
  { value: 'erosion', label: 'Erosion' },
  { value: 'cloudburst', label: 'Cloudburst' }
];
function CitizenPanel({
  focus,
  onFocusLocation,
  onLocateMe,
  onReport,
  located = false,
  relocationSites = [],
  selectedRelocationSite = null,
  onSelectRelocationSite,
  relocationSitesLoading = false,
  relocationSitesError = "",
  emergencyActionsTarget = null,
}) {
  const {
    dangerPoint = null,
    nearestShelter = null,
    nearestHospital = null,
    nearbyHazards = [],
    roadStatus = [],
    weakInfrastructure = [],
    locationMode = 'unknown',
    locationStatus = 'LOCATION NOT SHARED',
    originLabel = 'your location'
  } = focus || {};
  const [locating, setLocating] = useState(false);
  const [locateMsg, setLocateMsg] = useState(null);
  const [isSafe, setIsSafe] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState('');
  const [reportHazardSubtype, setReportHazardSubtype] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [reportStatus, setReportStatus] = useState('idle');
  const [reportMsg, setReportMsg] = useState(null);
  const flyTo = (pt, zoom) => {
    if (pt && typeof pt.lat === 'number' && onFocusLocation) onFocusLocation(pt.lat, pt.lng, zoom);
  };
  const handleLocate = useCallback(async () => {
    if (!onLocateMe) return;
    setLocating(true);
    setLocateMsg(null);
    const r = await onLocateMe();
    setLocating(false);
    if (!r || !r.ok) {
      setLocateMsg(r && r.reason === 'unsupported'
        ? 'Location not supported on this device.'
        : 'Could not get your location — allow location access and retry.');
    } else if (r.mode === 'remote') {
      setLocateMsg("Location captured. Nearby information is limited to data registered around this position.");
    } else if (r.mode === 'local') {
      setLocateMsg(null);
    }
  }, [onLocateMe]);
  const handleShare = useCallback(async () => {
    const text = "I'm safe. Sharing my location via SENETRY.";
    const url = dangerPoint ? `https://www.openstreetmap.org/?mlat=${dangerPoint.lat}&mlon=${dangerPoint.lng}#map=16/${dangerPoint.lat}/${dangerPoint.lng}` : window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'SENETRY', text, url });
        setIsSafe(true);
        return;
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setIsSafe(true);
      }
    } catch { void 0; }
  }, [dangerPoint]);
  const emergencyActions = (
    <div className="citizen-map-emergency-tools">
      <div className="gis-cz-emergency-actions">
        <span className="gis-cz-section-label">EMERGENCY ACTIONS</span>
        <div className="gis-cz-action-row">
          <a className="gis-cz-action gis-cz-action-sos" href="tel:112">CALL 112</a>
          <button type="button" className={`gis-cz-action ${reportOpen ? 'active' : ''}`} onClick={() => setReportOpen((v) => !v)}>REPORT</button>
          <button type="button" className={`gis-cz-action ${located ? 'active' : ''}`} onClick={handleLocate} disabled={locating}>
            {locating ? 'LOCATING…' : located ? 'LOCATED' : 'LOCATE ME'}
          </button>
          <button type="button" className={`gis-cz-action ${isSafe ? 'gis-cz-action-safe active' : ''}`} onClick={handleShare}>
            {isSafe ? "I'M SAFE ✓" : "I'M SAFE"}
          </button>
        </div>
        {locateMsg ? <p className="gis-cz-note">{locateMsg}</p> : null}
      </div>
      <div className={`gis-cz-locmode gis-cz-locmode-${locationMode}`} role="status">
        <span className="gis-cz-locmode-dot" aria-hidden="true">{locationMode === 'live' ? '📡' : '🧭'}</span>
        <span className="gis-cz-locmode-text">{locationStatus}</span>
      </div>
    </div>
  );
  const submitReport = useCallback(async (e) => {
    e.preventDefault();
    if (!reportType || !reportHazardSubtype || !reportDesc.trim() || !onReport) return;
    setReportStatus('sending');
    const r = await onReport({
      type: reportType,
      hazardSubtype: reportHazardSubtype,
      description: reportDesc.trim()
    });
    setReportStatus('done');
    setReportMsg(r?.navigating
      ? 'Continue in the incident form to add evidence and submit your report.'
      : r && r.synced ? 'Report sent to the response team.' : 'Report saved — it will sync when online.');
    setReportDesc('');
  }, [reportType, reportHazardSubtype, reportDesc, onReport]);
  return (
    <section className="gis-citizen-panel" aria-label="Citizen safety information">
      {emergencyActionsTarget ? createPortal(emergencyActions, emergencyActionsTarget) : emergencyActions}

      {reportOpen ? (
        <form className="gis-cz-report" onSubmit={submitReport}>
          <span className="gis-cz-section-label">REPORT AN INCIDENT</span>
          <select className="gis-cz-input" value={reportType} onChange={(e) => setReportType(e.target.value)} required>
            <option value="">Select incident type</option>
            {INCIDENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select
            className="gis-cz-input"
            value={reportHazardSubtype}
            onChange={(e) => setReportHazardSubtype(e.target.value)}
            required
          >
            <option value="">Select hazard category</option>
            {HAZARD_TYPES.map((hazard) => <option key={hazard.value} value={hazard.value}>{hazard.label}</option>)}
          </select>
          <textarea
            className="gis-cz-input"
            rows={2}
            placeholder="What did you see? (e.g. debris across the road near…)"
            value={reportDesc}
            onChange={(e) => setReportDesc(e.target.value)}
          />
          <div className="d-flex align-items-center gap-2">
            <button type="submit" className="gis-cz-report-submit" disabled={reportStatus === 'sending' || !reportType || !reportDesc.trim() || !reportHazardSubtype}>
              {reportStatus === 'sending' ? 'Sending…' : 'Submit report'}
            </button>
            {located ? <span className="gis-cz-note m-0">Using your location</span> : <span className="gis-cz-note m-0">Tip: tap Locate me first</span>}
          </div>
          {reportMsg ? <p className="gis-cz-note gis-cz-ok m-0">{reportMsg}</p> : null}
        </form>
      ) : null}

      {nearbyHazards.length ? (
        <div>
          <span className="gis-cz-section-label">NEARBY HAZARDS</span>
          <ul className="gis-cz-hazards">
            {nearbyHazards.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  className={`gis-cz-hazard${h.isPrimary ? ' gis-cz-hazard-primary' : ''}`}
                  onClick={() => flyTo(h.location, 14)}
                  title="Show on map"
                >
                  <span className="gis-cz-hazard-dot" aria-hidden="true">{h.dot}</span>
                  <span className="gis-cz-hazard-body">
                    <span className="gis-cz-hazard-type">
                      <span className={`gis-cz-sev sev-${String(h.severity).toLowerCase()}`}>{String(h.severity).toUpperCase()}</span>
                      {h.type}
                      {h.isPrimary ? <span className="gis-cz-hazard-badge">PRIMARY</span> : null}
                    </span>
                    {h.detectedAgo ? <span className="gis-cz-hazard-time">Detected {h.detectedAgo}</span> : null}
                  </span>
                  <span className="gis-cz-hazard-dist">{h.distanceKm.toFixed(1)} km</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="gis-cz-note m-0">
            {locationMode === 'live'
              ? 'Distances from your location.'
              : `Distances from ${originLabel}. Tap Locate me for your position.`}
          </p>
        </div>
      ) : null}

      {(roadStatus.length || weakInfrastructure.length) ? (
        <div>
          <span className="gis-cz-section-label">LOCAL CONDITIONS</span>

          {roadStatus.length ? (
            <ul className="gis-cz-conds">
              {roadStatus.map((r) => (
                <li key={r.id}>
                  <div className={`gis-cz-cond gis-cz-cond-${r.avoid ? 'avoid' : 'caution'}`}>
                    <span className="gis-cz-cond-ico" aria-hidden="true">{r.avoid ? '⛔' : '⚠️'}</span>
                    <span className="gis-cz-cond-body">
                      <span className="gis-cz-cond-title">
                        {r.name}
                        <span className="gis-cz-cond-tag">{String(r.status).toUpperCase()}</span>
                      </span>
                      <span className="gis-cz-cond-sub">{r.avoid ? 'Avoid — ' : 'Caution — '}{r.reason}</span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {weakInfrastructure.length ? (
            <ul className="gis-cz-conds">
              {weakInfrastructure.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    className="gis-cz-cond gis-cz-cond-infra"
                    onClick={() => flyTo(w.location, 14)}
                    title="Show on map"
                  >
                    <span className="gis-cz-cond-ico" aria-hidden="true">🏚️</span>
                    <span className="gis-cz-cond-body">
                      <span className="gis-cz-cond-title">
                        Weak infrastructure
                        <span className="gis-cz-cond-tag">{String(w.severity).toUpperCase()}</span>
                      </span>
                      <span className="gis-cz-cond-sub">{w.title}{w.address ? ` · ${w.address}` : ''}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="gis-cz-relocation">
        <span className="gis-cz-section-label">RELOCATION SITES</span>
        <label className="visually-hidden" htmlFor="citizen-relocation-destination">Choose a registered relocation site</label>
        <select
          id="citizen-relocation-destination"
          className="gis-cz-input"
          value={selectedRelocationSite?._id || ''}
          onChange={(event) => onSelectRelocationSite?.(
            relocationSites.find((site) => site._id === event.target.value) || null
          )}
          disabled={relocationSitesLoading || Boolean(relocationSitesError) || !relocationSites.length}
        >
          <option value="">
            {relocationSitesLoading
              ? 'Loading registered sites'
              : relocationSitesError
                ? 'Site data unavailable'
                : relocationSites.length
                  ? 'Choose a registered site'
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
            <article className="gis-cz-destination" aria-live="polite">
              <strong>{site.name}</strong>
              <span>Available capacity: {Number.isFinite(capacity.available) ? capacity.available.toLocaleString() : 'Not recorded'}</span>
              <span>Road access: {site.roadAccess || 'UNKNOWN'}</span>
              <span>Suitability: {Number.isFinite(site.suitability) ? `${site.suitability}/100` : 'Not assessed'}</span>
              <span>Hazard exposure: {site.hazardExposure?.length ? site.hazardExposure.join(', ') : 'Not recorded'}</span>
              <p className="gis-cz-note">
                SENTRY does not currently provide an in-map route, route distance or ETA. External directions do not account for verified SENTRY road closures.
              </p>
              {blocked ? <span role="status">Directions withheld: this site is marked as blocked.</span> : null}
              {site._id ? <Link to={`/relocation-sites/${site._id}`}>Review site record</Link> : null}
            </article>
          );
        })() : (
          <p className="gis-cz-note">
            {relocationSitesLoading
              ? 'Loading registered relocation-site data.'
              : relocationSitesError
                ? 'Relocation-site data is unavailable.'
                : relocationSites.length
                  ? 'Choose a site to check its recorded capacity, hazards and road access.'
                  : 'No registered relocation sites are currently available.'}
          </p>
        )}

        <p className="gis-cz-note">
          SENTRY provides map context, recorded road status and direct distance only. It does not provide safe evacuation routes or ETAs.
        </p>

        <div className="gis-cz-card-wrap">
          <button type="button" className="gis-cz-card gis-cz-shelter" onClick={() => flyTo(nearestShelter && nearestShelter.location, 15)} disabled={!nearestShelter}>
            <span className="gis-cz-card-body">
              <span className="gis-cz-card-title">FIND SHELTER</span>
              <span className="gis-cz-card-sub">{nearestShelter ? nearestShelter.name : 'None nearby'}</span>
              {nearestShelter ? <span className="gis-cz-card-eta">Approx. {nearestShelter.distanceKm} km direct distance</span> : null}
            </span>
            {nearestShelter ? <span className="gis-cz-card-tag">{nearestShelter.distanceKm} km</span> : null}
          </button>
        </div>

        <div className="gis-cz-card-wrap">
          <button type="button" className="gis-cz-card gis-cz-hospital" onClick={() => flyTo(nearestHospital && nearestHospital.location, 15)} disabled={!nearestHospital}>
            <span className="gis-cz-card-body">
              <span className="gis-cz-card-title">FIND HOSPITAL</span>
              <span className="gis-cz-card-sub">{nearestHospital ? nearestHospital.name : 'None nearby'}</span>
              {nearestHospital ? <span className="gis-cz-card-eta">Approx. {nearestHospital.distanceKm} km direct distance</span> : null}
            </span>
            {nearestHospital ? <span className="gis-cz-card-tag">{nearestHospital.distanceKm} km</span> : null}
          </button>
        </div>
      </div>

      <div>
        <span className="gis-cz-section-label">EMERGENCY HELPLINES</span>
        <div className="d-flex flex-column gap-1">
          <a className="gis-cz-help" href="tel:112"><span>Emergency (all services)</span><strong>112</strong></a>
          <a className="gis-cz-help" href="tel:1078"><span>NDMA disaster helpline</span><strong>1078</strong></a>
          <a className="gis-cz-help" href="tel:108"><span>Ambulance</span><strong>108</strong></a>
        </div>
      </div>

      <p className="gis-cz-foot">Follow official instructions. In an emergency call <strong>112</strong>.</p>
    </section>
  );
}
export default memo(CitizenPanel);
