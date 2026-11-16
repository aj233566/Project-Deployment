export function isAlertExpired(alert, now = Date.now()) {
  if (!alert?.expiresAt) return false;
  const expiry = new Date(alert.expiresAt).getTime();
  return Number.isFinite(expiry) && expiry <= now;
}

export function isAlertActive(alert, now = Date.now()) {
  const status = String(alert?.status || "").toLowerCase();
  return status === "active" && !isAlertExpired(alert, now);
}

export function getAlertDisplayStatus(alert, now = Date.now()) {
  if (isAlertExpired(alert, now)) return "Expired";
  const status = String(alert?.status || "Unknown");
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}
