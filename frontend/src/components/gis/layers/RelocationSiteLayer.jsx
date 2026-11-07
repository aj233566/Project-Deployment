import { memo } from "react";
import { CircleMarker, Popup, Tooltip } from "react-leaflet";
function RelocationSiteLayer({ sites = [], visible = true, onSelect }) {
  if (!visible) return null;
  return sites.map((site) => {
    const [lng, lat] = site.location?.coordinates || [];
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const color = {
      OPEN: "#3d8b63",
      RESTRICTED: "#c9a227",
      BLOCKED: "#d64545",
      UNKNOWN: "#87939a",
    }[site.roadAccess] || "#87939a";
    const capacity = site.capacity || {};
    return (
      <CircleMarker
        key={site._id}
        center={[lat, lng]}
        pane="gisDecisionPane"
        radius={7}
        pathOptions={{ color, fillColor: color, fillOpacity: 0.7, weight: 2 }}
        eventHandlers={onSelect ? { click: () => onSelect(site) } : undefined}
      >
        <Tooltip>{site.name} · relocation site</Tooltip>
        <Popup>
          <strong>{site.name}</strong>
          <div>Status: {site.status || "Unavailable"}</div>
          <div>Capacity: {Number.isFinite(capacity.occupied) ? capacity.occupied.toLocaleString() : "Not recorded"} occupied · {Number.isFinite(capacity.reserved) ? capacity.reserved.toLocaleString() : "Not recorded"} reserved</div>
          <div>Available: {Number.isFinite(capacity.available) ? capacity.available.toLocaleString() : "Not recorded"} / {Number.isFinite(capacity.total) ? capacity.total.toLocaleString() : "Not recorded"} total</div>
          <div>Road access: {site.roadAccess || "UNKNOWN"}</div>
          <div>Suitability: {Number.isFinite(site.suitability) ? `${site.suitability}/100` : "Not assessed"}</div>
          <div>Hazard exposure: {site.hazardExposure?.length ? site.hazardExposure.join(", ") : "Not recorded"}</div>
          <div>Facilities: {site.facilities?.length ? site.facilities.join(", ") : "Not recorded"}</div>
          {onSelect ? (
            <button type="button" className="btn btn-sm btn-outline-primary mt-2" onClick={() => onSelect(site)}>
              Review as destination
            </button>
          ) : null}
        </Popup>
      </CircleMarker>
    );
  });
}
export default memo(RelocationSiteLayer);
