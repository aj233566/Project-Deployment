import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { sentryApi } from "../services/sentryApi";
import CreateRecordForm from "../components/sentry/CreateRecordForm";
import "../css/sentry.css";

function getErrorMessage(error) {
  return error?.response?.data?.message || error?.message || "Unable to load relocation sites.";
}

function RelocationSitesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const mountedRef = useRef(false);
  const requestIdRef = useRef(0);

  const load = useCallback(async (showLoading = true) => {
    if (!mountedRef.current) return;
    const requestId = ++requestIdRef.current;
    if (showLoading) setLoading(true);
    setError("");

    try {
      const response = await sentryApi.getRelocationSites();
      if (mountedRef.current && requestId === requestIdRef.current) {
        setItems(Array.isArray(response?.data) ? response.data : []);
      }
    } catch (loadError) {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setError(getErrorMessage(loadError));
      }
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    mountedRef.current = true;

    // Defer the initial request to avoid scheduling state updates synchronously
    // inside the effect. The active flag also handles React Strict Mode cleanup.
    Promise.resolve().then(() => {
      if (active) void load(false);
    });

    return () => {
      active = false;
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, [load]);

  return (
    <section
      className="sentry-page relocation-sites-page container-fluid px-3 px-md-4 px-xl-5 py-3 py-md-4"
      aria-busy={loading}
    >
      <header className="mb-4">
        <p className="sentry-eyebrow mb-1">SENTRY / SAFE-SITE CAPACITY</p>
        <h1 className="h2 mb-1">Relocation sites</h1>
        <p className="text-muted mb-0">
          Capacity is computed from recorded total, occupancy, and reserved places.
        </p>
      </header>

      <CreateRecordForm type="relocationSite" onCreated={load} />

      {loading ? (
        <div className="sentry-state" role="status">
          Loading relocation sites…
        </div>
      ) : null}

      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
          <button type="button" className="btn btn-link" onClick={load}>
            Retry
          </button>
        </div>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <div className="sentry-state">
          <h2 className="h5">No relocation sites registered</h2>
          <p className="mb-0">
            Add verified site, safety, access, and capacity details before assigning residents.
          </p>
        </div>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <div className="row g-3">
          {items.map((site) => {
            const capacity = site.capacity || {};
            const roadAccessClass =
              site.roadAccess === "OPEN"
                ? "success"
                : site.roadAccess === "BLOCKED"
                  ? "danger"
                  : "secondary";

            return (
              <div className="col-12 col-sm-6 col-xxl-4 d-flex" key={site._id || site.id}>
                <article className="sentry-panel relocation-site-card h-100 w-100">
                  <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
                    <h2 className="h5 mb-0 text-break">
                      {site.name || "Unnamed relocation site"}
                    </h2>
                    <span className={`badge text-bg-${roadAccessClass}`}>
                      {site.roadAccess || "UNKNOWN"}
                    </span>
                  </div>

                  <p className="text-muted text-break mt-2 mb-3">
                    {site.district || "District not recorded"} · {site.state || "State not recorded"}
                  </p>

                  <div className="row row-cols-2 g-2 mb-3">
                    <Metric label="Total" value={capacity.total} />
                    <Metric label="Occupied" value={capacity.occupied} />
                    <Metric label="Reserved" value={capacity.reserved} />
                    <Metric label="Available" value={capacity.available} />
                  </div>

                  <div className="small mb-3">
                    Suitability: {site.suitability == null ? "Not assessed" : `${site.suitability}/100`}
                  </div>

                  <Link
                    className="btn btn-sm btn-outline-primary"
                    to={`/relocation-sites/${site._id || site.id}`}
                  >
                    Site details
                  </Link>
                </article>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="col-6">
      <div className="border rounded p-2 h-100">
        <small className="text-muted d-block">{label}</small>
        <strong>
          {Number.isFinite(value) ? value.toLocaleString() : "Unavailable"}
        </strong>
      </div>
    </div>
  );
}

export default RelocationSitesPage;
