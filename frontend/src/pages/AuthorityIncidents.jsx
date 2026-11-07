import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getIncidents } from "../services/api";
import "../css/AuthorityIncidents.css";
function AuthorityIncidents() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [filter, setFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function loadIncidents() {
    try {
      setLoading(true);
      setError("");
      const response = await getIncidents();
      const backendIncidents = Array.isArray(response?.data)
        ? response.data
        : [];
      setIncidents(backendIncidents);
    } catch (err) {
      console.error("Failed to load incidents:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to load incidents from the server.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const start = setTimeout(() => {
      void loadIncidents();
    }, 0);
    return () => clearTimeout(start);
  }, []);
  const formatIncidentType = (type) => {
    if (!type) {
      return "Unknown";
    }
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };
  const formatSeverity = (severity) => {
    if (!severity) {
      return "Unknown";
    }
    return severity.charAt(0).toUpperCase() + severity.slice(1);
  };
  const formatStatus = (status) => {
    if (!status) {
      return "Unknown";
    }
    switch (status) {
      case "submitted":
        return "Submitted";
      case "verified":
        return "Verified";
      case "in_progress":
        return "In Progress";
      case "resolved":
        return "Resolved";
      default:
        return status
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
    }
  };
  const formatReportedTime = (createdAt) => {
    if (!createdAt) {
      return "Unknown";
    }
    const createdDate = new Date(createdAt);
    if (Number.isNaN(createdDate.getTime())) {
      return "Unknown";
    }
    const now = new Date();
    const differenceInSeconds = Math.floor(
      (now.getTime() - createdDate.getTime()) / 1000,
    );
    if (differenceInSeconds < 60) {
      return "Just now";
    }
    const minutes = Math.floor(differenceInSeconds / 60);
    if (minutes < 60) {
      return `${minutes} min ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    }
    const days = Math.floor(hours / 24);
    if (days < 30) {
      return `${days} ${days === 1 ? "day" : "days"} ago`;
    }
    return createdDate.toLocaleDateString();
  };
  const formatLocation = (location) => {
    if (!location) {
      return "Location unavailable";
    }
    const { latitude, longitude, address } = location;
    if (address) {
      return address;
    }
    if (typeof latitude === "number" && typeof longitude === "number") {
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
    if (latitude != null && longitude != null) {
      return `${latitude}, ${longitude}`;
    }
    return "Location unavailable";
  };
  const filteredIncidents = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return incidents.filter((incident) => {
      const severity = formatSeverity(incident.severity);
      const type = formatIncidentType(incident.type);
      const status = formatStatus(incident.status);
      const location = formatLocation(incident.location);
      const id = incident._id || "";
      const matchesSeverity = filter === "All" || severity === filter;
      const matchesSearch =
        !search ||
        id.toLowerCase().includes(search) ||
        type.toLowerCase().includes(search) ||
        status.toLowerCase().includes(search) ||
        location.toLowerCase().includes(search) ||
        (incident.description || "").toLowerCase().includes(search);
      return matchesSeverity && matchesSearch;
    });
  }, [incidents, filter, searchTerm]);
  const totalIncidents = incidents.length;
  const criticalIncidents = incidents.filter(
    (incident) => incident.severity?.toLowerCase() === "critical",
  ).length;
  const highRiskIncidents = incidents.filter(
    (incident) => incident.severity?.toLowerCase() === "high",
  ).length;
  const activeResponseIncidents = incidents.filter(
    (incident) =>
      incident.status?.toLowerCase() === "submitted" ||
      incident.status?.toLowerCase() === "verified" ||
      incident.status?.toLowerCase() === "in_progress",
  ).length;
  const getSeverityClass = (severity) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return "authority-severity-critical";
      case "high":
        return "authority-severity-high";
      case "moderate":
        return "authority-severity-moderate";
      case "low":
        return "authority-severity-low";
      default:
        return "authority-severity-default";
    }
  };
  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case "submitted":
        return "authority-status-submitted";
      case "verified":
        return "authority-status-verified";
      case "in_progress":
        return "authority-status-progress";
      case "resolved":
        return "authority-status-resolved";
      default:
        return "authority-status-default";
    }
  };
  const handleViewIncident = (incident) => {
    if (!incident?._id) {
      return;
    }
    navigate(`/incidents/${incident._id}`, {
      state: { incident },
    });
  };
  if (loading) {
    return (
      <div className="container-fluid authority-incidents-page">
        <div className="authority-incidents-loading">
          <div
            className="authority-incidents-spinner"
            role="status"
            aria-label="Loading incidents"
          ></div>

          <p className="mb-0">Loading incidents...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="container-fluid authority-incidents-page">

      <div className="row authority-incidents-header align-items-center">
        <div className="col-12 col-md-8">
          <h2 className="authority-incidents-title">Incident Management</h2>

          <p className="authority-incidents-subtitle">
            Monitor and manage disaster incidents reported across the
            operational area.
          </p>
        </div>

        <div className="col-12 col-md-4 authority-incidents-header-action">
          <button
            type="button"
            className="authority-report-button"
            onClick={() => navigate("/report-incident")}
          >
            + Report Incident
          </button>
        </div>
      </div>


      {error && (
        <div className="authority-incidents-error">
          <strong>Unable to load incidents.</strong>

          <div className="mt-1">{error}</div>

          <button
            type="button"
            className="authority-retry-button mt-2"
            onClick={loadIncidents}
          >
            Retry
          </button>
        </div>
      )}


      <div className="row authority-incidents-statistics g-3">
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="authority-stat-card">
            <p className="authority-stat-label">Total Incidents</p>

            <h3 className="authority-stat-value">{totalIncidents}</h3>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="authority-stat-card">
            <p className="authority-stat-label">Critical</p>

            <h3 className="authority-stat-value authority-stat-critical">
              {criticalIncidents}
            </h3>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="authority-stat-card">
            <p className="authority-stat-label">High Risk</p>

            <h3 className="authority-stat-value authority-stat-high">
              {highRiskIncidents}
            </h3>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="authority-stat-card">
            <p className="authority-stat-label">Active Response</p>

            <h3 className="authority-stat-value authority-stat-response">
              {activeResponseIncidents}
            </h3>
          </div>
        </div>
      </div>


      <div className="authority-filter-card">
        <div className="row align-items-center g-3">

          <div className="col-12 col-lg-6">
            <input
              type="text"
              className="authority-search-input"
              placeholder="Search by ID, type, location or description..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>


          <div className="col-12 col-lg-6">
            <div className="authority-filter-buttons d-flex flex-wrap justify-content-lg-end">
              {["All", "Critical", "High", "Moderate", "Low"].map((level) => (
                <button
                  key={level}
                  type="button"
                  className={`authority-filter-button ${
                    filter === level ? "authority-filter-active" : ""
                  }`}
                  onClick={() => setFilter(level)}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>


      <div className="authority-incident-table-card">

        <div className="authority-incident-table-header">
          <div>
            <h5 className="authority-incident-table-title">Active Incidents</h5>

            <p className="authority-incident-table-subtitle mb-0">
              Live incident records from the backend
            </p>
          </div>

          <span className="authority-incident-count">
            Showing {filteredIncidents.length} of {incidents.length}
          </span>
        </div>


        <div className="table-responsive authority-incident-table-wrapper">
          <table className="table authority-incident-table">
            <thead>
              <tr>
                <th>Type</th>

                <th>Location</th>

                <th>Severity</th>


                <th className="d-none d-sm-table-cell">Status</th>

                <th className="d-none d-md-table-cell">Reported</th>

                <th className="d-none d-lg-table-cell">Reporter</th>

                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan="8" className="authority-incidents-empty">
                    {incidents.length === 0
                      ? "No incidents have been reported yet."
                      : "No incidents match the selected filters."}
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((incident) => (
                  <tr key={incident._id}>

                    <td className="authority-incident-type">
                      {formatIncidentType(incident.type)}
                    </td>


                    <td>
                      <span className="authority-incident-location">
                        <span className="authority-location-icon">📍</span>

                        {formatLocation(incident.location)}
                      </span>
                    </td>


                    <td>
                      <span
                        className={`authority-severity-badge ${getSeverityClass(
                          incident.severity,
                        )}`}
                      >
                        {formatSeverity(incident.severity)}
                      </span>
                    </td>


                    <td className="d-none d-sm-table-cell">
                      <span
                        className={`authority-incident-status ${getStatusClass(
                          incident.status,
                        )}`}
                      >
                        ● {formatStatus(incident.status)}
                      </span>
                    </td>


                    <td className="d-none d-md-table-cell authority-incident-reported">
                      {formatReportedTime(incident.createdAt)}
                    </td>


                    <td className="d-none d-lg-table-cell authority-response-team">
                      {incident.reportedBy || "Anonymous"}
                    </td>


                    <td>
                      <button
                        type="button"
                        className="authority-incident-view-button"
                        onClick={() => handleViewIncident(incident)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
export default AuthorityIncidents;
