import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, AlertCircle, ArrowRight, Clock3, CloudRain, Droplets,
  MapPin, Route, TrendingUp, Users, Trash2,
} from "lucide-react";
import { sentryApi } from "../../services/sentryApi";
import { getAlertDisplayStatus } from "../../utils/alertState";
import RiskBadge from "./RiskBadge";

const weatherCache = new Map();
const weatherRequests = new Map();
const populationCache = new Map();
const populationRequests = new Map();
const CACHE_DURATION_MS = 5 * 60 * 1000;

function readCoordinates(alert) {
  const latitude = Number(alert.location?.latitude ?? alert.coordinates?.[1] ?? alert.targetLocation?.coordinates?.[1]);
  const longitude = Number(alert.location?.longitude ?? alert.coordinates?.[0] ?? alert.targetLocation?.coordinates?.[0]);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
}

function getRainfall(alert, liveWeather) {
  const manual = alert.operatorTelemetry?.rainfallMm;
  if (manual !== null && manual !== undefined && manual !== "") {
    return { value: manual, label: "Rain · operator entry", source: "Operator" };
  }
  const forecast72h = alert.weather?.next72HourPrecipitation ?? liveWeather?.forecast?.next72HourPrecipitation;
  if (forecast72h !== null && forecast72h !== undefined) {
    return { value: forecast72h, label: "Rain · next 72h", source: liveWeather?.source || alert.weather?.source || "Open-Meteo" };
  }
  const current = liveWeather?.rain ?? liveWeather?.precipitation ?? alert.weather?.rain ?? alert.weather?.precipitation;
  return current === null || current === undefined
    ? { value: null, label: "Rainfall", source: "Weather unavailable" }
    : { value: current, label: "Current rain", source: liveWeather?.source || alert.weather?.source || "Open-Meteo" };
}

async function requestWeather(latitude, longitude) {
  const key = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
  const cached = weatherCache.get(key);
  if (cached && Date.now() - cached.savedAt < CACHE_DURATION_MS) return cached.data;
  if (weatherRequests.has(key)) return weatherRequests.get(key);
  const request = sentryApi.getCurrentWeather(latitude, longitude)
    .then((response) => {
      const data = response?.data || null;
      if (data) weatherCache.set(key, { data, savedAt: Date.now() });
      return data;
    })
    .finally(() => weatherRequests.delete(key));
  weatherRequests.set(key, request);
  return request;
}
async function requestNearbyPopulation(latitude, longitude) {
  const key = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
  const cached = populationCache.get(key);
  if (cached && Date.now() - cached.savedAt < CACHE_DURATION_MS) return cached.data;
  if (populationRequests.has(key)) return populationRequests.get(key);
  const request = sentryApi.getNearbyHabitations(latitude, longitude, 10)
    .then((response) => {
      const data = {
        population: response?.populationEstimate ?? null,
        complete: response?.populationEstimateComplete !== false,
      };
      populationCache.set(key, { data, savedAt: Date.now() });
      return data;
    })
    .finally(() => populationRequests.delete(key));
  populationRequests.set(key, request);
  return request;
}

