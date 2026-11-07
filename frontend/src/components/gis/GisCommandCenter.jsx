import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useTransition,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import MapView from "./MapView";
import CommandCenterRegionFocus from "./CommandCenterRegionFocus";
import { sentryApi } from "../../services/sentryApi";
import DisasterZonesLayer from "./layers/DisasterZonesLayer";
import IncidentLayer from "./layers/IncidentLayer";
import AffectedAreaLayer from "./layers/AffectedAreaLayer";
import IncidentVideoFx from "./layers/IncidentVideoFx";
import NearbyPeopleLayer from "./layers/NearbyPeopleLayer";
import NaturalEventsLayer from "./layers/NaturalEventsLayer";
import IncidentDangerZoneLayer from "./layers/IncidentDangerZoneLayer";
import FacilityLayer from "./layers/FacilityLayer";
import IncidentResponseLayer from "./layers/IncidentResponseLayer";
import ResourceLayer from "./layers/ResourceLayer";
import RoadStatusLayer from "./layers/RoadStatusLayer";
import VillageLayer from "./layers/VillageLayer";
import RedZoneLayer from "./layers/RedZoneLayer";
import HabitationLayer from "./layers/HabitationLayer";
import RelocationSiteLayer from "./layers/RelocationSiteLayer";
import RelocationDecisionLayer from "./layers/RelocationDecisionLayer";
import TargetedAlertLayer from "./layers/TargetedAlertLayer";
import RiskZoneLayer from "./layers/RiskZoneLayer";
import RiskHeatmapLayer from "./layers/RiskHeatmapLayer";
import RouteLayer from "./layers/RouteLayer";
import MapControls from "./MapControls";
import MapLegend from "./MapLegend";
import MapOverviewInset from "./MapOverviewInset";
import MapResetController from "./MapResetController";
import MapCoordinateTracker from "./MapCoordinateTracker";
import UserPointsLayer from "./UserPointsLayer";
import LiveQuakeLayer from "./layers/LiveQuakeLayer";
import LiveHospitalLayer from "./layers/LiveHospitalLayer";
import GibsFireLayer from "./layers/GibsFireLayer";
import BhuvanHazardLayer from "./layers/BhuvanHazardLayer";
import CitizenPanel from "./CitizenPanel";
import CitizenMapTools from "./CitizenMapTools";
import { applyLayerPreset } from "../../utils/gis/layerPresets";
import MyLocationMarker from "./MyLocationMarker";
import { fetchIndiaEarthquakes, fetchHospitalsInBounds } from "../../services/gis/liveFeeds";
import { deriveRoadStatusFromIncidents } from "../../utils/gis/roadStatusFromIncidents";
import { formatLatLon } from "../../utils/gis/formatCoords";
import {
  selectCitizenFocus,
} from "../../utils/gis/citizenView";
const USER_POINTS_STORAGE_KEY = "cascade-net.userPoints.v1";
const distanceKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
import TacticalTelemetryHUD from "./TacticalTelemetryHUD";
import { normalizeSimulatorDelta } from "../../services/gis/simulatorAdapter";
import { routingService } from "../../services/gis/routingService";
import { loadGisOperationalData } from "../../services/gis/operationalData";
import { calculateRiskHeatmapNodes } from "../../utils/gis/riskHeatmapCalculator";
import { normalizeBackendIncidents } from "../../utils/gis/incidentNormalizer";
import {
  DEMO_INCIDENTS,
  DEMO_VILLAGES,
  DEMO_HOSPITALS,
  DEMO_SHELTERS,
  DEMO_RESOURCES,
  DEMO_ROADS,
  DEMO_RISK_ZONES,
  DEMO_ROUTES,
  DEMO_SIMULATION_SCENARIOS,
} from "../../data/gis/demoGisData";
import "bootstrap/dist/css/bootstrap.min.css";
import "../../css/gis.css";
import { MAP_STYLE_KEYS } from '../../config/mapModes';
export default function GisCommandCenter({
  liveIncidents = null,
  initialHudMode = "tactical",
  initialMapStyle = "osmdark",
  onSelectFeature = null,
  onRoadsChange = null,
  role = "authority",
  citizenLocation = null,
  focusRegion = "india",
  focusToken = 0,
  embedded = false,
  basemapStyle = null,
  onBasemapChange = null,
  hideCitizenMapStyles = false,
  citizenToolsTarget = null,
  emergencyActionsTarget = null,
  incidentIdFilter = null,
  overlay = null,
  onMapInstance = null,
  areas: areasProp = null,
  people = null,
  naturalEvents = null,
  focusPresetId = undefined,
  onFocusPresetChange = null,
  controlsTarget = null,
  controlsActive = true,
}) {
  const navigate = useNavigate();
  // Drawn areas (affected areas and safe zones): the command center passes its own copy; any other page loads them here.
  const [affectedAreas, setAffectedAreas] = useState([]);
  useEffect(() => {
    if (Array.isArray(areasProp)) return undefined;
    let alive = true;
    const loadAreas = async () => {
      try {
        const response = await sentryApi.getAffectedAreas();
        if (alive && Array.isArray(response?.data)) setAffectedAreas(response.data);
      } catch { /* keep the last good list; the next poll retries */ }
    };
    loadAreas();
    const timer = setInterval(loadAreas, 30 * 1000);
    return () => { alive = false; clearInterval(timer); };
  }, [areasProp]);
  const isCitizen = role === "citizen";
  const demoMode = import.meta.env.VITE_DEMO_MODE === "true";
  const [arrivalMotionEnabled, setArrivalMotionEnabled] = useState(() => {
    try {
      return window.localStorage.getItem("sentry:arrival-motion-enabled") !== "false";
    } catch {
      return true;
    }
  });
  const handleToggleArrivalMotion = useCallback((enabled) => {
    setArrivalMotionEnabled(enabled);
    if (!enabled) window.dispatchEvent(new Event("gis:clear-incident-arrivals"));
    try {
      window.localStorage.setItem("sentry:arrival-motion-enabled", String(enabled));
    } catch {
      // Keep the in-session toggle usable when browser storage is blocked.
    }
  }, []);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const lastLatestIncidentId = useRef(null);
  const [resetTrigger, setResetTrigger] = useState(0);
  const simScenario = "BASELINE";
  const [hudMode, setHudMode] = useState(initialHudMode);
  const [mapStyleState, setMapStyleState] = useState(initialMapStyle);
  const mapStyle = basemapStyle || mapStyleState;
  const mapStyleRef = useRef(mapStyle);
  const onBasemapChangeRef = useRef(onBasemapChange);
  useEffect(() => {
    onBasemapChangeRef.current = onBasemapChange;
  }, [onBasemapChange]);
  useEffect(() => {
    mapStyleRef.current = mapStyle;
  }, [mapStyle]);
  const [mapInstance, setMapInstance] = useState(null);
  const handleMapReady = useCallback((map) => {
    setMapInstance(map);
    if (onMapInstance) onMapInstance(map);
  }, [onMapInstance]);
  const [localPresetId, setLocalPresetId] = useState(null);
  const activePresetId = focusPresetId === undefined ? localPresetId : focusPresetId;
  const [backendIncidents, setBackendIncidents] = useState(null);
  const liveIncidentsRef = useRef(liveIncidents);
  useEffect(() => {
    liveIncidentsRef.current = liveIncidents;
  }, [liveIncidents]);
  const [habitations, setHabitations] = useState([]);
  const [redZones, setRedZones] = useState([]);
  const [relocationSites, setRelocationSites] = useState([]);
  const [selectedRelocationSiteId, setSelectedRelocationSiteId] = useState("");
  const [decisionHabitation, setDecisionHabitation] = useState(null);
  const [targetedAlerts, setTargetedAlerts] = useState([]);
  const [targetedAlertsError, setTargetedAlertsError] = useState("");
  const [targetedAlertsLoading, setTargetedAlertsLoading] = useState(true);
  const [domainError, setDomainError] = useState("");
  const [domainLoading, setDomainLoading] = useState(true);
  const [liveWeather, setLiveWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");
  const [userLocation, setUserLocation] = useState(citizenLocation);
  const [routes, setRoutes] = useState(demoMode ? DEMO_ROUTES : []);
  const [manualRoute, setManualRoute] = useState(null);
  const [routeRequestStatus, setRouteRequestStatus] = useState("idle");
  const [routeRequestError, setRouteRequestError] = useState("");
  const [viewInfo, setViewInfo] = useState(null);
  const handleViewChange = useCallback((lat, lng, zoom) => {
    setViewInfo((current) => (
      current?.lat === lat && current?.lng === lng && current?.zoom === zoom
        ? current
        : { lat, lng, zoom }
    ));
  }, []);
  const centerReadout = viewInfo
    ? formatLatLon(viewInfo.lat, viewInfo.lng, 5)
    : "—";
  const centerMapsHref = viewInfo
    ? `https://www.openstreetmap.org/?mlat=${viewInfo.lat.toFixed(
        6,
      )}&mlon=${viewInfo.lng.toFixed(6)}#map=15/${viewInfo.lat.toFixed(
        6,
      )}/${viewInfo.lng.toFixed(6)}`
    : null;
  const [userPoints, setUserPoints] = useState(() => {
    try {
      const raw = localStorage.getItem(USER_POINTS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [addPointMode, setAddPointMode] = useState(false);
  const [justAddedPointId, setJustAddedPointId] = useState(null);
  useEffect(() => {
    try {
      localStorage.setItem(USER_POINTS_STORAGE_KEY, JSON.stringify(userPoints));
    } catch { void 0; }
  }, [userPoints]);
  const citizenLatitude = citizenLocation?.lat;
  const citizenLongitude = citizenLocation?.lng;
  useEffect(() => {
    if (
      typeof citizenLatitude === "number" &&
      typeof citizenLongitude === "number"
    ) {
      const loc = {
        lat: citizenLatitude,
        lng: citizenLongitude,
      };
      const timer = setTimeout(() => {
        setUserLocation(loc);
        if (mapInstance) mapInstance.setView([loc.lat, loc.lng], 14, { animate: false });
      }, 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [citizenLatitude, citizenLongitude, mapInstance]);
  const handleAddPoint = useCallback((lat, lng) => {
    const id = `up-${Date.now()}`;
    setUserPoints((prev) => [...prev, { id, lat, lng, name: "", notes: "" }]);
    setJustAddedPointId(id);
    setAddPointMode(false);
  }, []);
  const handleUpdatePoint = useCallback((id, data) => {
    setUserPoints((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...data } : p)),
    );
  }, []);
  const handleDeletePoint = useCallback((id) => {
    setUserPoints((prev) => prev.filter((p) => p.id !== id));
  }, []);
  const toggleAddPointMode = useCallback(() => setAddPointMode((m) => !m), []);
  useEffect(() => {
    let cancelled = false;
    const loadIncidents = async () => {
      try {
        setDomainLoading(true);
        const currentLiveIncidents = liveIncidentsRef.current;
        const operationalData = await loadGisOperationalData(sentryApi, currentLiveIncidents);
        if (cancelled) return;
        if (!Array.isArray(liveIncidentsRef.current)) {
          setBackendIncidents(operationalData.incidents);
        }
        setHabitations(operationalData.habitations);
        setRedZones(operationalData.redZones);
        setRelocationSites(operationalData.relocationSites);
        setDomainError("");
      } catch (error) {
        if (!cancelled) {
          console.error("[GisCommandCenter] Failed to load live operational data:", error);
          setBackendIncidents([]);
          setHabitations([]);
          setRedZones([]);
          setRelocationSites([]);
          setDomainError(error.message || "Live map data is unavailable.");
        }
      } finally {
        if (!cancelled) setDomainLoading(false);
      }
    };
    loadIncidents();
    // A citizen watching the map gets new reports within seconds, not a minute.
    const interval = setInterval(loadIncidents, (isCitizen ? 20 : 60) * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isCitizen]);
  useEffect(() => {
    let cancelled = false;
    const loadAlerts = async () => {
      setTargetedAlertsLoading(true);
      try {
        const response = await sentryApi.getAlerts();
        if (!cancelled) {
          setTargetedAlerts(response.data);
          setTargetedAlertsError("");
        }
      } catch (error) {
        if (!cancelled) {
          setTargetedAlerts([]);
          setTargetedAlertsError(error.message || "Geo-targeted alerts are unavailable.");
        }
      } finally {
        if (!cancelled) setTargetedAlertsLoading(false);
      }
    };
    loadAlerts();
    const interval = setInterval(loadAlerts, 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);
  useEffect(() => {
    if (!viewInfo || demoMode) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setWeatherLoading(true);
      setLiveWeather(null);
      setWeatherError("");
      try {
        const result = await sentryApi.getCurrentWeather(viewInfo.lat, viewInfo.lng);
        if (!cancelled) {
          setLiveWeather(result.data);
          setWeatherError("");
        }
      } catch (error) {
        if (!cancelled) {
          setLiveWeather(null);
          setWeatherError(error.message || "Weather data is unavailable.");
        }
      } finally {
        if (!cancelled) setWeatherLoading(false);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [demoMode, viewInfo]);
  const [liveQuakes, setLiveQuakes] = useState([]);
  useEffect(() => {
    if (isCitizen) return undefined;
    let alive = true;
    const load = async () => {
      const q = await fetchIndiaEarthquakes();
      if (alive) setLiveQuakes(q);
    };
    const first = setTimeout(load, 2500);
    const id = setInterval(load, 120000);
    return () => {
      alive = false;
      clearTimeout(first);
      clearInterval(id);
    };
  }, [isCitizen]);
  const [focusPoint, setFocusPoint] = useState({ id: null, nonce: 0 });
  const handleFocusPoint = useCallback((id) => {
    setJustAddedPointId(null);
    setFocusPoint((prev) => ({ id, nonce: prev.nonce + 1 }));
  }, []);
  const incidentSource = Array.isArray(liveIncidents)
    ? liveIncidents
    : backendIncidents;
  const incidents = useMemo(() => {
    if (Array.isArray(incidentSource)) {
      return normalizeBackendIncidents(incidentSource);
    }
    return demoMode ? DEMO_INCIDENTS : [];
  }, [demoMode, incidentSource]);
  const isLiveApiData = Array.isArray(incidentSource);
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
        return;
      if (e.key === "h" || e.key === "H") {
        setHudMode((prev) => {
          if (prev === "tactical") return "operator";
          if (prev === "operator") return "minimal";
          return "tactical";
        });
      } else if (e.key === "s" || e.key === "S") {
        const idx = MAP_STYLE_KEYS.indexOf(mapStyleRef.current);
        const next = MAP_STYLE_KEYS[(idx + 1) % MAP_STYLE_KEYS.length];
        setMapStyleState(next);
        if (onBasemapChangeRef.current) onBasemapChangeRef.current(next);
      } else if (e.key === "r" || e.key === "R") {
        setResetTrigger((prev) => prev + 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  const baselineState = useMemo(
    () => ({
      roads: demoMode ? DEMO_ROADS : [],
      villages: demoMode ? DEMO_VILLAGES : [],
      hospitals: demoMode ? DEMO_HOSPITALS : [],
      shelters: demoMode ? DEMO_SHELTERS : [],
      resources: demoMode ? DEMO_RESOURCES : [],
      riskZones: demoMode ? DEMO_RISK_ZONES : [],
      routes: demoMode ? DEMO_ROUTES : [],
    }),
    [demoMode],
  );
  const activeMapState = useMemo(() => {
    if (demoMode && simScenario !== "BASELINE" && DEMO_SIMULATION_SCENARIOS[simScenario]) {
      return normalizeSimulatorDelta(
        DEMO_SIMULATION_SCENARIOS[simScenario],
        baselineState,
      );
    }
    return baselineState;
  }, [demoMode, simScenario, baselineState]);
  useEffect(() => {
    let isMounted = true;
    async function evaluateRoutes() {
      try {
        const scenarioConfig = DEMO_SIMULATION_SCENARIOS[simScenario];
        const scenarioRoutes =
          demoMode
            ? (scenarioConfig && scenarioConfig.routes) ||
              (scenarioConfig &&
                scenarioConfig.deltas &&
                scenarioConfig.deltas.routes) ||
              DEMO_ROUTES
            : [];
        const routeIncidents = isCitizen
          ? incidents.filter(
              (incident) =>
                !userLocation ||
                (typeof incident?.location?.lat === "number" &&
                  typeof incident?.location?.lng === "number" &&
                  distanceKm(
                    userLocation.lat,
                    userLocation.lng,
                    incident.location.lat,
                    incident.location.lng,
                  ) <= 100),
            )
          : incidents;
        const evaluated = demoMode
          ? await routingService.getRoutes({
              roads: activeMapState.roads,
              riskZones: activeMapState.riskZones,
              incidents: routeIncidents,
              candidateRoutes: scenarioRoutes,
            })
          : [];
        if (isMounted) {
          setRoutes((prevRoutes) => {
            const prevIds = prevRoutes
              .map((r) => `${r.id}:${r.status}:${r.travelTimeEtaMin || 0}`)
              .join("|");
            const newIds = evaluated
              .map((r) => `${r.id}:${r.status}:${r.travelTimeEtaMin || 0}`)
              .join("|");
            if (prevIds === newIds) return prevRoutes;
            return evaluated;
          });
        }
      } catch (err) {
        console.warn(
          "[GisCommandCenter] Emergency routing calculation failed:",
          err,
        );
      }
    }
    evaluateRoutes();
    return () => {
      isMounted = false;
    };
  }, [demoMode, simScenario, activeMapState, incidents, isCitizen, userLocation]);
  useEffect(() => {
    if (!Array.isArray(incidents) || incidents.length === 0) {
      return;
    }
    const latestIncident = incidents[0];
    if (!latestIncident?.id) {
      return;
    }
    let timer = null;
    if (lastLatestIncidentId.current === null) {
      lastLatestIncidentId.current = latestIncident.id;
      if (isLiveApiData) {
        timer = setTimeout(() => setSelectedFeature(latestIncident), 0);
      }
    } else if (isLiveApiData && latestIncident.id !== lastLatestIncidentId.current) {
      lastLatestIncidentId.current = latestIncident.id;
      timer = setTimeout(() => setSelectedFeature(latestIncident), 0);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [incidents, isLiveApiData]);
  const [layerVisibility, setLayerVisibility] = useState(() =>
    isCitizen
      ? {
          incidents: true,
          villages: demoMode,
          hospitals: demoMode,
          shelters: demoMode,
          resources: false,
          roads: true,
          riskZones: demoMode,
          redZones: true,
          areas: true,
          alerts: true,
          habitations: true,
          relocationSites: true,
          heatmap: false,
          routes: true,
          quakes: false,
          zones: false,
          liveMed: false,
          fires: false,
          bhuvan: false,
          ofm: false,
        }
      : {
          incidents: true,
          villages: demoMode,
          hospitals: demoMode,
          shelters: demoMode,
          resources: demoMode,
          roads: true,
          riskZones: demoMode,
          redZones: true,
          areas: true,
          alerts: true,
          habitations: true,
          relocationSites: true,
          heatmap: demoMode,
          routes: demoMode,
          quakes: true,
          liveMed: false,
          fires: false,
          bhuvan: false,
          ofm: false,
        },
  );
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [, startTransition] = useTransition();
  const handleToggleLayer = useCallback((layerKey) => {
    setLocalPresetId(null);
    onFocusPresetChange?.(null);
    startTransition(() => {
      setLayerVisibility((prev) => ({
        ...prev,
        [layerKey]: !prev[layerKey],
      }));
    });
  }, [onFocusPresetChange]);
  useEffect(() => {
    if (focusPresetId === undefined || !focusPresetId) return;
    startTransition(() => {
      setLayerVisibility((previous) => ({ ...previous, ...applyLayerPreset(previous, focusPresetId) }));
    });
  }, [focusPresetId]);
  const handleSetSeverityFilter = useCallback((filter) => {
    startTransition(() => {
      setSeverityFilter(filter);
    });
  }, []);
  const handleSetMapStyle = useCallback((style) => {
    setMapStyleState(style);
    if (onBasemapChange) onBasemapChange(style);
  }, [onBasemapChange]);
  const handleResetView = useCallback(() => {
    setResetTrigger((prev) => prev + 1);
    setDecisionHabitation(null);
  }, []);
  const handleCitizenFocusLocation = useCallback(
    (lat, lng, zoom = 14) => {
      if (mapInstance && typeof lat === "number" && typeof lng === "number") {
        mapInstance.setView([lat, lng], zoom, { animate: true });
      }
    },
    [mapInstance],
  );
  const selectedRelocationSite = useMemo(
    () => relocationSites.find((site) => site._id === selectedRelocationSiteId) || null,
    [relocationSites, selectedRelocationSiteId],
  );
  const handleSelectRelocationSite = useCallback((site) => {
    setSelectedRelocationSiteId(site?._id || "");
    const [lng, lat] = site?.location?.coordinates || [];
    if (mapInstance && Number.isFinite(lat) && Number.isFinite(lng)) {
      mapInstance.setView([lat, lng], 14, { animate: true });
    }
  }, [mapInstance]);
  const handleLocateMe = useCallback(
    () =>
      new Promise((resolve) => {
        if (!("geolocation" in navigator)) {
          resolve({ ok: false, reason: "unsupported" });
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            };
            setUserLocation(loc);
            if (mapInstance) {
              mapInstance.setView([loc.lat, loc.lng], 14, { animate: true });
            }
            resolve({
              ok: true,
              mode: "local",
              loc,
            });
          },
          (err) =>
            resolve({
              ok: false,
              reason: err.message || "denied",
            }),
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000,
          },
        );
      }),
    [mapInstance],
  );
  const handleCitizenReport = useCallback(
    async ({ type, hazardSubtype, description } = {}) => {
      navigate("/report-incident", {
        state: {
          location: userLocation
            ? { latitude: userLocation.lat, longitude: userLocation.lng }
            : null,
          incidentType: type || "",
          hazardSubtype: hazardSubtype || "",
          description: description || "",
        },
      });
      return { ok: true, navigating: true };
    },
    [navigate, userLocation],
  );
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (incidentIdFilter && !incidentIdFilter.has(inc.id)) return false;
      if (severityFilter === "CRITICAL") return inc.severity === "Critical";
      if (severityFilter === "HIGH_PLUS")
        return inc.severity === "Critical" || inc.severity === "High";
      return true;
    });
  }, [incidents, severityFilter, incidentIdFilter]);
  const citizenIncidents = useMemo(() => {
    const active = filteredIncidents.filter(
      (incident) => String(incident.status || "").toLowerCase() !== "resolved",
    );
    if (!userLocation) {
      return active;
    }
    return active.filter((incident) => {
      const lat = incident?.location?.lat;
      const lng = incident?.location?.lng;
      if (typeof lat !== "number" || typeof lng !== "number") {
        return false;
      }
      return distanceKm(userLocation.lat, userLocation.lng, lat, lng) <= 100;
    });
  }, [filteredIncidents, userLocation]);
  const citizenRiskZones = useMemo(
    () =>
      (activeMapState.riskZones || []).filter(
        (z) => z.riskLevel === "Critical" || z.riskLevel === "High",
      ),
    [activeMapState.riskZones],
  );
  const citizenRoads = useMemo(
    () =>
      (activeMapState.roads || []).filter((r) => {
        const s = String(r.status || "").toLowerCase();
        return s === "blocked" || s === "restricted" || s === "one-lane";
      }),
    [activeMapState.roads],
  );
  const roadStatusRows = useMemo(() => {
    const mapRoads = activeMapState.roads || [];
    if (mapRoads.length) return mapRoads;
    return deriveRoadStatusFromIncidents(isCitizen ? citizenIncidents : incidents);
  }, [activeMapState.roads, isCitizen, citizenIncidents, incidents]);
  useEffect(() => {
    if (typeof onRoadsChange === "function") onRoadsChange(roadStatusRows);
  }, [roadStatusRows, onRoadsChange]);
  const citizenVillages = useMemo(
    () =>
      (activeMapState.villages || []).filter((v) => {
        const lvl = String(v.riskLevel || "").toLowerCase();
        const conn = String(v.connectivityStatus || "").toLowerCase();
        return (
          lvl === "critical" ||
          lvl === "high" ||
          conn === "isolated" ||
          conn === "restricted"
        );
      }),
    [activeMapState.villages],
  );
  const citizenFocus = useMemo(
    () => {
      const liveRiskZones = redZones.map((habitation) => {
        const [longitude, latitude] = habitation.location?.coordinates || [];
        const level = habitation.risk?.level;
        return {
          id: habitation._id,
          name: habitation.name,
          riskScore: habitation.risk?.score,
          riskLevel: {
            RED: "CRITICAL",
            ORANGE: "HIGH",
            YELLOW: "WARNING",
          }[level] || "UNKNOWN",
          center: Number.isFinite(latitude) && Number.isFinite(longitude)
            ? [latitude, longitude]
            : null,
          primaryFactor: habitation.primaryHazard
            ? `Recorded primary hazard: ${habitation.primaryHazard}`
            : null,
        };
      });
      const focus = selectCitizenFocus({
        incidents: filteredIncidents,
        riskZones: demoMode ? activeMapState.riskZones : liveRiskZones,
        shelters: activeMapState.shelters,
        hospitals: activeMapState.hospitals,
        routes,
        roads: activeMapState.roads,
        reference: userLocation,
        demoMode,
      });
      if (!demoMode && (domainLoading || domainError)) {
        return {
          ...focus,
          dangerLevel: "UNKNOWN",
          warning: domainLoading
            ? "Current hazard data is loading."
            : "Current hazard data is unavailable.",
          riskReason: domainError || focus.riskReason,
        };
      }
      return focus;
    },
    [filteredIncidents, activeMapState, redZones, routes, userLocation, demoMode, domainLoading, domainError],
  );
  const citizenRoutes = useMemo(
    () => (citizenFocus.primaryRoute ? [citizenFocus.primaryRoute] : []),
    [citizenFocus],
  );
  const heatmapNodes = useMemo(() => demoMode
    ? calculateRiskHeatmapNodes(activeMapState.riskZones, filteredIncidents)
    : [], [demoMode, activeMapState.riskZones, filteredIncidents]);
  const blockedRoadCount = useMemo(() => {
    const fromRoads = (activeMapState.roads || []).filter(
      (r) => String(r.status).toUpperCase() === "BLOCKED",
    ).length;
    const fromIncidents = (incidents || []).filter(
      (i) => String(i.rawType || i.type || "").toLowerCase().replace(/[^a-z]/g, "").includes("roadblock"),
    ).length;
    if ((activeMapState.roads || []).length === 0 && (incidents || []).length === 0) return null;
    return fromRoads + fromIncidents;
  }, [activeMapState.roads, incidents]);
  const criticalIncidentCount = useMemo(() => {
    return domainError || domainLoading
      ? null
      : filteredIncidents.filter((i) => i.severity === "Critical").length;
  }, [domainError, domainLoading, filteredIncidents]);
  const hospitalAccessBlocked = useMemo(() => {
    return activeMapState.hospitals.some(
      (h) => (h.roadAccess || "").toLowerCase() === "blocked",
    );
  }, [activeMapState.hospitals]);
  const isolatedVillagesCount = useMemo(() => {
    if ((activeMapState.villages || []).length === 0) return null;
    return (activeMapState.villages || []).filter((v) => {
      const road = (activeMapState.roads || []).find(
        (r) => r.id === v.primaryAccessRoadId,
      );
      if (!road) return v.connectivityStatus === "Isolated";
      return (road.status || "").toUpperCase() === "BLOCKED";
    }).length;
  }, [activeMapState.villages, activeMapState.roads]);
  const maxRiskScore = useMemo(() => {
    const assessedScores = habitations.map((habitation) => habitation.risk?.score).filter(Number.isFinite);
    if (assessedScores.length > 0) return Math.max(...assessedScores);
    if (!activeMapState.riskZones || activeMapState.riskZones.length === 0)
      return null;
    const demoScores = activeMapState.riskZones
      .map((zone) => zone.riskScore)
      .filter(Number.isFinite);
    return demoScores.length ? Math.max(...demoScores) : null;
  }, [activeMapState.riskZones, habitations]);
  const precipitationValue = liveWeather?.precipitation;
  const currentPrecipitation = precipitationValue !== null && precipitationValue !== undefined && precipitationValue !== ""
    && Number.isFinite(Number(precipitationValue))
    ? `${Number(precipitationValue)} mm`
    : "Data unavailable";
  const operationalMapPoints = useMemo(() => [
    ...habitations.map((item) => item.location?.coordinates)
      .filter((item) => Array.isArray(item) && item.length === 2)
      .map(([lng, lat]) => [lat, lng]),
    ...relocationSites.map((item) => item.location?.coordinates)
      .filter((item) => Array.isArray(item) && item.length === 2)
      .map(([lng, lat]) => [lat, lng]),
    ...redZones.map((item) => item.location?.coordinates)
      .filter((item) => Array.isArray(item) && item.length === 2)
      .map(([lng, lat]) => [lat, lng]),
    ...incidents.map((item) => typeof item.location?.lat === "number"
      ? [item.location.lat, item.location.lng]
      : null).filter(Boolean),
  ], [habitations, relocationSites, redZones, incidents]);
  const assessedZones = useMemo(
    () => (habitations || []).filter((item) => item.risk?.level && item.risk.level !== "UNKNOWN"),
    [habitations],
  );
  const unassessedHabitations = useMemo(
    () => (habitations || []).filter((item) => !item.risk?.level || item.risk.level === "UNKNOWN"),
    [habitations],
  );
  useEffect(() => {
    if (decisionHabitation || !assessedZones.length) return;
    const rank = { RED: 4, ORANGE: 3, YELLOW: 2, GREEN: 1 };
    const top = [...assessedZones].sort(
      (a, b) => (rank[b.risk?.level] || 0) - (rank[a.risk?.level] || 0)
        || (b.risk?.score || 0) - (a.risk?.score || 0),
    )[0];
    if (!top) return undefined;
    const timer = setTimeout(() => setDecisionHabitation(top), 0);
    return () => clearTimeout(timer);
  }, [assessedZones, decisionHabitation]);
  const handleSelect = useCallback(
    (feature) => {
      setSelectedFeature(feature);
      if (onSelectFeature) onSelectFeature(feature);
    },
    [onSelectFeature],
  );
  const selectedIncident = useMemo(() => {
    if (!selectedFeature) return null;
    const incidentId = selectedFeature.id;
    return incidents.find((incident) => incident.id === incidentId) || null;
  }, [selectedFeature, incidents]);
  const handleRouteToNearestFacility = useCallback(async () => {
    const lat = selectedIncident?.location?.lat;
    const lng = selectedIncident?.location?.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setRouteRequestStatus("error");
      setRouteRequestError("Select an incident with a recorded location first.");
      return;
    }

    setRouteRequestStatus("loading");
    setRouteRequestError("");
    setManualRoute(null);
    try {
      const radiusLat = 0.22;
      const radiusLng = radiusLat / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
      const hospitals = await fetchHospitalsInBounds({
        south: lat - radiusLat,
        west: lng - radiusLng,
        north: lat + radiusLat,
        east: lng + radiusLng,
      });
      const hospitalCandidates = hospitals.map((hospital) => ({
        id: hospital.id,
        name: hospital.name || "Nearby hospital",
        lat: hospital.lat,
        lng: hospital.lng,
        kind: hospital.kind === "clinic" ? "clinic" : "hospital",
      }));
      const siteCandidates = relocationSites
        .filter((site) => {
          const access = String(site.roadAccess || "").toUpperCase();
          const status = String(site.status || "").toLowerCase();
          const available = site.capacity?.available;
          return access !== "BLOCKED" && !["closed", "inactive", "deleted"].includes(status)
            && !(Number.isFinite(available) && available <= 0);
        })
        .map((site) => {
          const [siteLng, siteLat] = site.location?.coordinates || [];
          return {
            id: site._id,
            name: site.name || "Registered relocation site",
            lat: siteLat,
            lng: siteLng,
            kind: "relocation site",
          };
        });
      const destination = [...hospitalCandidates, ...siteCandidates]
        .filter((candidate) => Number.isFinite(candidate.lat) && Number.isFinite(candidate.lng))
        .sort((a, b) => distanceKm(lat, lng, a.lat, a.lng) - distanceKm(lat, lng, b.lat, b.lng))[0];
      if (!destination) {
        throw new Error("No nearby hospital or available relocation site was found.");
      }
      const origin = {
        lat,
        lng,
        name: selectedIncident.title || selectedIncident.type || "Selected incident",
      };
      const route = await routingService.calculateRoute({
        origin,
        destination,
        routeId: "ROUTE-LIVE-01",
      });
      route.name = `${origin.name} to ${destination.name}`;
      route.destinationType = destination.kind;
      setManualRoute(route);
      setSelectedFeature(route);
      setLayerVisibility((current) => ({ ...current, routes: true }));
      setRouteRequestStatus("success");
    } catch (error) {
      setRouteRequestStatus("error");
      setRouteRequestError(error?.message || "A live road route could not be calculated.");
    }
  }, [selectedIncident, relocationSites]);
  const mapElement = (
    <MapView
      className="gis-dark-tiles"
      basemap={mapStyle}
      onMapReady={handleMapReady}
    >
      <MapResetController
        resetTrigger={resetTrigger}
        isSimActive={demoMode && simScenario !== "BASELINE"}
        demoMode={demoMode}
        points={operationalMapPoints}
      />
      {!isCitizen ? (
        <CommandCenterRegionFocus regionId={focusRegion} resetToken={resetTrigger + focusToken} />
      ) : null}

      <MapCoordinateTracker
        onViewChange={handleViewChange}
      />

      <UserPointsLayer
        points={userPoints}
        addMode={addPointMode}
        openPointId={focusPoint.id || justAddedPointId}
        flyTo={focusPoint}
        onAddPoint={handleAddPoint}
        onUpdatePoint={handleUpdatePoint}
        onDeletePoint={handleDeletePoint}
      />

      <RiskHeatmapLayer
        nodes={heatmapNodes}
        visible={layerVisibility.heatmap}
        onSelectNode={handleSelect}
      />

      <RedZoneLayer
        habitations={assessedZones}
        visible={layerVisibility.redZones}
        onSelect={(item) => setDecisionHabitation(item)}
      />
      <HabitationLayer
        habitations={unassessedHabitations}
        visible={layerVisibility.habitations}
        onSelect={(item) => setDecisionHabitation(item)}
      />
      <RelocationSiteLayer
        sites={relocationSites}
        visible={layerVisibility.relocationSites}
        onSelect={handleSelectRelocationSite}
      />
      <RelocationDecisionLayer
        habitation={decisionHabitation}
        sites={relocationSites}
        visible={layerVisibility.relocationSites !== false}
      />
      <TargetedAlertLayer
        alerts={targetedAlerts}
        visible={layerVisibility.alerts}
        onSelect={handleSelect}
      />

      <RiskZoneLayer
        riskZones={isCitizen ? citizenRiskZones : activeMapState.riskZones}
        visible={layerVisibility.riskZones}
        selectedRiskZoneId={selectedFeature && selectedFeature.id}
        onSelectRiskZone={handleSelect}
        hudMode={hudMode}
      />

      <RoadStatusLayer
        roads={isCitizen ? citizenRoads : activeMapState.roads}
        visible={layerVisibility.roads}
        selectedRoadId={selectedFeature && selectedFeature.id}
        onSelectRoad={handleSelect}
        hudMode={hudMode}
      />

      <RouteLayer
        routes={isCitizen ? citizenRoutes : demoMode ? routes : manualRoute ? [manualRoute] : []}
        visible={layerVisibility.routes}
        selectedRouteId={selectedFeature && selectedFeature.id}
        onSelectRoute={handleSelect}
        hudMode={hudMode}
      />

      <VillageLayer
        villages={isCitizen ? citizenVillages : activeMapState.villages}
        roads={activeMapState.roads}
        visible={layerVisibility.villages}
        selectedVillageId={selectedFeature && selectedFeature.id}
        onSelectVillage={handleSelect}
        hudMode={hudMode}
      />

      <FacilityLayer
        hospitals={activeMapState.hospitals}
        shelters={activeMapState.shelters}
        visibleHospitals={layerVisibility.hospitals}
        visibleShelters={layerVisibility.shelters}
        selectedFacilityId={selectedFeature && selectedFeature.id}
        onSelectFacility={handleSelect}
        hudMode={hudMode}
      />

      <ResourceLayer
        resources={activeMapState.resources}
        visible={layerVisibility.resources}
        selectedResourceId={selectedFeature && selectedFeature.id}
        onSelectResource={handleSelect}
        hudMode={hudMode}
      />

      <AffectedAreaLayer
        areas={areasProp || affectedAreas}
        visible={layerVisibility.areas !== false}
        animate={!demoMode && arrivalMotionEnabled}
      />
      <IncidentDangerZoneLayer
        incidents={isCitizen ? citizenIncidents : filteredIncidents}
        visible={layerVisibility.incidents}
        onSelect={handleSelect}
      />
      <NaturalEventsLayer events={naturalEvents} />
      <NearbyPeopleLayer people={people} />
      <IncidentVideoFx
        incidents={isLiveApiData && !demoMode ? (isCitizen ? citizenIncidents : incidents) : null}
        enabled={!demoMode && arrivalMotionEnabled}
      />
      <IncidentLayer
        incidents={isCitizen ? citizenIncidents : filteredIncidents}
        trackedIncidents={isLiveApiData && !demoMode ? (isCitizen ? citizenIncidents : incidents) : null}
        animateArrivals={!demoMode && arrivalMotionEnabled}
        visible={layerVisibility.incidents}
        selectedIncidentId={selectedFeature && selectedFeature.id}
        onSelectIncident={handleSelect}
        hudMode={hudMode}
      />
      <IncidentResponseLayer
        incident={selectedIncident}
        roads={activeMapState.roads}
        hospitals={activeMapState.hospitals}
        shelters={activeMapState.shelters}
        villages={activeMapState.villages}
        resources={activeMapState.resources}
        visible={layerVisibility.incidents}
      />

      <LiveQuakeLayer
        quakes={liveQuakes}
        visible={layerVisibility.quakes !== false}
      />

      {overlay}

      <LiveHospitalLayer visible={layerVisibility.liveMed === true} />

      <GibsFireLayer visible={layerVisibility.fires === true} />

      <BhuvanHazardLayer visible={layerVisibility.bhuvan === true} />

      <DisasterZonesLayer visible={demoMode && layerVisibility.zones !== false} />

      {isCitizen ? (
        <MyLocationMarker
          location={
            userLocation ||
            (demoMode && citizenFocus.locationMode === "demo" ? citizenFocus.myPoint : null)
          }
            simulated={!userLocation && demoMode}
        />
      ) : null}
    </MapView>
  );
  if (isCitizen) {
    return (
      <div className="gis-app-wrapper gis-role-citizen d-flex flex-column vh-100">
        {citizenToolsTarget ? createPortal(
          <CitizenMapTools
            mapStyle={mapStyle}
            onSetMapStyle={handleSetMapStyle}
            onResetMapView={handleResetView}
            layerVisibility={layerVisibility}
            onToggleLayer={handleToggleLayer}
            hideMapStyles={hideCitizenMapStyles}
            inline
          />,
          citizenToolsTarget,
        ) : null}
        <header className="gis-header gis-header-citizen d-flex align-items-center justify-content-between gap-3 px-3">
          <div className="d-flex align-items-center gap-2">
            <span className="gis-brand-name">SENETRY</span>
            <span className="gis-cz-header-sub d-none d-sm-inline">
              Live Safety Map
            </span>
          </div>
          <span
            className={`gis-cz-header-pill gis-cz-status-${
              String(citizenFocus.dangerLevel).toUpperCase() === "CRITICAL"
                ? "danger"
                : String(citizenFocus.dangerLevel).toUpperCase() === "HIGH"
                ? "high"
                : String(citizenFocus.dangerLevel).toUpperCase() === "LOW"
                ? "safe"
                : "warning"
            }`}
          >
            {domainLoading
              ? "LOADING HAZARD DATA"
              : domainError
                ? "HAZARD DATA UNAVAILABLE"
                : !citizenFocus.dangerPoint && String(citizenFocus.dangerLevel).toUpperCase() === "UNKNOWN"
                  ? "NO ASSESSMENT AVAILABLE"
                  : `${String(citizenFocus.dangerLevel).toUpperCase()} REPORTED`}
          </span>
        </header>

        <main className="gis-citizen-main flex-grow-1">
          <div className="container-fluid p-0">
            <div className="row g-0 gis-citizen-row">
              <div className="col-12 gis-citizen-mapcol position-relative">
                {mapElement}
              </div>
              <aside className="col-12 gis-citizen-sidecol">
                <CitizenPanel
                  focus={citizenFocus}
                  onFocusLocation={handleCitizenFocusLocation}
                  onLocateMe={handleLocateMe}
                  onReport={handleCitizenReport}
                  located={!!userLocation}
                  relocationSites={relocationSites}
                  selectedRelocationSite={selectedRelocationSite}
                  onSelectRelocationSite={handleSelectRelocationSite}
                  relocationSitesLoading={domainLoading}
                  relocationSitesError={domainError}
                  emergencyActionsTarget={emergencyActionsTarget}
                />
              </aside>
            </div>
          </div>
        </main>
      </div>
    );
  }
  return (
    <div className={`gis-app-wrapper gis-role-authority d-flex flex-column ${embedded ? "gis-embedded" : "vh-100"}`}>
      <header className="gis-header d-flex align-items-center justify-content-between gap-2 px-2 px-md-3">
        <div className="gis-header-left d-flex align-items-center gap-2">
          <span className="gis-eoc-tag">EOC-GIS</span>
          <div className="gis-header-title d-flex align-items-center gap-2">
            <span className="gis-brand-name">SENETRY</span>
            <span
              className="d-none d-sm-inline"
              style={{ color: "var(--text-muted)" }}
            >
              /
            </span>
            <span
              className="d-none d-sm-inline"
              style={{ color: "var(--text-secondary)" }}
            >
              {demoMode ? "DEMO THEATER" : "OPERATIONAL AREA"}
            </span>
          </div>
        </div>

        <div className="gis-header-meta d-flex align-items-center gap-2">
          <span className="gis-header-meta-extra gis-coord-readout d-none d-lg-inline">
            CTR{" "}
            {centerMapsHref ? (
              <a
                className="gis-coord-link"
                href={centerMapsHref}
                target="_blank"
                rel="noopener noreferrer"
                title="Open view center in OpenStreetMap (WGS-84)"
              >
                {centerReadout}
              </a>
            ) : (
              centerReadout
            )}
            {viewInfo ? (
              <span className="gis-coord-zoom">
                {" "}
                · Z{viewInfo.zoom.toFixed(1)}
              </span>
            ) : null}
          </span>
          <span className="gis-header-meta-extra d-none d-lg-inline">•</span>
          <span className="gis-header-meta-extra d-none d-lg-inline">
            DATUM WGS-84
          </span>
          <span className="gis-header-meta-extra d-none d-lg-inline">•</span>
          <span className={demoMode ? "gis-meta-sim" : domainError ? "gis-meta-sim" : "gis-meta-live"}>
            {demoMode ? "DEMO DATA" : domainError ? "DATA UNAVAILABLE" : domainLoading ? "LOADING DATA" : "LIVE API"}
          </span>
          <span className="gis-header-meta-extra d-none d-sm-inline">•</span>
          <span
            className="d-none d-sm-inline"
            style={{ color: "var(--color-info)" }}
          >
            {hudMode.toUpperCase()}
          </span>
        </div>
      </header>

      <main
        className={`gis-workspace flex-grow-1 position-relative gis-style-${mapStyle} ${
          addPointMode ? "gis-add-mode" : ""
        }`}
      >
        {mapElement}
        {!isCitizen && <MapOverviewInset map={mapInstance} />}

        {domainError && !demoMode ? (
          <div className="alert alert-danger position-absolute top-0 start-50 translate-middle-x m-2" style={{ zIndex: 1200 }} role="alert">
            {domainError} <button className="btn btn-sm btn-link" onClick={() => window.location.reload()}>Retry</button>
          </div>
        ) : null}
        {targetedAlertsError && !demoMode ? (
          <div className="alert alert-warning position-absolute top-0 end-0 m-2" style={{ zIndex: 1100 }} role="status">
            {targetedAlertsError}
          </div>
        ) : null}
        {domainLoading && !demoMode ? (
          <div className="position-absolute top-0 start-0 m-2 badge text-bg-secondary" style={{ zIndex: 1100 }} role="status">Loading live operational layers…</div>
        ) : null}
        {targetedAlertsLoading && !demoMode ? (
          <div className="position-absolute bottom-0 start-0 m-2 badge text-bg-secondary" style={{ zIndex: 1100 }} role="status">Loading targeted alerts…</div>
        ) : null}
        {!domainLoading && !domainError && !demoMode && operationalMapPoints.length === 0 ? (
          <div className="position-absolute top-0 start-0 m-2 badge text-bg-secondary" style={{ zIndex: 1100 }}>No registered SENTRY map data in this area.</div>
        ) : null}

        {!isCitizen && (
          <>
            <div className="gis-left-rail">
              <TacticalTelemetryHUD
                incidentCount={domainError || domainLoading ? null : filteredIncidents.length}
                criticalCount={criticalIncidentCount}
                blockedRoadCount={blockedRoadCount}
                isolatedVillagesCount={isolatedVillagesCount}
                currentPrecipitation={demoMode ? "Demo fixture" : weatherLoading ? "Loading…" : weatherError ? "Data unavailable" : currentPrecipitation}
                precipitationStatus={demoMode ? "DEMO" : weatherLoading ? "LOADING" : weatherError || !liveWeather ? "UNAVAILABLE" : "LIVE"}
                maxRiskScore={maxRiskScore}
                hospitalAccessCount={demoMode ? (hospitalAccessBlocked ? "1/2" : "2/2") : "Data unavailable"}
                activeResourcesCount={
                  demoMode ? activeMapState.resources.length : null
                }
                hudMode={hudMode}
                weatherSource={demoMode ? "DEMO FIXTURES" : weatherLoading ? "WEATHER LOADING" : weatherError || !liveWeather ? "WEATHER UNAVAILABLE" : liveWeather?.source || "NO WEATHER SOURCE"}
              />

              <MapLegend
                hudMode={hudMode}
                demoMode={demoMode}
                isSimActive={simScenario !== "BASELINE"}
                layerVisibility={layerVisibility}
                activePresetId={activePresetId}
                dataFreshness={domainError ? "error" : domainLoading ? "loading" : "live"}
              />
            </div>

            {embedded ? (controlsTarget && controlsActive ? createPortal(
              <div className="gis-app-wrapper icc-controls-portal">
                <MapControls
              layerVisibility={layerVisibility}
              onToggleLayer={handleToggleLayer}
              severityFilter={severityFilter}
              onSetSeverityFilter={handleSetSeverityFilter}
              mapStyle={mapStyle}
              onSetMapStyle={handleSetMapStyle}
              onResetView={handleResetView}
              hudMode={hudMode}
              addPointMode={addPointMode}
              onToggleAddPoint={toggleAddPointMode}
              userPoints={userPoints}
              onFocusPoint={handleFocusPoint}
              onDeletePoint={handleDeletePoint}
              authorityMapPanel={embedded}
              relocationSites={relocationSites}
              selectedRelocationSite={selectedRelocationSite}
              onSelectRelocationSite={handleSelectRelocationSite}
              relocationSitesLoading={domainLoading}
              relocationSitesError={domainError}
              selectedIncident={selectedIncident}
              onRouteToNearestFacility={handleRouteToNearestFacility}
              routeRequestStatus={routeRequestStatus}
              routeRequestError={routeRequestError}
              routeSummary={manualRoute}
              arrivalMotionEnabled={arrivalMotionEnabled}
              onToggleArrivalMotion={handleToggleArrivalMotion}
                />
              </div>,
              controlsTarget,
            ) : null) : (
              <MapControls
                layerVisibility={layerVisibility}
                onToggleLayer={handleToggleLayer}
                severityFilter={severityFilter}
                onSetSeverityFilter={handleSetSeverityFilter}
                mapStyle={mapStyle}
                onSetMapStyle={handleSetMapStyle}
                onResetView={handleResetView}
                hudMode={hudMode}
                addPointMode={addPointMode}
                onToggleAddPoint={toggleAddPointMode}
                userPoints={userPoints}
                onFocusPoint={handleFocusPoint}
                onDeletePoint={handleDeletePoint}
                relocationSites={relocationSites}
                selectedRelocationSite={selectedRelocationSite}
                onSelectRelocationSite={handleSelectRelocationSite}
                relocationSitesLoading={domainLoading}
                relocationSitesError={domainError}
                selectedIncident={selectedIncident}
                onRouteToNearestFacility={handleRouteToNearestFacility}
                routeRequestStatus={routeRequestStatus}
                routeRequestError={routeRequestError}
                routeSummary={manualRoute}
                arrivalMotionEnabled={arrivalMotionEnabled}
                onToggleArrivalMotion={handleToggleArrivalMotion}
              />
            )}


            {addPointMode ? (
              <div className="gis-addpoint-banner" role="status">
                CLICK ANYWHERE ON THE MAP TO DROP A POINT
              </div>
            ) : null}
          </>
        )}

        {isCitizen && (
          <CitizenPanel
            focus={citizenFocus}
            onFocusLocation={handleCitizenFocusLocation}
            mapStyle={mapStyle}
            onSetMapStyle={handleSetMapStyle}
            onResetMapView={handleResetView}
            layerVisibility={layerVisibility}
            onToggleLayer={handleToggleLayer}
            relocationSites={relocationSites}
            selectedRelocationSite={selectedRelocationSite}
            onSelectRelocationSite={handleSelectRelocationSite}
            relocationSitesLoading={domainLoading}
            relocationSitesError={domainError}
          />
        )}
      </main>
    </div>
  );
}
