import { Route, Building, Home, Truck, Send } from "lucide-react";
import RiskBadge from "../alerts/RiskBadge";
export const PriorityCard = ({ area, onDispatch }) => {
  if (!area) {
    return null;
  }
  const normalizedRoadStatus = String(area.roadStatus || "Unknown").toLowerCase();
  const getRoadClass = () => {
    if (normalizedRoadStatus.includes("blocked")) {
      return "blocked";
    }
    if (
      normalizedRoadStatus.includes("partial") ||
      normalizedRoadStatus.includes("obstructed")
    ) {
      return "partial";
    }
    return normalizedRoadStatus === "open" ? "open" : "unknown";
  };
  const getRoadLabel = () => {
    if (normalizedRoadStatus.includes("blocked")) {
      return "Road Blocked";
    }
    if (
      normalizedRoadStatus.includes("partial") ||
      normalizedRoadStatus.includes("obstructed")
    ) {
      return "Partially Obstructed";
    }
    return normalizedRoadStatus === "open" ? "Road Open" : "Road Status Unknown";
  };
  const rawRiskScore = area.riskScore ?? area.risk?.score;
  const riskScore = rawRiskScore !== null && rawRiskScore !== undefined && rawRiskScore !== ""
    && Number.isFinite(Number(rawRiskScore)) ? Number(rawRiskScore) : null;
  const riskLevel = area.riskLevel || area.risk?.level || "UNKNOWN";
  const rawPopulation = area.affectedPopulation;
  const population = rawPopulation !== null && rawPopulation !== undefined && rawPopulation !== ""
    && Number.isFinite(Number(rawPopulation)) ? Number(rawPopulation) : null;
  const linkedHabitation = area.linkedHabitation;
  const relocationDecision = area.relocationDecision;
  const recommendedSite = relocationDecision?.candidates?.find((candidate) => candidate.usable);
  const assignedTeams =
    area.availableResources?.assignedTeams || area.assignedTeams || [];
  const assignmentDataAvailable =
    area.availableResources != null || Array.isArray(area.assignedTeams);
  const responseStatus = area.responseStatus || "Not recorded";
  const getResponseStatusColor = () => {
    const status = String(responseStatus).toLowerCase();
    if (status.includes("on scene") || status.includes("active")) {
      return "var(--safe)";
    }
    if (status.includes("transit") || status.includes("dispatch")) {
      return "var(--warning)";
    }
    return "var(--text-muted)";
  };
  const getRiskScoreColor = () => {
    if (riskScore == null) {
      return "var(--text-muted)";
    }
    if (riskScore >= 80) {
      return "var(--critical)";
    }
    if (riskScore >= 65) {
      return "var(--high-risk)";
    }
    if (riskScore >= 25) {
      return "var(--warning)";
    }
    return "var(--safe)";
  };
  const getLocationName = () => {
    if (!area.location) {
      return "Unknown Location";
    }
    if (typeof area.location === "string") {
      return area.location;
    }
    return area.location.name || area.location.district || "Unknown Location";
  };
  const getDistrict = () => {
    if (area.district) {
      return area.district;
    }
    if (typeof area.location === "object") {
      return area.location.district || "";
    }
    return "";
  };
  const getState = () => {
    if (area.state) {
      return area.state;
    }
    if (typeof area.location === "object") {
      return area.location.state || "";
    }
    return "";
  };
  const formatDistance = (distance) => {
    const value = Number(distance);
    if (!Number.isFinite(value)) {
      return "—";
    }
    return `${value} km`;
  };
  const formatPopulation = () => {
    if (population === null) {
      return "—";
    }
    return population.toLocaleString();
  };
  return (
    <div className="priority-card">

      <div>

        <div className="priority-card-top">
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              minWidth: 0,
            }}
          >
            <div className="priority-rank-chip">
              #{area.priorityRank || "—"}
            </div>

            <div className="priority-loc-info">
              <h4>{getLocationName()}</h4>

              <span>
                {getDistrict()}

                {getDistrict() && getState() ? ", " : ""}

                {getState()}
              </span>
            </div>
          </div>

          <RiskBadge level={riskLevel} />
        </div>


        <div className="impact-stats-row">
          <div className="impact-stat-item">
            <span className="lbl">Risk Score</span>

            <span
              className="val"
              style={{
                color: getRiskScoreColor(),
              }}
            >
              {riskScore == null ? "Unavailable" : `${riskScore}/100`}
            </span>
          </div>

          <div className="impact-stat-item">
            <span className="lbl">Linked habitation population</span>

            <span className="val">{formatPopulation()}</span>
          </div>
        </div>


        <div className={`road-status-indicator ${getRoadClass()}`}>
          <Route size={14} />

          <span>{getRoadLabel()}</span>
        </div>

        <section className="sentry-response-link border rounded p-2 mb-3" aria-label="Linked habitation relocation assessment">
          <strong className="d-block">SENTRY habitation & relocation</strong>
          {linkedHabitation ? (
            <>
              <div className="small mt-1">
                {linkedHabitation.name} · {linkedHabitation.riskLevel || "UNKNOWN"}
                {Number.isFinite(linkedHabitation.riskScore) ? ` (${linkedHabitation.riskScore}/100)` : ""}
              </div>
              <div className="small">
                Relocation: {relocationDecision?.priority || "Unavailable"} · Vulnerable groups: {Number.isFinite(area.vulnerablePopulation) ? area.vulnerablePopulation.toLocaleString() : "Not recorded"}
              </div>
              <div className="small">
                {recommendedSite
                  ? `Candidate site: ${recommendedSite.name} · ${Number.isFinite(recommendedSite.available) ? `${recommendedSite.available.toLocaleString()} available` : "capacity unavailable"}`
                  : "No relocation site is confirmed safe and available for this habitation."}
              </div>
              <div className="small text-muted">
                Capacity gap: {Number.isFinite(relocationDecision?.capacityGap) ? relocationDecision.capacityGap.toLocaleString() : "Unavailable"}
              </div>
            </>
          ) : (
            <div className="small text-muted mt-1">No linked registered habitation; relocation priority and capacity have not been assessed for this incident.</div>
          )}
        </section>


        <div className="shelter-hosp-info">
          {area.nearestHospital && (
            <div className="shelter-hosp-item">
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  minWidth: 0,
                }}
              >
                <Building size={12} color="var(--info)" />

                <span>{area.nearestHospital.name || "Hospital"}</span>
              </span>

              <strong
                style={{
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                }}
              >
                {formatDistance(area.nearestHospital.distanceKm)}
              </strong>
            </div>
          )}

          {area.nearestShelter && (
            <div className="shelter-hosp-item">
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  minWidth: 0,
                }}
              >
                <Home size={12} color="var(--safe)" />

                <span>{area.nearestShelter.name || "Relief Shelter"}</span>
              </span>

              <strong
                style={{
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                }}
              >
                {formatDistance(area.nearestShelter.distanceKm)}
              </strong>
            </div>
          )}

          {!area.nearestHospital && !area.nearestShelter && (
            <div
              style={{
                fontSize: "1.131rem",
                color: "var(--text-muted)",
              }}
            >
              No nearby relief infrastructure data available.
            </div>
          )}
        </div>


        <div
          style={{
            fontSize: "1.179rem",
            color: "var(--text-secondary)",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              color: "var(--text-muted)",
              marginBottom: "4px",
            }}
          >
            <Truck size={12} />

            <span>Assigned Response Units:</span>
          </div>

          {assignedTeams.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "4px",
              }}
            >
              {assignedTeams.map((team, index) => {
                const teamName =
                  typeof team === "string"
                    ? team
                    : team?.name || team?.type || "Response Unit";
                return (
                  <span
                    key={`${teamName}-${index}`}
                    className="badge-ops info"
                    style={{
                      fontSize: "1.07rem",
                    }}
                  >
                    {teamName}
                  </span>
                );
              })}
            </div>
          ) : (
            <span
              style={{
                color: "var(--critical)",
                fontSize: "1.131rem",
              }}
            >
              {assignmentDataAvailable ? "No Response Teams Assigned" : "Assignment Data Unavailable"}
            </span>
          )}
        </div>
      </div>


      <div className="priority-card-actions">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "1.131rem",
            color: "var(--text-muted)",
          }}
        >
          <span
            className="live-dot"
            style={{
              backgroundColor: getResponseStatusColor(),
            }}
          />

          <span>Status: {responseStatus || "Not recorded"}</span>
        </div>

        <button
          className="btn-ops btn-ops-sm btn-ops-primary"
          onClick={() => onDispatch?.(area)}
          disabled={!onDispatch}
        >
          <Send size={12} />

          <span>Dispatch Team</span>
        </button>
      </div>
    </div>
  );
};
export default PriorityCard;
