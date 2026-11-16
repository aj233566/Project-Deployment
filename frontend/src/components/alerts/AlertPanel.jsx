import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertOctagon, Flame, AlertTriangle, Clock3, MapPin, RefreshCw } from "lucide-react";
import { useAlerts } from "../../context/useAlerts";
import { isAlertActive } from "../../utils/alertState";
import WarningBanner from "./WarningBanner";
import AlertList from "./AlertList";
import AlertDetails from "./AlertDetails";
import Modal from "../common/Modal";
import TargetedAlertComposer from "./TargetedAlertComposer";
import ThresholdSimulator from "./ThresholdSimulator";
export const AlertPanel = () => {
  const { alerts, alertsLoading, alertsError, loadAlerts, deleteAlert } = useAlerts();
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingAlertId, setDeletingAlertId] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const activeAlerts = alerts.filter((alert) => isAlertActive(alert));
  const urgentAlert = useMemo(() => activeAlerts
    .filter((alert) => ["CRITICAL", "HIGH"].includes(String(alert.riskLevel || "").toUpperCase()))
    .sort((a, b) => Number(b.riskScore || 0) - Number(a.riskScore || 0))[0] || null,
  [activeAlerts]);
  const criticalCount = alerts.filter(
    (alert) => alert.riskLevel === "Critical" || alert.riskLevel === "CRITICAL",
  ).length;
  const highCount = alerts.filter(
    (alert) => alert.riskLevel === "High" || alert.riskLevel === "HIGH",
  ).length;
  const targetedAlerts = alerts.filter((alert) => Boolean(alert.targetType)).length;
  const refreshAlerts = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    const loaded = await loadAlerts({ silent });
    if (loaded) setLastUpdated(new Date());
    if (!silent) setRefreshing(false);
  }, [loadAlerts]);
  const handleDeleteAlert = async (alert) => {
    const id = alert?._id || alert?.id;
    if (!id || deletingAlertId) return;
    const name = typeof alert.location === "string" ? alert.location : alert.location?.name || "this alert";
    if (!window.confirm(`Delete the alert for ${name} permanently? Its linked notifications will remain in history without an alert link.`)) return;
    setDeletingAlertId(id);
    setDeleteError("");
    setDeleteMessage("");
    try {
      await deleteAlert(id);
      if ((selectedAlert?._id || selectedAlert?.id) === id) setSelectedAlert(null);
      setDeleteMessage(`Alert for ${name} was deleted.`);
    } catch (error) {
      setDeleteError(error.response?.data?.message || error.message || "Unable to delete this alert.");
    } finally {
      setDeletingAlertId(null);
    }
  };
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) void refreshAlerts(true);
    }, 30000);
    return () => window.clearInterval(timer);
  }, [refreshAlerts]);
  return (
    <div className="container-fluid p-0 alert-panel-container alerts-page">
      <header className="alerts-page-header">
        <div>
          <div className="alerts-eyebrow"><Activity size={15} /> OPERATIONS / MONITORING</div>
          <h1>Alert center</h1>
          <p>Review risk signals, issue targeted advisories, and track response status.</p>
        </div>
        <div className="alerts-header-actions">
          <span className="alerts-updated"><Clock3 size={14} />
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Auto-refresh every 30 sec"}
          </span>
          <button type="button" className="btn btn-outline-light alerts-refresh" onClick={() => void refreshAlerts()} disabled={refreshing || alertsLoading}>
            <RefreshCw size={15} className={refreshing ? "alerts-spin" : ""} />
            {refreshing ? "Refreshing" : "Refresh"}
          </button>
        </div>
      </header>
      {urgentAlert ? <WarningBanner alert={urgentAlert} onClick={() => setSelectedAlert(urgentAlert)} /> : null}
      {alertsError ? (
        <div className="alert alert-danger" role="alert">
          {alertsError} <button type="button" className="btn btn-link" onClick={loadAlerts}>Retry</button>
        </div>
      ) : null}
      {deleteError ? <div className="alert alert-danger" role="alert">{deleteError}</div> : null}
      {deleteMessage ? <div className="alert alert-success" role="status">{deleteMessage}</div> : null}
      {alertsLoading ? <div className="alert alert-secondary" role="status">Loading alert records…</div> : null}

      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <div
            className="kpi-metric-card h-100"
            style={{
              borderLeft: "4px solid var(--critical)",
            }}
          >
            <div className="kpi-metric-header">
              <span>Critical Alerts</span>
              <Flame size={16} color="var(--critical)" />
            </div>

            <div
              className="kpi-metric-value"
              style={{
                color: "var(--critical)",
              }}
            >
              {alertsLoading && alerts.length === 0 ? "--" : criticalCount}
            </div>

            <div className="kpi-metric-sub">Recorded critical alert records</div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div
            className="kpi-metric-card h-100"
            style={{
              borderLeft: "4px solid var(--high-risk)",
            }}
          >
            <div className="kpi-metric-header">
              <span>High Risk Alerts</span>

              <AlertTriangle size={16} color="var(--high-risk)" />
            </div>

            <div
              className="kpi-metric-value"
              style={{
                color: "var(--high-risk)",
              }}
            >
              {alertsLoading && alerts.length === 0 ? "--" : highCount}
            </div>

            <div className="kpi-metric-sub">Recorded high-severity alert records</div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div
            className="kpi-metric-card h-100"
            style={{
              borderLeft: "4px solid var(--warning)",
            }}
          >
            <div className="kpi-metric-header">
              <span>Active Alerts</span>

              <AlertOctagon size={16} color="var(--warning)" />
            </div>

            <div className="kpi-metric-value">{alertsLoading && alerts.length === 0 ? "--" : activeAlerts.length}</div>

            <div className="kpi-metric-sub">Alert records with active status</div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div
            className="kpi-metric-card h-100"
            style={{
              borderLeft: "4px solid var(--info)",
            }}
          >
            <div className="kpi-metric-header">
              <span>Geo-targeted alerts</span>
              <MapPin size={16} color="var(--info)" />
            </div>

            <div
              className="kpi-metric-value"
              style={{
                color: "var(--info)",
              }}
            >
              {alertsLoading && alerts.length === 0 ? "--" : targetedAlerts}
            </div>

            <div className="kpi-metric-sub">Alerts with registered geographic targets</div>
          </div>
        </div>
      </div>

      <TargetedAlertComposer />
      <ThresholdSimulator />

      <div className="ops-panel mt-4">
        <div className="ops-panel-header">
          <h2 className="ops-panel-title">
            <AlertTriangle size={18} color="var(--info)" />

            <span>Risk Alerts</span>
          </h2>

          <span className="badge-ops info">
            {alertsLoading && alerts.length === 0 ? "Loading" : `${alerts.length} Alert Records`}
          </span>
        </div>

        {alertsLoading && alerts.length === 0 ? null : (
          <AlertList
            alerts={alerts}
            onSelectAlert={(alert) => setSelectedAlert(alert)}
            onDeleteAlert={handleDeleteAlert}
            deletingAlertId={deletingAlertId}
          />
        )}
      </div>

      <Modal
        isOpen={Boolean(selectedAlert)}
        onClose={() => setSelectedAlert(null)}
        title={
          selectedAlert
            ? `${selectedAlert.id || selectedAlert._id} - ${
                selectedAlert.location?.name ||
                selectedAlert.location ||
                "Unknown Location"
              }`
            : "Alert Details"
        }
        maxWidth="720px"
      >
        <AlertDetails
          key={selectedAlert?._id || selectedAlert?.id || "alert-details"}
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
        />
      </Modal>
    </div>
  );
};
export default AlertPanel;
