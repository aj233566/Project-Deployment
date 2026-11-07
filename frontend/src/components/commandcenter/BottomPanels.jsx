import { useMemo, useState } from 'react';
import {
  Ambulance, Brain, CloudLightning, CloudRain, Eye, Gauge, LineChart, Mountain, Route, Siren, Snowflake, Sun, Thermometer, Users, Waves, Wind,
} from 'lucide-react';
import { FeedState, MiniBar, Panel, SeverityBadge, ToneBadge } from './hud';
import { formatDateTimeIst, relativeTime, useNow } from './format';
import { TREND_LEGEND, TrendChart } from './charts';
import {
  SEVERITY_ORDER,
  TREND_WINDOW_KEYS,
  buildIncidentTrend,
  incidentCoords,
  incidentLocationLabel,
  incidentStatusLabel,
  incidentTimeMs,
  incidentTypeLabel,
  normalizeSeverity,
  shortIncidentId,
  summarizePopulationAtRisk,
  summarizeResources,
  summarizeSites,
} from '../../utils/commandCenter/incidentStats';

const inr = (value) => Number(value).toLocaleString('en-IN');
const plural = (count, one, many) => (count === 1 ? one : many);
const severityRank = (incident) => {
  const index = SEVERITY_ORDER.indexOf(normalizeSeverity(incident?.severity));
  return index === -1 ? SEVERITY_ORDER.length : index;
};

