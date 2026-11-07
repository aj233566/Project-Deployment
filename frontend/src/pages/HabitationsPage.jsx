import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { sentryApi } from "../services/sentryApi";
import CreateRecordForm from "../components/sentry/CreateRecordForm";
import "../css/sentry.css";
const ZONE_CLASS = { RED: "danger", ORANGE: "warning", YELLOW: "info", GREEN: "success" };
function HabitationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await sentryApi.getHabitations({ active: true });
      setItems(response.data);
    } catch (loadError) {
      setError(loadError.message || "Unable to load registered habitations.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    sentryApi.getHabitations({ active: true })
      .then((response) => {
        if (active) setItems(response.data);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Unable to load registered habitations.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);
  return (
    <section className="sentry-page habitations-page container-fluid py-4">
      <header className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <p className="sentry-eyebrow mb-1">SENTRY / POPULATION EXPOSURE</p>
          <h1 className="h2 mb-1">Habitations</h1>
          <p className="text-muted mb-0">Registered habitation records and latest multi-hazard classifications.</p>
        </div>
        <Link className="btn btn-outline-primary" to="/relocation-sites">Relocation sites</Link>
      </header>
      <CreateRecordForm type="habitation" onCreated={load} />
      {loading ? <div className="sentry-state" role="status">Loading habitation records…</div> : null}
      {error ? <div className="alert alert-danger" role="alert">{error}<button className="btn btn-link" onClick={load}>Retry</button></div> : null}
      {!loading && !error && items.length === 0 ? (
        <div className="sentry-state">
          <h2 className="h5">No habitation records</h2>
          <p className="mb-0">Add registered habitation data to enable exposure and relocation assessments.</p>
        </div>
      ) : null}
      {!loading && !error && items.length > 0 ? (
        <div className="table-responsive sentry-table-wrap">
          <table className="table align-middle mb-0">
            <thead><tr><th>Habitation</th><th>District</th><th>Population</th><th>Zone</th><th>Relocation</th><th /></tr></thead>
            <tbody>{items.map((item) => (
              <tr key={item._id}>
                <td><strong>{item.name}</strong><div className="small text-muted">{item.primaryHazard || "Hazard not yet assessed"}</div></td>
                <td>{item.district || "Not recorded"}</td>
                <td>{Number.isFinite(item.population) ? item.population.toLocaleString() : "Unavailable"}</td>
                <td><span className={`badge text-bg-${ZONE_CLASS[item.risk?.level] || "secondary"}`}>{item.risk?.level || "UNKNOWN"}</span></td>
                <td>{String(item.relocationStatus || "UNKNOWN").replaceAll("_", " ")}</td>
                <td><Link className="btn btn-sm btn-outline-secondary" to={`/habitations/${item._id}`}>Details</Link></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
export default HabitationsPage;
