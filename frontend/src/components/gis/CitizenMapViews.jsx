import { useCallback, useEffect, useState } from "react";
import GisCommandCenter from "./GisCommandCenter";
import Map3D from "../commandcenter/Map3D";
import { sentryApi } from "../../services/sentryApi";
import { useSharedMapControls } from "../../hooks/useSharedMapControls";
import { MAP_STYLE_OPTIONS } from "../../config/mapModes";
import { mapProviderLabel } from "../../config/mapProviderLabel";
import { NATIONAL_ID } from "../../utils/commandCenter/scope";
import "../../css/india-command-center.css";
import "../../css/citizen-map-views.css";

const VIEWS = [
  { key: "live", label: "LIVE MAP" },
  {
    key: "3d",
    label: "3D MAP",
    hint: "Tilted map with 3D buildings, terrain and satellite imagery.",
  },
];
const EMPTY = Object.freeze([]);
const FOCUS = Object.freeze({ id: NATIONAL_ID, token: 0 });
const list = (response) =>
  Array.isArray(response?.data) ? response.data : null;

// The citizen map: one view at a time (flat map or 3D map), chosen with the tabs. Only the chosen view is mounted, so the
// other view costs nothing. The 3D map gets the same incidents, shelters and drawn areas as the flat map, refreshed every 20 seconds.
export default function CitizenMapViews({ liveProps, citizenLocation }) {
  const [view, setView] = useState("live");
  const [mapStyle, setMapStyle] = useState(liveProps?.initialMapStyle || "osmdark");
  const [mapToolsTarget, setMapToolsTarget] = useState(null);
  const [emergencyActionsTarget, setEmergencyActionsTarget] = useState(null);
  const [note, setNote] = useState("");
  const [data, setData] = useState({
    incidents: EMPTY,
    sites: EMPTY,
    habitations: EMPTY,
    areas: EMPTY,
  });
  const controls = useSharedMapControls({
    incidents: data.incidents,
    sites: data.sites,
  });
  const needsData = view !== "live";

  const load = useCallback(async (full) => {
    const [incidents, areas, sites, habitations] = await Promise.all([
      sentryApi.getActiveIncidents().catch(() => null),
      sentryApi.getAffectedAreas().catch(() => null),
      full ? sentryApi.getRelocationSites().catch(() => null) : null,
      full
        ? sentryApi.getHabitations({ active: true }).catch(() => null)
        : null,
    ]);
    setData((current) => ({
      incidents: list(incidents) || current.incidents,
      areas: list(areas) || current.areas,
      sites: list(sites) || current.sites,
      habitations: list(habitations) || current.habitations,
    }));
  }, []);

  useEffect(() => {
    if (!needsData) return undefined;
    const first = window.setTimeout(() => {
      void load(true);
    }, 0);
    const timer = window.setInterval(() => {
      if (!document.hidden) void load(false);
    }, 20000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [needsData, load]);

  const handleFail = useCallback(() => {
    setNote("3D is not available in this browser, so the flat map is shown.");
    setView("live");
  }, []);

  // Fly the 3D map to the citizen once it is ready.
  const handleMapInstance = useCallback(
    (map) => {
      if (!map || !citizenLocation) return;
      window.setTimeout(() => {
        try {
          map.flyTo({
            center: [citizenLocation.lng, citizenLocation.lat],
            zoom: 10,
            pitch: 50,
            duration: 1600,
          });
        } catch {
          /* the map was closed */
        }
      }, 900);
    },
    [citizenLocation],
  );

  const current = VIEWS.find((item) => item.key === view) || VIEWS[0];
  return (
    <div className="citizen-map-views">
      <div className="citizen-map-display gis-role-citizen">
        <span className="citizen-map-display-title">MAP DISPLAY</span>
        <div className="citizen-map-style-controls">
          <span className="citizen-map-provider">{mapProviderLabel(mapStyle)}</span>
          <div className="citizen-map-tabs" role="group" aria-label="Choose map display">
            {VIEWS.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={view === item.key}
                className={`citizen-map-tab${view === item.key ? " active" : ""}`}
                onClick={() => {
                  setNote("");
                  setView(item.key);
                }}
              >
                {item.label}
              </button>
            ))}
            {MAP_STYLE_OPTIONS.map((style) => (
              <button
                key={style.key}
                type="button"
                className={`citizen-map-tab citizen-map-style-tab${mapStyle === style.key ? " active" : ""}`}
                aria-pressed={mapStyle === style.key}
                onClick={() => setMapStyle(style.key)}
                title={`${style.label} · ${style.provider}`}
              >
                {style.shortLabel}
              </button>
            ))}
          </div>
        </div>
        <div className="citizen-map-layers-target" ref={setMapToolsTarget} />
        <div className="citizen-map-emergency-target" ref={setEmergencyActionsTarget} />
        <span className="citizen-map-hint">{note || current.hint}</span>
      </div>
      {view === "live" ? (
        <GisCommandCenter {...liveProps} basemapStyle={mapStyle} onBasemapChange={setMapStyle} hideCitizenMapStyles citizenToolsTarget={mapToolsTarget} emergencyActionsTarget={emergencyActionsTarget} />
      ) : (
        <div
          className="citizen-map-stage icc-map-stage"
          aria-label={current.label}
        >
          <Map3D
            controls={controls}
            incidents={controls.visibleIncidents}
            allIncidents={data.incidents}
            habitations={data.habitations}
            sites={data.sites}
            areas={data.areas}
            canDraw={false}
            heatPlaces={EMPTY}
            hazardEvents={EMPTY}
            quakes={EMPTY}
            stateIndex={null}
            stateRows={null}
            scopeId={NATIONAL_ID}
            focus={FOCUS}
            onMapInstance={handleMapInstance}
            onFail={handleFail}
          />
        </div>
      )}
    </div>
  );
}
