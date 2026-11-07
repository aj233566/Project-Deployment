import {
  Send,
} from "lucide-react";
import RiskBadge from "../alerts/RiskBadge";
export const ResponseTable = ({
  areas = [],
  onDispatch,
}) => {
  return (
    <div className="ops-panel">

      <div className="ops-panel-header">

        <h3 className="ops-panel-title">
          <span>
            Emergency Response Criteria
            Matrix
          </span>
        </h3>

        <span className="badge-ops neutral">
          {areas.length} Recorded Impact Zones
        </span>

      </div>

      {areas.length === 0 ? (
        <div className="p-4 text-center text-muted-custom">
          No affected areas available.
        </div>
      ) : (
        <div className="ops-table-responsive">

          <table className="ops-table">

            <thead>
              <tr>
                <th>
                  Rank / Queue
                </th>

                <th>
                  Location & Sector
                </th>

                <th>
                  Risk Score
                </th>

                <th>
                  Road Status
                </th>

                <th>
                  Habitation Pop.
                </th>

                <th>
                  Relief Infrastructure
                </th>

                <th>
                  Assigned Response Units
                </th>

                <th>
                  Action
                </th>
              </tr>
            </thead>

            <tbody>

              {areas.map((area) => {
                const rawRiskScore = area.riskScore ?? area.risk?.score;
                const riskScore = rawRiskScore !== null && rawRiskScore !== undefined && rawRiskScore !== ""
                  && Number.isFinite(Number(rawRiskScore))
                  ? Number(rawRiskScore)
                  : null;
                const priority =
                  area.priorityQueue ||
                  "Priority 3";
                const priorityColor =
                  priority === "Priority 1"
                    ? "var(--critical)"
                    : priority ===
                      "Priority 2"
                    ? "var(--high-risk)"
                    : "var(--warning)";
                const roadStatus =
                  area.roadStatus ||
                  area.operations
                    ?.roadBlockage ||
                  "Unknown";
                const roadClass =
                  roadStatus === "Blocked"
                    ? "critical"
                    : roadStatus ===
                      "Partially Obstructed"
                    ? "warning"
                    : roadStatus === "Open"
                    ? "safe"
                    : "neutral";
                return (
                  <tr
                    key={
                      area.id ||
                      area._id
                    }
                  >

                    <td>

                      <div
                        style={{
                          display: "flex",
                          alignItems:
                            "center",
                          gap: "6px",
                        }}
                      >

                        <span
                          className="badge-ops"
                          style={{
                            backgroundColor:
                              priorityColor,
                            color:
                              priority ===
                              "Priority 3"
                                ? "#101416"
                                : "#ffffff",
                          }}
                        >
                          #{area.priorityRank ??
                            "--"}{" "}
                          {priority}
                        </span>

                      </div>

                    </td>

                    <td>

                      <strong
                        style={{
                          color:
                            "var(--text-primary)",
                        }}
                      >
                        {typeof area.location ===
                        "string"
                          ? area.location
                          : area.location
                              ?.name ||
                            "Unknown Location"}
                      </strong>

                      <div
                        style={{
                          fontSize: "1.131rem",
                          color:
                            "var(--text-muted)",
                        }}
                      >
                        {area.district ||
                          "Unknown District"}
                        ,{" "}
                        {area.state ||
                          "Unknown State"}
                      </div>

                    </td>

                    <td>

                      <div
                        style={{
                          display: "flex",
                          alignItems:
                            "center",
                          gap: "6px",
                        }}
                      >

                        <span
                          style={{
                            fontFamily: "inherit",
                            fontWeight: "700",
                            color:
                              riskScore != null && riskScore >=
                              80
                                ? "var(--critical)"
                                  : riskScore != null && riskScore >=
                                  65
                                ? "var(--high-risk)"
                                  : riskScore == null ? "var(--text-muted)" : "var(--warning)",
                          }}
                        >
                          {riskScore == null ? "Unavailable" : `${riskScore}/100`}
                        </span>

                        <RiskBadge
                          level={
                            area.riskLevel ||
                            area.risk?.level ||
                            "LOW"
                          }
                          showIcon={false}
                        />

                      </div>

                    </td>

                    <td>

                      <span
                        className={`badge-ops ${roadClass}`}
                      >
                        {roadStatus}
                      </span>

                    </td>

                    <td
                      style={{
                        fontFamily: "inherit",
                      }}
                    >
                      {area.affectedPopulation !=
                      null
                        ? Number(
                            area.affectedPopulation
                          ).toLocaleString()
                        : "--"}
                    </td>

                    <td
                      style={{
                        fontSize: "1.179rem",
                      }}
                    >

                      <div>
                        🏠{" "}
                        {area.nearestShelter
                          ?.name ||
                          "Not recorded"}

                        {" ("}

                        {area.nearestShelter
                          ?.distanceKm ??
                          "--"}

                        {" km)"}
                      </div>

                      <div
                        style={{
                          color:
                            "var(--text-muted)",
                        }}
                      >
                        🏥{" "}
                        {area.nearestHospital
                          ?.name ||
                          "Not recorded"}

                        {" ("}

                        {area.nearestHospital
                          ?.distanceKm ??
                          "--"}

                        {" km)"}
                      </div>

                    </td>

                    <td>

                      {area
                        .availableResources
                        ?.assignedTeams
                        ?.length > 0 ? (
                        <div
                          style={{
                            display:
                              "flex",
                            flexWrap:
                              "wrap",
                            gap: "3px",
                          }}
                        >

                          {area.availableResources.assignedTeams.map(
                            (
                              team,
                              index
                            ) => (
                              <span
                                key={
                                  index
                                }
                                className="badge-ops info"
                                style={{
                                  fontSize: "1.022rem",
                                }}
                              >
                                {team}
                              </span>
                            )
                          )}

                        </div>
                      ) : (
                        <span
                          style={{
                            color:
                              "var(--critical)",
                            fontSize: "1.131rem",
                          }}
                        >
                          {area.availableResources == null &&
                          !Array.isArray(area.assignedTeams)
                            ? "Assignment data unavailable"
                            : "No units assigned"}
                        </span>
                      )}

                    </td>

                    <td>

                      <button
                        className="btn-ops btn-ops-sm btn-ops-primary"
                        onClick={() =>
                          onDispatch(
                            area
                          )
                        }
                      >
                        <Send size={11} />

                        <span>
                          Dispatch
                        </span>
                      </button>

                    </td>

                  </tr>
                );
              })}

            </tbody>

          </table>

        </div>
      )}

    </div>
  );
};
export default ResponseTable;
