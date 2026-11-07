import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import IncidentCard from "../components/IncidentCard";
import { getIncidents, updateIncidentFromServer } from "../services/db";
import { getIncidentById } from "../services/api";
import { syncPendingIncidents } from "../services/incidentSyncService";
import "../css/CitizenIncidents.css";
function CitizenIncidents() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const loadIncidents = useCallback(async () => {
    try {
      const savedIncidents = await getIncidents();
      let refreshFailed = false;
      const currentIncidents = await Promise.all(savedIncidents.map(async (incident) => {
        if (!incident.synced || !incident.remoteId) return incident;
        try {
          const response = await getIncidentById(incident.remoteId);
          return await updateIncidentFromServer(incident.id, response?.data) || incident;
        } catch {
          refreshFailed = true;
          return incident;
        }
      }));
      const sortedIncidents = [...currentIncidents].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.time || 0);
        const dateB = new Date(b.createdAt || b.time || 0);
        return dateB - dateA;
      });
      setIncidents(sortedIncidents);
      setError(refreshFailed
        ? "Some server statuses could not be refreshed. Showing the last locally saved report status."
        : "");
    } catch (error) {
      console.error("Error loading citizen incidents:", error);
      setError(error.message || "Unable to load locally saved reports.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const initialLoad = window.setTimeout(() => { void loadIncidents(); }, 0);
    const handleSync = () => loadIncidents();
    window.addEventListener("incident-sync-complete", handleSync);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("incident-sync-complete", handleSync);
    };
  }, [loadIncidents]);
  const pendingCount = incidents.filter(
    (incident) =>
      incident.synced === false || incident.syncStatus === "Pending Sync",
  ).length;
  const syncedCount = incidents.filter(
    (incident) => incident.synced === true || incident.syncStatus === "Synced",
  ).length;
  const handleReportIncident = () => {
    navigate("/report-incident");
  };
  const handleSyncPending = async () => {
    setSyncing(true);
    try {
      const result = await syncPendingIncidents();
      if (result.failed > 0) {
        setError(`${result.synced} report(s) synchronized; ${result.failed} remain queued. Check the connection and retry.`);
      } else if (result.synced > 0) {
        setError("");
      }
      await loadIncidents();
    } catch (syncError) {
      setError(syncError.message || "Unable to synchronize pending reports.");
    } finally {
      setSyncing(false);
    }
  };
  return (
    <main className="incidents-page">
      <div className="container py-4">
        {error ? <div className="alert alert-warning" role="status">{error}</div> : null}
        <div className="incidents-header row align-items-center">
          <div className="col-12 col-md-8">
            <button
              type="button"
              className="btn btn-outline-light mb-3"
              onClick={() => navigate("/dashboard/citizen")}
            >
              ← Back
            </button>
            <h1 className="incidents-title">My Reported Incidents</h1>

            <p className="incidents-subtitle">
              View the disaster incidents you have reported.
            </p>
          </div>

          <div className="col-12 col-md-4">
            <div className="incidents-header-action">
              {pendingCount > 0 ? (
                <button
                  type="button"
                  className="btn btn-outline-primary me-2"
                  onClick={handleSyncPending}
                  disabled={syncing || !navigator.onLine}
                >
                  {syncing ? "Synchronizing…" : `Sync ${pendingCount} pending`}
                </button>
              ) : null}
              <button
                type="button"
                className="incident-report-button"
                onClick={handleReportIncident}
              >
                + Report Incident
              </button>
            </div>
          </div>
        </div>

        {!loading && (
          <div className="incidents-statistics row g-3">
            <div className="col-12 col-sm-6 col-lg-4">
              <div className="incident-stat-card">
                <p className="incident-stat-label">Total Reports</p>

                <p className="incident-stat-value">{incidents.length}</p>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-4">
              <div className="incident-stat-card">
                <p className="incident-stat-label">Pending Sync</p>

                <p className="incident-stat-value incident-stat-high">
                  {pendingCount}
                </p>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-4">
              <div className="incident-stat-card">
                <p className="incident-stat-label">Synced Reports</p>

                <p className="incident-stat-value incident-stat-response">
                  {syncedCount}
                </p>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="incidents-loading">
            <div className="incidents-spinner"></div>

            <p>Loading your incidents...</p>
          </div>
        )}

        {!loading && incidents.length === 0 && (
          <div className="incident-table-card">
            <div className="incident-empty-state">
              <h2>No incidents reported</h2>

              <p>You have not reported any disaster incidents yet.</p>

              <button
                type="button"
                className="incident-report-button"
                onClick={handleReportIncident}
              >
                Report Your First Incident
              </button>
            </div>
          </div>
        )}

        {!loading && incidents.length > 0 && (
          <section className="citizen-incident-list">
            <div className="incident-table-header">
              <div>
                <h2 className="incident-table-title">Your Incidents</h2>

                <p className="incident-count">
                  {incidents.length} report
                  {incidents.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="row g-4">
              {incidents.map((incident) => (
                <div
                  className="col-12 col-md-6"
                  key={incident.id || incident._id}
                >
                  <IncidentCard incident={incident} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
export default CitizenIncidents;
