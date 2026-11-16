import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { sentryApi } from "../services/sentryApi";
import CreateRecordForm from "../components/sentry/CreateRecordForm";
import "../css/sentry.css";

const ZONE_CLASS = {
  RED: "danger",
  ORANGE: "warning",
  YELLOW: "info",
  GREEN: "success",
};

function getErrorMessage(error) {
  return error?.response?.data?.message || error?.message || "Unable to load registered habitations.";
}

function HabitationsPage() {
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
      const response = await sentryApi.getHabitations({ active: true });
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
      className="sentry-page habitations-page container-fluid px-3 px-md-4 px-xl-5 py-3 py-md-4"
      aria-busy={loading}
    >
      <header className="d-flex flex-column flex-md-row flex-wrap justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <p className="sentry-eyebrow mb-1">SENTRY / POPULATION EXPOSURE</p>
          <h1 className="h2 mb-1">Habitations</h1>
          <p className="text-muted mb-0">
            Registered habitation records and latest multi-hazard classifications.
          </p>
        </div>
        <Link className="btn btn-outline-primary" to="/relocation-sites">
          Relocation sites
        </Link>
      </header>

      <CreateRecordForm type="habitation" onCreated={load} />

      {loading ? (
        <div className="sentry-state" role="status">
          Loading habitation records…
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
          <h2 className="h5">No habitation records</h2>
          <p className="mb-0">
            Add registered habitation data to enable exposure and relocation assessments.
          </p>
        </div>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <div className="table-responsive sentry-table-wrap w-100">
          <table className="table table-hover align-middle mb-0 sentry-habitations-table">
            <thead>
              <tr>
                <th scope="col">Habitation</th>
                <th scope="col">District</th>
                <th scope="col">Population</th>
                <th scope="col">Zone</th>
                <th scope="col">Relocation</th>
                <th scope="col">
                  <span className="visually-hidden">Details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id || item.id}>
                  <td>
                    <strong>{item.name || "Unnamed habitation"}</strong>
                    <div className="small text-muted">
                      {item.primaryHazard || "Hazard not yet assessed"}
                    </div>
                  </td>
                  <td>{item.district || "Not recorded"}</td>
                  <td>
                    {Number.isFinite(item.population)
                      ? item.population.toLocaleString()
                      : "Unavailable"}
                  </td>
                  <td>
                    <span
                      className={`badge text-bg-${ZONE_CLASS[item.risk?.level] || "secondary"}`}
                    >
                      {item.risk?.level || "UNKNOWN"}
                    </span>
                  </td>
                  <td>
                    {String(item.relocationStatus || "UNKNOWN").replaceAll("_", " ")}
                  </td>
                  <td>
                    <Link
                      className="btn btn-sm btn-outline-secondary"
                      to={`/habitations/${item._id || item.id}`}
                    >
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

export default HabitationsPage;
