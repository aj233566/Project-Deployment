import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { sentryApi } from "../services/sentryApi";
import CreateRecordForm from "../components/sentry/CreateRecordForm";
import "../css/sentry.css";
function RelocationSitesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await sentryApi.getRelocationSites();
      setItems(response.data);
    } catch (loadError) {
      setError(loadError.message || "Unable to load relocation sites.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    sentryApi.getRelocationSites()
      .then((response) => {
        if (active) setItems(response.data);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Unable to load relocation sites.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);
  return (
    <section className="sentry-page container-fluid py-4">
      <header className="mb-4"><p className="sentry-eyebrow mb-1">SENTRY / SAFE-SITE CAPACITY</p><h1 className="h2 mb-1">Relocation sites</h1><p className="text-muted mb-0">Capacity is computed from recorded total, occupancy, and reserved places.</p></header>
      <CreateRecordForm type="relocationSite" onCreated={load} />
      {loading ? <div className="sentry-state" role="status">Loading relocation sites…</div> : null}
      {error ? <div className="alert alert-danger" role="alert">{error}<button className="btn btn-link" onClick={load}>Retry</button></div> : null}
      {!loading && !error && items.length === 0 ? <div className="sentry-state"><h2 className="h5">No relocation sites registered</h2><p className="mb-0">Add verified site, safety, access, and capacity details before assigning residents.</p></div> : null}
      {!loading && !error && items.length > 0 ? <div className="row g-3">{items.map((site) => (
        <div className="col-12 col-md-6 col-xl-4" key={site._id}><article className="sentry-panel h-100">
          <div className="d-flex justify-content-between gap-2"><h2 className="h5">{site.name}</h2><span className={`badge text-bg-${site.roadAccess === "OPEN" ? "success" : site.roadAccess === "BLOCKED" ? "danger" : "secondary"}`}>{site.roadAccess}</span></div>
          <p className="text-muted">{site.district || "District not recorded"} · {site.state || "State not recorded"}</p>
          <div className="row g-2 mb-3"><Metric label="Total" value={site.capacity.total} /><Metric label="Occupied" value={site.capacity.occupied} /><Metric label="Reserved" value={site.capacity.reserved} /><Metric label="Available" value={site.capacity.available} /></div>
          <div className="small mb-3">Suitability: {site.suitability == null ? "Not assessed" : `${site.suitability}/100`}</div>
          <Link className="btn btn-sm btn-outline-primary" to={`/relocation-sites/${site._id}`}>Site details</Link>
        </article></div>
      ))}</div> : null}
    </section>
  );
}
function Metric({ label, value }) {
  return <div className="col-6"><div className="border rounded p-2"><small className="text-muted d-block">{label}</small><strong>{Number.isFinite(value) ? value.toLocaleString() : "Unavailable"}</strong></div></div>;
}
export default RelocationSitesPage;
