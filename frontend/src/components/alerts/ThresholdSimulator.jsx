import { useState } from "react";
import { analyzeRisk } from "../../services/riskApi";
import api from "../../services/api";
const SCENARIOS = [
  { key: "increased-monitoring", label: "Increased multi-hazard monitoring" },
  { key: "flood-response", label: "Flood response readiness" },
  { key: "slope-stabilization", label: "Slope stabilization" },
  { key: "earthquake-rapid-assessment", label: "Earthquake rapid assessment" },
];
function ThresholdSimulator() {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [scenario, setScenario] = useState(SCENARIOS[0].key);
  const [assessment, setAssessment] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const locate = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLatitude(String(coords.latitude));
        setLongitude(String(coords.longitude));
        setError("");
      },
      (locationError) => setError(locationError.message || "Unable to get your location."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  };
  const runScenario = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await analyzeRisk({
        latitude,
        longitude,
        disasterType: "multi_hazard",
      });
      if (!data?.risk || !Number.isFinite(data.risk.score)) {
        throw new Error("A deterministic baseline score is unavailable for this location.");
      }
      setAssessment(data);
      const response = await api.post("/risk/scenario", {
        risk: data.risk,
        scenario,
      }, { timeout: 15000 });
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Scenario analysis failed.");
      }
      setResult(response.data.data);
    } catch (requestError) {
      setAssessment(null);
      setError(requestError.response?.data?.message || requestError.message || "Scenario analysis failed.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <section className="ops-panel mt-4" aria-labelledby="scenario-analysis-title">
      <div className="ops-panel-header">
        <h2 className="ops-panel-title" id="scenario-analysis-title">Scenario analysis</h2>
      </div>
      <div className="p-3">
        <p className="text-muted">
          Compares an illustrative intervention rule against the supporting deterministic risk profile. The SENTRY multi-hazard index is shown separately; the indices are not directly comparable. This is not a forecast or operational response-time estimate.
        </p>
        <form className="row g-3" onSubmit={runScenario}>
          <div className="col-12 col-md-3">
            <label className="form-label" htmlFor="scenario-latitude">Latitude</label>
            <input id="scenario-latitude" className="form-control" type="number" step="any" min="-90" max="90" value={latitude} onChange={(event) => setLatitude(event.target.value)} required />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label" htmlFor="scenario-longitude">Longitude</label>
            <input id="scenario-longitude" className="form-control" type="number" step="any" min="-180" max="180" value={longitude} onChange={(event) => setLongitude(event.target.value)} required />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label" htmlFor="scenario-type">Intervention assumption</label>
            <select id="scenario-type" className="form-select" value={scenario} onChange={(event) => setScenario(event.target.value)}>
              {SCENARIOS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
          </div>
          <div className="col-12 col-md-3 d-flex align-items-end gap-2">
            <button className="btn btn-outline-secondary" type="button" onClick={locate}>Use my location</button>
            <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Analyzing…" : "Analyze"}</button>
          </div>
        </form>
        {error ? <div className="alert alert-danger mt-3 mb-0" role="alert">{error}</div> : null}
        {assessment && result ? (
          <div className="mt-3" aria-live="polite">
            <div className="row g-3">
              <Metric label="SENTRY multi-hazard index" value={assessment.multiHazard?.compositeScore == null ? "Unavailable" : `${assessment.multiHazard.compositeScore}/100 · ${assessment.multiHazard.redZone}`} />
              <Metric label="Supporting profile index" value={`${result.currentScore}/100 · ${result.currentLevel}`} />
              <Metric label="Illustrative profile scenario" value={result.simulatedScore == null ? "Unavailable" : `${result.simulatedScore}/100 · ${result.simulatedLevel}`} />
              <Metric label="Illustrative change" value={result.estimatedReduction == null ? "Unavailable" : `-${result.estimatedReduction} index points`} />
            </div>
            <p className="small text-muted mt-3 mb-1">{result.explanation}</p>
            <p className="small text-muted mb-1">{result.scenarioAssumptions}</p>
            <p className="small text-muted mb-0">{result.disclaimer}</p>
            {!result.scenarioMatchesDisaster ? <p className="small text-warning mt-2 mb-0">This intervention is not configured for the supporting profile; interpret the result only as an illustrative comparison.</p> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
function Metric({ label, value }) {
  return (
    <div className="col-12 col-md-4">
      <div className="border rounded p-3 h-100">
        <div className="small text-muted">{label}</div>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
export default ThresholdSimulator;
