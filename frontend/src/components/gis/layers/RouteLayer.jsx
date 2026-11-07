import { Fragment, memo } from 'react';
import { Polyline, Tooltip } from 'react-leaflet';
import { shouldShowLabel, PRIORITY_WEIGHTS } from '../../../utils/gis/overlayPriority';
function RouteLayer({
  routes = [],
  visible = true,
  selectedRouteId = null,
  onSelectRoute,
  hudMode = 'tactical'
}) {
  if (!visible || !Array.isArray(routes) || routes.length === 0) {
    return null;
  }
  const isValidGeometry = (coords) => {
    if (!Array.isArray(coords) || coords.length < 2) return false;
    return coords.every(
      (pt) =>
        Array.isArray(pt) &&
        pt.length >= 2 &&
        Number.isFinite(pt[0]) &&
        Number.isFinite(pt[1])
    );
  };
  const validRoutes = routes.filter((r) => r && isValidGeometry(r.coordinates));
  const getRouteStyle = (type, isSelected, trafficLevel) => {
    switch (type) {
      case 'Primary':
        return {
          color: '#22D3EE',
          weight: isSelected ? 5 : 3.6,
          opacity: 0.96,
          lineCap: 'round',
          lineJoin: 'round',
          dashArray: '9 13',
        };
      case 'Affected':
        return {
          color: '#D64545',
          dashArray: '6, 6',
          weight: isSelected ? 4.5 : 3.5,
          opacity: 0.9,
          lineCap: 'round'
        };
      case 'Alternative':
      default:
        return {
          color: trafficLevel === 'HEAVY' || trafficLevel === 'SEVERE' ? '#D97732' : '#C9A227',
          dashArray: '8, 6',
          weight: isSelected ? 4.0 : 3.0,
          opacity: 0.85,
          lineCap: 'round'
        };
    }
  };
  return (
    <>
      {validRoutes.map((route) => {
        const isSelected = selectedRouteId === route.id;
        const isPrimary = route.type === 'Primary';
        const style = getRouteStyle(route.type, isSelected, route.trafficLevel);
        const priority = isPrimary
          ? PRIORITY_WEIGHTS.PRIMARY_ROUTE
          : PRIORITY_WEIGHTS.ROUTINE_ROAD;
        const showLabel = shouldShowLabel(priority, hudMode, isSelected);
        const trafficText = ['HEAVY', 'SEVERE'].includes(route.trafficLevel)
          ? ` [${route.trafficLevel}]`
          : '';
        const etaMinutes = Number.isFinite(route.trafficAwareEtaMin)
          ? route.trafficAwareEtaMin
          : Number.isFinite(route.travelTimeEtaMin)
            ? route.travelTimeEtaMin
            : Number.isFinite(route.freeFlowEtaMin)
              ? route.freeFlowEtaMin
              : null;
        const routeSource = route.source === 'LIVE_OSM' ? 'OSM road estimate' : route.source === 'SIMULATED' ? 'demo route' : route.source || null;
        const routeMeta = [
          Number.isFinite(route.distanceKm) ? `${route.distanceKm} km` : null,
          etaMinutes === null ? null : `~${etaMinutes} min`,
          routeSource,
        ].filter(Boolean).join(' · ');
        const routeLabel = `[${route.id}] ${route.name}${routeMeta ? ` · ${routeMeta}` : ''}${trafficText}`;
        return (
          <Fragment key={route.id}>
          <Polyline
            positions={route.coordinates}
            pane="gisRoutePane"
            pathOptions={{ ...style, color: '#071114', weight: (style.weight || 4) + 4, opacity: 0.9, dashArray: null, className: '' }}
            interactive={false}
          />
          <Polyline
            positions={route.coordinates}
            pane="gisRoutePane"
            pathOptions={style}
            eventHandlers={{
              click: () => onSelectRoute && onSelectRoute(route)
            }}
          >
            {showLabel && isSelected ? (
              <Tooltip
                permanent
                direction="bottom"
                offset={[0, 16]}
                className="gis-tactical-label-permanent primary-route-label"
              >
                <span>{routeLabel}</span>
              </Tooltip>
            ) : (
              <Tooltip sticky className="gis-tactical-tooltip-contextual">
                <span>{routeLabel}</span>
              </Tooltip>
            )}
          </Polyline>
          </Fragment>
        );
      })}
    </>
  );
}
export default memo(RouteLayer);
