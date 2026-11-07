import { memo, Fragment } from "react";
import { Polyline, CircleMarker, Tooltip, Popup } from "react-leaflet";
import { rankRelocationSites } from "../../../utils/gis/relocationDecision";
function tierColor(candidate) {
  if (candidate.canAbsorb === true) return "#22c55e";                 
  if ((candidate.availableCapacity ?? 0) > 0) return "#eab308";           
  return "#ef4444";                  
}
function RelocationDecisionLayer({ habitation, sites = [], visible = true, maxSites = 3 }) {
  if (!visible || !habitation) return null;
  const coords = habitation.location?.coordinates;
  if (!Array.isArray(coords)) return null;
  const [hlng, hlat] = coords;
  if (!Number.isFinite(hlat) || !Number.isFinite(hlng)) return null;
  const ranked = rankRelocationSites(habitation, sites).slice(0, maxSites);
  if (!ranked.length) return null;
  return (
    <Fragment>
      {ranked.map((candidate, index) => {
        const to = candidate.site?.location?.coordinates;
        if (!Array.isArray(to)) return null;
        const [slng, slat] = to;
        if (!Number.isFinite(slat) || !Number.isFinite(slng)) return null;
        const color = tierColor(candidate);
        const km = Number.isFinite(candidate.distanceKm) ? candidate.distanceKm.toFixed(1) : "—";
        const compass = candidate.bearing?.compass || "—";
        const spare = Number.isFinite(candidate.availableCapacity)
          ? candidate.availableCapacity.toLocaleString()
          : "Not recorded";
        const fit = candidate.canAbsorb === true
          ? "fits everyone"
          : (candidate.availableCapacity ?? 0) > 0 ? "partial capacity" : "full / unknown";
        const need = Number.isFinite(candidate.population)
          ? ` (needs ${candidate.population.toLocaleString()})` : "";
        return (
          <Fragment key={candidate.site._id || index}>
            <Polyline
              positions={[[hlat, hlng], [slat, slng]]}
              pathOptions={{
                color,
                weight: index === 0 ? 2.5 : 1.5,
                opacity: index === 0 ? 0.75 : 0.45,
                dashArray: "6 8",
                className: "sentry-reloc-connector",
              }}
            >
              <Tooltip sticky direction="top">
                <strong>{candidate.site.name}</strong>
                <br />
                {km} km · {compass} · spare {spare} · {fit}
              </Tooltip>
            </Polyline>
            <CircleMarker
              center={[slat, slng]}
              radius={index === 0 ? 8 : 6}
              pathOptions={{ color: "#ffffff", weight: 1.5, fillColor: color, fillOpacity: 0.9 }}
            >
              <Popup>
                <div className="sentry-reloc-popup">
                  <strong>{candidate.site.name}</strong>
                  <div className="sentry-reloc-metric">
                    {km} km {compass} of {habitation.name}
                  </div>
                  <div>Spare capacity: {spare}{need}</div>
                  <div>Fit: {fit}</div>
                  <div className="sentry-reloc-warn">
                    ⚠ SENTRY does not provide safe evacuation routes. This is a straight-line
                    bearing only — roads may be closed, damaged or hazardous. Follow local
                    authority instructions and physical road signs.
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          </Fragment>
        );
      })}
    </Fragment>
  );
}
export default memo(RelocationDecisionLayer);
