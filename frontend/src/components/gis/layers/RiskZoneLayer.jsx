import { memo } from 'react';
import { Polygon, Circle } from 'react-leaflet';
import MapPopup from '../MapPopup';
function RiskZoneLayer({
  riskZones = [],
  visible = true,
  selectedRiskZoneId = null,
  onSelectRiskZone
}) {
  if (!visible || !Array.isArray(riskZones) || riskZones.length === 0) {
    return null;
  }
  const isValidPolygon = (coords) => {
    if (!Array.isArray(coords) || coords.length < 3) return false;
    return coords.every(
      (pt) =>
        Array.isArray(pt) &&
        pt.length >= 2 &&
        typeof pt[0] === 'number' &&
        !isNaN(pt[0]) &&
        typeof pt[1] === 'number' &&
        !isNaN(pt[1])
    );
  };
  const isValidCircle = (center, radius) => {
    return (
      Array.isArray(center) &&
      center.length >= 2 &&
      typeof center[0] === 'number' &&
      !isNaN(center[0]) &&
      typeof center[1] === 'number' &&
      !isNaN(center[1]) &&
      typeof radius === 'number' &&
      radius > 0
    );
  };
  const getZoneStyle = (riskLevel, isSelected) => {
    switch (riskLevel) {
      case 'Critical':
        return {
          color: '#FF2D3F',
          fillColor: '#E23D3D',
          fillOpacity: isSelected ? 0.5 : 0.38,
          weight: isSelected ? 5 : 3.6,
          dashArray: null                     
        };
      case 'High':
        return {
          color: '#F97316',
          fillColor: '#F97316',
          fillOpacity: isSelected ? 0.36 : 0.26,
          weight: isSelected ? 4 : 2.8,
          dashArray: null
        };
      case 'Warning':
      case 'Moderate':
        return {
          color: '#EAB308',
          fillColor: '#EAB308',
          fillOpacity: isSelected ? 0.28 : 0.18,
          weight: isSelected ? 3 : 2.2,
          dashArray: '5, 5'
        };
      case 'Low':
        return {
          color: '#22C55E',
          fillColor: '#22C55E',
          fillOpacity: isSelected ? 0.2 : 0.12,
          weight: isSelected ? 2.4 : 1.8,
          dashArray: '3, 7'
        };
      default:
        return {
          color: '#C9A227',
          fillColor: '#C9A227',
          fillOpacity: isSelected ? 0.28 : 0.16,
          weight: isSelected ? 2.5 : 1.8,
          dashArray: '5, 5'
        };
    }
  };
  return (
    <>
      {riskZones.map((zone) => {
        if (!zone) return null;
        const isSelected = selectedRiskZoneId === zone.id;
        const style = getZoneStyle(zone.riskLevel, isSelected);
        const zoneAnchor = zone.geometryType === 'Circle' && isValidCircle(zone.center, zone.radius)
          ? zone.center
          : zone.geometryType === 'Polygon' && isValidPolygon(zone.coordinates)
            ? [
                zone.coordinates.reduce((sum, pt) => sum + pt[0], 0) / zone.coordinates.length,
                zone.coordinates.reduce((sum, pt) => sum + pt[1], 0) / zone.coordinates.length
              ]
            : null;
        const popupContent = (
          <MapPopup
            title={zone.name}
            type="Spatial Risk Assessment"
            severity={zone.riskLevel}
            status={zone.status || 'Active Assessment'}
            description={zone.primaryFactor ? `Primary Factor: ${zone.primaryFactor}` : null}
            anchorPosition={zoneAnchor}
            metrics={[
              {
                label: 'Risk Score',
                value: zone.riskScore !== undefined ? `${zone.riskScore} / 100` : 'N/A'
              },
              {
                label: 'Vulnerable Pop.',
                value: zone.estimatedPopulation
                  ? `~${zone.estimatedPopulation.toLocaleString()} residents`
                  : 'Engine Metric'
              }
            ]}
          />
        );
        if (zone.geometryType === 'Circle' && isValidCircle(zone.center, zone.radius)) {
          return (
            <Circle
              key={zone.id}
              center={zone.center}
              radius={zone.radius}
              pathOptions={style}
              eventHandlers={onSelectRiskZone ? { click: () => onSelectRiskZone(zone) } : undefined}
            >
              {popupContent}
            </Circle>
          );
        }
        if (zone.geometryType === 'Polygon' && isValidPolygon(zone.coordinates)) {
          return (
            <Polygon
              key={zone.id}
              positions={zone.coordinates}
              pathOptions={style}
              eventHandlers={onSelectRiskZone ? { click: () => onSelectRiskZone(zone) } : undefined}
            >
              {popupContent}
            </Polygon>
          );
        }
        return null;
      })}
    </>
  );
}
export default memo(RiskZoneLayer);
