import { memo, Fragment } from "react";
import { Tooltip, Popup } from "react-leaflet";
import SoftZoneDisc from "./SoftZoneDisc";
import { groupDangerZones } from "../../../utils/gis/dangerZoneGroups";
const SEVERITY_STYLE = {
  Critical:    { color: "#B91C1C", radius: 2600, fillOpacity: 0.16, weight: 1.25 },
  High:        { color: "#DC2626", radius: 1900, fillOpacity: 0.12, weight: 1.25 },
  Warning:     { color: "#EA580C", radius: 1300, fillOpacity: 0.10, weight: 1.25 },
  Operational: { color: "#F59E0B", radius: 950,  fillOpacity: 0.08, weight: 1.25 },
};
const DEFAULT_STYLE = { color: "#DC2626", radius: 1300, fillOpacity: 0.10, weight: 1.25 };
function IncidentDangerZoneLayer({ incidents = [], visible = true, onSelect }) {
  if (!visible || !Array.isArray(incidents)) return null;
  return groupDangerZones(incidents).map(({ key, incident, count }) => {
    const lat = incident.location.lat;
    const lng = incident.location.lng;
    const style = SEVERITY_STYLE[incident.severity] || DEFAULT_STYLE;
    const label = count > 1 ? `${count} incidents` : (incident.type || "Hazard");
    const place = incident?.location?.address || "Location not recorded";
    return (
      <Fragment key={`danger-${key}`}>
      <SoftZoneDisc
        center={[lat, lng]}
        radiusMeters={style.radius}
        color={style.color}
        fillOpacity={style.fillOpacity}
        pane="gisRiskPane"
        className={`sentry-danger-zone sentry-risk-radius--${String(incident.severity || 'warning').toLowerCase()}`}
        eventHandlers={onSelect ? { click: () => onSelect(incident) } : undefined}
      >
        <Tooltip direction="top" offset={[0, -4]} opacity={1} className="gis-zone-tip">
          <span style={{ color: style.color, fontWeight: 700 }}>■</span> {label}
          <br />
          <span style={{ opacity: 0.75 }}>{place}</span>
        </Tooltip>
        <Popup>
          <div className="sentry-zone-popup">
            <strong className="sentry-zone-popup__title">{count > 1 ? `${label} here` : `${label} zone`}</strong>
            <div className="sentry-zone-popup__level" style={{ color: style.color }}>
              {incident.severity || "Severity not recorded"}
            </div>
            <div>Location: {place}</div>
            <div>Status: {incident.status || "Unknown"}</div>
            {incident.description ? (
              <div className="sentry-zone-popup__note">{incident.description}</div>
            ) : null}
          </div>
        </Popup>
      </SoftZoneDisc>
      </Fragment>
    );
  });
}
export default memo(IncidentDangerZoneLayer);
