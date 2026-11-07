import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { logoutAndRedirect, resourcesApi } from '../services/api';
import Navbar from '../components/Navbar';
import { sentryApi } from '../services/sentryApi';
import { useCommandCenterFeeds } from '../hooks/useCommandCenterFeeds';
import { useIndiaGrid, useIndiaPopulation } from '../hooks/useIndiaGrid';
import { useMapScope } from '../hooks/useMapScope';
import { useStateIndex } from '../hooks/useStateIndex';
import { deriveRoadStatusFromBackendIncidents } from '../utils/gis/roadStatusFromBackendIncidents';
import { getCommandCenterRegion, partitionIncidentsByRegion } from '../utils/gis/commandCenterRegions';
import {
  countBySeverity,
  countRecent,
  incidentCoords,
  placesFromRecords,
  summarizeSites,
} from '../utils/commandCenter/incidentStats';
import { summarizeCities } from '../utils/commandCenter/forecastAlerts';
import { DELHI_CODE, NATIONAL_ID, NCR_ID } from '../utils/commandCenter/scope';
import {
  airAtWeatherPoint,
  filterGeoJsonRecords,
  filterPointRecords,
  resourcesInRegion,
  scopeFeedToRegion,
} from '../utils/commandCenter/scopeData';
import { groupIncidentsByState } from '../utils/commandCenter/stateStats';
import HudHeader from '../components/commandcenter/HudHeader';
import { useAuthoritiesOnline } from '../hooks/usePresence';
import { useAllSharingPeople } from '../hooks/useNearbyPeople';
import { buildHeaderLines } from '../utils/commandCenter/headerLines';
import { useNow } from '../components/commandcenter/format';
import MapPanel from '../components/commandcenter/MapPanel';
import { PopulationStatesPanel, TopStatesPanel, TypePanel } from '../components/commandcenter/NationalPanels';
import { AlertsPanel, RiverPanel, SatellitePanel } from '../components/commandcenter/SidePanels';
import {
  EvacuationPanel,
  ForecastPanel,
  IncidentsTable,
  PopulationPanel,
  ResourcePanel,
  TrendPanel,
} from '../components/commandcenter/BottomPanels';
import '../css/command_center.css';
import '../css/india-command-center.css';

const DAY_MS = 24 * 60 * 60 * 1000;
// After the user picks a view, the map's own movement is ignored for this long so it cannot undo the choice.
const HOLD_AFTER_PICK_MS = 1600;
const EMPTY_DATA = Object.freeze({
  incidents: null,
  habitations: null,
  relocationSites: null,
  resources: null,
  alerts: null,
  affectedAreas: null,
});

function unwrapArray(result) {
  return Array.isArray(result?.value?.data) ? result.value.data : null;
}

