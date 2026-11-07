import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";
import "../css/IncidentCard.css";
function IncidentCard({ incident }) {
  return (
    <article className="incident-card h-100 w-100">
      <div className="incident-card-header d-flex flex-column flex-sm-row justify-content-between align-items-start gap-2">
        <h2 className="incident-card-title">{incident.title}</h2>

        <div className="incident-card-status">
          <StatusBadge status={incident.status} synced={incident.synced} />
        </div>
      </div>

      <div className="incident-card-severity">{incident.severity}</div>

      <p className="incident-card-description">{incident.description}</p>

      <div className="incident-card-info d-flex flex-column gap-2">
        <div className="incident-card-info-item">
          <span className="incident-card-info-icon">📍</span>

          <span className="incident-card-info-text">
            {incident.location || "Location not provided"}
          </span>
        </div>

        <div className="incident-card-info-item">
          <span className="incident-card-info-icon">🕒</span>

          <span className="incident-card-info-text">
            {incident.time || "Time not provided"}
          </span>
        </div>
      </div>
        
      <div className="incident-card-footer">
        <Link
          to={`/citizen/incidents/${incident.remoteId || incident.id || incident._id}`}
          state={{ incident }}
          className="incident-view-details"
        >
          View Details
        </Link>
      </div>
    </article>
  );
}
export default IncidentCard;
