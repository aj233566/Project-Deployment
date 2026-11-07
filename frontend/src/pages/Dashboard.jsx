import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../css/Dashboard.css";
import "../css/notifications.css";
import CitizenMapViews from "../components/gis/CitizenMapViews";
import NearbyPeople from "../components/citizen/NearbyPeople";
import IncidentAlertBanner from "../components/citizen/IncidentAlertBanner";
import { useCitizenLang } from "../hooks/useCitizenLang";
import { CITIZEN_INITIAL_MAP_STYLE } from "../config/mapDefaults";
import { analyzeRisk } from "../services/riskApi";
import { getIncidents } from "../services/api";
import { useAlerts } from "../context/useAlerts";
import { logoutAndRedirect } from "../services/api";
import { selectRoadStatusRows } from "../utils/gis/roadStatusDisplay";
function getStoredUser() {
  try {
    const stored = sessionStorage.getItem("user") || localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error("Unable to read stored user:", error);
    return null;
  }
}
function getWeatherCondition(weatherCode) {
  if (weatherCode == null) {
    return "Unknown";
  }
  if (weatherCode === 0) {
    return "Clear sky";
  }
  if ([1, 2, 3].includes(weatherCode)) {
    return "Cloudy";
  }
  if ([45, 48].includes(weatherCode)) {
    return "Foggy";
  }
  if ([51, 53, 55, 56, 57].includes(weatherCode)) {
    return "Drizzle";
  }
  if ([61, 63, 65, 66, 67].includes(weatherCode)) {
    return "Rain";
  }
  if ([71, 73, 75, 77].includes(weatherCode)) {
    return "Snow";
  }
  if ([80, 81, 82].includes(weatherCode)) {
    return "Rain showers";
  }
  if ([85, 86].includes(weatherCode)) {
    return "Snow showers";
  }
  if ([95, 96, 99].includes(weatherCode)) {
    return "Thunderstorm";
  }
  return "Unknown";
}
function getNotificationText(value, fallback = "") {
  if (!value) {
    return fallback;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object") {
    return (
      value.en ||
      value.english ||
      value.hi ||
      Object.values(value)[0] ||
      fallback
    );
  }
  return fallback;
}
function getNotificationTime(notification) {
  const date =
    notification?.createdAt ||
    notification?.updatedAt ||
    notification?.timestamp;
  if (!date) {
    return "Recently";
  }
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return "Recently";
  }
  return parsed.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
