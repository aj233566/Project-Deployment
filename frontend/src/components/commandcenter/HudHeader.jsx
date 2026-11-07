import { useEffect, useState } from 'react';
import {
  Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, Droplets, Eye, LogOut, Moon, Snowflake, Sun, Wind,
} from 'lucide-react';
import { aqiBand } from '../../utils/commandCenter/forecastAlerts';
import { compassPoint, describeWeather, formatVisibility } from '../../utils/commandCenter/weatherCodes';
import { scopeLine } from '../../utils/commandCenter/scopeLine';

const WEATHER_ICONS = { clear: Sun, partly: CloudSun, cloud: Cloud, fog: CloudFog, rain: CloudRain, snow: Snowflake, storm: CloudLightning };

const SUBTITLES = {
  national: 'SENETRY COMMAND CENTER',
  region: 'SENETRY COMMAND CENTER',
  state: 'SENETRY COMMAND CENTER',
};

function formatClock(date) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(date);
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }).format(date).toUpperCase();
}

// Owns the one-second tick so the rest of the page (and the map) is not re-rendered every second.
function ClockBlock({ apiStatus }) {
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const live = apiStatus === 'live';
  return (
    <div className="icc-clock">
      <span className="icc-clock-date">{formatDate(clock)}</span>
      <strong className="icc-clock-time">{formatClock(clock)}</strong>
      <span className="icc-clock-zone">IST (UTC+05:30)</span>
      <span className={`icc-live icc-live-${apiStatus}`}><i aria-hidden="true" />{live ? 'LIVE' : apiStatus === 'partial' ? 'PARTIAL' : 'CONNECTING'}</span>
    </div>
  );
}

const LINE_MS = 6000;

// The line under the title. When there is more than one line (area, newest incident, all clear, authorities online) they take turns.
function BrandLine({ lines }) {
  const [tick, setTick] = useState(0);
  const count = lines.length;
  useEffect(() => {
    if (count < 2) return undefined;
    const timer = window.setInterval(() => setTick((value) => value + 1), LINE_MS);
    return () => window.clearInterval(timer);
  }, [count]);
  const line = lines[tick % count] || lines[0];
  return <p className="icc-brand-line"><span key={line.key} className="icc-brand-line-text">{line.text}</span></p>;
}

function BrandMark() {
  return (
    <img className="icc-brand-mark" src="/senetry-mark.svg" alt="SENETRY" />
  );
}

function Kpi({ tone, label, value, loading, delta, sub }) {
  return (
    <div className={`icc-kpi icc-kpi-${tone}`}>
      <span className="icc-kpi-label">{label}</span>
      <strong className="icc-kpi-value">{loading ? '…' : value ?? '—'}</strong>
      <span className="icc-kpi-delta">{loading || value === null ? sub : delta}</span>
    </div>
  );
}

function deltaText(count) {
  return count > 0 ? `▲ +${count} in 24 h` : '0 new in 24 h';
}

function CityAverageBlock({ summary }) {
  const wettest = summary.wettest
    ? `${summary.wettest.name} ${Math.round(summary.wettest.rain24h)} mm`
    : 'No significant rain';
  return (
    <div className="icc-weather" aria-label={`Average of ${summary.count} monitored cities`}>
      <div className="icc-weather-main">
        <CloudSun size={46} strokeWidth={1.5} aria-hidden="true" className="icc-weather-icon" />
        <div>
          <strong className="icc-weather-temp">{Number.isFinite(summary.temperature) ? `${Math.round(summary.temperature)}°C` : '—'}</strong>
          <span className="icc-weather-text">Average of {summary.count} cities</span>
        </div>
      </div>
      <dl className="icc-weather-stats">
        <div><dt><Droplets size={18} aria-hidden="true" /> Humidity</dt><dd>{Number.isFinite(summary.humidity) ? `${Math.round(summary.humidity)}%` : '—'}</dd></div>
        <div><dt><Wind size={18} aria-hidden="true" /> Wind</dt><dd>{Number.isFinite(summary.windSpeed) ? `${Math.round(summary.windSpeed)} km/h` : '—'}</dd></div>
        <div><dt><CloudRain size={18} aria-hidden="true" /> Wettest 24 h</dt><dd>{wettest}</dd></div>
        <div><dt><Sun size={18} aria-hidden="true" /> Hottest now</dt><dd>{summary.hottest ? `${summary.hottest.name} ${Math.round(summary.hottest.temperature)}°C` : '—'}</dd></div>
      </dl>
    </div>
  );
}

