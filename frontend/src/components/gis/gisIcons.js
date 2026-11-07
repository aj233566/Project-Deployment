import L from 'leaflet';
import { markerSurfaceStyle, roadMarkerVisual } from '../../config/markerVisuals';
const SEVERITY_COLORS = {
  Critical: '#D64545',
  High: '#D97732',
  Warning: '#C9A227',
  Operational: '#3D8B63',
  Info: '#3B82F6',
  Default: '#4F7C8A'
};
export function createIncidentIcon(severity = 'Warning', isSelected = false, isArrival = false) {
  const color = SEVERITY_COLORS[severity] || SEVERITY_COLORS.Default;
  const size = isSelected ? 34 : 28;
  const html = `
    <div class="gis-marker-wrapper ${isSelected ? 'is-selected' : ''}">
      <div class="gis-marker-pulse" style="border-color: ${color}"></div>
      ${isArrival ? '<div class="gis-marker-pulse is-arrival" style="border-color: ' + color + '"></div>' : ''}
      <div class="gis-marker-badge gis-marker-badge--incident${isArrival ? ' is-arrival' : ''}" style="${markerSurfaceStyle(color)}; width: ${size}px; height: ${size}px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'gis-custom-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
}
export function createRoadBlockIcon(roadStatus = 'Blocked', isSelected = false) {
  const visual = roadMarkerVisual(roadStatus);
  const size = isSelected ? 34 : 28;
  const html = `
    <div class="gis-marker-wrapper ${isSelected ? 'is-selected' : ''}" role="img" aria-label="${visual.label}">
      <div class="gis-marker-badge road-status-badge" style="${markerSurfaceStyle(visual.color)}; width: ${size}px; height: ${size}px; font-size: ${isSelected ? 16 : 14}px;">
        ${visual.glyph}
      </div>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'gis-custom-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}
export function createUserPinIcon(isSelected = false) {
  const color = '#22D3EE';
  const h = isSelected ? 40 : 34;
  const w = Math.round(h * 0.72);
  const html = `
    <div class="gis-user-pin ${isSelected ? 'is-selected' : ''}">
      <svg width="${w}" height="${h}" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.4 0 0 5.2 0 11.6 0 20.4 12 32 12 32s12-11.6 12-20.4C24 5.2 18.6 0 12 0Z" fill="#0E1419" stroke="${color}" stroke-width="2"/>
        <circle cx="12" cy="11.5" r="4.4" fill="${color}"/>
      </svg>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'gis-custom-icon',
    iconSize: [w, h],
    iconAnchor: [Math.round(w / 2), h],
    popupAnchor: [0, -h + 6]
  });
}
export function createHospitalIcon(roadAccess = 'Open', isSelected = false) {
  const isBlocked = roadAccess === 'Blocked';
  const color = isBlocked ? '#D64545' : '#3B82F6';
  const size = isSelected ? 32 : 26;
  const html = `
    <div class="gis-marker-wrapper ${isSelected ? 'is-selected' : ''}">
      <div class="gis-marker-badge facility-hospital" style="${markerSurfaceStyle(color)}; width: ${size}px; height: ${size}px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 6v12"/>
          <path d="M6 12h12"/>
        </svg>
      </div>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'gis-custom-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
}
export function createShelterIcon(isSelected = false) {
  const color = '#3D8B63';
  const size = isSelected ? 32 : 26;
  const html = `
    <div class="gis-marker-wrapper ${isSelected ? 'is-selected' : ''}">
      <div class="gis-marker-badge facility-shelter" style="${markerSurfaceStyle(color)}; width: ${size}px; height: ${size}px;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </div>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'gis-custom-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
}
export function createResourceIcon(resourceType = 'Rescue Team', status = 'Available', isSelected = false) {
  const isAvailable = status === 'Available';
  const color = isAvailable ? '#3D8B63' : '#D97732';
  const size = isSelected ? 30 : 24;
  let svgIcon;
  if (resourceType === 'Ambulance') {
    svgIcon = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="2"/>
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
        <circle cx="5.5" cy="18.5" r="2.5"/>
        <circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    `;
  } else if (resourceType === 'Generator') {
    svgIcon = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    `;
  } else {
    svgIcon = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    `;
  }
  const html = `
    <div class="gis-marker-wrapper ${isSelected ? 'is-selected' : ''}">
      <div class="gis-marker-badge resource-badge" style="${markerSurfaceStyle(color)}; width: ${size}px; height: ${size}px;">
        ${svgIcon}
      </div>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'gis-custom-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
}
export function createWaypointIcon(label = 'A', isDestination = false) {
  const color = isDestination ? '#D64545' : '#3D8B63';
  const size = 22;
  const html = `
    <div class="gis-marker-wrapper">
      <div class="gis-marker-badge waypoint-badge" style="${markerSurfaceStyle(color)}; font-size: 10px; font-weight: 700; width: ${size}px; height: ${size}px;">
        ${label}
      </div>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'gis-custom-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
}
export function createVillageIcon(riskLevel = 'Warning', connectivityStatus = 'Connected', isSelected = false) {
  const color = SEVERITY_COLORS[riskLevel] || SEVERITY_COLORS.Default;
  const isIsolated = connectivityStatus === 'Isolated';
  const size = isSelected ? 32 : 26;
  const html = `
    <div class="gis-marker-wrapper ${isSelected ? 'is-selected' : ''}">
      ${isIsolated ? '<div class="gis-marker-pulse isolated" style="border-color: #D64545"></div>' : ''}
      <div class="gis-marker-badge settlement-village ${isIsolated ? 'is-isolated' : ''}" style="${markerSurfaceStyle(isIsolated ? '#D64545' : color)}; width: ${size}px; height: ${size}px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 10.5 12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 20z"/>
          <polyline points="9 21 9 12 15 12 15 21"/>
        </svg>
      </div>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'gis-custom-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
}
