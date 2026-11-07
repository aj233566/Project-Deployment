function WeatherCard({
  city = "Location not recorded",
  temperature = null,
  condition = "Condition unavailable",
  humidity = null,
  wind = null,
  rainfall = null,
  risk = "UNKNOWN",
}) {
  const riskLevel = String(risk || "UNKNOWN").toUpperCase();
  const riskClass = riskLevel === "CRITICAL" || riskLevel === "HIGH"
    ? "bg-danger"
    : riskLevel === "MODERATE"
      ? "bg-warning text-dark"
      : riskLevel === "LOW"
        ? "bg-success"
        : "bg-secondary";
  const formatMeasurement = (value, unit) => Number.isFinite(value)
    ? `${value}${unit}`
    : "Unavailable";
  return (
    <div className="card shadow-sm border-0 h-100">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h5 className="fw-bold mb-1">{city}</h5>
            <p className="text-muted mb-0">{condition}</p>
          </div>

          <span
            className={`badge ${riskClass}`}
          >
            {riskLevel === "UNKNOWN" ? "RISK UNAVAILABLE" : `${riskLevel} RISK`}
          </span>
        </div>

        <div className="d-flex align-items-center gap-3 mb-4">
          <span style={{ fontSize: "55.9px" }}>☁️</span>

          <div>
            <h2 className="fw-bold mb-0">{formatMeasurement(temperature, "°C")}</h2>
            <small className="text-muted">{condition}</small>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-6">
            <div className="bg-light rounded p-3">
              <small className="text-muted d-block">Humidity</small>
              <strong>{formatMeasurement(humidity, "%")}</strong>
            </div>
          </div>

          <div className="col-6">
            <div className="bg-light rounded p-3">
              <small className="text-muted d-block">Wind</small>
              <strong>{formatMeasurement(wind, " km/h")}</strong>
            </div>
          </div>

          <div className="col-6">
            <div className="bg-light rounded p-3">
              <small className="text-muted d-block">Rainfall</small>
              <strong>{formatMeasurement(rainfall, " mm")}</strong>
            </div>
          </div>

          <div className="col-6">
            <div className="bg-light rounded p-3">
              <small className="text-muted d-block">Risk Score</small>
              <strong>{riskLevel === "UNKNOWN" ? "Unavailable" : riskLevel}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default WeatherCard;
