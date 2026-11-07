import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { sentryApi } from "../services/sentryApi";
import "../css/sentry.css";
const RELOCATION_STATUSES = ["UNKNOWN", "NOT_REQUIRED", "MONITOR", "PLANNED", "IN_PROGRESS", "RELOCATED"];
function HabitationDetails() {
  const { id } = useParams();
  const [habitation, setHabitation] = useState(null);
  const [zone, setZone] = useState(null);
  const [priority, setPriority] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [decisionSaving, setDecisionSaving] = useState(false);
  const [decisionMessage, setDecisionMessage] = useState("");
  const [relocationStatus, setRelocationStatus] = useState("UNKNOWN");
  const [error, setError] = useState("");
  let currentUser = null;
  try {
    currentUser = JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user") || "null");
  } catch (parseError) {
    console.error("Unable to read current user for relocation controls:", parseError);
  }
  const canRecordDecision = currentUser?.role === "admin"
    || (currentUser?.role === "authority" && currentUser?.authorityStatus === "verified");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [habitationResponse, zoneResponse, priorityResponse] = await Promise.all([
        sentryApi.getHabitation(id),
        sentryApi.getRedZone(id).catch((zoneError) => {
          if (zoneError.response?.status === 404) return { data: null };
          throw zoneError;
        }),
        sentryApi.getRelocationPriority(id),
      ]);
      setHabitation(habitationResponse.data);
      setRelocationStatus(habitationResponse.data.relocationStatus || "UNKNOWN");
      setZone(zoneResponse.data?.assessment || null);
      setPriority(priorityResponse.data[0] || priorityResponse.data || null);
    } catch (loadError) {
      setError(loadError.message || "Unable to load this habitation.");
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    let active = true;
    Promise.all([
      sentryApi.getHabitation(id),
      sentryApi.getRedZone(id).catch((zoneError) => {
        if (zoneError.response?.status === 404) return { data: null };
        throw zoneError;
      }),
      sentryApi.getRelocationPriority(id),
    ])
      .then(([habitationResponse, zoneResponse, priorityResponse]) => {
        if (!active) return;
        setHabitation(habitationResponse.data);
        setRelocationStatus(habitationResponse.data.relocationStatus || "UNKNOWN");
        setZone(zoneResponse.data?.assessment || null);
        setPriority(priorityResponse.data[0] || priorityResponse.data || null);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Unable to load this habitation.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id]);
  const recalculate = async () => {
    setSaving(true);
    setError("");
    try {
      await sentryApi.recalculateRedZone(id);
      await load();
    } catch (loadError) {
      setError(loadError.message || "Unable to recalculate this habitation.");
    } finally {
      setSaving(false);
    }
  };
  const saveRelocationDecision = async (event) => {
    event.preventDefault();
    setDecisionSaving(true);
    setDecisionMessage("");
    setError("");
    try {
      const response = await sentryApi.updateHabitation(id, { relocationStatus });
      setHabitation(response.data);
      setDecisionMessage("Relocation decision saved.");
    } catch (saveError) {
      setError(saveError.message || "Unable to save the relocation decision.");
    } finally {
      setDecisionSaving(false);
    }
  };
  if (loading) return <div className="sentry-page sentry-state" role="status">Loading habitation…</div>;
  if (error && !habitation) return <div className="sentry-page container py-4"><div className="alert alert-danger">{error}<button className="btn btn-link" onClick={load}>Retry</button></div></div>;
  if (!habitation) return <div className="sentry-page sentry-state">Habitation not found.</div>;
  const coordinates = habitation.location?.coordinates || [];
  const groups = habitation.vulnerableGroups || {};
  const factors = zone?.hazards || [];
  return (
    <section className="sentry-page container-fluid py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div><Link to="/habitations">← Habitations</Link><p className="sentry-eyebrow mt-3 mb-1">HABITATION DETAILS</p><h1 className="h2">{habitation.name}</h1><p className="text-muted mb-0">{habitation.district || "District not recorded"}, {habitation.state || "State not recorded"}</p></div>
        {canRecordDecision ? <button className="btn btn-primary" disabled={saving} onClick={recalculate}>{saving ? "Assessing…" : "Recalculate assessment"}</button> : null}
      </div>
      {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
      <div className="row g-3 mb-4">
        <Metric label="Population" value={Number.isFinite(habitation.population) ? habitation.population.toLocaleString() : "Unavailable"} />
        <Metric label="SENTRY zone" value={habitation.risk?.level || "UNKNOWN"} />
        <Metric label="Index score" value={Number.isFinite(habitation.risk?.score) ? `${habitation.risk.score}/100` : "Unavailable"} />
        <Metric label="Relocation priority" value={priority?.priority || "Unavailable"} />
      </div>
      <div className="row g-4">
        <div className="col-12 col-lg-5">
          <article className="sentry-panel h-100">
            <h2 className="h5">Exposure profile</h2>
            <p>Exposure: <strong>{habitation.exposure}</strong></p>
            <p>Primary hazard: <strong>{habitation.primaryHazard || "Not assessed"}</strong></p>
            <p>Relocation status: <strong>{habitation.relocationStatus ? String(habitation.relocationStatus).replaceAll("_", " ") : "Not recorded"}</strong></p>
            {canRecordDecision ? (
              <form className="mt-3" onSubmit={saveRelocationDecision}>
                <label className="form-label" htmlFor="relocation-decision">Authority relocation decision</label>
                <div className="d-flex gap-2">
                  <select
                    id="relocation-decision"
                    className="form-select"
                    value={relocationStatus}
                    onChange={(event) => setRelocationStatus(event.target.value)}
                    disabled={decisionSaving}
                  >
                    {RELOCATION_STATUSES.map((status) => (
                      <option key={status} value={status}>{status.replaceAll("_", " ")}</option>
                    ))}
                  </select>
                  <button className="btn btn-outline-primary text-nowrap" type="submit" disabled={decisionSaving}>
                    {decisionSaving ? "Saving…" : "Save decision"}
                  </button>
                </div>
                {decisionMessage ? <p className="small text-success mt-2 mb-0" role="status">{decisionMessage}</p> : null}
              </form>
            ) : null}
            <p>Coordinates: <strong>{coordinates.length === 2 ? `${coordinates[1]}, ${coordinates[0]}` : "Not recorded"}</strong></p>
            <h3 className="h6 mt-4">Reported vulnerable groups</h3>
            {Object.values(groups).some(Number.isFinite)
              ? <ul className="mb-0">{Object.entries(groups).filter(([, count]) => Number.isFinite(count)).map(([group, count]) => <li key={group}>{group.replaceAll(/([A-Z])/g, " $1")}: {count}</li>)}</ul>
              : <p className="text-muted mb-0">No group counts recorded.</p>}
          </article>
        </div>
        <div className="col-12 col-lg-7">
          <article className="sentry-panel mb-4">
            <h2 className="h5">Explainable multi-hazard assessment</h2>
            {!zone ? <p className="text-muted mb-0">No saved assessment. Recalculate to use available weather, hazard feeds, and verified nearby reports.</p> : (
              <>
                <p>{zone.explanation?.summary}</p>
                <div className="table-responsive"><table className="table table-sm"><thead><tr><th>Hazard</th><th>Index</th><th>Evidence coverage</th><th /></tr></thead><tbody>
                  {factors.map((hazard) => <tr key={hazard.hazardType}><td className="text-capitalize">{hazard.hazardType}</td><td>{Number.isFinite(hazard.score) ? hazard.score : "Unavailable"}</td><td>{hazard.evidenceCount} sources</td><td>{hazard.factors.filter((factor) => factor.status === "unavailable").length} unavailable</td></tr>)}
                </tbody></table></div>
                <p className="small text-muted mb-0">Data coverage: {Number.isFinite(zone.explanation?.dataQuality?.availableFactors) ? zone.explanation.dataQuality.availableFactors : "Unavailable"}/{Number.isFinite(zone.explanation?.dataQuality?.totalFactors) ? zone.explanation.dataQuality.totalFactors : "Unavailable"} factors. Scores are decision-support indices, not probabilities or official warnings.</p>
              </>
            )}
          </article>
          <article className="sentry-panel">
            <h2 className="h5">Relocation options</h2>
            {!priority?.candidates?.length ? <p className="text-muted mb-0">No active relocation sites are registered.</p> : <div className="table-responsive"><table className="table table-sm mb-0"><thead><tr><th>Site</th><th>Available</th><th>Distance</th><th>Access / suitability</th><th>Candidate</th></tr></thead><tbody>{priority.candidates.map((candidate) => <tr key={candidate.siteId}><td>{candidate.name}</td><td>{Number.isFinite(candidate.available) ? candidate.available.toLocaleString() : "Unavailable"}</td><td>{candidate.distanceKm == null ? "Unavailable" : `${candidate.distanceKm} km`}</td><td>{candidate.roadAccess} / {candidate.suitability ?? "Not recorded"}</td><td>{candidate.usable ? "Suitable for review" : "Not confirmed safe"}</td></tr>)}</tbody></table></div>}
          </article>
        </div>
      </div>
    </section>
  );
}
function Metric({ label, value }) {
  return <div className="col-6 col-xl-3"><article className="sentry-panel h-100"><div className="small text-muted">{label}</div><strong className="fs-4">{value}</strong></article></div>;
}
export default HabitationDetails;
