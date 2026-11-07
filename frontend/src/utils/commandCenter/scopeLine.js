// The one-line summary under the command-center title: what the page is watching, taken from the district list the sign-up form uses.
// The numbers come from that list (Local Government Directory), so they are never typed in by hand.
import stateDistricts, { unionTerritoryDistricts } from '../../data/stateDistricts.js';

const sameName = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

function districtsOf(name) {
  const key = [...Object.keys(stateDistricts), ...Object.keys(unionTerritoryDistricts)].find((candidate) => sameName(candidate, name));
  if (!key) return null;
  return (stateDistricts[key] || unionTerritoryDistricts[key] || []).length || null;
}

export function scopeLine(region) {
  const live = 'LIVE MONITORING';
  if (!region) return live;
  if (region.kind === 'national') {
    const states = Object.keys(stateDistricts).length;
    const territories = Object.keys(unionTerritoryDistricts).length;
    return `${states} STATES · ${territories} UNION TERRITORIES · ${live}`;
  }
  if (region.kind === 'state') {
    const count = districtsOf(region.title || region.label);
    return count ? `${count} ${count === 1 ? 'DISTRICT' : 'DISTRICTS'} · ${live}` : live;
  }
  return `${region.label || region.title} · ${live}`;
}
