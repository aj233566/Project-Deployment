import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { ArrowDownRight, ArrowUpRight, ExternalLink, Minus, Radio, Satellite, Waves } from 'lucide-react';
import { FeedState, Panel, ToneBadge } from './hud';
import { formatTimeIst, relativeTime, useNow } from './format';
import { RiverChart } from './charts';
import { splitSachetByLanguage } from '../../utils/commandCenter/sachetAlerts';
import { formatDischarge } from '../../utils/commandCenter/riverStatus';

const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';
const COASTLINES = `${GIBS}/Coastlines_15m/default/default/GoogleMapsCompatible_Level13/{z}/{y}/{x}.png`;

const SAT_LAYERS = [
  {
    key: 'visible',
    label: 'VISIBLE',
    note: 'NASA VIIRS true colour, latest daily pass',
    layers: [{ url: `${GIBS}/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`, native: 9 }],
  },
  {
    key: 'infrared',
    label: 'INFRARED',
    note: 'Himawari-9 clean infrared, refreshed about every 10 min',
    layers: [{ url: `${GIBS}/Himawari_AHI_Band13_Clean_Infrared/default/default/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`, native: 6 }],
  },
  {
    key: 'rain',
    label: 'RAINFALL',
    note: 'NASA IMERG precipitation rate, latest composite',
    base: true,
    layers: [{ url: `${GIBS}/IMERG_Precipitation_Rate/default/default/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`, native: 6, opacity: 0.85 }],
  },
];

