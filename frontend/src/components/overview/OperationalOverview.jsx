import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Flame,
  Bell,
  Truck,
  Radio,
  ArrowRight,
  Layers,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAlerts } from "../../context/useAlerts";
import WarningBanner from "../alerts/WarningBanner";
import ThresholdSimulator from "../alerts/ThresholdSimulator";
import AlertCard from "../alerts/AlertCard";
import ResourceStatus from "../emergency/ResourceStatus";
import Modal from "../common/Modal";
import AlertDetails from "../alerts/AlertDetails";
import GisCommandCenter from "../gis/GisCommandCenter";
import { sentryApi } from "../../services/sentryApi";
export const OperationalOverview = () => {
  const {
    alerts = [], alertsLoading, alertsError, loadAlerts,
    emergencyAreas = [], emergencyAreasLoading, emergencyAreasError, loadEmergencyAreas,
    notifications = [], notificationsLoading, notificationsError, loadNotifications,
  } = useAlerts();
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [sentryData, setSentryData] = useState(null);
  const [sentryLoading, setSentryLoading] = useState(true);
  const [sentryError, setSentryError] = useState("");
  const [sentryReloadToken, setSentryReloadToken] = useState(0);
  const loadSentryData = useCallback(() => {
    setSentryLoading(true);
    setSentryError("");
    setSentryReloadToken((value) => value + 1);
  }, []);
  useEffect(() => {
    let active = true;
    Promise.all([
      sentryApi.getRelocationSites(),
      sentryApi.getRelocationPriorities(),
    ])
      .then(([sites, priorities]) => {
        if (!active) return;
        setSentryData({ sites: sites.data, priorities: priorities.data });
        setSentryError("");
      })
      .catch((error) => {
        if (!active) return;
        setSentryData(null);
        setSentryError(error.message || "Unable to load SENTRY operational data.");
      })
      .finally(() => {
        if (active) setSentryLoading(false);
      });
    return () => { active = false; };
  }, [sentryReloadToken]);
  const getRiskLevel = (alert) => {
    return String(
      alert?.riskLevel || alert?.risk?.level || "UNKNOWN",
    ).toUpperCase();
  };
  const criticalAlerts = alerts.filter(
    (alert) => getRiskLevel(alert) === "CRITICAL",
  );
  const eligibleRelocationSites = (sentryData?.sites || [])
    .filter((site) => site.status === "ACTIVE" && site.roadAccess === "OPEN" && Number.isFinite(site.suitability) && site.suitability >= 50);
  const availableRelocationCapacity = eligibleRelocationSites.length > 0
    && eligibleRelocationSites.every((site) => Number.isFinite(site.capacity?.available))
    ? eligibleRelocationSites.reduce((sum, site) => sum + site.capacity.available, 0)
    : null;
  const activeChannels = new Set(
    notifications.filter((item) => item.delivered && item.channel).map((item) => item.channel),
  ).size;
  const p1Areas = emergencyAreas.filter(
    (area) =>
      String(area?.priorityQueue || "").toLowerCase() ===
      "priority 1".toLowerCase(),
  );
  const getAlertId = (alert) => {
    return alert?.id || alert?._id || "Alert";
  };
  const getLocationName = (alert) => {
    if (!alert?.location) {
      return "Unknown Location";
    }
    if (typeof alert.location === "string") {
      return alert.location;
    }
    return alert.location.name || alert.location.district || "Unknown Location";
  };
  const getNotificationTitle = (notification) => {
    if (!notification?.title) {
      return "Notification";
    }
    if (typeof notification.title === "string") {
      return notification.title;
    }
    return notification.title.en || "Notification";
  };
  const getNotificationMessage = (notification) => {
    if (!notification?.message) {
      return "";
    }
    if (typeof notification.message === "string") {
      return notification.message;
    }
    return notification.message.en || "";
  };
  const getNotificationTime = (notification) => {
    const timestamp = notification?.timestamp || notification?.createdAt;
    if (!timestamp) {
      return "";
    }
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  return (
    <div className="container-fluid p-0 overview-container">

      <WarningBanner onSelectAlert={(alert) => setSelectedAlert(alert)} />
      {emergencyAreasError ? <div className="alert alert-danger" role="alert">{emergencyAreasError}<button className="btn btn-link" onClick={loadEmergencyAreas}>Retry</button></div> : null}


      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <div
            className="kpi-metric-card h-100"
            style={{
              borderLeft: "4px solid var(--critical)",
            }}
          >
            <div className="kpi-metric-header">
              <span>Critical alerts</span>

              <Flame size={16} color="var(--critical)" />
            </div>

            <div
              className="kpi-metric-value"
              style={{
                color: "var(--critical)",
              }}
            >
              {alertsLoading || alertsError ? "--" : criticalAlerts.length}
            </div>

            <div className="kpi-metric-sub">Recorded alert records</div>
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
              <span>Priority 1 incidents</span>

              <Layers size={16} color="var(--high-risk)" />
            </div>

            <div
              className="kpi-metric-value"
              style={{
                color: "var(--high-risk)",
              }}
            >
              {emergencyAreasLoading || emergencyAreasError ? "--" : p1Areas.length}
            </div>

            <div className="kpi-metric-sub">
              Ranked by risk and operational impact
            </div>
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
              <span>Active Broadcast Channels</span>

              <Radio size={16} color="var(--info)" />
            </div>

            <div className="kpi-metric-value">{notificationsLoading || notificationsError ? "--" : activeChannels}</div>

            <div className="kpi-metric-sub">Channels used by delivered notifications</div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div
            className="kpi-metric-card h-100"
            style={{
              borderLeft: "4px solid var(--safe)",
            }}
          >
            <div className="kpi-metric-header">
              <span>Available relocation capacity</span>

              <Truck size={16} color="var(--safe)" />
            </div>

            <div className="kpi-metric-value">{sentryLoading || sentryError ? "--" : availableRelocationCapacity === null ? "Unavailable" : availableRelocationCapacity.toLocaleString()}</div>

            <div className="kpi-metric-sub">Recorded open access and suitability only</div>
          </div>
        </div>
      </div>


      <ThresholdSimulator />


      {sentryError ? <div className="alert alert-danger" role="alert">{sentryError} <button className="btn btn-link" onClick={loadSentryData}>Retry</button></div> : null}
      {sentryLoading ? <div className="alert alert-secondary" role="status">Loading SENTRY data…</div> : null}
      <GisCommandCenter role="authority" />


      <div className="row g-4 mb-4">

        <div className="col-12 col-lg-7">
          <div className="ops-panel h-100">
            <div className="ops-panel-header">
              <h3 className="ops-panel-title">
                <AlertTriangle size={18} color="var(--critical)" />

                <span>Active High-Severity Risk Alerts</span>
              </h3>

              <Link to="/alerts" className="btn-ops btn-ops-sm">
                <span>View All ({alerts.length})</span>

                <ArrowRight size={12} />
              </Link>
            </div>

            <div className="d-flex flex-column gap-3">
              {alertsError ? <div className="alert alert-danger">{alertsError}<button className="btn btn-link" onClick={loadAlerts}>Retry</button></div>
              : alertsLoading ? <div role="status">Loading alerts…</div>
              : alerts.length === 0 ? (
                <div
                  className="ops-card text-center p-4"
                  style={{
                    color: "var(--text-muted)",
                  }}
                >
                  No active risk alerts.
                </div>
              ) : (
                alerts
                  .slice(0, 2)
                  .map((alert) => (
                    <AlertCard
                      key={getAlertId(alert)}
                      alert={alert}
                      onSelect={(selected) => setSelectedAlert(selected)}
                    />
                  ))
              )}
            </div>
          </div>
        </div>


        <div className="col-12 col-lg-5">
          <div className="ops-panel h-100">
            <div className="ops-panel-header">
              <h3 className="ops-panel-title">
                <Bell size={18} color="var(--info)" />

                <span>Latest Notifications</span>
              </h3>

              <Link to="/notifications" className="btn-ops btn-ops-sm">
                <span>Hub</span>

                <ArrowRight size={12} />
              </Link>
            </div>

            <div className="d-flex flex-column gap-2">
              {notificationsError ? <div className="alert alert-danger">{notificationsError}<button className="btn btn-link" onClick={loadNotifications}>Retry</button></div>
              : notificationsLoading ? <div role="status">Loading notifications…</div>
              : notifications.length === 0 ? (
                <div
                  className="ops-card text-center p-4"
                  style={{
                    color: "var(--text-muted)",
                  }}
                >
                  No notifications.
                </div>
              ) : (
                notifications.slice(0, 3).map((notification) => {
                  const id = notification.id || notification._id;
                  return (
                    <div
                      key={id}
                      className={`ops-card ${
                        !notification.read ? "elevated" : ""
                      } p-3`}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <span
                          className={`notif-channel-badge ${
                            notification.channel || "in_app"
                          }`}
                          style={{
                            fontSize: "1.022rem",
                          }}
                        >
                          {String(
                            notification.channel || "IN_APP",
                          ).toUpperCase()}
                        </span>

                        <span
                          style={{
                            fontSize: "1.07rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          {getNotificationTime(notification)}
                        </span>
                      </div>

                      <strong
                        style={{
                          fontSize: "1.288rem",
                          color: "var(--text-primary)",
                          display: "block",
                          marginBottom: "2px",
                        }}
                      >
                        {getNotificationTitle(notification)}
                      </strong>

                      <p
                        style={{
                          fontSize: "1.179rem",
                          color: "var(--text-secondary)",
                          margin: 0,
                          lineHeight: 1.35,
                        }}
                      >
                        {getNotificationMessage(notification)}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>


      <ResourceStatus />


      <Modal
        isOpen={Boolean(selectedAlert)}
        onClose={() => setSelectedAlert(null)}
        title={
          selectedAlert
            ? `${getAlertId(selectedAlert)} - ${getLocationName(selectedAlert)}`
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
export default OperationalOverview;
