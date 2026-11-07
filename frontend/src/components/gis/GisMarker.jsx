import { useMemo } from 'react';
import { Marker } from 'react-leaflet';
import {
  createIncidentIcon,
  createRoadBlockIcon,
  createHospitalIcon,
  createShelterIcon,
  createResourceIcon,
  createWaypointIcon,
  createVillageIcon
} from './gisIcons';
export default function GisMarker({
  position,
  kind = 'incident',
  severity = 'Warning',
  riskLevel,
  connectivityStatus = 'Connected',
  roadAccess = 'Open',
  status = 'Active',
  resourceType = 'Rescue Team',
  waypointLabel = 'A',
  isDestination = false,
  isSelected = false,
  isArrival = false,
  onClick,
  children
}) {
  const icon = useMemo(() => {
  switch (kind) {
    case 'village':
      return createVillageIcon(riskLevel || severity, connectivityStatus, isSelected);
    case 'waypoint':
      return createWaypointIcon(waypointLabel, isDestination);
    case 'road':
      return createRoadBlockIcon(roadAccess, isSelected);
    case 'hospital':
      return createHospitalIcon(roadAccess, isSelected);
    case 'shelter':
      return createShelterIcon(isSelected);
    case 'resource':
      return createResourceIcon(resourceType, status, isSelected);
    case 'incident':
    default:
      return createIncidentIcon(severity, isSelected, isArrival);
  }
  }, [kind, severity, riskLevel, connectivityStatus, roadAccess, status, resourceType, waypointLabel, isDestination, isSelected, isArrival]);
  if (!position || typeof position[0] !== 'number' || typeof position[1] !== 'number') {
    return null;
  }
  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={onClick ? { click: onClick } : undefined}
    >
      {children}
    </Marker>
  );
}
