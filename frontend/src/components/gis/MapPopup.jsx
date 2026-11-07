import { Popup } from 'react-leaflet';
export default function MapPopup({
  title,
  type,
  severity = 'Warning',
  status,
  location,
  description,
  reportedAt,
  metrics = [],
  onClose,
  anchorPosition
}) {
  const getSeverityBadgeClass = (sev) => {
    switch (sev) {
      case 'Critical':
        return 'gis-popup-badge-critical';
      case 'High':
        return 'gis-popup-badge-high';
      case 'Operational':
        return 'gis-popup-badge-operational';
      case 'Warning':
      default:
        return 'gis-popup-badge-warning';
    }
  };
  const formatTimestamp = (isoString) => {
    if (!isoString) return null;
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) + ' (' + date.toLocaleDateString() + ')';
    } catch {
      return isoString;
    }
  };
  return (
    <Popup
      className="gis-popup-container"
      autoPan
      autoPanPaddingTopLeft={[220, 70]}
      autoPanPaddingBottomRight={[20, 90]}
      {...(anchorPosition ? { position: anchorPosition } : {})}
      eventHandlers={onClose ? { remove: onClose } : undefined}
    >
      <div className="gis-popup-card">
        <div className="gis-popup-header">
          <div className="gis-popup-title">{title || 'Incident Details'}</div>
          <div className="gis-popup-tags">
            {type && <span className="gis-popup-type-tag">{type}</span>}
            {severity && (
              <span className={`gis-popup-badge ${getSeverityBadgeClass(severity)}`}>
                {severity.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        <div className="gis-popup-meta-row">
          {status && (
            <span className="gis-popup-status">
              <span className="gis-popup-status-dot" />
              Status: <strong>{status}</strong>
            </span>
          )}
          {reportedAt && (
            <span className="gis-popup-timestamp">
              {formatTimestamp(reportedAt)}
            </span>
          )}
        </div>

        {location && (
          <div className="gis-popup-location">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span>
              {location.address || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
            </span>
          </div>
        )}

        {description && (
          <div className="gis-popup-description">
            {description}
          </div>
        )}

        {metrics.length > 0 && (
          <div className="gis-popup-metrics-grid">
            {metrics.map((m, idx) => (
              <div key={idx} className="gis-popup-metric-cell">
                <span className="gis-popup-metric-label">{m.label}</span>
                <span className="gis-popup-metric-value">{m.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Popup>
  );
}
