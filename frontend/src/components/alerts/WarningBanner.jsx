import { AlertTriangle, ShieldAlert } from "lucide-react";
function getCurrentUser() {
  try {
    const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (!storedUser) {
      return null;
    }
    return JSON.parse(storedUser);
  } catch {
    return null;
  }
}
function WarningBanner({
  alert,
  onClick,
}) {
  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || "citizen";
  const isAuthority =
    userRole === "authority" ||
    userRole === "admin";
  if (!alert) {
    return null;
  }
  const severity =
    alert.severity ||
    alert.riskLevel ||
    alert.level ||
    "moderate";
  const title =
    alert.title ||
    alert.name ||
    "Early Warning Alert";
  const message =
    alert.message ||
    alert.description ||
    "A potential hazard has been detected.";
  const location =
    alert.location ||
    alert.area ||
    alert.region ||
    "";
  const normalizedSeverity =
    String(severity).toLowerCase();
  const isCritical =
    normalizedSeverity === "critical";
  const isHigh =
    normalizedSeverity === "high";
  const Icon =
    isCritical || isHigh
      ? ShieldAlert
      : AlertTriangle;
  return (
    <div
      className={`warning-banner warning-banner-${normalizedSeverity}`}
      role="alert"
      onClick={onClick}
      style={{
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div className="warning-banner-icon">
        <Icon size={22} />
      </div>

      <div className="warning-banner-content">

        <div className="warning-banner-header">
          <strong>
            {title}
          </strong>

          <span className="warning-banner-severity">
            {String(severity).toUpperCase()}
          </span>
        </div>

        <p>
          {message}
        </p>

        {location && (
          <div className="warning-banner-location">
            {location}
          </div>
        )}

        {isAuthority && (
          <div className="warning-banner-authority">
            Authority response required
          </div>
        )}

      </div>
    </div>
  );
}
export default WarningBanner;