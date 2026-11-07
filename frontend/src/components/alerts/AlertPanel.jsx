import { useState } from "react";
import { AlertOctagon, Flame, AlertTriangle, MapPin } from "lucide-react";
import { useAlerts } from "../../context/useAlerts";
import WarningBanner from "./WarningBanner";
import AlertList from "./AlertList";
import AlertDetails from "./AlertDetails";
import Modal from "../common/Modal";
import TargetedAlertComposer from "./TargetedAlertComposer";
import ThresholdSimulator from "./ThresholdSimulator";
export const AlertPanel = () => {
  const { alerts, alertsLoading, alertsError, loadAlerts } = useAlerts();
  const [selectedAlert, setSelectedAlert] = useState(null);
  const activeAlerts = alerts.filter(
    (alert) => alert.status === "Active" || alert.status === "ACTIVE",
  );
  const criticalCount = alerts.filter(
    (alert) => alert.riskLevel === "Critical" || alert.riskLevel === "CRITICAL",
  ).length;
  const highCount = alerts.filter(
    (alert) => alert.riskLevel === "High" || alert.riskLevel === "HIGH",
  ).length;
  const targetedAlerts = alerts.filter((alert) => Boolean(alert.targetType)).length;
  return (
    <div className="container-fluid p-0 alert-panel-container">
      <WarningBanner onSelectAlert={(alert) => setSelectedAlert(alert)} />
      {alertsError ? (
        <div className="alert alert-danger" role="alert">
          {alertsError} <button type="button" className="btn btn-link" onClick={loadAlerts}>Retry</button>
        </div>
      ) : null}
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
              {alertsLoading || alertsError ? "--" : criticalCount}
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
              {alertsLoading || alertsError ? "--" : highCount}
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

            <div className="kpi-metric-value">{alertsLoading || alertsError ? "--" : activeAlerts.length}</div>

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
              {alertsLoading || alertsError ? "--" : targetedAlerts}
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
            {alertsLoading || alertsError ? "Unavailable" : `${alerts.length} Alert Records`}
          </span>
        </div>

        {alertsLoading || alertsError ? null : (
          <AlertList
            alerts={alerts}
            onSelectAlert={(alert) => setSelectedAlert(alert)}
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
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
        />
      </Modal>
    </div>
  );
};
export default AlertPanel;
