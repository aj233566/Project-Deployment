import { MAP_STYLE_OPTIONS } from '../../config/mapModes';
import { mapProviderLabel } from '../../config/mapProviderLabel';

export default function CitizenMapTools({
  mapStyle = 'osmdark',
  onSetMapStyle,
  onResetMapView,
  layerVisibility = {},
  onToggleLayer,
  hideMapStyles = false,
  inline = false,
}) {
  const layers = [
    { key: 'incidents', label: 'INCIDENTS' },
    { key: 'redZones', label: 'ZONES' },
    { key: 'habitations', label: 'HABITATIONS' },
    { key: 'relocationSites', label: 'SITES' },
    { key: 'roads', label: 'ROAD STATUS' },
    { key: 'routes', label: 'ROUTES' },
  ];

  return (
    <div className={`gis-cz-map-tools${inline ? ' citizen-map-tools-inline' : ''}`} aria-label="Map display controls">
      <div className="gis-cz-map-tools-head">
        <span className="gis-cz-section-label">MAP LAYERS</span>
      </div>
      {!hideMapStyles ? (
        <div className="gis-cz-map-styles" role="group" aria-label="Choose a map style">
          <span className="gis-cz-map-provider" aria-live="polite">{mapProviderLabel(mapStyle)}</span>
          {MAP_STYLE_OPTIONS.map((style) => (
            <button
              key={style.key}
              type="button"
              className={`gis-cz-map-style ${mapStyle === style.key ? 'active' : ''}`}
              onClick={() => onSetMapStyle?.(style.key)}
              aria-pressed={mapStyle === style.key}
              title={`${style.label} · ${style.provider}`}
            >
              {style.shortLabel}
            </button>
          ))}
        </div>
      ) : null}
      <div className="gis-cz-map-actions" id="citizen-layers">
        {layers.map((layer) => (
          <button
            key={layer.key}
            type="button"
            className={`gis-cz-map-layer ${layerVisibility[layer.key] !== false ? 'active' : ''}`}
            onClick={() => onToggleLayer?.(layer.key)}
            aria-pressed={layerVisibility[layer.key] !== false}
          >
            {layer.label}
          </button>
        ))}
        <button type="button" className="gis-cz-map-reset" onClick={onResetMapView}>⌖ RESET</button>
      </div>
    </div>
  );
}
