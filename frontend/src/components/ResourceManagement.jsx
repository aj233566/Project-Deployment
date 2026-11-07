import { useEffect, useMemo, useState } from "react";
import { Truck, Search, Phone, Building, ShieldCheck } from "lucide-react";
import { resourcesApi } from "../services/api";
import "../css/resources.css";
const ResourceManagement = () => {
  const [resources, setResources] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  useEffect(() => {
    let mounted = true;
    resourcesApi.getResources()
      .then((response) => {
        if (!mounted) return;
        const resourceList = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response) ? response : null;
        if (!resourceList) throw new Error("The resource service returned an invalid response.");
        setResources(resourceList);
        setError("");
      })
      .catch((loadError) => {
        console.error("Failed to load resources:", loadError);
        if (mounted) {
          setResources([]);
          setError(loadError.message || "Unable to load resource inventory.");
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [reloadToken]);
  const filteredResources = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return resources.filter((res) => {
      const name = String(res?.name || "").toLowerCase();
      const location = String(res?.location || "").toLowerCase();
      const type = String(res?.type || "").toLowerCase();
      const category = String(res?.category || "").toUpperCase();
      const matchSearch =
        !search ||
        name.includes(search) ||
        location.includes(search) ||
        type.includes(search) ||
        category.toLowerCase().includes(search);
      if (!matchSearch) return false;
      if (categoryFilter === "ALL") {
        return true;
      }
      return category === categoryFilter;
    });
  }, [resources, searchTerm, categoryFilter]);
  const resourceSummary = (matches) => {
    if (!matches.length) return null;
    const values = matches.map((resource) => ({
      total: resource.totalUnits ?? resource.total,
      available: resource.availableUnits ?? resource.available,
    }));
    if (values.some((item) => !Number.isFinite(item.total) || !Number.isFinite(item.available))) {
      return { total: null, available: null };
    }
    return values.reduce((totals, item) => ({
      total: totals.total + item.total,
      available: totals.available + item.available,
    }), { total: 0, available: 0 });
  };
  const rescueSummary = resourceSummary(resources.filter((resource) =>
    ["NDRF", "SDRF"].includes(String(resource.category || "").trim().toUpperCase())
  ));
  const ambulanceSummary = resourceSummary(resources.filter((resource) =>
    ["MEDICAL TRANSPORT", "AMBULANCE"].includes(String(resource.category || "").trim().toUpperCase())
  ));
  const earthmoverSummary = resourceSummary(resources.filter((resource) =>
    ["ROAD CLEARING", "EARTHMOVER"].includes(String(resource.category || "").trim().toUpperCase())
  ));
  const medicalTeamSummary = resourceSummary(resources.filter((resource) =>
    ["FIELD MEDICAL", "MEDICAL SQUAD", "MEDICAL TEAM"].includes(String(resource.category || "").trim().toUpperCase())
  ));
  const displayTotal = (summary) => loading || error || summary?.total === null ? "Unavailable" : summary ? summary.total.toLocaleString() : "Not recorded";
  const displayAvailable = (summary) => loading || error || summary?.available === null ? "Availability unavailable" : summary ? `Available: ${summary.available.toLocaleString()}` : "Availability not recorded";
  return (
    <div className="container-fluid p-0 resources-management-container">

      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <div
            className="kpi-metric-card h-100"
            style={{ borderLeft: "4px solid var(--info)" }}
          >
            <div className="kpi-metric-header">
              <span>Rescue Units</span>
              <ShieldCheck size={16} className="metric-icon info" />
            </div>

            <div className="kpi-metric-value">{displayTotal(rescueSummary)}</div>

            <div className="kpi-metric-sub">{displayAvailable(rescueSummary)} · NDRF/SDRF records</div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div
            className="kpi-metric-card h-100"
            style={{ borderLeft: "4px solid var(--safe)" }}
          >
            <div className="kpi-metric-header">
              <span>ALS Ambulances</span>
              <Truck size={16} className="metric-icon safe" />
            </div>

            <div className="kpi-metric-value">{displayTotal(ambulanceSummary)}</div>

            <div className="kpi-metric-sub">{displayAvailable(ambulanceSummary)}</div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div
            className="kpi-metric-card h-100"
            style={{ borderLeft: "4px solid var(--warning)" }}
          >
            <div className="kpi-metric-header">
              <span>Heavy Earthmovers</span>
              <Building size={16} className="metric-icon warning" />
            </div>

            <div className="kpi-metric-value">{displayTotal(earthmoverSummary)}</div>

            <div className="kpi-metric-sub">{displayAvailable(earthmoverSummary)}</div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div
            className="kpi-metric-card h-100"
            style={{ borderLeft: "4px solid var(--critical)" }}
          >
            <div className="kpi-metric-header">
              <span>Field Medical Squads</span>
              <Phone size={16} className="metric-icon critical" />
            </div>

            <div className="kpi-metric-value">{displayTotal(medicalTeamSummary)}</div>

            <div className="kpi-metric-sub">{displayAvailable(medicalTeamSummary)}</div>
          </div>
        </div>
      </div>


      <div className="ops-panel">
        <div className="ops-panel-header">
          <h2 className="ops-panel-title">
            <Truck size={18} className="panel-icon-info" />

            <span>Resources &amp; Facilities</span>
          </h2>

          <span className="badge-ops info">
            {loading || error ? "Inventory unavailable" : `${resources.length} Resource Records`}
          </span>
        </div>

        {error ? (
          <div className="alert alert-danger m-3" role="alert">
            {error}
            <button
              type="button"
              className="btn btn-link"
              onClick={() => {
                setLoading(true);
                setError("");
                setReloadToken((value) => value + 1);
              }}
            >
              Retry
            </button>
          </div>
        ) : null}


        <div className="alert-filter-bar">
          <div className="filter-left-group">
            <button
              type="button"
              className={`filter-chip-btn ${
                categoryFilter === "ALL" ? "active" : ""
              }`}
              onClick={() => setCategoryFilter("ALL")}
            >
              All Assets ({resources.length})
            </button>

            <button
              type="button"
              className={`filter-chip-btn ${
                categoryFilter === "NDRF" ? "active" : ""
              }`}
              onClick={() => setCategoryFilter("NDRF")}
            >
              NDRF Units
            </button>

            <button
              type="button"
              className={`filter-chip-btn ${
                categoryFilter === "SDRF" ? "active" : ""
              }`}
              onClick={() => setCategoryFilter("SDRF")}
            >
              SDRF Units
            </button>

            <button
              type="button"
              className={`filter-chip-btn ${
                categoryFilter === "MEDICAL TRANSPORT" ? "active" : ""
              }`}
              onClick={() => setCategoryFilter("MEDICAL TRANSPORT")}
            >
              Ambulances
            </button>

            <button
              type="button"
              className={`filter-chip-btn ${
                categoryFilter === "ROAD CLEARING" ? "active" : ""
              }`}
              onClick={() => setCategoryFilter("ROAD CLEARING")}
            >
              Earthmovers &amp; BRO
            </button>
          </div>


          <div className="resource-search-wrapper">
            <Search size={14} className="resource-search-icon" />

            <input
              type="text"
              className="ops-input"
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>


        <div className="table-responsive resource-table-wrapper">
          {loading && (
            <div className="resource-loading">
              Loading resource inventory...
            </div>
          )}

          {!loading && !error && (
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Resource Name</th>
                  <th>Category</th>
                  <th>Total Units</th>
                  <th>Available</th>
                  <th>Deployed</th>
                  <th>Location / Station</th>
                  <th>Contact Point</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredResources.map((res, index) => {
                  const resourceId = res?.id || res?._id || `RES-${index + 1}`;
                  const status = String(res?.status || "Available");
                  const isActive = status.toLowerCase().includes("active");
                  return (
                    <tr key={resourceId}>

                      <td>
                        <strong className="resource-name">
                          {res?.name || "Unnamed Resource"}
                        </strong>

                        <div className="resource-id">{resourceId}</div>
                      </td>


                      <td>
                        <span className="badge-ops neutral">
                          {res?.category || "General"}
                        </span>
                      </td>


                      <td className="resource-number">
                        {Number.isFinite(res?.totalUnits ?? res?.total)
                          ? (res.totalUnits ?? res.total).toLocaleString()
                          : "Unavailable"}
                      </td>


                      <td className="resource-number available">
                        {Number.isFinite(res?.availableUnits ?? res?.available)
                          ? (res.availableUnits ?? res.available).toLocaleString()
                          : "Unavailable"}
                      </td>


                      <td className="resource-number deployed">
                        {Number.isFinite(res?.deployedUnits ?? res?.deployed)
                          ? (res.deployedUnits ?? res.deployed).toLocaleString()
                          : "Unavailable"}
                      </td>


                      <td className="resource-location">
                        {res?.location || "—"}
                      </td>


                      <td className="resource-contact">
                        <div>{res?.contactPerson || "—"}</div>

                        {res?.phone && <small>{res.phone}</small>}
                      </td>


                      <td>
                        <span
                          className={`badge-ops ${
                            isActive ? "warning" : "safe"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}


                {filteredResources.length === 0 && (
                  <tr>
                    <td colSpan="8" className="resource-empty">
                      No resources match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
export default ResourceManagement;
