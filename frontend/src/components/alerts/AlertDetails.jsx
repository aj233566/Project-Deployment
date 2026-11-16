import { useEffect, useState } from "react";
import {
  Users,
  CloudRain,
  Droplets,
  TrendingUp,
  Activity,
  Building,
  Home,
  CheckCircle,
  ShieldAlert,
  PhoneCall,
  Navigation,
} from "lucide-react";
import { useAlerts } from "../../context/useAlerts";
import { getAlertDisplayStatus, isAlertExpired } from "../../utils/alertState";
import { sentryApi } from "../../services/sentryApi";
import RiskBadge from "./RiskBadge";

const EARTH_RADIUS_KM = 6371;
function distanceKm(latitudeA, longitudeA, latitudeB, longitudeB) {
  const radians = (value) => value * Math.PI / 180;
  const deltaLatitude = radians(latitudeB - latitudeA);
  const deltaLongitude = radians(longitudeB - longitudeA);
  const arc = Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(radians(latitudeA)) * Math.cos(radians(latitudeB)) * Math.sin(deltaLongitude / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
}

export const AlertDetails = ({ alert, onClose }) => {
  const { acknowledgeAlert, resolveAlert, escalateAlert, updateAlertTelemetry } = useAlerts();
  const [statusSaving, setStatusSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [telemetrySaving, setTelemetrySaving] = useState(false);
  const [telemetryMessage, setTelemetryMessage] = useState("");
  const [telemetryError, setTelemetryError] = useState("");
  const [liveData, setLiveData] = useState({ weather: null, population: null, populationComplete: true, roadReports: 0, roadDataAvailable: false });
  const [enrichmentLoading, setEnrichmentLoading] = useState(true);
  const [manualTelemetry, setManualTelemetry] = useState(() => {
    const saved = alert?.operatorTelemetry || {};
    return {
      rainfallMm: saved.rainfallMm ?? "",
      soilMoisture: saved.soilMoisture ?? "",
      slopeRisk: saved.slopeRisk || "UNKNOWN",
      roadStatus: saved.roadStatus || "UNKNOWN",
      populationEstimate: saved.populationEstimate ?? "",
      notes: saved.notes || "",
    };
  });
  useEffect(() => {
    if (!alert) return undefined;
    const latitude = Number(alert.location?.latitude ?? alert.coordinates?.[1]);
    const longitude = Number(alert.location?.longitude ?? alert.coordinates?.[0]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;
    let active = true;
    const within10Km = (item) => {
      const lat = Number(item.location?.latitude ?? item.location?.coordinates?.[1]);
      const lon = Number(item.location?.longitude ?? item.location?.coordinates?.[0]);
      return Number.isFinite(lat) && Number.isFinite(lon) && distanceKm(latitude, longitude, lat, lon) <= 10;
    };
    Promise.allSettled([
      sentryApi.getCurrentWeather(latitude, longitude),
      sentryApi.getNearbyHabitations(latitude, longitude, 10),
      sentryApi.getActiveIncidents(),
    ]).then(([weatherResult, habitationResult, incidentResult]) => {
      if (!active) return;
      const weather = weatherResult.status === "fulfilled" ? weatherResult.value.data : null;
      const habitationData = habitationResult.status === "fulfilled" ? habitationResult.value : null;
      const verifiedRoadReports = incidentResult.status === "fulfilled"
        ? (incidentResult.value.data || []).filter((item) => item && within10Km(item)
          && ["verified", "in_progress"].includes(String(item.status || "").toLowerCase())
          && ["road_blockage", "road obstruction"].includes(String(item.type || "").toLowerCase().replace(/\s+/g, "_"))).length
        : 0;
      setLiveData({
        weather,
        population: habitationData?.populationEstimate ?? null,
        populationComplete: habitationData?.populationEstimateComplete !== false,
        roadReports: verifiedRoadReports,
        roadDataAvailable: incidentResult.status === "fulfilled",
      });
    }).finally(() => {
      if (active) setEnrichmentLoading(false);
    });
    return () => { active = false; };
  }, [alert]);
  if (!alert) {
    return null;
  }
  const hasAlertCoordinates = Number.isFinite(Number(alert.location?.latitude ?? alert.coordinates?.[1]))
    && Number.isFinite(Number(alert.location?.longitude ?? alert.coordinates?.[0]));
  const getCurrentUser = () => {
    try {
      const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
      if (!storedUser) {
        return null;
      }
      return JSON.parse(storedUser);
    } catch (error) {
      console.warn("Unable to read logged-in user:", error);
      return null;
    }
  };
  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || "citizen";
  const isCitizen = userRole === "citizen";
  const isAuthority = userRole === "authority" || userRole === "admin";
  const roleLabel =
    userRole === "admin"
      ? "Admin"
      : userRole === "authority"
      ? "Authority"
      : "Citizen";
  const locationName =
    typeof alert.location === "string"
      ? alert.location
      : alert.location?.name || "Unknown Location";
  const latitude = alert.coordinates?.[0] ?? alert.location?.latitude;
  const longitude = alert.coordinates?.[1] ?? alert.location?.longitude;
  const riskScore = alert.riskScore ?? alert.risk?.score ?? null;
  const riskLevel = alert.riskLevel || alert.risk?.level || "UNKNOWN";
  const alertStatus = String(alert.status || "").toLowerCase();
  const canUpdateStatus = !isAlertExpired(alert) && alertStatus !== "resolved";
  const formatCoordinate = (value, positiveDirection, negativeDirection) =>
    `${Math.abs(Number(value)).toFixed(4)}° ${Number(value) < 0 ? negativeDirection : positiveDirection}`;
  const targetedPopulation = Array.isArray(alert.affectedHabitations)
    ? alert.affectedHabitations.reduce((sum, habitation) => sum + (Number(habitation?.population) || 0), 0)
    : null;
  const targetedPopulationAvailable = Boolean(alert.targetType && Array.isArray(alert.affectedHabitations)
    && alert.affectedHabitations.some((habitation) => habitation && typeof habitation === "object" && Object.hasOwn(habitation, "population")));
  const providedPopulation = alert.affectedPopulation ?? alert.populationExposure;
  const numericProvidedPopulation = providedPopulation !== null && providedPopulation !== undefined
    && Number.isFinite(Number(providedPopulation)) ? Number(providedPopulation) : null;
  const registeredPopulation = manualTelemetry.populationEstimate !== ""
    ? Number(manualTelemetry.populationEstimate)
    : targetedPopulationAvailable ? targetedPopulation
      : liveData.population ?? numericProvidedPopulation;
  const liveRainfall = liveData.weather?.forecast?.next72HourPrecipitation
    ?? alert.weather?.next72HourPrecipitation;
  const currentRainfall = liveData.weather?.rain ?? liveData.weather?.precipitation
    ?? alert.weather?.rain ?? alert.weather?.precipitation;
  const rainfallLabel = manualTelemetry.rainfallMm !== ""
    ? "Rainfall · operator entry"
    : liveRainfall != null ? "Rain forecast · next 72h" : "Current precipitation";
  const registeredPopulationLabel = manualTelemetry.populationEstimate !== ""
    ? "operator estimate"
    : targetedPopulationAvailable ? "people in target"
      : "registered people within 10 km";
  const roadDisplay = manualTelemetry.roadStatus !== "UNKNOWN"
    ? manualTelemetry.roadStatus
    : liveData.roadReports > 0 ? `${liveData.roadReports} verified report${liveData.roadReports === 1 ? "" : "s"}`
      : liveData.roadDataAvailable ? "No blockage reports" : "Unknown";
  const handleStatusChange = async (changeStatus) => {
    setActionError("");
    setStatusSaving(true);
    try {
      await changeStatus(alert.id || alert._id);
      onClose();
    } catch (error) {
      setActionError(error.response?.data?.message || error.message || "Could not update the alert status.");
    } finally {
      setStatusSaving(false);
    }
  };
  const saveTelemetry = async (event) => {
    event.preventDefault();
    setTelemetrySaving(true);
    setTelemetryError("");
    setTelemetryMessage("");
    try {
      const payload = {
        rainfallMm: manualTelemetry.rainfallMm === "" ? null : Number(manualTelemetry.rainfallMm),
        soilMoisture: manualTelemetry.soilMoisture === "" ? null : Number(manualTelemetry.soilMoisture),
        slopeRisk: manualTelemetry.slopeRisk,
        roadStatus: manualTelemetry.roadStatus,
        populationEstimate: manualTelemetry.populationEstimate === "" ? null : Number(manualTelemetry.populationEstimate),
        notes: manualTelemetry.notes,
      };
      const updated = await updateAlertTelemetry(alert.id || alert._id, payload);
      const saved = updated?.operatorTelemetry || {};
      setManualTelemetry({
        rainfallMm: saved.rainfallMm ?? "",
        soilMoisture: saved.soilMoisture ?? "",
        slopeRisk: saved.slopeRisk || "UNKNOWN",
        roadStatus: saved.roadStatus || "UNKNOWN",
        populationEstimate: saved.populationEstimate ?? "",
        notes: saved.notes || "",
      });
      setTelemetryMessage("Operator data saved.");
    } catch (error) {
      setTelemetryError(error.response?.data?.message || error.message || "Unable to save operator data.");
    } finally {
      setTelemetrySaving(false);
    }
  };
  const getGuidance = (guidance) => {
    if (!guidance) {
      return [];
    }
    if (Array.isArray(guidance)) {
      return guidance;
    }
    if (Array.isArray(guidance.en)) {
      return guidance.en;
    }
    if (typeof guidance.en === "string") {
      return [guidance.en];
    }
    return [];
  };
  const citizenGuidance = getGuidance(alert.guidance?.citizen);
  const authorityGuidance = getGuidance(alert.guidance?.authority);
  const getText = (value) => {
    if (!value) {
      return "";
    }
    if (typeof value === "string") {
      return value;
    }
    if (typeof value.en === "string") {
      return value.en;
    }
    return "";
  };
  const recommendedAction =
    getText(alert.action) ||
    getText(alert.recommendedAction) ||
    (Array.isArray(alert.recommendations) ? alert.recommendations[0] : "");
  const contributingFactors = Array.isArray(alert.contributingFactors)
    ? alert.contributingFactors
    : Array.isArray(alert.majorContributors)
    ? alert.majorContributors.map((factor) => ({
        factor: factor.label || factor.key || "Risk Factor",
        detail: factor.reason || factor.detail || "",
      }))
    : [];
  return (
    <div>

      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <span className="eyebrow">
            {alert.state || alert.location?.state || "Operational Sector"}
          </span>

          <h2
            style={{
              fontSize: "1.964rem",
              margin: "2px 0 4px",
            }}
          >
            {locationName}
          </h2>

          <div
            className="d-flex align-items-center gap-2"
            style={{
              fontSize: "1.226rem",
              color: "var(--text-muted)",
            }}
          >
            {latitude != null && longitude != null && (
              <span className="d-flex align-items-center gap-1">
                <Navigation size={12} />

                <span>
                  {formatCoordinate(latitude, "N", "S")},{" "}
                  {formatCoordinate(longitude, "E", "W")}
                </span>
              </span>
            )}

            {registeredPopulation != null && (
              <>
                <span>•</span>

                <span className="d-flex align-items-center gap-1">
                  <Users size={12} />

                  <span>
                    {Number(registeredPopulation).toLocaleString()} {registeredPopulationLabel}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>

        <div className="d-flex flex-column align-items-end gap-1">
          <RiskBadge level={riskLevel} />

          <span
            style={{
              fontSize: "2.201rem",
              fontWeight: "800",
              fontFamily: "inherit",
              color: "var(--text-primary)",
            }}
          >
            {Number.isFinite(riskScore) ? `${riskScore}/100` : "Index unavailable"}
          </span>
        </div>
      </div>

      {alert.targetType ? (
        <div className="detail-section mb-3">
          <div className="detail-section-title">Geographic target</div>
          <p className="mb-1">Target method: {alert.targetType}</p>
          <p className="mb-1">Registered habitations: {alert.affectedHabitations?.length ?? 0}</p>
          {alert.expiresAt ? <p className="mb-0">Expires: {new Date(alert.expiresAt).toLocaleString()}</p> : null}
        </div>
      ) : null}

      <div className="alert-detail-status-row">
        <span className={`alert-status-pill status-${getAlertDisplayStatus(alert).toLowerCase()}`}>{getAlertDisplayStatus(alert)}</span>
        {alert.expiresAt ? <span>{isAlertExpired(alert) ? "Expired" : "Expires"} {new Date(alert.expiresAt).toLocaleString()}</span> : null}
      </div>


      {recommendedAction && (
        <div className="detail-section mb-3">
          <div className="detail-section-title">
            Recommended Operational Advisory
          </div>

          <div
            style={{
              backgroundColor: "var(--bg-secondary)",
              padding: "12px 14px",
              borderRadius: "4px",
              borderLeft: "4px solid var(--info)",
              fontSize: "1.337rem",
              color: "var(--text-primary)",
            }}
          >
            {recommendedAction}
          </div>
        </div>
      )}


      <div className="detail-section mb-3">
        <div className="detail-section-title">Risk & Telemetry Factors</div>
        <p className="small text-muted">Decision-support index; not a probability or official warning.</p>

        <div className="row g-2 mb-2">
          <div className="col-6 col-md-3">
            <div
              className="telemetry-item p-2 rounded"
              style={{
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              <span className="telemetry-label">
                <CloudRain size={12} />
                {rainfallLabel}
              </span>

              <span className="telemetry-val">
                {manualTelemetry.rainfallMm !== "" ? manualTelemetry.rainfallMm
                  : liveRainfall ?? currentRainfall ?? "--"} mm
              </span>
            </div>
          </div>

          <div className="col-6 col-md-3">
            <div
              className="telemetry-item p-2 rounded"
              style={{
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              <span className="telemetry-label">
                <Droplets size={12} />
                Soil Saturation
              </span>

              <span className="telemetry-val">
                {manualTelemetry.soilMoisture !== "" ? manualTelemetry.soilMoisture : "Not recorded"}
                {manualTelemetry.soilMoisture !== "" ? "%" : ""}
              </span>
            </div>
          </div>

          <div className="col-6 col-md-3">
            <div
              className="telemetry-item p-2 rounded"
              style={{
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              <span className="telemetry-label">
                <TrendingUp size={12} />
                Slope Risk
              </span>

              <span className="telemetry-val">
                {manualTelemetry.slopeRisk !== "UNKNOWN" ? manualTelemetry.slopeRisk : "Not recorded"}
              </span>
            </div>
          </div>

          <div className="col-6 col-md-3">
            <div
              className="telemetry-item p-2 rounded"
              style={{
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              <span className="telemetry-label">
                <Activity size={12} />
                Road Status
              </span>

              <span className="telemetry-val">
                {roadDisplay}
              </span>
            </div>
          </div>
        </div>

        <div className="alert-enrichment-note" role="status">
          {!hasAlertCoordinates ? "Live enrichment unavailable: this alert has no coordinates." : enrichmentLoading ? "Loading live weather and nearby registered population…" : (
            <>
              Weather: {liveData.weather?.source || (alert.weather?.source ? `${alert.weather.source} · saved snapshot` : "unavailable")}
              {liveData.weather?.updateTime ? ` · updated ${liveData.weather.updateTime}` : ""}
              {registeredPopulation != null ? ` · ${registeredPopulationLabel}${!liveData.populationComplete && manualTelemetry.populationEstimate === "" ? " (partial estimate)" : ""}` : " · population unavailable"}
            </>
          )}
        </div>
        {alert.operatorTelemetry?.notes ? (
          <div className="alert-field-notes"><strong>Field notes</strong><span>{alert.operatorTelemetry.notes}</span></div>
        ) : null}

        {isAuthority ? (
          <details className="alert-operator-editor">
            <summary>Add or correct field data</summary>
            <p>Automatically fetched data stays read-only. Use this form for local measurements that are not available from connected sources.</p>
            <form onSubmit={saveTelemetry}>
              <div className="row g-3">
                <div className="col-12 col-sm-6 col-lg-4">
                  <label className="form-label" htmlFor="operator-rainfall">Rainfall, next 72h (mm)</label>
                  <input id="operator-rainfall" className="form-control" type="number" min="0" step="any" value={manualTelemetry.rainfallMm} onChange={(event) => setManualTelemetry((current) => ({ ...current, rainfallMm: event.target.value }))} placeholder={liveRainfall == null ? "Enter if known" : `Auto: ${liveRainfall} mm`} />
                </div>
                <div className="col-12 col-sm-6 col-lg-4">
                  <label className="form-label" htmlFor="operator-soil">Soil moisture (%)</label>
                  <input id="operator-soil" className="form-control" type="number" min="0" max="100" step="any" value={manualTelemetry.soilMoisture} onChange={(event) => setManualTelemetry((current) => ({ ...current, soilMoisture: event.target.value }))} placeholder="No sensor data" />
                </div>
                <div className="col-12 col-sm-6 col-lg-4">
                  <label className="form-label" htmlFor="operator-slope">Slope risk</label>
                  <select id="operator-slope" className="form-select" value={manualTelemetry.slopeRisk} onChange={(event) => setManualTelemetry((current) => ({ ...current, slopeRisk: event.target.value }))}>
                    <option value="UNKNOWN">Not assessed</option><option value="LOW">Low</option><option value="MODERATE">Moderate</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div className="col-12 col-sm-6 col-lg-4">
                  <label className="form-label" htmlFor="operator-road">Road status</label>
                  <select id="operator-road" className="form-select" value={manualTelemetry.roadStatus} onChange={(event) => setManualTelemetry((current) => ({ ...current, roadStatus: event.target.value }))}>
                    <option value="UNKNOWN">Not assessed</option><option value="OPEN">Open</option><option value="PARTIAL">Partially blocked</option><option value="BLOCKED">Blocked</option>
                  </select>
                </div>
                <div className="col-12 col-sm-6 col-lg-4">
                  <label className="form-label" htmlFor="operator-population">Exposed population estimate</label>
                  <input id="operator-population" className="form-control" type="number" min="0" step="1" value={manualTelemetry.populationEstimate} onChange={(event) => setManualTelemetry((current) => ({ ...current, populationEstimate: event.target.value }))} placeholder={liveData.population == null ? "No nearby records" : `Auto: ${liveData.population} registered`} />
                </div>
                <div className="col-12 col-lg-8">
                  <label className="form-label" htmlFor="operator-notes">Field notes</label>
                  <textarea id="operator-notes" className="form-control" rows="2" maxLength="1000" value={manualTelemetry.notes} onChange={(event) => setManualTelemetry((current) => ({ ...current, notes: event.target.value }))} placeholder="Source, observation time, or field context" />
                </div>
              </div>
              {telemetryError ? <div className="alert alert-danger mt-3 mb-0" role="alert">{telemetryError}</div> : null}
              {telemetryMessage ? <div className="alert alert-success mt-3 mb-0" role="status">{telemetryMessage}</div> : null}
              <div className="alert-operator-actions">
                {alert.operatorTelemetry?.updatedAt ? <span>Last field update: {new Date(alert.operatorTelemetry.updatedAt).toLocaleString()}</span> : <span>Manual fields are saved with this alert.</span>}
                <button type="submit" className="btn btn-primary" disabled={telemetrySaving}>{telemetrySaving ? "Saving…" : "Save field data"}</button>
              </div>
            </form>
          </details>
        ) : null}

        {contributingFactors.length > 0 && (
          <div className="contributing-factors-list">
            {contributingFactors.map((factor, index) => (
              <div key={index} className="contributing-factor-tag">
                <span
                  style={{
                    color: "var(--info)",
                    fontWeight: "700",
                  }}
                >
                  •
                </span>

                <div>
                  <strong
                    style={{
                      color: "var(--text-primary)",
                    }}
                  >
                    {factor.factor || "Risk Factor"}:{" "}
                  </strong>

                  <span>{getText(factor.detail || factor.reason)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


      <div className="detail-section mb-3">
        <div className="detail-section-title">
          Operational Guidance — ({roleLabel})
        </div>

        {isCitizen && (
          <div className="guidance-callout-box citizen">
            <h4
              style={{
                fontSize: "1.337rem",
                color: "var(--safe)",
                marginBottom: "8px",
              }}
            >
              Citizen Safety Guidance
            </h4>

            {citizenGuidance.length > 0 ? (
              <ul className="guidance-list">
                {citizenGuidance.map((guidance, index) => (
                  <li key={index}>
                    <span className="bullet">✓</span>

                    <span>{getText(guidance)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="guidance-list">
                <li>
                  <span className="bullet">✓</span>

                  <span>
                    Follow instructions from local disaster management
                    authorities.
                  </span>
                </li>

                <li>
                  <span className="bullet">✓</span>

                  <span>Avoid unstable slopes and affected roads.</span>
                </li>
              </ul>
            )}

            <div
              className="d-flex align-items-center gap-2 mt-3 pt-2"
              style={{
                borderTop: "1px solid var(--border)",
                color: "var(--safe)",
                fontSize: "1.259rem",
                fontWeight: "600",
              }}
            >
              <PhoneCall size={14} />

              <span>Emergency Helpline: 112</span>
            </div>
          </div>
        )}

        {isAuthority && (
          <div className="guidance-callout-box authority">
            <h4
              style={{
                fontSize: "1.337rem",
                color: "var(--critical)",
                marginBottom: "8px",
              }}
            >
              Authority Response Guidance
            </h4>

            {authorityGuidance.length > 0 ? (
              <ul className="guidance-list">
                {authorityGuidance.map((guidance, index) => (
                  <li key={index}>
                    <span
                      className="bullet"
                      style={{
                        color: "var(--critical)",
                      }}
                    >
                      !
                    </span>

                    <span>{getText(guidance)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="guidance-list">
                <li>
                  <span
                    className="bullet"
                    style={{
                      color: "var(--critical)",
                    }}
                  >
                    !
                  </span>

                  <span>Review the risk score and contributing factors.</span>
                </li>

                <li>
                  <span
                    className="bullet"
                    style={{
                      color: "var(--critical)",
                    }}
                  >
                    !
                  </span>

                  <span>
                    Coordinate appropriate emergency response resources.
                  </span>
                </li>
              </ul>
            )}
          </div>
        )}
      </div>


      {(alert.nearbyShelter || alert.nearestHospital) && (
        <div className="detail-section mb-3">
          <div className="detail-section-title">
            Critical Relief Infrastructure
          </div>

          <div className="row g-3">
            {alert.nearbyShelter && (
              <div className="col-12 col-md-6">
                <div
                  className="h-100 p-2 rounded"
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div
                    className="d-flex align-items-center gap-1 mb-1"
                    style={{
                      fontSize: "1.179rem",
                      color: "var(--info)",
                    }}
                  >
                    <Home size={13} />

                    <strong>Nearest Shelter</strong>
                  </div>

                  <div
                    style={{
                      fontSize: "1.337rem",
                      color: "var(--text-primary)",
                      fontWeight: "600",
                    }}
                  >
                    {alert.nearbyShelter.name}
                  </div>

                  <div
                    style={{
                      fontSize: "1.131rem",
                      color: "var(--text-muted)",
                      marginTop: "2px",
                    }}
                  >
                    {alert.nearbyShelter.distanceKm} km away •{" "}
                    {alert.nearbyShelter.occupied}/
                    {alert.nearbyShelter.capacity} capacity
                  </div>
                </div>
              </div>
            )}

            {alert.nearestHospital && (
              <div className="col-12 col-md-6">
                <div
                  className="h-100 p-2 rounded"
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div
                    className="d-flex align-items-center gap-1 mb-1"
                    style={{
                      fontSize: "1.179rem",
                      color: "var(--info)",
                    }}
                  >
                    <Building size={13} />

                    <strong>Nearest Hospital</strong>
                  </div>

                  <div
                    style={{
                      fontSize: "1.337rem",
                      color: "var(--text-primary)",
                      fontWeight: "600",
                    }}
                  >
                    {alert.nearestHospital.name}
                  </div>

                  <div
                    style={{
                      fontSize: "1.131rem",
                      color: "var(--text-muted)",
                      marginTop: "2px",
                    }}
                  >
                    {alert.nearestHospital.distanceKm} km away •{" "}
                    {alert.nearestHospital.beds} Beds (
                    {alert.nearestHospital.icuAvailable} ICU)
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      <div
        className="d-flex align-items-center justify-content-end gap-2 mt-4 pt-3 flex-wrap"
        style={{
          borderTop: "1px solid var(--border)",
        }}
      >
        {actionError ? <div className="alert alert-danger w-100 mb-0" role="alert">{actionError}</div> : null}
        {canUpdateStatus && alertStatus === "active" && (
          <button type="button" className="btn-ops" disabled={statusSaving} onClick={() => void handleStatusChange(acknowledgeAlert)}>
            <CheckCircle size={14} />

            <span>Acknowledge Alert</span>
          </button>
        )}

        {canUpdateStatus && String(riskLevel).toUpperCase() !== "CRITICAL" && (
          <button type="button" className="btn-ops btn-ops-critical" disabled={statusSaving} onClick={() => void handleStatusChange(escalateAlert)}>
            <ShieldAlert size={14} />

            <span>Escalate Priority</span>
          </button>
        )}

        {canUpdateStatus ? (
          <button type="button" className="btn-ops btn-ops-primary" disabled={statusSaving} onClick={() => void handleStatusChange(resolveAlert)}>
            <span>{statusSaving ? "Saving…" : "Resolve Alert"}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
};
export default AlertDetails;
