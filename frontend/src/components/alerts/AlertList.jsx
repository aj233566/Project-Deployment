import { useState, useMemo } from "react";
import { Search, AlertTriangle } from "lucide-react";
import AlertCard from "./AlertCard";
export const AlertList = ({ alerts = [], onSelectAlert }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const normalizeRiskLevel = (level) => {
    return String(level || "UNKNOWN").toUpperCase();
  };
  const filteredAlerts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return alerts.filter((alert) => {
      const location =
        typeof alert.location === "string"
          ? alert.location
          : alert.location?.name || "";
      const state = alert.state || "";
      const alertId = alert.id || alert._id || "";
      const disasterType = alert.disasterType || "";
      const matchesSearch =
        !search ||
        location.toLowerCase().includes(search) ||
        state.toLowerCase().includes(search) ||
        alertId.toLowerCase().includes(search) ||
        disasterType.toLowerCase().includes(search);
      if (!matchesSearch) {
        return false;
      }
      if (severityFilter === "ALL") {
        return true;
      }
      if (severityFilter === "ACTIVE") {
        return alert.status === "Active" || alert.status === "ACTIVE";
      }
      return normalizeRiskLevel(alert.riskLevel) === severityFilter;
    });
  }, [alerts, searchTerm, severityFilter]);
  const criticalCount = alerts.filter(
    (alert) => normalizeRiskLevel(alert.riskLevel) === "CRITICAL",
  ).length;
  const highCount = alerts.filter(
    (alert) => normalizeRiskLevel(alert.riskLevel) === "HIGH",
  ).length;
  const moderateCount = alerts.filter(
    (alert) => normalizeRiskLevel(alert.riskLevel) === "MODERATE",
  ).length;
  const lowCount = alerts.filter(
    (alert) => normalizeRiskLevel(alert.riskLevel) === "LOW",
  ).length;
  return (
    <div>
      <div className="alert-filter-bar d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div className="filter-left-group d-flex align-items-center flex-wrap gap-2">
          <button
            className={`filter-chip-btn ${
              severityFilter === "ALL" ? "active" : ""
            }`}
            onClick={() => setSeverityFilter("ALL")}
          >
            All ({alerts.length})
          </button>

          <button
            className={`filter-chip-btn ${
              severityFilter === "CRITICAL" ? "active" : ""
            }`}
            onClick={() => setSeverityFilter("CRITICAL")}
          >
            Critical ({criticalCount})
          </button>

          <button
            className={`filter-chip-btn ${
              severityFilter === "HIGH" ? "active" : ""
            }`}
            onClick={() => setSeverityFilter("HIGH")}
          >
            High ({highCount})
          </button>

          <button
            className={`filter-chip-btn ${
              severityFilter === "MODERATE" ? "active" : ""
            }`}
            onClick={() => setSeverityFilter("MODERATE")}
          >
            Moderate ({moderateCount})
          </button>

          <button
            className={`filter-chip-btn ${
              severityFilter === "LOW" ? "active" : ""
            }`}
            onClick={() => setSeverityFilter("LOW")}
          >
            Low ({lowCount})
          </button>

          <button
            className={`filter-chip-btn ${
              severityFilter === "ACTIVE" ? "active" : ""
            }`}
            onClick={() => setSeverityFilter("ACTIVE")}
          >
            Active (
            {
              alerts.filter(
                (alert) =>
                  alert.status === "Active" || alert.status === "ACTIVE",
              ).length
            }
            )
          </button>
        </div>

        <div
          style={{
            position: "relative",
            width: "240px",
            maxWidth: "100%",
          }}
        >
          <Search
            size={14}
            style={{
              position: "absolute",
              left: "10px",
              top: "11px",
              color: "var(--text-muted)",
            }}
          />

          <input
            type="text"
            className="ops-input"
            style={{
              paddingLeft: "32px",
            }}
            placeholder="Search alerts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredAlerts.length === 0 ? (
        <div className="ops-card text-center p-4 text-muted-custom">
          <AlertTriangle size={32} className="mb-2 opacity-50" />

          <p className="m-0">
            {alerts.length === 0
              ? "No alerts have been generated yet."
              : "No alerts match the selected filter."}
          </p>
        </div>
      ) : (
        <div className="row g-3">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id || alert._id}
              className="col-12 col-md-6 col-xl-4 d-flex"
            >
              <div className="w-100 d-flex flex-column">
                <AlertCard alert={alert} onSelect={onSelectAlert} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default AlertList;
