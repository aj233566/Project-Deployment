import { useEffect, useState } from "react";
import { analyzeRisk } from "../services/riskApi";
import { sentryApi } from "../services/sentryApi";
import "../css/Weather.css";
function getWeatherCondition(weatherCode) {
  if (weatherCode == null) return "Unknown";
  if (weatherCode === 0) return "Clear sky";
  if ([1, 2, 3].includes(weatherCode)) return "Cloudy";
  if ([45, 48].includes(weatherCode)) return "Foggy";
  if ([51, 53, 55, 56, 57].includes(weatherCode)) return "Drizzle";
  if ([61, 63, 65, 66, 67].includes(weatherCode)) return "Rain";
  if ([71, 73, 75, 77].includes(weatherCode)) return "Snow";
  if ([80, 81, 82].includes(weatherCode)) return "Rain showers";
  if ([85, 86].includes(weatherCode)) return "Snow showers";
  if ([95, 96, 99].includes(weatherCode)) return "Thunderstorm";
  return "Unknown";
}
const NORTHEAST_STATES = [
  {
    name: "Arunachal Pradesh",
    latitude: 27.0844,
    longitude: 93.6053,
  },
  {
    name: "Assam",
    latitude: 26.1445,
    longitude: 91.7362,
  },
  {
    name: "Manipur",
    latitude: 24.817,
    longitude: 93.9368,
  },
  {
    name: "Meghalaya",
    latitude: 25.467,
    longitude: 91.3662,
  },
  {
    name: "Mizoram",
    latitude: 23.7271,
    longitude: 92.7176,
  },
  {
    name: "Nagaland",
    latitude: 25.6751,
    longitude: 94.1086,
  },
  {
    name: "Tripura",
    latitude: 23.8315,
    longitude: 91.2868,
  },
  {
    name: "Sikkim",
    latitude: 27.3389,
    longitude: 88.6065,
  },
];
function getWeatherIcon(weatherCode) {
  if (weatherCode == null) return "🌤️";
  if (weatherCode === 0) return "☀️";
  if ([1, 2, 3].includes(weatherCode)) return "☁️";
  if ([45, 48].includes(weatherCode)) return "🌫️";
  if ([51, 53, 55, 56, 57].includes(weatherCode)) return "🌦️";
  if ([61, 63, 65, 66, 67].includes(weatherCode)) return "🌧️";
  if ([71, 73, 75, 77].includes(weatherCode)) return "❄️";
  if ([80, 81, 82].includes(weatherCode)) return "🌦️";
  if ([85, 86].includes(weatherCode)) return "🌨️";
  if ([95, 96, 99].includes(weatherCode)) return "⛈️";
  return "🌤️";
}
function getRiskClass(level) {
  const value = String(level || "").toLowerCase();
  if (value === "red" || value === "critical") return "weather-impact-critical";
  if (value === "orange" || value === "high") return "weather-impact-high";
  if (value === "yellow" || value === "moderate") return "weather-impact-moderate";
  if (value === "unknown" || value === "unavailable") return "weather-impact-unknown";
  return "weather-impact-low";
}
function getRiskPercentage(score) {
  if (!Number.isFinite(score)) return null;
  return Math.max(0, Math.min(100, score));
}
function formatDate(dateString) {
  if (!dateString) return "Unknown";
  return new Date(dateString).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
function Weather() {
  const [regionalData, setRegionalData] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    async function loadRegionalWeather() {
      setLoading(true);
      setError("");
      const weatherResults = new Array(NORTHEAST_STATES.length);
      let nextIndex = 0;
      const weatherWorker = async () => {
        while (nextIndex < NORTHEAST_STATES.length) {
          const index = nextIndex;
          nextIndex += 1;
          const state = NORTHEAST_STATES[index];
          try {
            const response = await sentryApi.getCurrentWeather(state.latitude, state.longitude);
            weatherResults[index] = {
              ...state,
              data: { weather: response.data },
              success: true,
              riskUnavailable: true,
            };
          } catch (weatherError) {
            console.error(`Failed to load weather for ${state.name}:`, weatherError);
            weatherResults[index] = {
              ...state,
              data: null,
              success: false,
              error: weatherError.message,
            };
          }
          if (!cancelled) {
            setRegionalData(weatherResults.filter(Boolean));
            if (weatherResults[index]?.success) setLoading(false);
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(4, NORTHEAST_STATES.length) }, weatherWorker));
      if (cancelled) return;
      setRegionalData(weatherResults);
      const successfulStates = weatherResults.filter(
        (state) => state.success && state.data,
      );
      if (successfulStates.length === 0) {
        setError("Unable to load weather data for the monitored states.");
      }
      setLoading(false);

      // Risk analysis includes news and AI enrichment and can take longer than live weather.
      // Update each state's card as its assessment arrives instead of blocking this page.
      nextIndex = 0;
      const riskWorker = async () => {
        while (nextIndex < NORTHEAST_STATES.length) {
          const index = nextIndex;
          nextIndex += 1;
          const state = NORTHEAST_STATES[index];
          try {
            const data = await analyzeRisk({
              latitude: state.latitude,
              longitude: state.longitude,
              name: state.name,
              disasterType: "multi_hazard",
            });
            if (cancelled) return;
            setRegionalData((current) => current.map((item) => (
              item.name === state.name ? { ...item, data, success: true, riskUnavailable: false } : item
            )));
          } catch (err) {
            console.warn(`Risk analysis unavailable for ${state.name}; showing live weather:`, err.message);
          }
        }
      };
      await Promise.all(Array.from({ length: 3 }, riskWorker));
    }
    loadRegionalWeather();
    return () => {
      cancelled = true;
    };
  }, []);
  if (loading) {
    return (
      <main className="weather-page">
        <div className="weather-header">
          <div>
            <h2 className="weather-title">Weather & Early Warning</h2>

            <p className="weather-subtitle">
              Live weather and explainable multi-hazard assessment
            </p>
          </div>

          <span className="weather-status">● Connecting</span>
        </div>

        <div className="weather-loading">
          <div className="weather-spinner"></div>
          <p>Fetching live weather and risk intelligence...</p>
        </div>
      </main>
    );
  }
  if (error) {
    return (
      <main className="weather-page">
        <div className="weather-header">
          <div>
            <h2 className="weather-title">Weather & Early Warning</h2>

            <p className="weather-subtitle">
              Live weather and explainable multi-hazard assessment
            </p>
          </div>

          <span className="weather-status weather-status-error">● Offline</span>
        </div>

        <div className="weather-error">
          <h5>Unable to load live weather data</h5>

          <p>{error || "No risk intelligence data is available."}</p>

          <button
            type="button"
            className="weather-retry"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </main>
    );
  }
  const selectedStateData = regionalData.find(
    (item) => item.name === selectedState,
  );
  const riskData = selectedStateData?.data || null;
  if (!riskData) {
    return (
      <main className="weather-page">
        <div className="weather-header">
          <div>
            <h2 className="weather-title">Weather & Early Warning</h2>

            <p className="weather-subtitle">
              Live environmental monitoring across Northeast India
            </p>
          </div>

          <span className="weather-status">● Live Monitoring</span>
        </div>

        <div className="weather-section">
          <div className="weather-section-header">
            <h2 className="weather-section-title">Choose a monitoring region</h2>
            <p className="weather-section-subtitle">No location is selected by default. Select a regional reference point to review its available assessment.</p>
          </div>
          <div className="weather-section-body">
            <div className="row g-3">
              {regionalData.map((state) => (
                <div className="col-12 col-sm-6 col-lg-4 col-xl-3" key={state.name}>
                  <button
                    type="button"
                    className="w-100 text-start border rounded p-3 h-100"
                    onClick={() => state.data && setSelectedState(state.name)}
                    disabled={!state.data}
                    style={{ background: "var(--weather-card-bg, #1d2529)", color: "inherit", cursor: state.data ? "pointer" : "not-allowed" }}
                  >
                    <strong>{state.name}</strong>
                    <div className="mt-2">{state.data?.multiHazard?.redZone || (state.riskUnavailable ? "Risk assessment updating" : "Data unavailable")}</div>
                    <small className="text-muted">
                      {Number.isFinite(state.data?.multiHazard?.compositeScore)
                        ? `Decision-support index ${state.data.multiHazard.compositeScore}/100`
                        : state.riskUnavailable ? "Live weather loaded; risk assessment is updating." : state.error || "No assessment data"}
                    </small>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }
  const weather = riskData.weather || {};
  const forecast = weather.forecast || {};
  const forecastDays = Array.isArray(forecast.days) ? forecast.days : [];
  const incidents = riskData.incidents || {};
  const multiHazard = riskData.multiHazard || {};
  const riskScore = Number.isFinite(multiHazard.compositeScore) ? multiHazard.compositeScore : null;
  const riskLevel = multiHazard.redZone || "UNKNOWN";
  const recommendations = Array.isArray(riskData.recommendations)
    ? riskData.recommendations
    : [];
  const nearbyIncidentCount = incidents.dataAvailable === false
    ? null
    : typeof incidents.count === "number" ? incidents.count : null;
  const regionalFailures = regionalData.filter((item) => !item.success);
  const weatherCondition = getWeatherCondition(weather.weatherCode);
  const weatherIcon = getWeatherIcon(weather.weatherCode);
  const latestUpdate = weather.updateTime || riskData.generatedAt;
  return (
    <main className="weather-page">


      <div className="weather-section mb-4">
        {regionalFailures.length > 0 && (
          <div className="alert alert-warning" role="status">
            Regional data unavailable for: {regionalFailures.map((item) => item.name).join(", ")}.
          </div>
        )}
        <div className="weather-section-header">
          <h5 className="weather-section-title">
            Northeast India Weather Overview
          </h5>

          <p className="weather-section-subtitle">
            Live weather and explainable multi-hazard assessment across monitored states
          </p>
        </div>

        <div className="weather-section-body">
          <div className="row g-3">
            {regionalData.map((state) => {
              const data = state.data;
              if (!data) return null;
              const stateWeather = data.weather || {};
              const stateAssessment = data.multiHazard || {};
              const score = Number.isFinite(stateAssessment.compositeScore)
                ? stateAssessment.compositeScore
                : null;
              const level = stateAssessment.redZone || "UNKNOWN";
              const nearbyReports = Number.isFinite(data.incidents?.count)
                ? data.incidents.count
                : null;
              const stateRiskClass = getRiskClass(level);
              return (
                <div
                  className="col-12 col-sm-6 col-lg-4 col-xl-3"
                  key={state.name}
                >
                  <button
                    type="button"
                    className={`w-100 text-start border rounded p-3 h-100 ${
                      selectedState === state.name ? "border-primary" : ""
                    }`}
                    onClick={() => setSelectedState(state.name)}
                    style={{
                      background: "var(--weather-card-bg, #1d2529)",
                      color: "inherit",
                      cursor: "pointer",
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                      <strong>{state.name}</strong>

                      <span
                        className={`weather-impact-level ${stateRiskClass}`}
                      >
                        {level}
                      </span>
                    </div>

                    <div className="d-flex align-items-center gap-2 mb-3">
                      <span style={{ fontSize: "47.2px" }}>
                        {getWeatherIcon(stateWeather.weatherCode)}
                      </span>

                      <div>
                        <div className="fw-bold fs-4">
                          {stateWeather.temperature ?? "--"}°C
                        </div>

                        <small className="text-muted">
                          {getWeatherCondition(stateWeather.weatherCode)}
                        </small>
                      </div>
                    </div>

                    <div className="small">
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Humidity</span>

                        <strong>{stateWeather.humidity ?? "--"}%</strong>
                      </div>

                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Rain</span>

                        <strong>
                          {stateWeather.rain ??
                            stateWeather.precipitation ??
                            "--"}{" "}
                          mm
                        </strong>
                      </div>

                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Multi-hazard index</span>

                        <strong>{score ?? "--"}/100</strong>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-top">
                      <small className="text-muted">
                        Nearby verified reports: {data.incidents?.dataAvailable === false || nearbyReports === null ? "Unavailable" : nearbyReports}
                      </small>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>


      <div className="row g-4 mb-4">

        <div className="col-lg-8">
          <div className="weather-main-card">
            <div className="weather-location">📍 {selectedState}</div>
            <div className="weather-temperature-row">
              <div className="weather-icon">{weatherIcon}</div>

              <div>
                <div className="weather-temperature">
                  {weather.temperature ?? "--"}°C
                </div>

                <div className="weather-condition">{weatherCondition}</div>

                <div className="weather-updated">
                  Updated{" "}
                  {latestUpdate
                    ? new Date(latestUpdate).toLocaleString("en-IN")
                    : "Unknown"}
                </div>
              </div>
            </div>

            <div className="weather-metrics">
              <div className="weather-metric">
                <span className="weather-metric-label">Humidity</span>

                <strong className="weather-metric-value">
                  {weather.humidity ?? "--"}%
                </strong>
              </div>

              <div className="weather-metric">
                <span className="weather-metric-label">Wind Speed</span>

                <strong className="weather-metric-value">
                  {weather.windSpeed ?? "--"} km/h
                </strong>
              </div>

              <div className="weather-metric">
                <span className="weather-metric-label">Current Rain</span>

                <strong className="weather-metric-value">
                  {weather.rain ?? weather.precipitation ?? "--"}{weather.rain == null && weather.precipitation == null ? "" : " mm"}
                </strong>
              </div>

              <div className="weather-metric">
                <span className="weather-metric-label">Forecast Rain</span>

                <strong className="weather-metric-value">
                  {forecast.dailyPrecipitation ?? "--"}{forecast.dailyPrecipitation == null ? "" : " mm"}
                </strong>
              </div>
            </div>
          </div>
        </div>


        <div className="col-lg-4">
          <div className="risk-card">
            <div className="risk-card-header">
              <h5>Multi-hazard assessment</h5>

              <span className={`risk-level-badge ${getRiskClass(riskLevel)}`}>
                {riskLevel}
              </span>
            </div>
            <br />
            <div className="risk-score">{riskScore ?? "--"} / 100</div>

            {riskScore === null
              ? <p className="text-muted mb-0">Index unavailable</p>
              : <div className="weather-progress"><div className="weather-progress-bar" style={{ width: `${getRiskPercentage(riskScore)}%` }} /></div>}

            <p className="risk-description">
              {multiHazard.explanation?.summary || "Assessment unavailable; source data is incomplete."}
            </p>

            <div className="risk-footer">
              <span>Nearby Reports: </span>

              <strong>{nearbyIncidentCount}</strong>
            </div>
          </div>
        </div>
      </div>


      <div className="weather-section mb-4">
        <div className="weather-section-header">
          <h5 className="weather-section-title">
            {selectedState} Precipitation Forecast
          </h5>

          <p className="weather-section-subtitle">
            Forecast rainfall at the selected monitoring location
          </p>
        </div>

        <div className="weather-section-body">
          <div className="weather-forecast">
            {forecastDays.length > 0 ? (
              forecastDays.slice(0, 5).map((day, index) => {
                const dayCondition = getWeatherCondition(day.weatherCode);
                const dayIcon = getWeatherIcon(day.weatherCode);
                return (
                  <div
                    className="weather-forecast-card"
                    key={`${day.date}-${index}`}
                  >
                    <div className="weather-forecast-day">
                      {formatDate(day.date)}
                    </div>

                    <div className="weather-forecast-icon">{dayIcon}</div>

                    <div className="weather-forecast-temp">
                      {day.maxTemperature ?? "--"}°C
                    </div>
                    <div className="forecast-condition">Forecast maximum</div>

                    <div className="weather-forecast-condition">
                      {dayCondition}
                    </div>

                    <div className="forecast-precipitation">
                      🌧️ {day.precipitation ?? "--"}{day.precipitation == null ? "" : " mm"}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="weather-empty">
                Forecast data is currently unavailable.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="row g-4">

        <div className="col-md-6">
          <div className="weather-section">
            <div className="weather-section-header">
              <h5 className="weather-section-title">
                {selectedState} Weather Impact
              </h5>

              <p className="weather-section-subtitle">
                Available weather factors used by the risk assessment
              </p>
            </div>

            <div className="weather-section-body">
              <div className="weather-impact-list">
                <div className="weather-impact-item">
                  <div>
                    <div className="weather-impact-name">Current Rainfall</div>

                    <div className="weather-impact-description">
                      Current precipitation at the monitored location
                    </div>
                  </div>

                  <strong>
                    {weather.rain ?? weather.precipitation ?? "--"}{weather.rain == null && weather.precipitation == null ? "" : " mm"}
                  </strong>
                </div>

                <div className="weather-impact-item">
                  <div>
                    <div className="weather-impact-name">
                      Forecast Precipitation
                    </div>

                    <div className="weather-impact-description">
                      Expected rainfall contributing to future risk
                    </div>
                  </div>

                  <strong>{forecast.dailyPrecipitation ?? "--"}{forecast.dailyPrecipitation == null ? "" : " mm"}</strong>
                </div>

                <div className="weather-impact-item">
                  <div>
                    <div className="weather-impact-name">Humidity</div>

                    <div className="weather-impact-description">
                      Atmospheric moisture condition
                    </div>
                  </div>

                  <strong>{weather.humidity ?? "--"}%</strong>
                </div>

                <div className="weather-impact-item">
                  <div>
                    <div className="weather-impact-name">
                      Nearby Field Reports
                    </div>

                    <div className="weather-impact-description">
                      Citizen/field incidents within the risk area
                    </div>
                  </div>

                  <strong>{nearbyIncidentCount}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>



        <div className="col-md-6">
          <div className="weather-section">
            <div className="weather-section-header">
              <h5 className="weather-section-title">Decision-support actions</h5>

              <p className="weather-section-subtitle">
                Recommendations generated from the current weather, risk and
                environmental assessment
              </p>
            </div>

            <div className="weather-section-body">
              <div className="weather-actions">
                {recommendations.length > 0 ? (
                  recommendations.slice(0, 5).map((recommendation, index) => (
                    <div className="weather-action" key={index}>
                      <span className="weather-action-icon">✓</span>

                      <p className="weather-action-text">
                        {typeof recommendation === "string"
                          ? recommendation
                          : recommendation.action ||
                            recommendation.recommendation ||
                            recommendation.text ||
                            "Recommendation available."}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="weather-action">
                    <span className="weather-action-icon">ℹ</span>

                    <p className="weather-action-text">
                      No decision-support actions are currently available for this
                      monitoring location.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
export default Weather;
