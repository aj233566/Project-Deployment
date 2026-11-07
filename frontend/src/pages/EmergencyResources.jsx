import { useEffect, useMemo, useState } from "react";
import { emergencyApi, resourcesApi } from "../services/api";
import "../css/EmergencyResources.css";
const ICON_BY_CATEGORY = {
  "MEDICAL TRANSPORT": "🚑",
  AMBULANCE: "🚑",
  "ROAD CLEARING": "🚜",
  NDRF: "🧑‍🚒",
  SDRF: "🧑‍🚒",
};
function responseData(response) {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response)) return response;
  return [];
}
function EmergencyResources() {
  const [resources, setResources] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resourceError, setResourceError] = useState("");
  const [deploymentError, setDeploymentError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.allSettled([
      resourcesApi.getResources(),
      emergencyApi.getPrioritisedAreas(),
    ]).then(([resourceResult, deploymentResult]) => {
      if (!active) return;
      if (resourceResult.status === "fulfilled") {
        setResources(responseData(resourceResult.value));
        setResourceError("");
      } else {
        console.error("Emergency resource inventory unavailable:", resourceResult.reason);
        setResources([]);
        setResourceError(resourceResult.reason?.message || "Unable to load resource inventory.");
      }
      if (deploymentResult.status === "fulfilled") {
        setDeployments(responseData(deploymentResult.value));
        setDeploymentError("");
      } else {
        console.error("Emergency dispatch records unavailable:", deploymentResult.reason);
        setDeployments([]);
        setDeploymentError(deploymentResult.reason?.message || "Unable to load dispatch records.");
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [reloadToken]);
  const totals = useMemo(() => {
    const sum = (key) => resources.length === 0
      ? 0
      : resources.every((resource) => Number.isFinite(resource[key]))
        ? resources.reduce((total, resource) => total + resource[key], 0)
        : null;
    return {
      total: sum("total"),
      available: sum("available"),
      deployed: sum("deployed"),
    };
  }, [resources]);
  const activeDeployments = deployments.filter((item) =>
    item.assignedTeam
    && !["Awaiting Dispatch", "Resolved", "Closed"].includes(item.responseStatus)
  );
  const recordStatus = loading ? "loading" : resourceError || deploymentError ? "unavailable" : "loaded";
  const retry = () => {
    setLoading(true);
    setResourceError("");
    setDeploymentError("");
    setReloadToken((value) => value + 1);
  };
  const formatCount = (value) => loading || value === null ? "Unavailable" : value.toLocaleString();
  return (
    <main className="emergency-resources-page">
      <header className="emergency-resources-header">
        <div>
          <h1 className="emergency-resources-title">Emergency Resources</h1>
          <p className="emergency-resources-subtitle">
            Recorded resource inventory and active dispatch assignments.
          </p>
        </div>
        <div className={`emergency-resources-status is-${recordStatus}`}>
          {loading ? "Loading records" : resourceError || deploymentError ? "Some records unavailable" : "Records loaded"}
        </div>
      </header>

      {(resourceError || deploymentError) ? (
        <div className="alert alert-danger" role="alert">
          {[resourceError, deploymentError].filter(Boolean).join(" ")}
          <button type="button" className="btn btn-link" onClick={retry}>Retry</button>
        </div>
      ) : null}

      <section className="emergency-summary" aria-label="Recorded resource totals">
        <Summary label="Total units" value={formatCount(resourceError ? null : totals.total)} detail="Sum of recorded inventory totals" />
        <Summary label="Available units" value={formatCount(resourceError ? null : totals.available)} detail="Sum of recorded available quantities" />
        <Summary label="Deployed units" value={formatCount(resourceError ? null : totals.deployed)} detail="Sum of recorded deployed quantities" />
      </section>

      <section className="emergency-resources-section">
        <div className="emergency-resources-section-header">
          <div>
            <h2 className="emergency-resources-section-title">Resource Availability</h2>
            <p className="emergency-resources-section-subtitle">Values are taken from the configured resource inventory.</p>
          </div>
        </div>
        <div className="emergency-resources-section-body">
          {loading ? <p role="status">Loading resource inventory…</p> : null}
          {!loading && resourceError ? <p className="text-muted mb-0">Resource records could not be loaded.</p> : null}
          {!loading && !resourceError && resources.length === 0 ? (
            <p className="text-muted mb-0">No resource records are registered.</p>
          ) : null}
          {!loading && !resourceError && resources.length > 0 ? (
            <div className="emergency-resource-grid">
              {resources.map((resource, index) => {
                const total = Number.isFinite(resource.total) ? resource.total : null;
                const available = Number.isFinite(resource.available) ? resource.available : null;
                const percentage = total > 0 && available !== null
                  ? Math.max(0, Math.min(100, Math.round(available / total * 100)))
                  : null;
                const category = String(resource.category || "").toUpperCase();
                const progressClass = percentage === null ? "" : percentage <= 20
                  ? "emergency-resource-progress-critical"
                  : percentage <= 40 ? "emergency-resource-progress-low"
                    : percentage <= 60 ? "emergency-resource-progress-warning" : "";
                return (
                  <article className="emergency-resource-card" key={resource._id || resource.id || `${category}-${index}`}>
                    <div className="emergency-resource-top">
                      <div className="emergency-resource-icon">{ICON_BY_CATEGORY[category] || "📦"}</div>
                      <span className="emergency-resource-status">{resource.status || "Status not recorded"}</span>
                    </div>
                    <h3 className="emergency-resource-name">{resource.name || "Unnamed resource"}</h3>
                    <p className="emergency-resource-description">{resource.description || category || "Category not recorded"}</p>
                    <div className="emergency-resource-count">
                      <span className="emergency-resource-available">{available === null ? "Unavailable" : available.toLocaleString()}</span>
                      <span className="emergency-resource-total">/ {total === null ? "Unavailable" : `${total.toLocaleString()} units`}</span>
                    </div>
                    {percentage === null ? (
                      <p className="emergency-resource-status-text">Availability ratio unavailable.</p>
                    ) : (
                      <>
                        <div className="emergency-resource-progress" aria-label={`${percentage}% available`}>
                          <div className={`emergency-resource-progress-bar ${progressClass}`} style={{ width: `${percentage}%` }} />
                        </div>
                        <p className="emergency-resource-status-text">{percentage}% of recorded units available</p>
                      </>
                    )}
                    <p className="emergency-resource-status-text mb-0">
                      Location: {resource.location || "Not recorded"}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>

      <section className="emergency-resources-section">
        <div className="emergency-resources-section-header">
          <div>
            <h2 className="emergency-resources-section-title">Active Dispatch Assignments</h2>
            <p className="emergency-resources-section-subtitle">Assignments linked to unresolved incidents.</p>
          </div>
        </div>
        <div className="emergency-resources-section-body">
          {deploymentError ? <p className="text-muted mb-0">Dispatch records could not be loaded.</p> : null}
          {!deploymentError && !loading && activeDeployments.length === 0 ? (
            <p className="text-muted mb-0">No active dispatch assignments are recorded.</p>
          ) : null}
          {activeDeployments.length > 0 ? (
            <div className="emergency-deployment-list">
              {activeDeployments.map((item) => (
                <article className="emergency-deployment-item" key={item.incidentId || item.id}>
                  <div className="emergency-deployment-info">
                    <div className="emergency-deployment-icon">🚨</div>
                    <div>
                      <h3 className="emergency-deployment-name">{item.location || "Location not recorded"}</h3>
                      <p className="emergency-deployment-location">
                        {item.type || "Incident type not recorded"} · {item.responseStatus || "Status not recorded"}
                      </p>
                    </div>
                  </div>
                  <span className="emergency-deployment-count">{item.assignedTeam}</span>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="emergency-resources-section">
        <div className="emergency-resources-section-header">
          <div>
            <h2 className="emergency-resources-section-title">Emergency Contact</h2>
            <p className="emergency-resources-section-subtitle">National emergency number shown by this application.</p>
          </div>
        </div>
        <div className="emergency-resources-section-body">
          <a className="emergency-contact" href="tel:112">
            <h3 className="emergency-contact-name">Emergency response</h3>
            <span className="emergency-contact-number">112</span>
            <span className="emergency-contact-label">Call the national emergency number</span>
          </a>
        </div>
      </section>
    </main>
  );
}
function Summary({ label, value, detail }) {
  return (
    <article className="emergency-summary-card">
      <div className="emergency-summary-label">{label}</div>
      <div className="emergency-summary-value">{value}</div>
      <div className="emergency-summary-detail">{detail}</div>
    </article>
  );
}
export default EmergencyResources;
