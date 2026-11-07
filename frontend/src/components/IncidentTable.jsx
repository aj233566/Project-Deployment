import "../css/IncidentCard.css";
function IncidentTable({ incidents = [] }) {
  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-dark">
          <tr>
            <th>Incident ID</th>
            <th>Type</th>
            <th>Location</th>
            <th>Severity</th>
            <th>Status</th>
            <th>Reported</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {incidents.length > 0 ? (
            incidents.map((incident) => (
              <tr key={incident.id}>
                <td className="fw-bold">{incident.id}</td>
                <td>{incident.type}</td>
                <td>{incident.location}</td>
                <td>
                  <span
                    className={`badge ${
                      incident.severity === "Critical"
                        ? "bg-danger"
                        : incident.severity === "High"
                        ? "bg-warning text-dark"
                        : incident.severity === "Moderate"
                        ? "bg-info text-dark"
                        : "bg-success"
                    }`}
                  >
                    {incident.severity}
                  </span>
                </td>
                <td>
                  <span
                    className={`badge ${
                      incident.status === "Active"
                        ? "bg-danger"
                        : incident.status === "Responding"
                        ? "bg-warning text-dark"
                        : incident.status === "Resolved"
                        ? "bg-success"
                        : "bg-secondary"
                    }`}
                  >
                    {incident.status}
                  </span>
                </td>
                <td>{incident.reported}</td>
                <td>
                  <button className="btn btn-sm btn-outline-primary">
                    View
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" className="text-center py-4 text-muted">
                No incidents found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
export default IncidentTable;