function readSignedInUser() {
  try {
    const storedUser = sessionStorage.getItem('user') || localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
}

// One word per feed for the header: live, stale (showing the last good copy), down or loading.
function feedHealth(...feeds) {
  const states = feeds.map((feed) => {
    const hasData = feed.data !== null && feed.data !== undefined;
    if (!hasData && feed.status === 'loading') return 'loading';
    if (hasData && feed.status === 'live') return 'live';
    if (hasData) return 'stale';
    return 'down';
  });
  if (states.every((state) => state === 'live')) return 'live';
  if (states.every((state) => state === 'loading')) return 'loading';
  if (states.every((state) => state === 'down')) return 'down';
  if (states.some((state) => state === 'live' || state === 'stale')) return 'stale';
  return 'loading';
}

// Keeps only the records that belong to the active view; `null` (not loaded yet) stays `null`.
function inView(records, region, index) {
  if (records === null || region.kind === 'national') return records;
  return filterGeoJsonRecords(records, region, index);
}

function CommandCenter() {
  const [scopeId, setScopeId] = useState(NATIONAL_ID);
  const [focus, setFocus] = useState({ id: NATIONAL_ID, token: 0 });
  const [autoFollow, setAutoFollow] = useState(true);
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const nowMs = useNow(60000);
  const [map, setMap] = useState(null);
  const [user] = useState(readSignedInUser);
  const holdUntil = useRef(0);
  const stateIndex = useStateIndex();
  const region = getCommandCenterRegion(scopeId);
  const national = region.kind === 'national';
  const feeds = useCommandCenterFeeds(region);
  const indiaGrid = useIndiaGrid();
  const indiaPopulation = useIndiaPopulation();

  const load = useCallback(async () => {
    const [incidents, habitations, relocationSites, resources, alerts, affectedAreas] = await Promise.allSettled([
      sentryApi.getActiveIncidents(),
      sentryApi.getHabitations({ active: true }),
      sentryApi.getRelocationSites(),
      resourcesApi.getResources(),
      sentryApi.getAlerts(),
      sentryApi.getAffectedAreas(),
    ]);
    setData({
      incidents: unwrapArray(incidents),
      habitations: unwrapArray(habitations),
      relocationSites: unwrapArray(relocationSites),
      resources: unwrapArray(resources),
      alerts: unwrapArray(alerts),
      affectedAreas: unwrapArray(affectedAreas),
    });
    setLoading(false);
  }, []);

  const refreshIncidents = useCallback(async () => {
    try {
      // Drawn areas ride along with the incident refresh, so an area added by another authority shows within seconds.
      const [response, areas] = await Promise.all([sentryApi.getActiveIncidents(), sentryApi.getAffectedAreas().catch(() => null)]);
      setData((current) => ({
        ...current,
        incidents: Array.isArray(response.data) ? response.data : current.incidents,
        affectedAreas: Array.isArray(areas?.data) ? areas.data : current.affectedAreas,
      }));
    } catch {
      // The next full refresh reports the failure; keep showing the last good incidents meanwhile.
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => { void load(); }, 0);
    const refreshAll = window.setInterval(() => { if (!document.hidden) void load(); }, 60000);
    const refreshActive = window.setInterval(() => { if (!document.hidden) void refreshIncidents(); }, 15000);
    const handleStorage = (event) => {
      if (event.key === 'sentry:citizen-report-synced') void refreshIncidents();
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(refreshAll);
      window.clearInterval(refreshActive);
      window.removeEventListener('storage', handleStorage);
    };
  }, [load, refreshIncidents]);

  // A view the user picked (list, badge or the back button): switch to it and move the map there.
  const selectView = useCallback((target) => {
    const id = target === DELHI_CODE ? NCR_ID : target;
    holdUntil.current = Date.now() + HOLD_AFTER_PICK_MS;
    setScopeId(id);
    setFocus((current) => ({ id, token: current.token + 1 }));
  }, []);

  // A view the map's position calls for (zooming into or out of a state): switch the dashboard only, the map is already there.
  const followMap = useCallback((id) => setScopeId(id), []);
  useMapScope({ map, index: stateIndex, scopeId, enabled: autoFollow, holdUntilRef: holdUntil, onScope: followMap });

  const partition = useMemo(() => partitionIncidentsByRegion(data.incidents, region, stateIndex), [data.incidents, region, stateIndex]);
  const elsewhere = data.incidents === null ? 0 : data.incidents.length - partition.inRegion.length - partition.unmapped.length;
  const stateStats = useMemo(() => groupIncidentsByState(data.incidents, stateIndex), [data.incidents, stateIndex]);
  const places = useMemo(() => placesFromRecords(data), [data]);
  const roads = useMemo(() => deriveRoadStatusFromBackendIncidents(partition.inRegion), [partition.inRegion]);

  const habitationsInView = useMemo(() => inView(data.habitations, region, stateIndex), [data.habitations, region, stateIndex]);
  const sitesInView = useMemo(() => inView(data.relocationSites, region, stateIndex), [data.relocationSites, region, stateIndex]);
  const resourcesInView = useMemo(
    () => (data.resources === null || national ? data.resources : resourcesInRegion(data.resources, region)),
    [data.resources, region, national],
  );
  const resourcesElsewhere = data.resources === null || resourcesInView === null ? 0 : data.resources.length - resourcesInView.length;
  const sentryAlertsInView = useMemo(
    () => (data.alerts === null || national ? data.alerts : filterPointRecords(data.alerts, region, stateIndex)),
    [data.alerts, region, stateIndex, national],
  );
  const hazardsInView = useMemo(() => scopeFeedToRegion(feeds.hazards, region), [feeds.hazards, region]);
  const eventsInView = useMemo(() => scopeFeedToRegion(feeds.events, region), [feeds.events, region]);
  const mapHazards = useMemo(() => [...(Array.isArray(feeds.hazards.data) ? feeds.hazards.data : []), ...(Array.isArray(feeds.events.data) ? feeds.events.data : [])], [feeds.hazards.data, feeds.events.data]);
  const quakesInView = useMemo(() => scopeFeedToRegion(feeds.quakes, region), [feeds.quakes, region]);

  const kpis = useMemo(() => {
    const counts = countBySeverity(partition.inRegion);
    return {
      total: data.incidents === null ? null : counts.total,
      critical: data.incidents === null ? null : counts.critical,
      high: data.incidents === null ? null : counts.high,
      medium: data.incidents === null ? null : counts.medium,
      low: data.incidents === null ? null : counts.low,
      unmapped: partition.unmapped.length,
      safeSites: sitesInView === null ? null : summarizeSites(sitesInView).open,
      recent: countRecent(partition.inRegion, DAY_MS, nowMs),
    };
  }, [partition, data.incidents, sitesInView, nowMs]);

  const authoritiesOnline = useAuthoritiesOnline(['authority', 'admin'].includes(user?.role));
  const { people: sharingPeople, refresh: refreshPeople } = useAllSharingPeople(['authority', 'admin'].includes(user?.role));
  const headerLines = useMemo(
    () => buildHeaderLines({ region, incidents: data.incidents === null ? null : partition.inRegion, authoritiesOnline, now: nowMs }),
    [region, data.incidents, partition, authoritiesOnline, nowMs],
  );

  const sentryValues = Object.values(data);
  const apiStatus = loading ? 'connecting' : sentryValues.every((value) => value !== null) ? 'live' : sentryValues.every((value) => value === null) ? 'down' : 'partial';
  const sentryFeed = { status: loading ? 'loading' : 'live', data: loading ? null : sentryValues.some((value) => value !== null) ? data : null };
  const feedList = [
    { label: 'SENTRY API', status: apiStatus === 'partial' ? 'stale' : feedHealth(sentryFeed) },
    { label: 'Open-Meteo', status: feedHealth(feeds.weather, feeds.forecast, feeds.rivers) },
    { label: 'NDMA SACHET', status: feedHealth(feeds.sachet) },
    { label: 'GDACS', status: feedHealth(feeds.hazards) },
    { label: 'NASA EONET', status: feedHealth(feeds.events) },
    { label: 'USGS', status: feedHealth(feeds.quakes) },
  ];

  const airHere = useMemo(() => airAtWeatherPoint(region, feeds.air.data), [region, feeds.air.data]);
  const citySummary = useMemo(() => (feeds.places ? summarizeCities(feeds.places) : null), [feeds.places]);

  const focusIncident = useCallback((incident) => {
    const coords = incidentCoords(incident);
    if (!map || !coords) return;
    map.getContainer().scrollIntoView({ behavior: 'smooth', block: 'center' });
    map.flyTo([coords.lat, coords.lng], Math.max(map.getZoom(), 12), { duration: 0.9 });
  }, [map]);

  const incidentsUnavailable = data.incidents === null && !loading;
  const habitationsUnavailable = data.habitations === null && !loading;
  const logout = () => { void logoutAndRedirect(); };
  const canDraw = ['authority', 'admin'].includes(user?.role);
  // Saves a drawn area, then reloads so every map and panel shows it.
  const createArea = useCallback(async (payload) => {
    await sentryApi.createAffectedArea(payload);
    await load();
  }, [load]);
  const resourceFeed = { status: loading ? 'loading' : 'live', data: resourcesInView, error: null };
  const siteFeed = { status: loading ? 'loading' : 'live', data: sitesInView, error: null };

  return (
    <div className="command-center-wrapper india-command-center">
      <Navbar />
      <div className={`icc-root icc-scope-${region.kind}`}>
        <HudHeader
          region={region}
          apiStatus={apiStatus}
          kpis={kpis}
          loading={loading}
          weather={feeds.weather}
          air={airHere}
          citySummary={citySummary}
          feeds={feedList}
          user={user}
          onLogout={logout}
          lines={headerLines}
        />
        <MapPanel
          people={sharingPeople}
          naturalEvents={mapHazards}
          onPeopleChanged={refreshPeople}
          region={region}
          scopeId={scopeId}
          focus={focus}
          onSelectView={selectView}
          autoFollow={autoFollow}
          onAutoFollowChange={setAutoFollow}
          stateRows={stateStats.rows}
          stateIndex={stateIndex}
          areas={data.affectedAreas}
          canDraw={canDraw}
          onCreateArea={createArea}
          heatPlaces={indiaGrid.data}
          hazardEvents={mapHazards}
          quakes={feeds.quakes.data}
          incidents={data.incidents}
          habitations={data.habitations}
          sites={data.relocationSites}
          places={places}
          rivers={feeds.rivers.data}
          onMapInstance={setMap}
        />
        <div className="icc-side">
          <SatellitePanel region={region} />
          <RiverPanel feed={feeds.rivers} region={region} />
          <AlertsPanel
            sachet={feeds.sachet}
            regional={feeds.regionalAlerts}
            hazards={hazardsInView}
            events={eventsInView}
            quakes={quakesInView}
            region={region}
          />
        </div>
        <div className={`icc-bottom ${national ? 'icc-bottom-national' : 'icc-bottom-local'}`}>
          {national ? (
            <>
              <TypePanel incidents={partition.inRegion} loading={loading} />
              <TopStatesPanel rows={stateStats.rows} outside={stateStats.outside} loading={loading} indexReady={Boolean(stateIndex)} onSelect={selectView} />
              <PopulationStatesPanel populationFeed={indiaPopulation} habitations={habitationsInView} index={stateIndex} loading={loading} unavailable={habitationsUnavailable} onSelect={selectView} />
            </>
          ) : null}
          <IncidentsTable
            incidents={partition.inRegion}
            unmapped={partition.unmapped}
            places={places}
            loading={loading}
            unavailable={incidentsUnavailable}
            onFocus={focusIncident}
            region={region}
            elsewhere={elsewhere}
          />
          <ResourcePanel feed={resourceFeed} region={region} elsewhere={resourcesElsewhere} />
          {national ? null : (
            <>
              <EvacuationPanel sitesFeed={siteFeed} roads={roads} region={region} />
              <PopulationPanel habitations={habitationsInView} loading={loading} unavailable={habitationsUnavailable} region={region} />
            </>
          )}
          <TrendPanel incidents={partition.inRegion} loading={loading} />
          <ForecastPanel
            forecastAlerts={feeds.forecastAlerts}
            places={feeds.places}
            feed={feeds.forecast}
            sentryAlerts={sentryAlertsInView}
            region={region}
          />
        </div>
        <footer className="icc-foot">
          <span>Incident, habitation, site, resource and risk-alert figures come from the SENTRY API. Nothing on this page is simulated.</span>
          <span>
            State boundaries (never drawn) only decide which state a point is in: Natural Earth, public domain, simplified; points within a few km of a border can land in the neighbouring state.
          </span>
          <span>
            Free public data:{' '}
            <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Weather data by Open-Meteo.com</a> (CC BY 4.0, non-commercial) ·{' '}
            <a href="https://sachet.ndma.gov.in/" target="_blank" rel="noreferrer">NDMA SACHET</a> ·{' '}
            <a href="https://www.gdacs.org/" target="_blank" rel="noreferrer">GDACS</a> ·{' '}
            <a href="https://earthquake.usgs.gov/" target="_blank" rel="noreferrer">USGS</a> ·{' '}
            <a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noreferrer">NASA GIBS</a> ·{' '}
            <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth</a> ·{' '}
            © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>
          </span>
        </footer>
      </div>
    </div>
  );
}

export default CommandCenter;
