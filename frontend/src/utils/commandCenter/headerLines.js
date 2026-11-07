// The lines that take turns under the command-center title. Every line is built from real data and a line is left out when its data is
// missing, so the header never shows a number it cannot back up:
//   1. the area being watched (always there, so the header is never empty)
//   2. the newest open incident in view, as a ticker line
//   3. an "all clear" line, only when no critical incident is open in view
//   4. how many authorities are on the page right now (a count only, never names)
import { incidentTypeLabel, normalizeSeverity } from './incidentStats.js';
import { scopeLine } from './scopeLine.js';

const isOpen = (incident) => String(incident?.status || '').toLowerCase() !== 'resolved';

export function ageText(createdAt, now = Date.now()) {
  const time = new Date(createdAt).getTime();
  if (!Number.isFinite(time)) return null;
  const minutes = Math.max(0, Math.floor((now - time) / 60000));
  if (minutes < 1) return 'JUST NOW';
  if (minutes < 60) return `${minutes} MIN AGO`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} H AGO`;
  return `${Math.floor(hours / 24)} D AGO`;
}

function tickerLine(incidents, now) {
  const newest = incidents
    .filter((incident) => isOpen(incident) && Number.isFinite(new Date(incident.createdAt).getTime()))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  if (!newest) return null;
  const age = ageText(newest.createdAt, now);
  const fresh = now - new Date(newest.createdAt).getTime() < 24 * 3600 * 1000;
  const place = String(newest.location?.address || '').trim().slice(0, 36);
  return [fresh ? 'NEW' : 'LATEST', incidentTypeLabel(newest).toUpperCase(), place, age].filter(Boolean).join(' · ');
}

export function buildHeaderLines({ region, incidents, authoritiesOnline, now = Date.now() }) {
  const lines = [{ key: 'scope', text: scopeLine(region) }];
  if (Array.isArray(incidents)) {
    const ticker = tickerLine(incidents, now);
    if (ticker) lines.push({ key: 'ticker', text: ticker });
    const open = incidents.filter(isOpen);
    if (open.length === 0) lines.push({ key: 'clear', text: 'NO ACTIVE INCIDENTS IN THIS AREA' });
    else if (!open.some((incident) => normalizeSeverity(incident.severity) === 'critical')) lines.push({ key: 'clear', text: 'NO CRITICAL INCIDENT RIGHT NOW' });
  }
  if (Number.isFinite(authoritiesOnline) && authoritiesOnline >= 1) {
    lines.push({ key: 'online', text: `${authoritiesOnline} ${authoritiesOnline === 1 ? 'AUTHORITY' : 'AUTHORITIES'} ONLINE` });
  }
  return lines;
}
