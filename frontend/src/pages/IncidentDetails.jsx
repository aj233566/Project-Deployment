import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import StatusBadge from "../components/StatusBadge";
import "../css/IncidentDetails.css";
import { getIncidentEvidence, getIncidentById, updateIncidentStatus } from "../services/api";
const STATUSES = ["submitted", "verified", "in_progress", "resolved"];
function getStoredUser() {
  try {
    const value = sessionStorage.getItem("user") || localStorage.getItem("user");
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}
function formatStatus(value) {
  return String(value || "unknown")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
function AuthenticatedEvidence({ fileId, type, index }) {
  const [evidence, setEvidence] = useState(null);
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    getIncidentEvidence(fileId)
      .then((loadedUrl) => {
        objectUrl = loadedUrl;
        if (active) setEvidence({ fileId, url: loadedUrl });
        else URL.revokeObjectURL(loadedUrl);
      })
      .catch(() => {
        if (active) setEvidence({ fileId, failed: true });
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId]);
  const currentEvidence = evidence?.fileId === fileId ? evidence : null;
  if (currentEvidence?.failed) return <p role="alert">Unable to load this evidence file.</p>;
  if (!currentEvidence?.url) return <p role="status">Loading {type.toLowerCase()}…</p>;
  if (type === "Photo") {
    return <img src={currentEvidence.url} alt={`Incident evidence ${index + 1}`} className="img-fluid rounded" style={{ maxHeight: "500px" }} />;
  }
  return (
    <video controls preload="metadata" className="w-100 rounded" style={{ maxHeight: "600px" }}>
      <source src={currentEvidence.url} />
      Your browser does not support video playback.
    </video>
  );
}
function IncidentDetails() {
  const { id } = useParams();
  const location = useLocation();
  const user = getStoredUser();
  const canUpdateStatus = user?.role === "admin"
    || (user?.role === "authority" && user?.authorityStatus === "verified");
  const fallbackIncident = location.state?.incident || null;
  const [serverIncident, setServerIncident] = useState(null);
  const [loadedId, setLoadedId] = useState(null);
  const [statusChoice, setStatusChoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [riskRecalculation, setRiskRecalculation] = useState(null);
  useEffect(() => {
    let active = true;
    if (!/^[a-f\d]{24}$/i.test(id || "")) return () => { active = false; };
    getIncidentById(id)
      .then((response) => {
        if (!active) return;
        const record = response?.data;
        if (!record) throw new Error("Incident details were not returned by the server.");
        setServerIncident(record);
        setLoadedId(id);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError.response?.data?.message || loadError.message || "Unable to load incident details.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id, fallbackIncident]);
  const isServerIncident = /^[a-f\d]{24}$/i.test(id || "");
  const currentIncident = isServerIncident
    ? loadedId === id ? serverIncident : fallbackIncident
    : fallbackIncident;
  const status = statusChoice?.id === id
    ? statusChoice.value
    : currentIncident?.status?.toLowerCase() || "submitted";
  const saveStatus = async () => {
    if (!currentIncident?._id || !canUpdateStatus || !STATUSES.includes(status)) return;
    setSaving(true);
    setError("");
    setMessage("");
    setRiskRecalculation(null);
    try {
      const response = await updateIncidentStatus(currentIncident._id, status);
      const updatedIncident = response?.data;
      if (!updatedIncident) throw new Error("The server did not return the updated incident.");
      setServerIncident(updatedIncident);
      setLoadedId(id);
      setStatusChoice({ id, value: updatedIncident.status });
      setRiskRecalculation(response.riskRecalculation || null);
      setMessage("Incident status saved.");
    } catch (saveError) {
      setError(saveError.response?.data?.message || saveError.message || "Unable to update incident status.");
    } finally {
      setSaving(false);
    }
  };
  if (isServerIncident && loading && loadedId !== id) {
    return <div className="container py-4" role="status">Loading incident details…</div>;
  }
  if (!currentIncident) {
    return (
      <div className="container incident-details-page py-4">
        <Link to={canUpdateStatus ? "/incidents" : "/citizen/incidents"} className="back-btn">← Back to Incidents</Link>
        <h1 className="mt-4">Incident Not Found</h1>
        <p role="alert">{error || "No incident details are available."}</p>
      </div>
    );
  }
  const incident = currentIncident;
  const images = Array.isArray(incident.images) ? incident.images : [];
  const videos = Array.isArray(incident.videos) ? incident.videos : [];
  const localEvidence = incident.evidence && typeof incident.evidence === "object"
    ? incident.evidence
    : null;
  const reportedAt = incident.reportedAt || incident.createdAt || incident.time;
  const reportedDate = reportedAt ? new Date(reportedAt) : null;
  const reportedDateText = reportedDate && Number.isFinite(reportedDate.getTime())
    ? reportedDate.toLocaleString()
    : "Not recorded";
  const incidentType = incident.title || incident.type || "Incident";
  const locationText = typeof incident.location === "string"
    ? incident.location
    : Number.isFinite(incident.location?.latitude) && Number.isFinite(incident.location?.longitude)
      ? `${incident.location.latitude}, ${incident.location.longitude}`
      : "Location not recorded";
  return (
    <div className="container incident-details-page py-4">
      <div className="details-header">
        <div>
          <Link to={canUpdateStatus ? "/incidents" : "/citizen/incidents"} className="back-btn">← Back to Incidents</Link>
          <h1 className="mt-3">{incidentType}</h1>
          <p>Incident Details</p>
        </div>
        <StatusBadge status={incident.status || status} synced={incident.synced} />
      </div>

      {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
      {message ? <div className="alert alert-success" role="status">{message}</div> : null}

      <section className="incident-details-card" aria-label="Incident information">
        <div className="details-row"><strong>Incident Type</strong><span>{formatStatus(incident.type || incidentType)}</span></div>
        {incident.hazardSubtype ? <div className="details-row"><strong>SENTRY hazard subtype</strong><span>{formatStatus(incident.hazardSubtype)}</span></div> : null}
        <div className="details-row"><strong>Severity</strong><span>{formatStatus(incident.severity)}</span></div>
        <div className="details-row"><strong>Description</strong><span>{incident.description || "Not recorded"}</span></div>
        <div className="details-row"><strong>Location</strong><span>{locationText}</span></div>
        <div className="details-row"><strong>Reported On</strong><span>{reportedDateText}</span></div>
        {incident.linkedHabitation ? (
          <div className="details-row">
            <strong>Linked habitation</strong>
            <span><Link to={`/habitations/${incident.linkedHabitation}`}>View registered habitation</Link></span>
          </div>
        ) : (
          <div className="details-row"><strong>Linked habitation</strong><span>Not linked to a registered habitation</span></div>
        )}
      </section>

      <section className="incident-details-card mt-4" aria-label="Incident evidence">
        <h2 className="h4">Evidence</h2>
        {images.map((fileId, index) => (
          <div className="mt-3" key={fileId || `image-${index}`}>
            <AuthenticatedEvidence fileId={fileId} type="Photo" index={index} />
            <small className="d-block mt-2">Photo {index + 1}</small>
          </div>
        ))}
        {videos.map((fileId, index) => (
          <div className="mt-3" key={fileId || `video-${index}`}>
            <AuthenticatedEvidence fileId={fileId} type="Video" index={index} />
            <small className="d-block mt-2">Video {index + 1}</small>
          </div>
        ))}
        {localEvidence ? <p className="mb-0 mt-3">Local evidence: {localEvidence.name || "Pending synchronization"}</p> : null}
        {images.length === 0 && videos.length === 0 && !localEvidence ? <p className="text-muted mt-3 mb-0">No evidence attached to this record.</p> : null}
      </section>

      <section className="incident-details-card mt-4" aria-label="Incident lifecycle">
        <h2 className="h4">Incident Lifecycle</h2>
        <div className="lifecycle">
          {STATUSES.map((item, index) => {
            const currentIndex = STATUSES.indexOf(incident.status || status);
            return (
              <div key={item} className={`lifecycle-step ${index <= currentIndex ? "completed" : ""}`}>
                <div className="lifecycle-circle">{index < currentIndex ? "✓" : index + 1}</div>
                <span>{formatStatus(item)}</span>
              </div>
            );
          })}
        </div>

        {canUpdateStatus ? (
          <div className="status-controls">
            <label className="form-label" htmlFor="incident-status">Update Incident Status</label>
            <div className="d-flex gap-2">
              <select id="incident-status" className="form-select" value={status} onChange={(event) => setStatusChoice({ id, value: event.target.value })} disabled={saving}>
                {STATUSES.map((item) => <option key={item} value={item}>{formatStatus(item)}</option>)}
              </select>
              <button type="button" className="btn btn-primary text-nowrap" onClick={saveStatus} disabled={saving || status === incident.status}>
                {saving ? "Saving…" : "Save status"}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {riskRecalculation ? (
        <section className="alert alert-info mt-4" aria-live="polite">
          <strong>Habitation assessment: {formatStatus(riskRecalculation.status)}</strong>
          {riskRecalculation.habitationId ? <div><Link to={`/habitations/${riskRecalculation.habitationId}`}>Open updated habitation assessment</Link></div> : null}
          {riskRecalculation.reason ? <div>{riskRecalculation.reason}</div> : null}
          {riskRecalculation.message ? <div>{riskRecalculation.message}</div> : null}
        </section>
      ) : incident.status === "verified" && ["high", "critical"].includes(String(incident.severity).toLowerCase()) ? (
        <p className="text-muted mt-3">Assessment recalculation status was not returned with this incident record.</p>
      ) : null}
    </div>
  );
}
export default IncidentDetails;
