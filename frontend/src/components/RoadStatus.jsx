function normalizeStatus(status) {
  const value = String(status || "").toLowerCase();
  if (["blocked", "closed"].includes(value)) return "Blocked";
  if (["restricted", "partial", "one-lane", "one lane"].includes(value)) return "Restricted";
  if (["open", "clear"].includes(value)) return "Open";
  return "Unknown";
}
function RoadStatus({ roads = [], loading = false }) {
  const roadData = Array.isArray(roads)
    ? roads.filter((road) => road && road.name).map((road) => ({
        ...road,
        normalizedStatus: normalizeStatus(road.status),
      }))
    : [];
  const counts = {
    Open: roadData.filter((road) => road.normalizedStatus === "Open").length,
    Restricted: roadData.filter((road) => road.normalizedStatus === "Restricted").length,
    Blocked: roadData.filter((road) => road.normalizedStatus === "Blocked").length,
    Unknown: roadData.filter((road) => road.normalizedStatus === "Unknown").length,
  };
  return (
    <div className="card shadow-sm border-0 h-100">
      <div className="card-body">
        <h2 className="h5 fw-bold mb-1">Road status</h2>
        <p className="text-muted mb-3">Reported route conditions; no inferred connectivity percentage.</p>
        {loading ? (
          <div className="text-muted text-center py-4" role="status">Loading reported road conditions…</div>
        ) : roadData.length === 0 ? (
          <div className="text-muted text-center py-4">No active road impacts are currently reported.</div>
        ) : (
          <>
            <div className="d-flex flex-wrap gap-3 mb-3" aria-label="Road status counts">
              {Object.entries(counts).filter(([, count]) => count > 0).map(([status, count]) => (
                <span key={status}><strong>{count}</strong> {status.toLowerCase()}</span>
              ))}
            </div>
            <div className="d-flex flex-column gap-2">
              {roadData.map((road, index) => (
                <div key={road.id || road.name || index} className="border rounded p-3 d-flex justify-content-between gap-3">
                  <div><strong>{road.name}</strong>{road.condition || road.blockageReason ? <div className="small text-muted">{road.condition || road.blockageReason}</div> : null}</div>
                  <span className={`badge text-bg-${road.normalizedStatus === "Blocked" ? "danger" : road.normalizedStatus === "Restricted" ? "warning" : road.normalizedStatus === "Open" ? "success" : "secondary"}`}>{road.normalizedStatus}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
export default RoadStatus;
