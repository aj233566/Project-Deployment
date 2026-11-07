import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Crosshair, Maximize2, Minimize2, Printer, Search, Share2, X } from 'lucide-react';
import GisCommandCenter from '../gis/GisCommandCenter';
import MapOverlays from './MapOverlays';
import HelpRequests from './HelpRequests';
import StateBadges from './StateBadges';
import StateRiskLayer from './StateRiskLayer';
import Map3D from './Map3D';
import { useSharedMapControls } from '../../hooks/useSharedMapControls';
import { listViewOptions } from '../../utils/gis/commandCenterRegions';
import { NATIONAL_ID } from '../../utils/commandCenter/scope';
import { buildFilterChips, incidentGroup } from '../../utils/commandCenter/incidentStats';
import { searchRecords } from '../../utils/commandCenter/searchRecords';

const TABS = [
  { key: '3d', label: '3D MAP', basemap: 'osmdark', overlay: 'none', mode3d: true },
  { key: 'live', label: 'LIVE MAP', basemap: 'osmdark', overlay: 'none' },
  { key: 'satellite', label: 'SATELLITE', basemap: 'satellite', overlay: 'none' },
  { key: 'rain', label: 'RAINFALL', basemap: 'osmdark', overlay: 'rain' },
  { key: 'rivers', label: 'RIVER LEVELS', basemap: 'osmdark', overlay: 'rivers' },
];

const VIEW_OPTIONS = listViewOptions();
const VIEW_GROUPS = [...new Set(VIEW_OPTIONS.map((option) => option.group))];

function activeTabKey(view) {
  if (view.mode3d) return '3d';
  const exact = TABS.find((tab) => !tab.mode3d && tab.overlay === view.overlay && (tab.overlay !== 'none' || tab.basemap === view.basemap));
  if (exact) return exact.key;
  return view.overlay === 'none' ? 'live' : view.overlay;
}

