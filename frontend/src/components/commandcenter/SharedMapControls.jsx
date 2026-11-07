import MapControls from '../gis/MapControls';

// The Live Map's Controls panel (map focus, arrival alert, relocation destination, road route, layers, severity filter,
// map display, reset view, annotations) on a 3D map. The map supplies its own layer list and map displays; everything else is shared.
export default function SharedMapControls({
  controls, sites, layers, hidden, onToggleLayer, styleOptions, mapStyle, onSetMapStyle, onResetView, idPrefix,
}) {
  const layerVisibility = Object.fromEntries(layers.map((layer) => [layer.key, !hidden.has(layer.key)]));
  const primary = layers.slice(0, 8);
  const more = layers.slice(8);
  return (
    <div className="gis-app-wrapper icc-ctl icc-controls-portal">
      <MapControls
        idPrefix={idPrefix}
        layerVisibility={layerVisibility}
        onToggleLayer={onToggleLayer}
        primaryLayers={primary}
        moreLayers={more}
        severityFilter={controls.severityFilter}
        onSetSeverityFilter={controls.setSeverityFilter}
        styleOptions={styleOptions}
        mapStyle={mapStyle}
        authorityMapPanel
        onSetMapStyle={onSetMapStyle}
        onResetView={onResetView}
        addPointMode={controls.addPointMode}
        onToggleAddPoint={controls.toggleAddPoint}
        userPoints={controls.userPoints}
        onFocusPoint={controls.flyToPoint}
        onDeletePoint={controls.deletePoint}
        relocationSites={sites || []}
        selectedRelocationSite={controls.selectedSite}
        onSelectRelocationSite={controls.selectSite}
        selectedIncident={controls.selectedIncident ? { ...controls.selectedIncident, title: controls.selectedIncident.title || String(controls.selectedIncident.type || '').replace(/_/g, ' ') } : null}
        onRouteToNearestFacility={controls.requestRoute}
        routeRequestStatus={controls.route.status}
        routeRequestError={controls.route.error}
        routeSummary={controls.route.summary}
        arrivalMotionEnabled={controls.arrivalEnabled}
        onToggleArrivalMotion={controls.setArrivalEnabled}
      />
      {controls.addPointMode ? <div className="gis-addpoint-banner" role="status">CLICK ANYWHERE ON THE MAP TO DROP A POINT</div> : null}
    </div>
  );
}
