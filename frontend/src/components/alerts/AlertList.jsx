import { useMemo, useState } from "react";
import { AlertTriangle, Download, Search, X } from "lucide-react";
import { getAlertDisplayStatus, isAlertActive, isAlertExpired } from "../../utils/alertState";
import AlertCard from "./AlertCard";

const normalize = (value) => String(value || "UNKNOWN").toUpperCase();
const severityOptions = [
  ["ALL", "All"], ["CRITICAL", "Critical"], ["HIGH", "High"],
  ["MODERATE", "Moderate"], ["LOW", "Low"],
];

export const AlertList = ({ alerts = [], onSelectAlert, onDeleteAlert, deletingAlertId = null }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("recent");
  const severityCounts = useMemo(() => alerts.reduce((counts, alert) => {
    const level = normalize(alert.riskLevel);
    if (Object.hasOwn(counts, level)) counts[level] += 1;
    return counts;
  }, { CRITICAL: 0, HIGH: 0, MODERATE: 0, LOW: 0 }), [alerts]);
  const filteredAlerts = useMemo(() => alerts.filter((alert) => {
    const searchable = [
      typeof alert.location === "string" ? alert.location : alert.location?.name,
      alert.state, alert.id, alert._id, alert.disasterType, alert.hazardType,
      alert.action, alert.status, alert.targetType,
    ].filter(Boolean).join(" ").toLowerCase();
    if (searchTerm.trim() && !searchable.includes(searchTerm.trim().toLowerCase())) return false;
    if (severityFilter !== "ALL" && normalize(alert.riskLevel) !== severityFilter) return false;
    if (statusFilter === "ACTIVE" && !isAlertActive(alert)) return false;
    if (statusFilter === "EXPIRED" && !isAlertExpired(alert)) return false;
    if (statusFilter !== "ALL" && !["ACTIVE", "EXPIRED"].includes(statusFilter)
      && normalize(alert.status) !== statusFilter) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === "risk") return Number(b.riskScore || 0) - Number(a.riskScore || 0);
    const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
    const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
    return sortBy === "oldest" ? timeA - timeB : timeB - timeA;
  }), [alerts, searchTerm, severityFilter, statusFilter, sortBy]);
  const exportAlerts = () => {
    const columns = ["id", "location", "hazard", "risk_level", "risk_score", "status", "created_at", "expires_at", "action"];
    const rows = filteredAlerts.map((alert) => [
      alert.id || alert._id || "",
      typeof alert.location === "string" ? alert.location : alert.location?.name || "",
      alert.hazardType || alert.disasterType || "",
      alert.riskLevel || "",
      alert.riskScore ?? "",
      getAlertDisplayStatus(alert),
      alert.createdAt || alert.timestamp || "",
      alert.expiresAt || "",
      alert.action || "",
    ]);
    const csv = [columns, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `senetry-alerts-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="alerts-list">
      <div className="alert-filter-bar">
        <div className="filter-left-group" role="group" aria-label="Filter alerts by severity">
          {severityOptions.map(([level, label]) => (
            <button
              key={level}
              type="button"
              aria-pressed={severityFilter === level}
              className={`filter-chip-btn${severityFilter === level ? " active" : ""}`}
              onClick={() => setSeverityFilter(level)}
            >
              {label} ({level === "ALL" ? alerts.length : severityCounts[level]})
            </button>
          ))}
        </div>
        <div className="alerts-list-controls">
          <label className="alerts-control-label">Status
            <select className="form-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active ({alerts.filter(isAlertActive).length})</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="ESCALATED">Escalated</option>
              <option value="RESOLVED">Resolved</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </label>
          <label className="alerts-control-label">Sort
            <select className="form-select" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="recent">Newest</option>
              <option value="risk">Highest risk</option>
              <option value="oldest">Oldest</option>
            </select>
          </label>
          <div className="alerts-search-wrap">
            <Search size={15} aria-hidden="true" />
            <input
              type="search"
              className="ops-input"
              aria-label="Search alerts"
              placeholder="Search location, action, hazard…"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            {searchTerm ? <button type="button" aria-label="Clear search" onClick={() => setSearchTerm("")}><X size={15} /></button> : null}
          </div>
          <button type="button" className="btn btn-outline-light alerts-export" disabled={filteredAlerts.length === 0} onClick={exportAlerts}>
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      <p className="alerts-results-count" aria-live="polite">Showing {filteredAlerts.length} of {alerts.length} alert records</p>
      {filteredAlerts.length === 0 ? (
        <div className="ops-card alerts-empty-state" role="status">
          <AlertTriangle size={30} aria-hidden="true" />
          <strong>{alerts.length === 0 ? "No alerts yet" : "No alerts match these filters"}</strong>
          <span>{alerts.length === 0 ? "New risk alerts will appear here when they are generated." : "Try changing the severity, status, or search terms."}</span>
          {alerts.length > 0 && (searchTerm || severityFilter !== "ALL" || statusFilter !== "ALL") ? (
            <button type="button" className="btn btn-outline-light btn-sm" onClick={() => { setSearchTerm(""); setSeverityFilter("ALL"); setStatusFilter("ALL"); }}>Clear filters</button>
          ) : null}
        </div>
      ) : (
        <div className="row g-3">
          {filteredAlerts.map((alert) => (
            <div key={alert.id || alert._id} className="col-12 col-md-6 col-xl-4 d-flex">
              <div className="w-100 d-flex flex-column">
                <AlertCard
                  alert={alert}
                  onSelect={onSelectAlert}
                  onDelete={onDeleteAlert}
                  deleting={deletingAlertId === (alert._id || alert.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default AlertList;