function getNotificationTypeClass(type) {
  const normalized = String(type || "info").toLowerCase();
  if (normalized === "critical") {
    return "status-danger";
  }
  if (normalized === "warning") {
    return "status-warning";
  }
  return "status-safe";
}
function isCitizenNotification(notification) {
  const audience = String(notification?.targetAudience || "").toLowerCase();
  if (!audience) {
    return true;
  }
  if (
    audience.includes("citizen") ||
    audience.includes("public") ||
    audience.includes("general") ||
    audience.includes("all")
  ) {
    return true;
  }
  return false;
}
function getRiskBadgeClass(level) {
  const normalized = String(level || "").toLowerCase();
  if (normalized === "red" || normalized === "orange") return "status-danger";
  if (normalized === "yellow") return "status-moderate";
  if (normalized === "green") return "status-safe";
  if (normalized.includes("critical")) {
    return "status-danger";
  }
  if (normalized.includes("high")) {
    return "status-danger";
  }
  if (normalized.includes("moderate")) {
    return "status-moderate";
  }
  if (normalized.includes("low")) {
    return "status-safe";
  }
  return "status-moderate";
}
function getIncidentSeverityClass(severity) {
  const normalized = String(severity || "reported").toLowerCase();
  if (normalized === "critical" || normalized === "high") {
    return "status-danger";
  }
  if (normalized === "moderate" || normalized === "medium") {
    return "status-moderate";
  }
  return "status-safe";
}
function formatIncidentType(type) {
  if (!type) {
    return "Incident";
  }
  return String(type)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
function getIncidentLocation(incident) {
  const location = incident?.location;
  if (location?.address && String(location.address).trim()) {
    return location.address;
  }
  if (
    typeof location?.latitude === "number" &&
    typeof location?.longitude === "number"
  ) {
    return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
  }
  return "Location unavailable";
}
function Dashboard() {
  const navigate = useNavigate();
  const user = useMemo(() => getStoredUser(), []);
  const displayName = user?.name || "Citizen";
  const district = user?.location?.district || "Your district";
  const state = user?.location?.state || "";
  const geolocationAvailable =
    typeof navigator !== "undefined" && Boolean(navigator.geolocation);
  const [citizenLocation, setCitizenLocation] = useState(null);
  const [nearbyPeople, setNearbyPeople] = useState([]);
  const { t } = useCitizenLang();
  const [locationLoading, setLocationLoading] = useState(geolocationAvailable);
  const [locationError, setLocationError] = useState(
    geolocationAvailable ? "" : "Location services are not supported by this browser.",
  );
  const { notifications = [], markNotificationRead } = useAlerts();
  const [riskData, setRiskData] = useState(null);
  const [riskLoading, setRiskLoading] = useState(true);
  const [riskError, setRiskError] = useState("");
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(() => Boolean(user?._id || user?.id));
  const [reportsError, setReportsError] = useState("");
  const [reportsReloadToken, setReportsReloadToken] = useState(0);
  const [selectedReport, setSelectedReport] = useState(null);
  const [mapRoadStatusRows, setMapRoadStatusRows] = useState([]);
  const [mapRoadStatusReady, setMapRoadStatusReady] = useState(false);
  const roadStatusRows = selectRoadStatusRows({
    mapRows: mapRoadStatusRows,
    incidentRows: riskData?.incidents?.nearby || [],
  });
  const blockedRoadCount = roadStatusRows.filter(
    (road) => String(road.status || "").toLowerCase() === "blocked",
  ).length;
  const restrictedRoadCount = roadStatusRows.filter(
    (road) => String(road.status || "").toLowerCase() === "restricted",
  ).length;
  const handleMapRoadStatusChange = useCallback((rows) => {
    setMapRoadStatusRows(Array.isArray(rows) ? rows : []);
    setMapRoadStatusReady(true);
  }, []);
  useEffect(() => {
    if (!geolocationAvailable) {
      return;
    }
    let settled = false;
    const hardTimeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      setLocationError(
        "Location not shared yet — allow location access to see risk, warnings and roads for your area.",
      );
      setLocationLoading(false);
    }, 13000);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (settled) return;
        settled = true;
        clearTimeout(hardTimeout);
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        if (typeof latitude !== "number" || typeof longitude !== "number") {
          setLocationError("Unable to determine your current location.");
          setLocationLoading(false);
          return;
        }
        const location = {
          latitude,
          longitude,
        };
        setCitizenLocation(location);
        setLocationError("");
        setLocationLoading(false);
      },
      (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(hardTimeout);
        console.warn("[Citizen Dashboard] Geolocation unavailable:", error);
        let message = "Unable to access your location.";
        if (error.code === error.PERMISSION_DENIED) {
          message =
            "Location access was denied. Enable location permission for personalized local risk information.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = "Your current location is unavailable.";
        } else if (error.code === error.TIMEOUT) {
          message = "Location request timed out.";
        }
        setLocationError(message);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
    return () => clearTimeout(hardTimeout);
  }, [geolocationAvailable]);
  useEffect(() => {
    if (!citizenLocation) {
      if (!locationLoading) {
        const timer = setTimeout(() => setRiskLoading(false), 0);
        return () => clearTimeout(timer);
      }
      return undefined;
    }
    let cancelled = false;
    async function fetchRisk() {
      try {
        setRiskLoading(true);
        setRiskError("");
        const result = await analyzeRisk({
          latitude: citizenLocation.latitude,
          longitude: citizenLocation.longitude,
          name: district && state ? `${district}, ${state}` : district,
          disasterType: "multi_hazard",
        });
        if (cancelled) {
          return;
        }
        const data =
          result?.data &&
          !result?.weather &&
          !result?.risk &&
          !result?.incidents
            ? result.data
            : result;
        setRiskData(data || null);
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error("[Citizen Dashboard] Risk API error:", error);
        setRiskError("Unable to load live local risk data.");
        setRiskData(null);
      } finally {
        if (!cancelled) {
          setRiskLoading(false);
        }
      }
    }
    fetchRisk();
    return () => {
      cancelled = true;
    };
  }, [citizenLocation, district, state, locationLoading]);
  useEffect(() => {
    let cancelled = false;
    async function fetchReports() {
      try {
        setReportsLoading(true);
        setReportsError("");
        const result = await getIncidents();
        if (cancelled) {
          return;
        }
        const incidents = Array.isArray(result?.data) ? result.data : [];
        setReports(incidents);
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error("[Citizen Dashboard] Reports API error:", error);
        setReports([]);
        setReportsError(error.message || "Unable to load your reports.");
      } finally {
        if (!cancelled) {
          setReportsLoading(false);
        }
      }
    }
    if (user?._id || user?.id) {
      fetchReports();
    }
    return () => {
      cancelled = true;
    };
  }, [user, reportsReloadToken]);
  const citizenNotifications = useMemo(() => {
    return [...notifications]
      .filter(isCitizenNotification)
      .sort((a, b) => {
        const dateA = new Date(
          a?.createdAt || a?.updatedAt || a?.timestamp || 0,
        ).getTime();
        const dateB = new Date(
          b?.createdAt || b?.updatedAt || b?.timestamp || 0,
        ).getTime();
        return dateB - dateA;
      });
  }, [notifications]);
  const unreadNotifications = citizenNotifications.filter(
    (notification) => !notification?.read,
  );
  const visibleNotifications = citizenNotifications.slice(0, 5);
  const handleNotificationClick = async (notification) => {
    const notificationId = notification?._id || notification?.id;
    if (!notificationId) {
      return;
    }
    if (notification.read) {
      return;
    }
    try {
      await markNotificationRead(notificationId);
    } catch (error) {
      console.error(
        "[Citizen Dashboard] Unable to mark notification as read:",
        error,
      );
    }
  };
  const scrollToNotifications = () => {
    const element = document.getElementById("citizen-notifications");
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };
  const handleLogout = () => {
    void logoutAndRedirect();
  };
  const handleReportIncident = () => {
    navigate("/report-incident");
  };
  const riskScore = riskData?.multiHazard?.compositeScore ?? null;
  const riskLevel = riskData?.multiHazard?.redZone ?? null;
  const riskBadgeClass = getRiskBadgeClass(riskLevel);
  const weather = riskData?.weather || null;
  const nearbyIncidents = Array.isArray(riskData?.incidents?.nearby)
    ? riskData.incidents.nearby
    : [];
  return (
    <main className="citizen-dashboard">
      <div className="citizen-container">

        <header className="citizen-topbar">
          <div>
            <div className="citizen-eyebrow">SENETRY • Citizen Portal</div>

            <h1 className="citizen-title">Welcome, {displayName}</h1>

            <p className="citizen-subtitle">
              Local disaster awareness for {district}
              {state ? `, ${state}` : ""}.
            </p>

            <div
              className="citizen-card-muted"
              style={{
                marginTop: "6px",
              }}
            >
              {locationLoading
                ? "📍 Detecting your current location..."
                : citizenLocation
                ? "📍 Using your current location for local risk intelligence"
                : "📍 Location unavailable"}
            </div>
          </div>

          <div className="citizen-actions">

            <button
              type="button"
              className="citizen-btn citizen-btn-secondary citizen-notification-button"
              onClick={scrollToNotifications}
              aria-label={`Notifications${unreadNotifications.length ? `, ${unreadNotifications.length} unread` : ""}`}
              title={`Notifications${unreadNotifications.length ? ` (${unreadNotifications.length} unread)` : ""}`}
            >
              <Bell aria-hidden="true" size={22} strokeWidth={2.2} />
              {unreadNotifications.length > 0 && (
                <span className="citizen-notification-count" aria-hidden="true">
                  {unreadNotifications.length}
                </span>
              )}
            </button>


            <button
              type="button"
              className="citizen-btn citizen-btn-danger"
              onClick={handleReportIncident}
            >
              Report an Incident
            </button>


            <button
              type="button"
              className="citizen-btn citizen-btn-secondary"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </header>


        {locationError && (
          <section
            className="citizen-alert"
            style={{
              marginBottom: "16px",
            }}
          >
            <div>
              <strong>Location access unavailable</strong>

              <p>{locationError}</p>
            </div>
          </section>
        )}


        <section className="citizen-alert" aria-label="Current warning">
          <div>
            <strong>
              {riskLoading
                ? "Assessing local risk..."
                : riskLevel
                ? `${riskLevel} Risk Conditions`
                : "Risk Assessment"}
            </strong>

            <p>
              {riskError
                ? riskError
                : riskData?.multiHazard?.explanation?.summary ||
                  "Multi-hazard assessment is unavailable for this location."}
            </p>
          </div>
        </section>


        <IncidentAlertBanner citizenLocation={citizenLocation} />

        <nav className="citizen-sections" aria-label={t("nav.label")}>
          <a href="#citizen-overview">{t("nav.area")}</a>
          <a href="#citizen-map">{t("nav.map")}</a>
          <a href="#citizen-safe">{t("nav.safe")}</a>
          <a href="#citizen-around">{t("nav.around")}</a>
          <a href="#citizen-people">{t("nav.people")}</a>
          <a href="#citizen-notifications">{t("nav.alerts")}</a>
          <a href="#citizen-reports">{t("nav.reports")}</a>
        </nav>

        <div className="row g-3">

          <div id="citizen-overview" className="col-12 col-xl-5">
            <section className="citizen-card risk-card">
              <div className="citizen-card-header">
                <div>
                  <h2 className="citizen-card-title">Local Risk Level</h2>

                  <div className="citizen-card-muted">
                    {citizenLocation
                      ? "Assessment based on your current location"
                      : "Current area assessment"}
                  </div>
                </div>

                <span className={`status-badge ${riskBadgeClass}`}>
                  {riskLoading ? "LOADING" : riskLevel || "UNKNOWN"}
                </span>
              </div>

              <div>
                <div className="risk-value-row">
                  <span className="risk-value">
                    {riskScore != null ? riskScore : "--"}
                  </span>

                  <span className="citizen-card-muted mb-2">/ 100</span>
                </div>

                <div className="risk-scale" aria-label="Risk score">
                  <div
                    className="risk-scale-fill"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, Number(riskScore || 0)),
                      )}%`,
                    }}
                  />
                </div>

                <div className="citizen-card-muted mt-2">
                  Risk can change with rainfall, terrain conditions and verified
                  incidents.
                </div>

                <div className="citizen-card-muted mt-2">
                  {riskData?.multiHazard?.explanation?.summary || "Assessment unavailable; source data is incomplete."}
                </div>
              </div>
            </section>
          </div>


          <div className="col-12 col-md-6 col-xl-4">
            <section className="citizen-card">
              <div className="citizen-card-header">
                <div>
                  <h2 className="citizen-card-title">Weather</h2>

                  <div className="citizen-card-muted">Local conditions</div>
                </div>

                <div className="weather-icon" aria-hidden="true">
                  ☁
                </div>
              </div>

              <div className="weather-main">
                <div>
                  <div className="weather-temperature">
                    {weather?.temperature != null
                      ? `${weather.temperature}°C`
                      : "--"}
                  </div>

                  <div className="weather-condition">
                    {getWeatherCondition(weather?.weatherCode)}
                  </div>
                </div>
              </div>

              <div className="metric-grid mt-4">
                <div className="metric-item">
                  <div className="metric-label">Rainfall</div>

                  <div className="metric-value">
                    {weather?.rain != null ? `${weather.rain} mm` : "--"}
                  </div>

                  <div className="citizen-card-muted">Current rainfall</div>
                </div>

                <div className="metric-item">
                  <div className="metric-label">Humidity</div>

                  <div className="metric-value">
                    {weather?.humidity != null ? `${weather.humidity}%` : "--"}
                  </div>
                </div>

                <div className="metric-item">
                  <div className="metric-label">Incidents</div>

                  <div className="metric-value">
                    {riskData?.incidents?.count ?? "--"}
                  </div>

                  <div className="citizen-card-muted">within 100 km</div>
                </div>
              </div>
            </section>
          </div>


          <div className="col-12 col-md-6 col-xl-3">
            <section className="citizen-card">
              <div className="citizen-card-header">
                <div>
                  <h2 className="citizen-card-title">Emergency Help</h2>

                  <div className="citizen-card-muted">Quick access</div>
                </div>
              </div>

              <div className="resource-grid">
                <div className="resource-box">
                  <div className="resource-number">112</div>

                  <div className="resource-label">National emergency</div>
                </div>

                <div className="resource-box">
                  <div className="resource-number">108</div>

                  <div className="resource-label">Ambulance</div>
                </div>

                <div className="resource-box">
                  <div className="resource-number">101</div>

                  <div className="resource-label">Fire service</div>
                </div>

                <div className="resource-box">
                  <div className="resource-number">1077</div>

                  <div className="resource-label">Disaster helpline</div>
                </div>
              </div>

              <button
                type="button"
                className="citizen-btn citizen-btn-danger w-100 mt-3"
                onClick={() => {
                  window.location.href = "tel:112";
                }}
              >
                Call 112
              </button>
            </section>
          </div>



          <div id="citizen-map" className="col-12">
            <section className="mt-2">
              <CitizenMapViews
                citizenLocation={citizenLocation ? { lat: citizenLocation.latitude, lng: citizenLocation.longitude } : null}
                liveProps={{
                  role: "citizen",
                  people: nearbyPeople,
                  initialHudMode: "minimal",
                  initialMapStyle: CITIZEN_INITIAL_MAP_STYLE,
                  citizenLocation: citizenLocation ? { lat: citizenLocation.latitude, lng: citizenLocation.longitude } : null,
                  onRoadsChange: handleMapRoadStatusChange,
                }}
              />
            </section>
          </div>



          <div id="citizen-around" className="col-12 col-lg-6">
            <section className="citizen-card">
              <div className="citizen-card-header">
                <div>
                  <h2 className="citizen-card-title">
                    Nearby Warnings & Incidents
                  </h2>

                  <div className="citizen-card-muted">
                    Active incidents detected around your location
                  </div>
                </div>

                <span
                  className={`status-badge ${
                    nearbyIncidents.length > 0
                      ? "status-warning"
                      : "status-safe"
                  }`}
                >
                  {riskLoading
                    ? "LOADING"
                    : riskData?.incidents?.dataAvailable === false
                    ? "Unavailable"
                    : `${nearbyIncidents.length} verified within 100 km`}
                </span>
              </div>

              <div className="data-list">
                {locationLoading ? (
                  <div className="citizen-card-muted">
                    Determining your location...
                  </div>
                ) : locationError ? (
                  <div className="citizen-card-muted">
                    Enable location access to see nearby warnings and incidents.
                  </div>
                ) : riskLoading ? (
                  <div className="citizen-card-muted">
                    Loading nearby incidents...
                  </div>
                ) : riskData?.incidents?.dataAvailable === false ? (
                  <div className="citizen-card-muted" role="status">
                    Verified incident data is unavailable.
                  </div>
                ) : nearbyIncidents.length > 0 ? (
                  nearbyIncidents.map((incident) => {
                    const severity = String(
                      incident?.severity || "reported",
                    ).toLowerCase();
                    const statusClass = getIncidentSeverityClass(severity);
                    return (
                      <div
                        className="data-row"
                        key={incident?._id || incident?.id}
                      >
                        <div>
                          <div className="data-name">
                            {formatIncidentType(incident?.type)}
                          </div>

                          <div className="data-meta">
                            {getIncidentLocation(incident)}
                          </div>

                          {incident?.description && (
                            <div
                              className="data-meta"
                              style={{
                                marginTop: "4px",
                              }}
                            >
                              {incident.description}
                            </div>
                          )}
                        </div>

                        <span className={`status-badge ${statusClass}`}>
                          {severity.charAt(0).toUpperCase() + severity.slice(1)}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="citizen-card-muted">
                    No verified incidents detected within 100 km.
                  </div>
                )}
              </div>
            </section>
          </div>


          <div className="col-12 col-lg-6">
            <section className="citizen-card">
              <div className="citizen-card-header">
                <div>
                  <h2 className="citizen-card-title">Road Status</h2>

                  <div className="citizen-card-muted">
                    Based on active road impacts shown on the safety map
                  </div>
                </div>

                <span
                  className={`status-badge ${
                    roadStatusRows.length > 0 ? "status-warning" : "status-safe"
                  }`}
                >
                  {!mapRoadStatusReady && riskLoading
                    ? "LOADING"
                    : roadStatusRows.length > 0
                    ? `${blockedRoadCount} blocked · ${restrictedRoadCount} restricted`
                    : "No blockages"}
                </span>
              </div>

              <div className="data-list data-list-scroll">
                {!mapRoadStatusReady && riskLoading ? (
                  <div className="citizen-card-muted">
                    Loading road conditions from the safety map...
                  </div>
                ) : roadStatusRows.length > 0 ? (
                  roadStatusRows.map((road) => {
                    const blocked = String(road.status || "").toLowerCase() === "blocked";
                    return (
                      <div className="data-row" key={road.id || road.name}>
                        <div>
                          <div className="data-name">{road.name}</div>
                          {road.condition ? <div className="data-meta">{road.condition}</div> : null}
                        </div>
                        <span className={`road-status ${blocked ? "road-blocked" : "road-partial"}`}>
                          {blocked ? "Blocked" : "Restricted"}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="citizen-card-muted">
                    No active road impacts are currently shown on the map.
                  </div>
                )}
              </div>
            </section>
          </div>



          <div id="citizen-people" className="col-12">
            <NearbyPeople citizenLocation={citizenLocation} onPeople={setNearbyPeople} />
          </div>



          <div className="col-12" id="citizen-notifications">
            <section className="citizen-card">
              <div className="citizen-card-header">
                <div>
                  <h2 className="citizen-card-title">
                    Authority Notifications
                  </h2>

                  <div className="citizen-card-muted">
                    Official alerts and announcements for citizens
                  </div>
                </div>

                {unreadNotifications.length > 0 && (
                  <span className="status-badge status-danger">
                    {unreadNotifications.length} unread
                  </span>
                )}
              </div>

              <div className="data-list">
                {visibleNotifications.length > 0 ? (
                  visibleNotifications.map((notification) => {
                    const title = getNotificationText(
                      notification?.title,
                      "Authority Notification",
                    );
                    const message = getNotificationText(
                      notification?.message,
                      "No message available.",
                    );
                    const typeClass = getNotificationTypeClass(
                      notification?.type,
                    );
                    const notificationId =
                      notification?._id || notification?.id;
                    return (
                      <button
                        type="button"
                        key={notificationId}
                        onClick={() => handleNotificationClick(notification)}
                        className="citizen-notification-item"
                        aria-label={`Read notification: ${title}`}
                      >
                        <div
                          className={`citizen-notification-row ${
                            notification?.read ? "is-read" : "is-unread"
                          }`}
                        >

                          <span
                            className={`citizen-notification-dot ${
                              notification?.read ? "read" : "unread"
                            }`}
                            aria-hidden="true"
                          />

                          <div className="citizen-notification-content">
                            <div className="citizen-notification-title-row">
                              <div className="data-name">{title}</div>

                              <span className={`status-badge ${typeClass}`}>
                                {String(
                                  notification?.type || "info",
                                ).toUpperCase()}
                              </span>
                            </div>

                            <div className="citizen-notification-message">
                              {message}
                            </div>

                            <div className="citizen-notification-meta">
                              {getNotificationTime(notification)}

                              {" • "}

                              {notification?.read ? "Read" : "Unread"}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div
                    className="citizen-card-muted"
                    style={{
                      padding: "18px 0",
                    }}
                  >
                    No authority notifications available right now.
                  </div>
                )}
              </div>

              {citizenNotifications.length > 5 && (
                <div
                  className="citizen-card-muted"
                  style={{
                    marginTop: "12px",
                    paddingTop: "12px",
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  Showing the 5 most recent notifications.
                </div>
              )}
            </section>
          </div>



          <div id="citizen-reports" className="col-12">
            <section className="citizen-card">
              <div className="citizen-card-header">
                <div>
                  <h2 className="citizen-card-title">My Recent Reports</h2>

                  <div className="citizen-card-muted">
                    Reports submitted from your account
                  </div>
                </div>

                <button
                  type="button"
                  className="citizen-btn citizen-btn-secondary"
                  onClick={() => navigate("/report-incident")}
                >
                  New Report
                </button>
              </div>


              {reportsLoading ? (
                <div className="citizen-card-muted">
                  Loading your reports...
                </div>
              ) : reportsError ? (
                <div className="alert alert-danger mb-0" role="alert">
                  {reportsError}
                  <button
                    type="button"
                    className="btn btn-link"
                    onClick={() => {
                      setReportsLoading(true);
                      setReportsError("");
                      setReportsReloadToken((value) => value + 1);
                    }}
                  >
                    Retry
                  </button>
                </div>
              ) : reports.length > 0 ? (
                <div className="citizen-reports-list">
                  {reports.slice(0, 5).map((report) => {
                    const reportId = report?._id || report?.id;
                    const incidentType = formatIncidentType(report?.type);
                    const reportStatus = String(report?.status || "submitted")
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (char) => char.toUpperCase());
                    const severity = String(
                      report?.severity || "unknown",
                    ).replace(/\b\w/g, (char) => char.toUpperCase());
                    const reportDate =
                      report?.createdAt || report?.reportedAt || report?.time;
                    return (
                      <div className="citizen-report-row" key={reportId}>

                        <div className="citizen-report-main">
                          <div className="citizen-report-title">
                            {incidentType}
                          </div>

                          <div className="citizen-report-meta">
                            {reportDate
                              ? new Date(reportDate).toLocaleString([], {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })
                              : "Date unavailable"}
                          </div>

                          <div className="citizen-report-location">
                            📍 {getIncidentLocation(report)}
                          </div>
                        </div>


                        <div className="citizen-report-status">
                          <span
                            className={`status-badge ${getIncidentSeverityClass(
                              report?.severity,
                            )}`}
                          >
                            {severity}
                          </span>

                          <span className="citizen-report-status-text">
                            {reportStatus}
                          </span>
                        </div>


                        <button
                          type="button"
                          className="citizen-btn citizen-btn-secondary citizen-report-view-btn"
                          onClick={() => setSelectedReport(report)}
                        >
                          View Details
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="citizen-empty-reports">
                  <div className="citizen-empty-icon">📋</div>

                  <div>
                    <div className="citizen-empty-title">No reports yet</div>

                    <div className="citizen-card-muted">
                      You have not submitted any incidents from this account.
                    </div>
                  </div>

                  <button
                    type="button"
                    className="citizen-btn citizen-btn-secondary"
                    onClick={() => navigate("/report-incident")}
                  >
                    Report an Incident
                  </button>
                </div>
              )}


              {reports.length > 5 && (
                <div
                  className="citizen-card-muted"
                  style={{
                    marginTop: "14px",
                    paddingTop: "12px",
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  Showing your 5 most recent reports.
                </div>
              )}
            </section>
          </div>


          {selectedReport && (
            <div
              className="citizen-report-modal-backdrop"
              onClick={() => setSelectedReport(null)}
            >
              <div
                className="citizen-report-modal"
                onClick={(event) => event.stopPropagation()}
              >

                <div className="citizen-report-modal-header">
                  <div>
                    <div className="citizen-eyebrow">INCIDENT REPORT</div>

                    <h2>{formatIncidentType(selectedReport.type)}</h2>
                  </div>

                  <button
                    type="button"
                    className="citizen-modal-close"
                    onClick={() => setSelectedReport(null)}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>


                <div className="citizen-report-detail-status">
                  <span
                    className={`status-badge ${getIncidentSeverityClass(
                      selectedReport.severity,
                    )}`}
                  >
                    {String(selectedReport.severity || "Unknown").toUpperCase()}
                  </span>

                  <span className="citizen-report-detail-status-text">
                    {String(selectedReport.status || "Submitted")
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (char) => char.toUpperCase())}
                  </span>
                </div>


                <div className="citizen-report-detail-section">
                  <div className="citizen-report-detail-label">DESCRIPTION</div>

                  <div className="citizen-report-detail-value">
                    {selectedReport.description || "No description provided."}
                  </div>
                </div>


                <div className="citizen-report-detail-section">
                  <div className="citizen-report-detail-label">LOCATION</div>

                  <div className="citizen-report-detail-value">
                    📍 {getIncidentLocation(selectedReport)}
                  </div>

                  {typeof selectedReport?.location?.latitude === "number" &&
                    typeof selectedReport?.location?.longitude === "number" && (
                      <div className="citizen-report-coordinates">
                        Latitude: {selectedReport.location.latitude}
                        <br />
                        Longitude: {selectedReport.location.longitude}
                      </div>
                    )}
                </div>


                <div className="citizen-report-detail-section">
                  <div className="citizen-report-detail-label">REPORTED</div>

                  <div className="citizen-report-detail-value">
                    {selectedReport?.createdAt
                      ? new Date(selectedReport.createdAt).toLocaleString([], {
                          dateStyle: "full",
                          timeStyle: "short",
                        })
                      : selectedReport?.reportedAt
                      ? new Date(selectedReport.reportedAt).toLocaleString([], {
                          dateStyle: "full",
                          timeStyle: "short",
                        })
                      : "Date unavailable"}
                  </div>
                </div>


                {(selectedReport?.images?.length > 0 ||
                  selectedReport?.videos?.length > 0) && (
                  <div className="citizen-report-detail-section">
                    <div className="citizen-report-detail-label">EVIDENCE</div>

                    <div className="citizen-report-detail-value">
                      Evidence attached to this incident report.
                    </div>
                  </div>
                )}


                <div className="citizen-report-modal-footer">
                  <button
                    type="button"
                    className="citizen-btn citizen-btn-secondary"
                    onClick={() => setSelectedReport(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
export default Dashboard;
