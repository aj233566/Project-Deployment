import { memo } from "react";
import { CircleMarker, Popup, Tooltip } from "react-leaflet";
function HabitationLayer({ habitations = [], visible = true, onSelect }) {
  if (!visible) return null;
  return habitations.map((item) => {
    const [lng, lat] = item.location?.coordinates || [];
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return (
      <CircleMarker
        key={item._id}
        center={[lat, lng]}
        pane="gisDecisionPane"
        radius={6}
        pathOptions={{ color: "#38bdf8", fillColor: "#38bdf8", fillOpacity: 0.55, weight: 1 }}
        eventHandlers={onSelect ? { click: () => onSelect(item) } : undefined}
      >
        <Tooltip>{item.name}</Tooltip>
        <Popup>
          <strong>{item.name}</strong>
          <div>Population: {Number.isFinite(item.population) ? item.population.toLocaleString() : "Unavailable"}</div>
          <div>Zone: {item.risk?.level || "Not assessed"}</div>
          <div>Relocation: {item.relocationStatus ? String(item.relocationStatus).replaceAll("_", " ") : "Not recorded"}</div>
        </Popup>
      </CircleMarker>
    );
  });
}
export default memo(HabitationLayer);
