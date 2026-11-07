import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { sentryApi } from "../services/sentryApi";
import "../css/sentry.css";
function RelocationSiteDetails() {
  const { id } = useParams();
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await sentryApi.getRelocationSite(id);
      setSite(response.data);
    } catch (loadError) {
      setError(loadError.message || "Unable to load relocation site.");
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    let active = true;
    sentryApi.getRelocationSite(id)
      .then((response) => {
        if (active) setSite(response.data);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Unable to load relocation site.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id]);
  if (loading) return <div className="sentry-page sentry-state" role="status">Loading relocation site…</div>;
  if (error) return <div className="sentry-page container py-4"><div className="alert alert-danger" role="alert">{error}<button className="btn btn-link" onClick={load}>Retry</button></div></div>;
  if (!site) return <div className="sentry-page sentry-state">Relocation site not found.</div>;
  const coords = site.location?.coordinates || [];
  return (
    <section className="sentry-page container py-4">
      <Link to="/relocation-sites">← Relocation sites</Link>
      <p className="sentry-eyebrow mt-3 mb-1">SITE DETAILS / {site.status}</p>
      <h1 className="h2">{site.name}</h1>
      <p className="text-muted">{site.district || "District not recorded"}, {site.state || "State not recorded"}</p>
      <div className="row g-3 my-3">{[
        ["Required", site.capacity.required], ["Total", site.capacity.total], ["Occupied", site.capacity.occupied],
        ["Reserved", site.capacity.reserved], ["Available", site.capacity.available], ["Capacity gap", site.capacity.capacityGap]
      ].map(([label, value]) => <div className="col-6 col-md-4" key={label}><article className="sentry-panel"><small className="text-muted d-block">{label}</small><strong className="fs-4">{Number.isFinite(value) ? value.toLocaleString() : "Unavailable"}</strong></article></div>)}</div>
      {site.capacity.required === null ? <p className="text-muted">No relocation demand is currently supplied; capacity gap is not calculated.</p> : null}
      <article className="sentry-panel">
        <h2 className="h5">Safety and access information</h2>
        <p>Road access: <strong>{site.roadAccess}</strong></p>
        <p>Suitability: <strong>{site.suitability == null ? "Not assessed" : `${site.suitability}/100`}</strong></p>
        <p>Hazard exposure: <strong>{site.hazardExposure?.length ? site.hazardExposure.join(", ") : "Not recorded"}</strong></p>
        <p>Facilities: <strong>{site.facilities?.length ? site.facilities.join(", ") : "Not recorded"}</strong></p>
        <p>Coordinates: <strong>{coords.length === 2 ? `${coords[1]}, ${coords[0]}` : "Not recorded"}</strong></p>
        <h3 className="h6 mt-4">Linked existing resources</h3>
        {site.linkedResources?.length ? <ul>{site.linkedResources.map((resource) => <li key={resource._id}>{resource.name} · {resource.category} · {resource.status}</li>)}</ul> : <p className="text-muted mb-0">No resources linked.</p>}
      </article>
    </section>
  );
}
export default RelocationSiteDetails;
