import { Truck } from "lucide-react";
import { useAlerts } from "../../context/useAlerts";
export const ResourceStatus = () => {
  const {
    resources = [],
    resourcesLoading,
    resourcesError,
    loadResources,
  } = useAlerts();
  return (
    <div className="resource-summary-panel mt-4">

      <div className="ops-panel-header">

        <h3 className="ops-panel-title">

          <Truck
            size={18}
            color="var(--info)"
          />

          <span>
            Regional Emergency Resource
            Readiness
          </span>

        </h3>

        <span className="badge-ops info">
          {resourcesLoading || resourcesError ? "Unavailable" : `${resources.length} recorded resource types`}
        </span>

      </div>

      {resourcesError ? (
        <div className="alert alert-danger" role="alert">{resourcesError}<button className="btn btn-link" onClick={loadResources}>Retry</button></div>
      ) : resourcesLoading ? (
        <div className="ops-card p-4 text-center text-muted-custom" role="status">Loading resource inventory…</div>
      ) : resources.length === 0 ? (
        <div className="ops-card p-4 text-center text-muted-custom">
          No resource data available.
        </div>
      ) : (
        <div className="row g-3">

          {resources.map((resource) => {
            const totalUnits = Number.isFinite(resource.total) ? resource.total : null;
            const availableUnits = Number.isFinite(resource.available) ? resource.available : null;
            const percentAvailable = totalUnits > 0 && availableUnits !== null
                ? Math.min(
                    100,
                    Math.round(
                      (availableUnits /
                        totalUnits) *
                        100
                    )
                  )
                : null;
            const statusColor = percentAvailable === null
              ? "var(--text-muted)"
              :
              percentAvailable < 40
                ? "var(--critical)"
                : percentAvailable < 70
                ? "var(--warning)"
                : "var(--safe)";
            return (
              <div
                key={
                  resource.id ||
                  resource._id
                }
                className="col-12 col-md-6 col-xl-4"
              >

                <div className="resource-meter-box h-100">

                  <div
                    className="resource-meter-header d-flex align-items-center justify-content-between mb-2"
                  >

                    <div>

                      <strong
                        style={{
                          color:
                            "var(--text-primary)",
                          display: "block",
                        }}
                      >
                        {resource.name ||
                          "Emergency Resource"}
                      </strong>

                      <small
                        style={{
                          color:
                            "var(--text-muted)",
                        }}
                      >
                        {resource.type ||
                          "Resource"}{" "}
                        •{" "}
                        {resource.category ||
                          "General"}
                      </small>

                    </div>

                    <div className="text-end">

                      <span
                        style={{
                          fontSize: "1.415rem",
                          fontWeight: "700",
                          fontFamily: "inherit",
                          color:
                            "var(--text-primary)",
                        }}
                      >
                        {availableUnits === null ? "--" : availableUnits}/
                        {totalUnits === null ? "--" : totalUnits}
                      </span>

                      <div
                        style={{
                          fontSize: "1.07rem",
                          color:
                            statusColor,
                        }}
                      >
                        {resource.status || "Status not recorded"}
                      </div>

                    </div>

                  </div>

                  <div className="resource-bar-track">

                    <div
                      className="resource-bar-fill"
                      style={{
                        width: `${percentAvailable ?? 0}%`,
                        backgroundColor:
                          statusColor,
                      }}
                    />

                  </div>

                </div>

              </div>
            );
          })}

        </div>
      )}

    </div>
  );
};
export default ResourceStatus;