export function IncidentsTable({ incidents, unmapped, places, loading, unavailable, onFocus, region, elsewhere = 0 }) {
  const rows = useMemo(
    () => [...incidents, ...unmapped].sort((a, b) => severityRank(a) - severityRank(b) || (incidentTimeMs(b) || 0) - (incidentTimeMs(a) || 0)),
    [incidents, unmapped],
  );
  const where = region.kind === 'national' ? 'India' : region.label;
  return (
    <Panel className="icc-incidents" title={`ACTIVE INCIDENTS (${loading ? '…' : rows.length})`} icon={Siren} kicker="SENTRY API">
      {loading ? <p className="icc-state" role="status">Loading incident reports…</p> : null}
      {!loading && unavailable ? <p className="icc-state icc-state-error" role="status">Incident data unavailable.</p> : null}
      {!loading && !unavailable && rows.length === 0 ? (
        <p className="icc-state">
          No active incident reports in {where}.
          {elsewhere > 0 ? ` ${elsewhere} active ${plural(elsewhere, 'incident is', 'incidents are')} elsewhere in SENTRY.` : ''}
        </p>
      ) : null}
      {!loading && !unavailable && rows.length > 0 ? (
        <div className="icc-table-wrap">
          <table className="icc-table">
            <caption className="icc-sr">Active incidents, most severe first</caption>
            <thead>
              <tr><th scope="col">ID</th><th scope="col">Location</th><th scope="col">Type</th><th scope="col">Risk</th><th scope="col">Reported</th><th scope="col">Status</th></tr>
            </thead>
            <tbody>
              {rows.map((incident) => {
                const canFocus = Boolean(incidentCoords(incident));
                return (
                  <tr key={incident._id || incident.id}>
                    <td>
                      {canFocus
                        ? <button type="button" className="icc-idbtn" onClick={() => onFocus(incident)} title="Show on map">{shortIncidentId(incident)}</button>
                        : shortIncidentId(incident)}
                    </td>
                    <td className="icc-cell-wrap">{incidentLocationLabel(incident, places)}</td>
                    <td>{incidentTypeLabel(incident)}</td>
                    <td><SeverityBadge level={normalizeSeverity(incident.severity)} /></td>
                    <td className="icc-nowrap">{formatDateTimeIst(incident.createdAt || incident.reportedAt)}</td>
                    <td>{incidentStatusLabel(incident)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </Panel>
  );
}

export function ResourcePanel({ feed, region, elsewhere = 0 }) {
  const summary = useMemo(() => summarizeResources(feed.data), [feed.data]);
  const national = region.kind === 'national';
  return (
    <Panel className="icc-resources" title="RESOURCE DEPLOYMENT" icon={Ambulance} kicker={national ? 'ALL AREAS' : region.label}>
      <FeedState
        feed={feed}
        label="resource register"
        empty={summary.rows.length === 0}
        emptyText={national
          ? 'No resources are registered in SENTRY yet.'
          : `No resources are registered for ${region.label}.${elsewhere > 0 ? ` ${elsewhere} ${plural(elsewhere, 'resource is', 'resources are')} registered in other areas.` : ''}`}
      >
        <div className="icc-summary">
          <strong>{summary.available}<small> / {summary.total}</small></strong>
          <span>units available · {summary.deployed} deployed</span>
        </div>
        <ul className="icc-list icc-resource-list">
          {summary.rows.map((row) => (
            <li key={row.id}>
              <div className="icc-row-line"><b>{row.name}</b><span>{row.available}/{row.total} available</span></div>
              <MiniBar value={row.available} max={row.total} tone="green" label={`${row.available} of ${row.total} ${row.name} available`} />
              <small>{[row.category, row.location].filter(Boolean).join(' · ')}{row.deployed ? ` · ${row.deployed} deployed` : ''}</small>
            </li>
          ))}
        </ul>
      </FeedState>
      {national ? null : <p className="icc-caption">Matched by the place written on each resource record.</p>}
    </Panel>
  );
}

const ACCESS_TONE = { OPEN: 'green', RESTRICTED: 'yellow', BLOCKED: 'red', UNKNOWN: 'muted' };

export function EvacuationPanel({ sitesFeed, roads, region }) {
  const sites = useMemo(() => summarizeSites(sitesFeed.data), [sitesFeed.data]);
  const blocked = roads.filter((road) => road.status === 'blocked').length;
  const restricted = roads.filter((road) => road.status === 'restricted').length;
  return (
    <Panel className="icc-evac" title="EVACUATION & ROADS" icon={Route} kicker={region.kind === 'national' ? 'SENTRY' : region.label}>
      <div className="icc-roadline">
        <span className={blocked ? 'icc-tone-text-red' : ''}><b>{blocked}</b> blocked</span>
        <span className={restricted ? 'icc-tone-text-yellow' : ''}><b>{restricted}</b> restricted</span>
        <span><b>{sites.open}</b>/{sites.total} sites open</span>
      </div>
      <FeedState feed={sitesFeed} label="relocation sites" empty={sites.rows.length === 0} emptyText={region.kind === 'national' ? 'No relocation sites registered.' : `No relocation sites registered in ${region.label}.`}>
        <ul className="icc-list icc-site-list">
          {sites.rows.map((site) => (
            <li key={site.id}>
              <div className="icc-row-line"><b>{site.name}</b><ToneBadge tone={ACCESS_TONE[site.roadAccess] || 'muted'}>{site.roadAccess}</ToneBadge></div>
              {site.total ? <MiniBar value={site.available ?? 0} max={site.total} tone={site.roadAccess === 'OPEN' ? 'green' : 'yellow'} label={`${site.available ?? 0} of ${site.total} places free at ${site.name}`} /> : null}
              <small>{site.available !== null ? `${inr(site.available)} places free of ${inr(site.total)}` : 'Capacity not recorded'}</small>
            </li>
          ))}
        </ul>
      </FeedState>
    </Panel>
  );
}

const TREND_LABELS = { '24h': '24 H', '7d': '7 D', '30d': '30 D' };

export function TrendPanel({ incidents, loading }) {
  const [windowKey, setWindowKey] = useState('7d');
  const now = useNow(60000);
  const trend = useMemo(() => buildIncidentTrend(incidents, windowKey, now), [incidents, windowKey, now]);
  return (
    <Panel
      className="icc-trend"
      title="INCIDENT TREND"
      icon={LineChart}
      actions={(
        <div className="icc-minitabs" role="tablist" aria-label="Trend window">
          {TREND_WINDOW_KEYS.map((key) => (
            <button key={key} type="button" role="tab" aria-selected={key === windowKey} className={key === windowKey ? 'active' : ''} onClick={() => setWindowKey(key)}>{TREND_LABELS[key]}</button>
          ))}
        </div>
      )}
    >
      {loading ? <p className="icc-state" role="status">Loading incident history…</p> : (
        <>
          <TrendChart trend={trend} />
          <ul className="icc-legend-inline" aria-label="Severity totals">
            {TREND_LEGEND.map((line) => (
              <li key={line.key}><i style={{ background: line.color }} aria-hidden="true" />{line.label} <b>{trend.totals[line.key]}</b></li>
            ))}
          </ul>
          {trend.totals.total === 0 ? <p className="icc-caption">No incidents were reported in the last {TREND_LABELS[windowKey].toLowerCase()}.</p> : null}
        </>
      )}
    </Panel>
  );
}

const LEVEL_TONE = { RED: 'red', ORANGE: 'orange', YELLOW: 'yellow', GREEN: 'green', UNASSESSED: 'muted' };

export function PopulationPanel({ habitations, loading, unavailable, region }) {
  const summary = useMemo(() => summarizePopulationAtRisk(habitations), [habitations]);
  const top = summary.rows.slice(0, 5);
  const maxPopulation = Math.max(1, ...top.map((row) => row.population));
  return (
    <Panel className="icc-population" title="POPULATION AT RISK" icon={Users} kicker={region.kind === 'national' ? 'HABITATIONS' : region.label}>
      {loading ? <p className="icc-state" role="status">Loading habitation records…</p> : null}
      {!loading && unavailable ? <p className="icc-state icc-state-error" role="status">Habitation records unavailable.</p> : null}
      {!loading && !unavailable ? (
        <>
          <div className="icc-summary">
            <strong className="icc-tone-text-red">{inr(summary.atRisk)}</strong>
            <span>people in red / orange zones · {inr(summary.watch)} in yellow</span>
          </div>
          <ul className="icc-list icc-pop-list">
            {top.map((row) => (
              <li key={row.id}>
                <div className="icc-row-line"><b>{row.name}</b><span>{inr(row.population)}</span></div>
                <MiniBar value={row.population} max={maxPopulation} tone={LEVEL_TONE[row.level] === 'muted' ? 'cyan' : LEVEL_TONE[row.level]} label={`${inr(row.population)} people at ${row.name}`} />
                <small><ToneBadge tone={LEVEL_TONE[row.level]}>{row.level === 'UNASSESSED' ? 'NOT ASSESSED' : row.level}</ToneBadge>{row.district ? ` ${row.district}` : ''}{row.score !== null ? ` · risk ${row.score}/100` : ''}</small>
              </li>
            ))}
            {top.length === 0 ? <li className="icc-state">{region.kind === 'national' ? 'No habitations with a recorded population.' : `No habitations with a recorded population in ${region.label}.`}</li> : null}
          </ul>
        </>
      ) : null}
    </Panel>
  );
}

const KIND_ICON = { rain: CloudRain, wind: Wind, aqi: Gauge, visibility: Eye, heat: Thermometer, cold: Snowflake, snow: Snowflake, storm: CloudLightning, uv: Sun, wave: Waves, landslide: Mountain };
const LEVEL_TONE_ALERT = { red: 'red', orange: 'orange', yellow: 'yellow' };

function riskTone(level) {
  const key = String(level || '').toUpperCase();
  if (key === 'CRITICAL' || key === 'RED' || key === 'SEVERE') return 'red';
  if (key === 'HIGH' || key === 'ORANGE') return 'orange';
  if (key === 'MODERATE' || key === 'MEDIUM' || key === 'YELLOW') return 'yellow';
  return 'green';
}

export function ForecastPanel({ forecastAlerts, places, feed, sentryAlerts, region }) {
  const now = useNow();
  const active = (Array.isArray(sentryAlerts) ? sentryAlerts : []).filter((alert) => String(alert.status || 'Active').toLowerCase() === 'active');
  const empty = Array.isArray(forecastAlerts) && forecastAlerts.length === 0 && active.length === 0;
  const placeCount = places ? places.length : 0;
  const allClear = `No watch-level rain, wind, air quality or visibility in the next 24 h across ${placeCount} monitored ${plural(placeCount, 'place', 'places')}.`;
  return (
    <Panel className="icc-forecast" title="FORECAST & RISK" icon={Brain} kicker="NEXT 24 H">
      <FeedState feed={feed} label="forecast model" empty={empty} emptyText={allClear}>
        <ul className="icc-list icc-forecast-list">
          {Array.isArray(forecastAlerts) && forecastAlerts.length === 0 ? (
            <li>
              <div className="icc-row-line"><b>Open-Meteo forecast</b><ToneBadge tone="green">ALL CLEAR</ToneBadge></div>
              <p>{allClear}</p>
            </li>
          ) : null}
          {(forecastAlerts || []).map((alert) => {
            const Icon = KIND_ICON[alert.kind] || Gauge;
            return (
              <li key={alert.id}>
                <div className="icc-row-line"><b><Icon size={20} aria-hidden="true" /> {alert.place}</b><ToneBadge tone={LEVEL_TONE_ALERT[alert.level]}>{alert.level.toUpperCase()}</ToneBadge></div>
                <p>{alert.title}: {alert.detail}</p>
                <small>Open-Meteo model forecast</small>
              </li>
            );
          })}
          {active.map((alert) => (
            <li key={alert._id || alert.fingerprint}>
              <div className="icc-row-line"><b>{String(alert.disasterType || 'Risk').replace(/^./, (c) => c.toUpperCase())} · {alert.location?.name || 'location not recorded'}</b><ToneBadge tone={riskTone(alert.riskLevel)}>{String(alert.riskLevel || 'UNRATED').toUpperCase()}</ToneBadge></div>
              <p>Risk score {alert.riskScore ?? '—'}/100{Number.isFinite(alert.aiConfidence) ? ` · AI confidence ${alert.aiConfidence}%` : ''}</p>
              <small>SENTRY risk engine · {relativeTime(alert.updatedAt || alert.createdAt, now)}</small>
            </li>
          ))}
        </ul>
      </FeedState>
      <p className="icc-caption">Model-derived watch levels for {region.kind === 'national' ? 'India' : region.label}: rain, landslide watch on hills, sea waves, heat, cold, thunderstorm and lightning risk, wind, snow, UV, air quality and visibility. Not official warnings.</p>
    </Panel>
  );
}