export const AlertCard = ({ alert, onSelect, onDelete, deleting = false }) => {
  const cardRef = useRef(null);
  const [liveWeather, setLiveWeather] = useState(null);
  const [livePopulation, setLivePopulation] = useState(null);
  const [populationChecked, setPopulationChecked] = useState(false);
  const [weatherChecked, setWeatherChecked] = useState(false);
  const id = alert.id || alert._id || "ALERT";
  const locationName = typeof alert.location === "string"
    ? alert.location
    : alert.location?.name || "Unknown Location";
  const level = String(alert.riskLevel || alert.risk?.level || "UNKNOWN").toUpperCase();
  const score = alert.riskScore ?? alert.risk?.score;
  const coords = useMemo(() => readCoordinates(alert), [alert]);
  const rainfall = getRainfall(alert, liveWeather);
  const soilMoisture = alert.operatorTelemetry?.soilMoisture ?? alert.soilMoisture;
  const slopeRisk = alert.operatorTelemetry?.slopeRisk && alert.operatorTelemetry.slopeRisk !== "UNKNOWN"
    ? alert.operatorTelemetry.slopeRisk
    : alert.slopeAngle ?? alert.terrain?.slopeRisk;
  const roadStatus = alert.operatorTelemetry?.roadStatus && alert.operatorTelemetry.roadStatus !== "UNKNOWN"
    ? alert.operatorTelemetry.roadStatus
    : alert.roadStatus || "Unknown";
  const population = alert.operatorTelemetry?.populationEstimate
    ?? alert.affectedPopulation
    ?? (Array.isArray(alert.affectedHabitations)
      ? alert.affectedHabitations.reduce((sum, habitation) => sum + (Number(habitation?.population) || 0), 0)
      : null);
  const hasTargetPopulation = alert.targetType && Array.isArray(alert.affectedHabitations)
    && alert.affectedHabitations.some((habitation) => habitation && typeof habitation === "object" && Object.hasOwn(habitation, "population"));
  const status = getAlertDisplayStatus(alert);
  const createdAt = alert.createdAt || alert.timestamp;
  const createdDate = createdAt ? new Date(createdAt) : null;
  const factors = Array.isArray(alert.majorContributors)
    ? alert.majorContributors
    : Array.isArray(alert.contributingFactors) ? alert.contributingFactors : [];
  const roadColor = String(roadStatus).toLowerCase().includes("block")
    ? "var(--critical)"
    : String(roadStatus).toLowerCase().includes("partial") ? "var(--warning)" : "var(--text-secondary)";

  useEffect(() => {
    const snapshotRain = alert.operatorTelemetry?.rainfallMm
      ?? alert.weather?.next72HourPrecipitation
      ?? alert.weather?.rain
      ?? alert.weather?.precipitation;
    const needWeather = snapshotRain === null || snapshotRain === undefined;
    const needPopulation = population == null && !hasTargetPopulation;
    if (!coords || (!needWeather && !needPopulation)) return undefined;
    let active = true;
    const load = () => {
      Promise.allSettled([
        needWeather ? requestWeather(coords.latitude, coords.longitude) : Promise.resolve(null),
        needPopulation ? requestNearbyPopulation(coords.latitude, coords.longitude) : Promise.resolve(null),
      ]).then(([weatherResult, populationResult]) => {
        if (!active) return;
        if (weatherResult.status === "fulfilled" && weatherResult.value) setLiveWeather(weatherResult.value);
        if (populationResult.status === "fulfilled" && populationResult.value) setLivePopulation(populationResult.value);
      }).finally(() => {
        if (active) {
          if (needWeather) setWeatherChecked(true);
          if (needPopulation) setPopulationChecked(true);
        }
      });
    };
    if (!("IntersectionObserver" in window)) {
      load();
      return () => { active = false; };
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        load();
      }
    }, { rootMargin: "120px" });
    if (cardRef.current) observer.observe(cardRef.current);
    return () => { active = false; observer.disconnect(); };
  }, [alert.operatorTelemetry?.rainfallMm, alert.operatorTelemetry?.populationEstimate, alert.weather?.next72HourPrecipitation, alert.weather?.rain, alert.weather?.precipitation, alert.targetType, alert.affectedHabitations, population, hasTargetPopulation, coords]);

  return (
    <article ref={cardRef} className={`alert-card alert-card-v2 ${level.toLowerCase()}-level`}>
      <div className="alert-card-topline">
        <div className="alert-card-location">
          <span className="alert-card-kicker">{alert.state || alert.location?.state || "Operational sector"}</span>
          <h3>{locationName}</h3>
          {coords ? <span className="alert-card-coordinates"><MapPin size={12} /> {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}</span> : null}
        </div>
        <div className="alert-card-score-box">
          <RiskBadge level={level} />
          <strong className={`score-number ${level.toLowerCase()}`}>{Number.isFinite(score) ? `${score}/100` : "—"}</strong>
          <span className="score-label">Risk index</span>
        </div>
      </div>

      <div className="alert-card-meta">
        <span className={`alert-status-pill status-${status.toLowerCase()}`}>{status}</span>
        <span className="alert-card-hazard">{String(alert.hazardType || alert.disasterType || "Multi-hazard").replace(/_/g, " ")}</span>
        <span className="alert-card-id" title={id}>ID · {String(id).slice(-10)}</span>
      </div>

      <div className="alert-telemetry-grid">
        <Telemetry icon={<CloudRain size={14} />} label={rainfall.label} value={rainfall.value == null ? (weatherChecked || !coords ? "Unavailable" : "Loading…") : `${rainfall.value} mm`} source={rainfall.source} />
        <Telemetry icon={<Droplets size={14} />} label="Soil moisture" value={soilMoisture == null ? "Not recorded" : `${soilMoisture}%`} source={soilMoisture == null ? "Add in details" : "Operator measurement"} />
        <Telemetry icon={<TrendingUp size={14} />} label="Slope risk" value={!slopeRisk || slopeRisk === "UNKNOWN" ? "Not assessed" : slopeRisk} source={!slopeRisk || slopeRisk === "UNKNOWN" ? "Add in details" : "Field assessment"} />
        <Telemetry icon={<Route size={14} />} label="Road status" value={roadStatus} source={alert.operatorTelemetry?.roadStatus && alert.operatorTelemetry.roadStatus !== "UNKNOWN" ? "Operator update" : "View reports / update"} valueStyle={{ color: roadColor }} />
      </div>

      {factors.length > 0 ? (
        <div className="alert-card-factors">
          {factors.slice(0, 2).map((factor, index) => (
            <div className="alert-card-factor" key={factor.key || factor.factor || index}>
              <AlertCircle size={13} />
              <span><strong>{factor.label || factor.factor || factor.key || "Risk factor"}</strong>{factor.reason || factor.detail ? ` · ${factor.reason || factor.detail}` : ""}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="alert-card-footer alert-card-footer-v2">
        <div className="alert-card-footer-info">
          <span><Clock3 size={13} /> {createdDate && Number.isFinite(createdDate.getTime()) ? createdDate.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Time unavailable"}</span>
          <span><Users size={13} /> {population != null
            ? `${Number(population).toLocaleString()} people`
            : livePopulation?.population != null
              ? `${livePopulation.complete ? "" : "~"}${Number(livePopulation.population).toLocaleString()} registered · 10km`
              : populationChecked ? "Population unavailable" : "Loading population…"}</span>
          {alert.expiresAt ? <span><Activity size={13} /> Expires {new Date(alert.expiresAt).toLocaleDateString()}</span> : null}
        </div>
        <div className="alert-card-actions">
          {onDelete ? (
            <button type="button" className="alert-card-delete" onClick={() => onDelete(alert)} disabled={deleting} aria-label={`Delete alert ${locationName}`}>
              <Trash2 size={14} /><span>{deleting ? "Deleting…" : "Delete"}</span>
            </button>
          ) : null}
          <button type="button" className="btn-ops btn-ops-sm btn-ops-primary" onClick={() => onSelect(alert)}>
            <span>View details</span><ArrowRight size={14} />
          </button>
        </div>
      </div>
    </article>
  );
};

function Telemetry({ icon, label, value, source, valueStyle }) {
  return (
    <div className="alert-telemetry-tile">
      <span className="alert-telemetry-label">{icon}{label}</span>
      <strong className="alert-telemetry-value" style={valueStyle}>{value}</strong>
      <span className="alert-telemetry-source">{source}</span>
    </div>
  );
}
export default AlertCard;
