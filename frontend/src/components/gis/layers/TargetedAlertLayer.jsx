import { Circle, CircleMarker, Popup, Tooltip } from "react-leaflet";
const COLORS = {
  CRITICAL: "#ef4444",
  HIGH: "#f97316",
  MODERATE: "#eab308",
  LOW: "#22c55e",
};
function TargetedAlertLayer({ alerts = [], visible = true, onSelect }) {
  if (!visible) return null;
  const now = Date.now();
  return alerts.map((alert) => {
    if (alert.status !== "Active" && alert.status !== "ACTIVE") return null;
    if (alert.expiresAt && new Date(alert.expiresAt).getTime() <= now) return null;
    const [longitude, latitude] = alert.targetLocation?.coordinates || [];
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    const color = COLORS[alert.riskLevel] || "#64748b";
    const position = [latitude, longitude];
    const details = (
      <>
        <strong>{alert.location?.name || "Geo-targeted alert"}</strong>
        <div>{alert.hazardType || alert.disasterType} · {alert.riskLevel || "UNKNOWN"}</div>
        <div>Target: {alert.targetType || "Not recorded"}</div>
        <div>Registered habitations: {Array.isArray(alert.affectedHabitations) ? alert.affectedHabitations.length : "Not recorded"}</div>
        {alert.action ? <p>{alert.action}</p> : null}
        {alert.expiresAt ? <small>Expires {new Date(alert.expiresAt).toLocaleString()}</small> : null}
      </>
    );
    const eventHandlers = onSelect ? { click: () => onSelect(alert) } : undefined;
    if (alert.targetType === "zone" && Array.isArray(alert.affectedHabitations)) {
      const targets = alert.affectedHabitations.filter((habitation) =>
        Array.isArray(habitation?.location?.coordinates)
        && Number.isFinite(habitation.location.coordinates[0])
        && Number.isFinite(habitation.location.coordinates[1])
      );
      return targets.map((habitation) => (
        <CircleMarker
          key={`${alert._id}-${habitation._id}`}
          center={[habitation.location.coordinates[1], habitation.location.coordinates[0]]}
          pane="gisAlertPane"
          radius={8}
          pathOptions={{ color, fillColor: color, fillOpacity: 0.75, weight: 2 }}
          eventHandlers={eventHandlers}
        >
          <Tooltip>{alert.hazardType || alert.disasterType} · {alert.riskLevel || "UNKNOWN"} · {habitation.name}</Tooltip>
          <Popup>
            {details}
            <div>Target habitation: {habitation.name}</div>
          </Popup>
        </CircleMarker>
      ));
    }
    if (alert.targetType === "radius" && Number.isFinite(alert.radiusKm) && alert.radiusKm > 0) {
      return (
        <Circle
          key={alert._id}
          center={position}
          radius={alert.radiusKm * 1000}
          pane="gisAlertPane"
          pathOptions={{ color, fillColor: color, fillOpacity: 0.12 }}
          eventHandlers={eventHandlers}
        >
          <Tooltip>{alert.hazardType || alert.disasterType} · {alert.riskLevel || "UNKNOWN"}</Tooltip>
          <Popup>{details}</Popup>
        </Circle>
      );
    }
    return (
      <CircleMarker
        key={alert._id}
        center={position}
        pane="gisAlertPane"
        radius={8}
        pathOptions={{ color, fillColor: color, fillOpacity: 0.75, weight: 2 }}
        eventHandlers={onSelect ? { click: () => onSelect(alert) } : undefined}
      >
        <Tooltip>{alert.hazardType || alert.disasterType} · {alert.riskLevel || "UNKNOWN"}</Tooltip>
        <Popup>
          {details}
        </Popup>
      </CircleMarker>
    );
  });
}
export default TargetedAlertLayer;
