import { memo, Fragment } from "react";
import L from "leaflet";
import { Marker, Popup, Tooltip } from "react-leaflet";
import SoftZoneDisc from "./SoftZoneDisc";
import { zoneSymbologyFor, zoneAreaStyle } from "../../../config/hazardSymbology";
import { zonePinMarkup } from "../../../utils/commandCenter/fxMarkup";
const iconCache = new Map();
function zoneIcon(level) {
  const sym = zoneSymbologyFor(level);
  if (!sym) return null;
  if (iconCache.has(sym.level)) return iconCache.get(sym.level);
  // A glossy pin in the zone colour with a sign for the level (see fxMarkup.zonePinMarkup). The tip of the pin sits on the place.
  const icon = L.divIcon({
    className: `sentry-zone-marker sentry-zone-marker--${sym.level.toLowerCase()}`,
    html: `<div class="zone-pin">${zonePinMarkup(sym.color, sym.level)}</div>`,
    iconSize: [36, 45],
    iconAnchor: [18, 38],
    popupAnchor: [0, -38],
  });
  iconCache.set(sym.level, icon);
  return icon;
}
function RedZoneLayer({ habitations = [], visible = true, onSelect }) {
  if (!visible) return null;
  return habitations.map((item) => {
    const [lng, lat] = item.location?.coordinates || [];
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const sym = zoneSymbologyFor(item.risk?.level);
    if (!sym) return null;                                                                       
    const icon = zoneIcon(sym.level);
    const area = zoneAreaStyle(sym.level);
    const population = Number.isFinite(item.population) ? item.population.toLocaleString() : "Unavailable";
    const score = Number.isFinite(item.risk?.score) ? `${item.risk.score}/100` : "Unavailable";
    const relocation = item.relocationStatus || item.relocation?.status;
    return (
      <Fragment key={item._id}>
        {area ? (
          <>
            <SoftZoneDisc
              center={[lat, lng]}
              radiusMeters={area.radiusMeters}
              color={area.color}
              fillOpacity={area.fillOpacity}
              pulse={sym.pulse}
              className={`sentry-risk-radius--${sym.level.toLowerCase()}`}
              eventHandlers={onSelect ? { click: () => onSelect(item) } : undefined}
            />
          </>
        ) : null}
      <Marker
        position={[lat, lng]}
        pane="gisDecisionPane"
        icon={icon}
        keyboard
        title={`${item.name} — ${sym.label} zone`}
        eventHandlers={onSelect ? { click: () => onSelect(item) } : undefined}
      >
        <Tooltip>{item.name} · {sym.label}</Tooltip>
        <Popup>
          <div className="sentry-zone-popup">
            <strong className="sentry-zone-popup__title">{item.name}</strong>
            <div className="sentry-zone-popup__level" style={{ color: sym.color }}>
              {sym.label} zone
            </div>
            <div>Hazard: {item.primaryHazard || "Not recorded"}</div>
            <div>Assessed index: {score}</div>
            <div>Population: {population}</div>
            {relocation ? <div>Relocation: {relocation}</div> : null}
            <div className="sentry-zone-popup__note">
              Stored assessment — verify on the ground before acting.
            </div>
          </div>
        </Popup>
      </Marker>
      </Fragment>
    );
  });
}
export default memo(RedZoneLayer);