export default function MapPanel({
  region, scopeId, focus, onSelectView, autoFollow, onAutoFollowChange, stateRows, stateIndex, heatPlaces, hazardEvents, quakes, areas, canDraw, onCreateArea,
  incidents, habitations, sites, places, rivers, onMapInstance, people, onPeopleChanged, naturalEvents,
}) {
  const panelRef = useRef(null);
  const [map, setMap] = useState(null);
  const [view, setView] = useState({ basemap: 'osmdark', overlay: 'none', mode3d: true });
  const [glMap, setGlMap] = useState(null);
  const [glFailed, setGlFailed] = useState(false);
  const [filterKey, setFilterKey] = useState('all');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [shareNote, setShareNote] = useState('');
  const [stateLayer, setStateLayer] = useState(true);
  const [focusPresetId, setFocusPresetId] = useState(null);
  const [controlsTarget, setControlsTarget] = useState(null);

  const chips = useMemo(() => buildFilterChips(incidents), [incidents]);
  const activeFilter = chips.some((chip) => chip.key === filterKey) ? filterKey : 'all';
  const incidentIdFilter = useMemo(() => {
    if (activeFilter === 'all') return null;
    return new Set((incidents || []).filter((incident) => incidentGroup(incident) === activeFilter).map((incident) => String(incident._id)));
  }, [incidents, activeFilter]);

  const filteredIncidents = useMemo(
    () => (incidentIdFilter ? (incidents || []).filter((incident) => incidentIdFilter.has(String(incident._id))) : incidents),
    [incidents, incidentIdFilter],
  );

  // The Controls panel's state is shared by the 3D map and the Live Map.
  const controls = useSharedMapControls({ incidents: filteredIncidents, sites });

  const results = useMemo(
    () => searchRecords(query, { incidents, habitations, sites, places }),
    [query, incidents, habitations, sites, places],
  );

  useEffect(() => {
    const onChange = () => {
      setFullscreen(Boolean(document.fullscreenElement));
      window.setTimeout(() => map?.invalidateSize(), 120);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [map]);

  // Layers drawn inside the map: the rainfall / river overlays, and on the national map one badge per state.
  const overlay = useMemo(() => (
    <>
      {stateLayer && stateIndex ? (
        <StateRiskLayer entries={stateIndex.entries} rows={stateRows} activeCode={scopeId === NATIONAL_ID ? null : (scopeId === 'ncr' ? 'IN-DL' : scopeId)} onSelect={onSelectView} />
      ) : null}
      <MapOverlays mode={view.overlay} rivers={rivers} />
      {scopeId === NATIONAL_ID ? <StateBadges rows={stateRows} onSelect={onSelectView} /> : null}
    </>
  ), [view.overlay, rivers, scopeId, stateRows, stateIndex, stateLayer, onSelectView]);

  // Expanded (in-page) mode is the fallback when the browser refuses or lacks element fullscreen, e.g. on iPhones.
  useEffect(() => {
    const resize = window.setTimeout(() => map?.invalidateSize(), 80);
    if (!expanded) return () => window.clearTimeout(resize);
    const onKey = (event) => { if (event.key === 'Escape') setExpanded(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(resize);
      window.removeEventListener('keydown', onKey);
    };
  }, [expanded, map]);

  const show3d = view.mode3d && !glFailed;
  const activeMap = show3d ? glMap : map;
  useEffect(() => {
    if (onMapInstance) onMapInstance(activeMap);
  }, [activeMap, onMapInstance]);

  const handleMapInstance = useCallback((instance) => { setMap(instance); }, []);
  const handleGlFail = useCallback(() => setGlFailed(true), []);

  const handleBasemapChange = useCallback((style) => {
    setView((current) => ({ ...current, basemap: style }));
  }, []);

  const selectTab = (tab) => setView({ basemap: tab.basemap, overlay: tab.overlay, mode3d: Boolean(tab.mode3d) });

  const flyTo = (result) => {
    if (activeMap) activeMap.flyTo([result.lat, result.lng], Math.max(activeMap.getZoom(), 12), { duration: 0.9 });
    setSearchOpen(false);
  };

  const focusRegion = () => {
    if (activeMap) activeMap.fitBounds(region.bounds, { padding: [36, 36], maxZoom: region.maxZoom, animate: true });
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
      return;
    }
    if (expanded) {
      setExpanded(false);
      return;
    }
    try {
      if (!panelRef.current?.requestFullscreen) throw new Error('Element fullscreen is not supported');
      await panelRef.current.requestFullscreen();
    } catch {
      setExpanded(true);
    }
  };

  const shareView = async () => {
    if (!activeMap) return;
    const center = activeMap.getCenter();
    const link = `https://www.openstreetmap.org/#map=${Math.round(activeMap.getZoom())}/${center.lat.toFixed(5)}/${center.lng.toFixed(5)}`;
    try {
      await navigator.clipboard.writeText(link);
      setShareNote('Link copied');
    } catch {
      setShareNote('Copy not allowed');
    }
    window.setTimeout(() => setShareNote(''), 2200);
  };

  const currentTab = activeTabKey(view);

  return (
    <section className={`icc-map${expanded ? ' icc-map-expanded' : ''}`} ref={panelRef} aria-label="Operational map">
      <div className="icc-map-tabs">
        <div role="tablist" aria-label="Map view">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={currentTab === tab.key}
              className={`icc-tab${currentTab === tab.key ? ' active' : ''}`}
              onClick={() => selectTab(tab)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="icc-tools" role="toolbar" aria-label="Map tools">
          <button type="button" onClick={focusRegion} title={`Re-centre on ${region.label}`} aria-label={`Re-centre on ${region.label}`}><Crosshair size={22} aria-hidden="true" /></button>
          <button type="button" onClick={toggleFullscreen} title="Full screen (Esc to exit)" aria-label="Toggle full screen">{fullscreen || expanded ? <Minimize2 size={22} aria-hidden="true" /> : <Maximize2 size={22} aria-hidden="true" />}</button>
          <button type="button" onClick={shareView} title="Copy a link to this map view" aria-label="Copy link to this map view"><Share2 size={22} aria-hidden="true" />{shareNote ? <span>{shareNote}</span> : null}</button>
          <button type="button" onClick={() => window.print()} title="Print this page" aria-label="Print this page"><Printer size={22} aria-hidden="true" /></button>
        </div>
      </div>

      <HelpRequests people={people} onChanged={onPeopleChanged} />

      <div className="icc-viewbar">
        <label className="icc-select">
          <span>VIEW</span>
          <select value={scopeId} onChange={(event) => onSelectView(event.target.value)} aria-label="Select the area shown on the dashboard">
            {VIEW_GROUPS.map((group) => (
              <optgroup key={group} label={group}>
                {VIEW_OPTIONS.filter((option) => option.group === group).map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        {scopeId !== NATIONAL_ID ? (
          <button type="button" className="icc-backbtn" onClick={() => onSelectView(NATIONAL_ID)}>
            <ArrowLeft size={20} aria-hidden="true" /> All India
          </button>
        ) : null}
        <button
          type="button"
          className={`icc-autobtn${autoFollow ? ' active' : ''}`}
          aria-pressed={autoFollow}
          onClick={() => onAutoFollowChange(!autoFollow)}
          title="When on, zooming the map into a state opens that state's dashboard, and zooming out returns to India."
        >
          <i aria-hidden="true" /> AUTO: {autoFollow ? 'ON' : 'OFF'}
        </button>
        <button type="button" className={`icc-autobtn${stateLayer ? ' active' : ''}`} aria-pressed={stateLayer} onClick={() => setStateLayer((v) => !v)} title="Tint each state by its worst active incident level">
          <i aria-hidden="true" /> STATE RISK: {stateLayer ? 'ON' : 'OFF'}
        </button>
        <p className="icc-viewhint">
          {scopeId === NATIONAL_ID
            ? (autoFollow ? 'Zoom into a state, or click a badge, to open its dashboard.' : 'Auto switching is off. Pick a view from the list.')
            : `Showing ${region.label}. ${autoFollow ? 'Zoom out to return to India.' : 'Use All India to go back.'}`}
        </p>
      </div>

      <div className="icc-map-toolbar">
        <div className="icc-search">
          <Search size={20} aria-hidden="true" />
          <input
            type="search"
            value={query}
            placeholder="Search incident, habitation or relocation site"
            aria-label="Search SENTRY records"
            onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(event) => { if (event.key === 'Escape') setSearchOpen(false); }}
          />
          {query ? <button type="button" aria-label="Clear search" onClick={() => { setQuery(''); setSearchOpen(false); }}><X size={20} aria-hidden="true" /></button> : null}
          {searchOpen && query.trim().length >= 2 ? (
            <ul className="icc-search-results" role="listbox" aria-label="Search results">
              {results.length === 0 ? <li className="icc-search-empty">No matching SENTRY records.</li> : results.map((result) => (
                <li key={result.key}>
                  <button type="button" onClick={() => flyTo(result)}>
                    <b>{result.title}</b>
                    <span>{result.sub}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="icc-chips" role="group" aria-label="Filter incidents by hazard">
          <button type="button" className={`icc-chip${activeFilter === 'all' ? ' active' : ''}`} aria-pressed={activeFilter === 'all'} onClick={() => setFilterKey('all')}>
            All <b>{(incidents || []).length}</b>
          </button>
          {chips.map((chip) => (
            <button key={chip.key} type="button" className={`icc-chip${activeFilter === chip.key ? ' active' : ''}`} aria-pressed={activeFilter === chip.key} onClick={() => setFilterKey(chip.key)}>
              {chip.label} <b>{chip.count}</b>
            </button>
          ))}
        </div>
      </div>

      {view.overlay === 'rain' ? (
        <div className="icc-legend" aria-label="Rainfall legend">
          <b>RAINFALL RATE · NASA IMERG</b>
          <i className="icc-legend-ramp" />
          <span className="icc-legend-ends"><em>light</em><em>heavy</em></span>
          <small>Latest daily composite; may lag real time.</small>
        </div>
      ) : null}
      {view.overlay === 'rivers' ? (
        <div className="icc-legend" aria-label="River level legend">
          <b>RIVER DISCHARGE · MODEL ESTIMATE</b>
          <span className="icc-legend-row"><i style={{ background: '#d97732' }} />Rising fast</span>
          <span className="icc-legend-row"><i style={{ background: '#c9a227' }} />Rising</span>
          <span className="icc-legend-row"><i style={{ background: '#3d8b63' }} />Steady</span>
          <span className="icc-legend-row"><i style={{ background: '#4f7c8a' }} />Falling</span>
          <small>Open-Meteo GloFAS, not a gauge reading.</small>
        </div>
      ) : null}

      <div className="icc-map-stage">
        {show3d ? (
          <Map3D
            controls={controls}
            incidents={controls.visibleIncidents}
            allIncidents={incidents}
            habitations={habitations}
            sites={sites}
            areas={areas}
            canDraw={canDraw}
            onCreateArea={onCreateArea}
            heatPlaces={heatPlaces}
            hazardEvents={hazardEvents}
            quakes={quakes}
            stateIndex={stateIndex}
            stateRows={stateRows}
            scopeId={scopeId}
            focus={focus}
            onSelectView={onSelectView}
            focusPresetId={focusPresetId}
            onFocusPresetChange={setFocusPresetId}
            controlsTarget={controlsTarget}
            controlsActive={show3d}
            onMapInstance={setGlMap}
            onFail={handleGlFail}
          />
        ) : null}
        <GisCommandCenter
          role="authority"
          embedded
          liveIncidents={incidents}
          areas={areas}
          people={people}
          naturalEvents={naturalEvents}
          initialHudMode="tactical"
          initialMapStyle="osmdark"
          focusRegion={focus.id}
          focusToken={focus.token}
          basemapStyle={view.basemap}
          onBasemapChange={handleBasemapChange}
          incidentIdFilter={incidentIdFilter}
          overlay={overlay}
          onMapInstance={handleMapInstance}
          focusPresetId={focusPresetId}
          onFocusPresetChange={setFocusPresetId}
          controlsTarget={controlsTarget}
          controlsActive={!show3d}
        />
        <div className="icc-controls-dock-content" ref={setControlsTarget} />
      </div>
    </section>
  );
}
