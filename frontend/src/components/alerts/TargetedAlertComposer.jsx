import { useEffect, useState } from "react";
import { sentryApi } from "../../services/sentryApi";
import { useAlerts } from "../../context/useAlerts";
const RISK_LEVELS = {
  YELLOW: "MODERATE",
  ORANGE: "HIGH",
  RED: "CRITICAL",
};
function TargetedAlertComposer() {
  const { loadAlerts } = useAlerts();
  const [habitations, setHabitations] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [targetType, setTargetType] = useState("habitations");
  const [radiusKm, setRadiusKm] = useState("");
  const [action, setAction] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [habitationError, setHabitationError] = useState("");
  const [message, setMessage] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);
  useEffect(() => {
    let cancelled = false;
    sentryApi.getHabitations({ active: true })
      .then((response) => {
        if (!cancelled) {
          setHabitations(response.data || []);
          setHabitationError("");
        }
      })
      .catch((loadError) => {
        if (!cancelled) setHabitationError(loadError.message || "Unable to load assessed habitations.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);
  const selected = habitations.find((item) => item._id === selectedId);
  const zoneType = selected?.risk?.level;
  const riskLevel = RISK_LEVELS[zoneType];
  const canCreate = selected
    && riskLevel
    && Number.isFinite(selected.risk?.score)
    && selected.location?.coordinates?.length === 2;
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!canCreate) {
      setError("Select a habitation with a recorded assessment and location.");
      return;
    }
    if (!action.trim() || !expiresAt || new Date(expiresAt) <= new Date()) {
      setError("Enter the response action and a future expiry time.");
      return;
    }
    if (targetType === "radius" && (!Number.isFinite(Number(radiusKm)) || Number(radiusKm) <= 0 || Number(radiusKm) > 500)) {
      setError("Enter a target radius greater than 0 and no more than 500 km.");
      return;
    }
    const [longitude, latitude] = selected.location.coordinates;
    setSubmitting(true);
    try {
      const response = await sentryApi.createTargetedAlert({
        hazardType: selected.primaryHazard,
        zoneType,
        targetType,
        ...(targetType === "habitations" ? { affectedHabitations: [selected._id] } : {}),
        ...(targetType === "radius" ? { radiusKm: Number(radiusKm) } : {}),
        location: {
          name: [selected.name, selected.district].filter(Boolean).join(", "),
          latitude,
          longitude,
        },
        riskScore: selected.risk.score,
        riskLevel,
        action: action.trim(),
        expiresAt: new Date(expiresAt).toISOString(),
        recommendations: [],
      });
      await loadAlerts();
      const count = response.data.affectedHabitationCount;
      const targetLabel = targetType === "zone"
        ? `all active habitations classified ${zoneType}`
        : targetType === "radius"
          ? `registered habitations within ${radiusKm} km`
          : selected.name;
      setMessage(`Alert saved for ${targetLabel} (${count} registered habitation${count === 1 ? "" : "s"}). ${response.data.residentDelivery}`);
      setAction("");
      setExpiresAt("");
      setRadiusKm("");
    } catch (submitError) {
      setError(submitError.message || "Unable to save the geo-targeted alert.");
    } finally {
      setSubmitting(false);
    }
  };
  const eligibleHabitations = habitations.filter((item) =>
    RISK_LEVELS[item.risk?.level]
    && Number.isFinite(item.risk?.score)
    && item.primaryHazard
    && item.location?.coordinates?.length === 2
  );
  return (
    <section className="ops-panel mb-4" aria-labelledby="targeted-alert-heading">
      <div className="ops-panel-header">
        <h2 className="ops-panel-title" id="targeted-alert-heading">Create geo-targeted alert</h2>
      </div>
      <div className="p-3">
        <p className="text-muted">
          Target an assessed habitation, habitations sharing its recorded SENTRY risk classification, or registered habitations within a radius. Resident delivery is not configured; alerts are saved for operational review.
        </p>
        {loading ? <p role="status">Loading assessed habitations…</p> : null}
        {habitationError ? (
          <div className="alert alert-danger" role="alert">
            {habitationError}
            <button
              type="button"
              className="btn btn-link"
              onClick={() => {
                setLoading(true);
                setRefreshToken((value) => value + 1);
              }}
            >
              Retry
            </button>
          </div>
        ) : null}
        {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
        {!loading && !habitationError && eligibleHabitations.length === 0 ? (
          <p className="text-muted mb-0">No assessed YELLOW, ORANGE, or RED habitation with a recorded hazard and location is available.</p>
        ) : null}
        {!habitationError && eligibleHabitations.length > 0 ? (
          <form onSubmit={submit}>
            <div className="row g-3">
              <div className="col-12 col-lg-4">
                <label className="form-label" htmlFor="alert-habitation">Assessed habitation</label>
                <select
                  id="alert-habitation"
                  className="form-select"
                  value={selectedId}
                  onChange={(event) => setSelectedId(event.target.value)}
                  required
                >
                  <option value="">Select a habitation</option>
                  {eligibleHabitations.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name} · {item.risk.level} · {item.risk.score}/100
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-lg-4">
                <label className="form-label" htmlFor="alert-target-type">Target area</label>
                <select
                  id="alert-target-type"
                  className="form-select"
                  value={targetType}
                  onChange={(event) => setTargetType(event.target.value)}
                >
                  <option value="habitations">Selected habitation only</option>
                  <option value="zone">All habitations with selected risk classification</option>
                  <option value="radius">Registered habitations within radius</option>
                </select>
              </div>
              {targetType === "radius" ? (
                <div className="col-12 col-lg-2">
                  <label className="form-label" htmlFor="alert-radius">Radius (km)</label>
                  <input
                    id="alert-radius"
                    className="form-control"
                    type="number"
                    min="0.1"
                    max="500"
                    step="any"
                    value={radiusKm}
                    onChange={(event) => setRadiusKm(event.target.value)}
                    required
                  />
                </div>
              ) : null}
              <div className="col-12 col-lg-4">
                <label className="form-label" htmlFor="alert-action">Response action</label>
                <input
                  id="alert-action"
                  className="form-control"
                  maxLength={1000}
                  value={action}
                  onChange={(event) => setAction(event.target.value)}
                  placeholder="Operator-approved public safety instruction"
                  required
                />
              </div>
              <div className="col-12 col-lg-3">
                <label className="form-label" htmlFor="alert-expiry">Expires at</label>
                <input
                  id="alert-expiry"
                  className="form-control"
                  type="datetime-local"
                  min={new Date().toISOString().slice(0, 16)}
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                  required
                />
              </div>
              <div className="col-12 col-lg-1 d-flex align-items-end">
                <button className="btn btn-danger w-100" type="submit" disabled={submitting || !canCreate}>
                  {submitting ? "Saving…" : "Create"}
                </button>
              </div>
            </div>
          </form>
        ) : null}
        {message ? <div className="alert alert-success mt-3 mb-0" role="status">{message}</div> : null}
      </div>
    </section>
  );
}
export default TargetedAlertComposer;