function WeatherBlock({ weather, air, regionLabel, pointLabel }) {
  const data = weather.data;
  if (!data) {
    return (
      <div className="icc-weather" aria-label="Weather">
        <p className="icc-state">{weather.status === 'loading' ? 'Loading weather…' : 'Weather unavailable'}</p>
      </div>
    );
  }
  const { text, icon } = describeWeather(data.weatherCode);
  const Icon = icon === 'clear' && !data.isDay ? Moon : WEATHER_ICONS[icon] || Cloud;
  const band = air ? aqiBand(air.aqi) : null;
  return (
    <div className="icc-weather" aria-label={`Weather at ${regionLabel}`}>
      <div className="icc-weather-main">
        <Icon size={46} strokeWidth={1.5} aria-hidden="true" className="icc-weather-icon" />
        <div>
          <strong className="icc-weather-temp">{Number.isFinite(data.temperature) ? `${Math.round(data.temperature)}°C` : '—'}</strong>
          <span className="icc-weather-text">{text}</span>
          {pointLabel ? <span className="icc-weather-place">{pointLabel}</span> : null}
        </div>
      </div>
      <dl className="icc-weather-stats">
        <div><dt><Droplets size={18} aria-hidden="true" /> Humidity</dt><dd>{Number.isFinite(data.humidity) ? `${Math.round(data.humidity)}%` : '—'}</dd></div>
        <div><dt><Wind size={18} aria-hidden="true" /> Wind</dt><dd>{Number.isFinite(data.windSpeed) ? `${Math.round(data.windSpeed)} km/h ${compassPoint(data.windDirection)}`.trim() : '—'}</dd></div>
        <div><dt><Eye size={18} aria-hidden="true" /> Visibility</dt><dd>{formatVisibility(data.visibilityM)}</dd></div>
        {air ? (
          <div><dt>AQI (US)</dt><dd className={`icc-tone-text-${band.tone}`}>{Number.isFinite(air.aqi) ? `${Math.round(air.aqi)} · ${band.label.split(' ')[0]}` : '—'}</dd></div>
        ) : null}
      </dl>
    </div>
  );
}

function FeedStatus({ feeds, user, onLogout }) {
  return (
    <div className="icc-feeds" aria-label="Data feed status">
      <span className="icc-feeds-title">DATA FEEDS</span>
      <ul>
        {feeds.map((feed) => (
          <li key={feed.label}>
            <i className={`icc-dot icc-dot-${feed.status}`} aria-hidden="true" />
            <span>{feed.label}</span>
            <b className={`icc-feed-state icc-feed-${feed.status}`}>{feed.status === 'live' ? 'LIVE' : feed.status === 'loading' ? '…' : feed.status === 'stale' ? 'STALE' : 'DOWN'}</b>
          </li>
        ))}
      </ul>
      <div className="icc-user">
        <span>{user?.name || 'Authority'}</span>
        <button type="button" onClick={onLogout} title="Log out"><LogOut size={20} aria-hidden="true" /> Log out</button>
      </div>
    </div>
  );
}

export default function HudHeader({ region, apiStatus, kpis, loading, weather, air, citySummary, feeds, user, onLogout, lines }) {
  const national = region.kind === 'national';
  return (
    <header className="icc-header">
      <div className="icc-brand">
        <BrandMark />
        <div className="icc-brand-text">
          <h1><span className="icc-brand-region">{region.title}</span> <span className="icc-brand-sub">{SUBTITLES[region.kind] || SUBTITLES.region}</span></h1>
          <BrandLine lines={lines && lines.length ? lines : [{ key: 'scope', text: scopeLine(region) }]} />
        </div>
      </div>

      <ClockBlock apiStatus={apiStatus} />

      {national && citySummary?.count
        ? <CityAverageBlock summary={citySummary} />
        : <WeatherBlock weather={weather} air={air} regionLabel={region.label} pointLabel={region.weatherLabel} />}
      <FeedStatus feeds={feeds} user={user} onLogout={onLogout} />

      <div className="icc-kpis">
        <Kpi tone="blue" label={national ? 'NATIONWIDE INCIDENTS' : 'TOTAL INCIDENTS'} value={kpis.total} loading={loading} delta={kpis.unmapped ? `${deltaText(kpis.recent.total)} · ${kpis.unmapped} unmapped` : deltaText(kpis.recent.total)} sub="active in view" />
        <Kpi tone="critical" label="CRITICAL" value={kpis.critical} loading={loading} delta={deltaText(kpis.recent.critical)} sub="" />
        <Kpi tone="high" label="HIGH" value={kpis.high} loading={loading} delta={deltaText(kpis.recent.high)} sub="" />
        <Kpi tone="medium" label="MEDIUM" value={kpis.medium} loading={loading} delta={deltaText(kpis.recent.medium)} sub="" />
        <Kpi tone="low" label="LOW" value={kpis.low} loading={loading} delta={deltaText(kpis.recent.low)} sub="" />
        <Kpi tone="safe" label="SAFE SITES" value={kpis.safeSites} loading={loading} delta="open relocation sites" sub="" />
      </div>
    </header>
  );
}