// The satellite frame stretches with its row, so tell Leaflet whenever the frame changes size.
function MapSizeSync() {
  const map = useMap();
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

export function SatellitePanel({ region }) {
  const [layerKey, setLayerKey] = useState('infrared');
  const layer = SAT_LAYERS.find((entry) => entry.key === layerKey);
  return (
    <Panel
      className="icc-sat"
      title="LIVE SATELLITE"
      icon={Satellite}
      kicker={region.label}
      toolbar={(
        <div className="icc-minitabs icc-minitabs-wide" role="tablist" aria-label="Satellite layer">
          {SAT_LAYERS.map((entry) => (
            <button key={entry.key} type="button" role="tab" aria-selected={entry.key === layerKey} className={entry.key === layerKey ? 'active' : ''} onClick={() => setLayerKey(entry.key)}>{entry.label}</button>
          ))}
        </div>
      )}
    >
      <div className="icc-sat-frame">
        <MapContainer
          key={region.id}
          bounds={region.satelliteBounds || region.bounds}
          boundsOptions={{ padding: [0, 0] }}
          zoomControl={false}
          attributionControl={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          className="icc-sat-map"
        >
          <MapSizeSync />
          {layer.base ? <TileLayer className="icc-dark-tiles" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} /> : null}
          {layer.layers.map((item) => (
            <TileLayer key={`${layer.key}-${item.url}`} url={item.url} maxNativeZoom={item.native} maxZoom={19} opacity={item.opacity ?? 1} />
          ))}
          <TileLayer key={`coast-${layer.key}`} url={COASTLINES} maxNativeZoom={13} maxZoom={19} opacity={0.7} />
        </MapContainer>
      </div>
      <p className="icc-caption">{layer.note} · NASA GIBS</p>
    </Panel>
  );
}

const TREND_ICON = { 'rising-fast': ArrowUpRight, rising: ArrowUpRight, falling: ArrowDownRight, steady: Minus };

function pct(value) {
  if (!Number.isFinite(value)) return '—';
  return `${value > 0 ? '+' : ''}${value.toFixed(0)}%`;
}

export function RiverPanel({ feed, region }) {
  const [selectedId, setSelectedId] = useState(null);
  const rivers = Array.isArray(feed.data) ? feed.data : [];
  const usable = rivers.filter((river) => river.status !== 'unavailable');
  const selected = rivers.find((river) => river.id === selectedId && river.status !== 'unavailable') || usable[0] || null;
  const noPoints = region.riverPoints.length === 0;
  return (
    <Panel className="icc-river" title="RIVER MONITORING" icon={Waves} kicker="MODELLED, NOT A GAUGE">
      {noPoints ? (
        <p className="icc-state">No river monitoring point is set up for {region.label}. River points exist for the larger river basins only.</p>
      ) : (
        <FeedState feed={feed} label="river flow model" empty={usable.length === 0} emptyText={`No river point near ${region.label} returned a usable flow estimate.`}>
          {selected ? (
            <>
              <div className="icc-river-head">
                <div>
                  <span className="icc-river-name">{selected.river} · {selected.place}</span>
                  <strong className="icc-river-value">{formatDischarge(selected.today)} <small>{selected.unit}</small></strong>
                </div>
                <ToneBadge tone={selected.tone}>{selected.label.toUpperCase()}</ToneBadge>
              </div>
              <RiverChart series={selected.series} tone={selected.tone} unit={selected.unit} />
              <p className="icc-river-stats">
                <span>{pct(selected.changeDay)} vs yesterday</span>
                <span>{pct(selected.change3d)} vs 3 days ago</span>
                <span>7-day peak {selected.forecastPeak ? `${formatDischarge(selected.forecastPeak.value)} (${selected.forecastPeak.date.slice(5)})` : '—'}</span>
              </p>
              {usable.length > 1 ? (
                <ul className="icc-river-list" aria-label="Other river points">
                  {usable.map((river) => {
                    const Icon = TREND_ICON[river.status] || Minus;
                    return (
                      <li key={river.id}>
                        <button type="button" className={river.id === selected.id ? 'active' : ''} onClick={() => setSelectedId(river.id)}>
                          <span>{river.river} · {river.place}</span>
                          <b>{formatDischarge(river.today)}</b>
                          <Icon size={20} className={`icc-tone-text-${river.tone}`} aria-hidden="true" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </>
          ) : null}
        </FeedState>
      )}
    </Panel>
  );
}

const SACHET_TONE = { high: 'red', watch: 'orange', moderate: 'yellow', advisory: 'blue', local: 'muted' };
const SACHET_LABEL = { local: 'LOCAL LANGUAGE' };
const HAZARD_TONE = { red: 'red', orange: 'orange', green: 'green' };

function magnitudeTone(mag) {
  if (mag >= 5) return 'red';
  if (mag >= 4) return 'orange';
  if (mag >= 3) return 'yellow';
  return 'green';
}

function ndmaEmptyText(region, regional, scopedOnly) {
  if (!scopedOnly) return 'No English alerts in the latest feed.';
  return regional?.stateFeed?.supported
    ? `No NDMA alert in the ${region.label} feed, or in the all-India feed, names ${region.label} places right now.`
    : `No alert in the all-India feed names ${region.label} places right now, and NDMA publishes no separate feed for it.`;
}

function ndmaCaption(region, regional, scopedOnly) {
  if (!scopedOnly) return 'Source: NDMA SACHET (official CAP feed), all India. Severity is read from the alert wording.';
  if (regional?.stateFeed?.supported) {
    return `Source: NDMA SACHET: the ${region.label} feed plus all-India alerts that name its places. Severity is read from the alert wording.`;
  }
  if (regional?.stateFeed?.status === 'loading') return `Source: NDMA SACHET all-India feed, filtered to ${region.label} places. Checking for a ${region.label} feed…`;
  return `Source: NDMA SACHET all-India feed, filtered to alerts that name ${region.label} places. NDMA has no separate feed for it.`;
}

export function AlertsPanel({ sachet, regional, hazards, events, quakes, region }) {
  const now = useNow();
  const [tab, setTab] = useState('ndma');
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [showAll, setShowAll] = useState(false);
  // The alerts are shown in English by default; the ones published only in a regional language are one click away.
  const [showLocal, setShowLocal] = useState(false);
  const scoped = region.kind !== 'national';
  const scopedOnly = scoped && !showAll;
  const fullList = regional ? (scopedOnly ? regional.regional : regional.all) : [];
  const { english: englishList, localCount } = splitSachetByLanguage(fullList);
  const list = showLocal ? fullList : englishList;
  const hazardList = Array.isArray(hazards.data) ? hazards.data : [];
  const quakeList = Array.isArray(quakes.data) ? quakes.data : [];
  const eventList = events && Array.isArray(events.data) ? events.data : [];
  const currentList = tab === 'ndma' ? list : tab === 'hazard' ? hazardList : tab === 'events' ? eventList : quakeList;
  const visibleItems = (items) => showAllAlerts ? items : items.slice(0, 3);
  const tabs = [
    { key: 'ndma', label: 'NDMA', count: regional ? list.length : null },
    { key: 'hazard', label: 'HAZARDS', count: Array.isArray(hazards.data) ? hazardList.length : null, title: 'Cyclone, flood, drought and tsunami events (GDACS)' },
    { key: 'events', label: 'EVENTS', count: events && Array.isArray(events.data) ? eventList.length : null, title: 'Storms, wildfires, volcanoes, dust, snow and other natural events (NASA EONET)' },
    { key: 'quake', label: 'QUAKES', count: Array.isArray(quakes.data) ? quakeList.length : null },
  ];
  return (
    <Panel
      className="icc-alerts"
      title="ALERTS & HAZARDS"
      icon={Radio}
      kicker={scoped ? region.label : 'ALL INDIA'}
      toolbar={(
        <div className="icc-minitabs icc-minitabs-wide" role="tablist" aria-label="Alert source">
          {tabs.map((entry) => (
            <button key={entry.key} type="button" role="tab" title={entry.title} aria-selected={tab === entry.key} className={tab === entry.key ? 'active' : ''} onClick={() => { setTab(entry.key); setShowAllAlerts(false); }}>
              {entry.label}{entry.count !== null ? <b>{entry.count}</b> : null}
            </button>
          ))}
        </div>
      )}
    >
      {tab === 'ndma' ? (
        <FeedState feed={sachet} label="NDMA SACHET alerts" empty={list.length === 0} emptyText={localCount > 0 ? `No English alert right now; ${localCount} alert${localCount === 1 ? ' is' : 's are'} published only in a regional language.` : ndmaEmptyText(region, regional, scopedOnly)}>
          <ul className="icc-list">
            {visibleItems(list).map((alert) => (
              <li key={alert.id} className="icc-alert-row">
                <div className="icc-row-meta">
                  <ToneBadge tone={SACHET_TONE[alert.level]}>{SACHET_LABEL[alert.level] || alert.level.toUpperCase()}</ToneBadge>
                  <span>{alert.agency}</span>
                  <time>{relativeTime(alert.time, now)}</time>
                </div>
                <p>{alert.title}</p>
              </li>
            ))}
          </ul>
        </FeedState>
      ) : null}
      {tab === 'ndma' && localCount > 0 ? (
        <button type="button" className="icc-linkbtn" onClick={() => setShowLocal((value) => !value)}>
          {showLocal ? 'Show English alerts only' : `Also show ${localCount} alert${localCount === 1 ? '' : 's'} in a regional language`}
        </button>
      ) : null}
      {tab === 'ndma' && scoped && regional ? (
        <button type="button" className="icc-linkbtn" onClick={() => setShowAll((value) => !value)}>
          {showAll ? `Show only ${region.label} alerts (${regional.regional.length})` : `Show all-India alerts (${regional.all.length})`}
        </button>
      ) : null}
      {tab === 'hazard' ? (
        <FeedState feed={hazards} label="GDACS hazard events" empty={hazardList.length === 0} emptyText={scoped ? `No active cyclone or flood event near ${region.label} in GDACS.` : 'No active cyclone, flood or wildfire event near India in GDACS.'}>
          <ul className="icc-list">
            {visibleItems(hazardList).map((event) => (
              <li key={event.id} className="icc-alert-row">
                <div className="icc-row-meta">
                  <ToneBadge tone={HAZARD_TONE[event.level]}>{event.level.toUpperCase()}</ToneBadge>
                  <span>{event.typeLabel}</span>
                  <time>{event.current ? 'ongoing' : 'ended'}</time>
                </div>
                <p><b>{event.name}</b>{event.country ? ` · ${event.country}` : ''}{event.severity ? ` · ${event.severity.trim()}` : ''}</p>
                {event.url ? <a className="icc-extlink" href={event.url} target="_blank" rel="noreferrer">GDACS report <ExternalLink size={18} aria-hidden="true" /></a> : null}
              </li>
            ))}
          </ul>
        </FeedState>
      ) : null}
      {tab === 'events' ? (
        <FeedState feed={events || { status: 'loading', data: null }} label="NASA EONET natural events" empty={eventList.length === 0} emptyText={scoped ? `No open natural event near ${region.label} in NASA EONET.` : 'No open natural event around India in NASA EONET.'}>
          <ul className="icc-list">
            {visibleItems(eventList).map((event) => (
              <li key={event.id} className="icc-alert-row">
                <div className="icc-row-meta">
                  <ToneBadge tone="orange">{event.typeLabel.toUpperCase()}</ToneBadge>
                  <time>{event.updated ? relativeTime(event.updated, now) : ''}</time>
                </div>
                <p><b>{event.name}</b>{event.severity ? ` · ${event.severity}` : ''}</p>
                {event.url ? <a className="icc-extlink" href={event.url} target="_blank" rel="noreferrer">Details <ExternalLink size={18} aria-hidden="true" /></a> : null}
              </li>
            ))}
          </ul>
        </FeedState>
      ) : null}
      {tab === 'quake' ? (
        <FeedState feed={quakes} label="USGS earthquakes" empty={quakeList.length === 0} emptyText={scoped ? `No earthquake of magnitude 2.5 or more near ${region.label} in the last 7 days.` : 'No earthquake of magnitude 2.5 or more in the India region in the last 7 days.'}>
          <ul className="icc-list">
            {visibleItems(quakeList).map((quake) => (
              <li key={quake.id} className="icc-quake-row">
                <ToneBadge tone={magnitudeTone(quake.mag)}>M {quake.mag.toFixed(1)}</ToneBadge>
                {quake.tsunami ? <ToneBadge tone="red">TSUNAMI MESSAGE</ToneBadge> : null}
                <div>
                  <p>{quake.place}</p>
                  <span>{quake.depthKm !== null ? `${Math.round(quake.depthKm)} km deep · ` : ''}{formatTimeIst(quake.time)} IST · {relativeTime(quake.time, now)}</span>
                </div>
              </li>
            ))}
          </ul>
        </FeedState>
      ) : null}
      {currentList.length > 3 ? (
        <button type="button" className="icc-linkbtn icc-alert-expand" onClick={() => setShowAllAlerts((value) => !value)} aria-expanded={showAllAlerts}>
          {showAllAlerts ? 'Show latest 3' : `Show all ${currentList.length} entries`}
        </button>
      ) : null}
      <p className="icc-caption">
        {tab === 'ndma' ? <>{ndmaCaption(region, regional, scopedOnly)}{showLocal && list.some((alert) => alert.level === 'local') ? ' Alerts in a regional language are shown as published, without a severity level.' : (localCount > 0 ? ' Showing the alerts that have English wording.' : '')}{regional?.stale ? ' Showing the last good copy.' : ''}</> : null}
        {tab === 'hazard' ? <>Source: GDACS (UN / European Commission), last 30 days{scoped ? `, within about 150 km of ${region.label}` : ''}.</> : null}
        {tab === 'events' ? <>Source: NASA EONET, open events in the last 30 days around India{scoped ? `, within about 150 km of ${region.label}` : ''}. Wildfires, storms, volcanoes, dust, snow and temperature extremes.</> : null}
        {tab === 'quake' ? <>Source: USGS, magnitude 2.5+, last 7 days{scoped ? `, within about 150 km of ${region.label}` : ', India and neighbouring region'}.</> : null}
      </p>
    </Panel>
  );
}
