import { useEffect, useRef, useState } from 'react';
import { Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { createUserPinIcon } from './gisIcons';
import { formatLatLon } from '../../utils/gis/formatCoords';
function PointEditor({ point, onSave, onDelete }) {
  const [name, setName] = useState(point.name || '');
  const [notes, setNotes] = useState(point.notes || '');
  const osmLink = `https://www.openstreetmap.org/?mlat=${point.lat.toFixed(6)}&mlon=${point.lng.toFixed(6)}#map=16/${point.lat.toFixed(6)}/${point.lng.toFixed(6)}`;
  return (
    <div className="gis-userpoint-form">
      <div className="gis-userpoint-heading">MAP POINT</div>

      <label className="gis-userpoint-label" htmlFor={`nm-${point.id}`}>NAME</label>
      <input
        id={`nm-${point.id}`}
        className="gis-userpoint-input"
        value={name}
        placeholder="e.g. Relief drop-off"
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />

      <label className="gis-userpoint-label" htmlFor={`nt-${point.id}`}>NOTES / INFO</label>
      <textarea
        id={`nt-${point.id}`}
        className="gis-userpoint-textarea"
        value={notes}
        placeholder="Any information about this location…"
        rows={3}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="gis-userpoint-coord">
        {formatLatLon(point.lat, point.lng, 5)}
        <a className="gis-coord-link" href={osmLink} target="_blank" rel="noopener noreferrer"> ↗ Maps</a>
      </div>

      <div className="gis-userpoint-actions">
        <button type="button" className="gis-userpoint-save" onClick={() => onSave({ name, notes })}>
          SAVE
        </button>
        <button type="button" className="gis-userpoint-delete" onClick={onDelete}>
          DELETE
        </button>
      </div>
    </div>
  );
}
function UserPointMarker({ point, autoOpen, openNonce = 0, onSave, onDelete }) {
  const markerRef = useRef(null);
  useEffect(() => {
    if (autoOpen && markerRef.current) {
      markerRef.current.openPopup();
    }
  }, [autoOpen, openNonce]);
  return (
    <Marker ref={markerRef} position={[point.lat, point.lng]} icon={createUserPinIcon()}>
      <Popup className="gis-userpoint-popup" autoPan minWidth={210} maxWidth={240}>
        <PointEditor point={point} onSave={onSave} onDelete={onDelete} />
      </Popup>
    </Marker>
  );
}
export default function UserPointsLayer({
  points = [],
  addMode = false,
  openPointId = null,
  flyTo = null,
  onAddPoint,
  onUpdatePoint,
  onDeletePoint
}) {
  const map = useMap();
  useMapEvents({
    click(e) {
      if (addMode && onAddPoint) onAddPoint(e.latlng.lat, e.latlng.lng);
    }
  });
  const flyToId = flyTo?.id;
  const flyToNonce = flyTo?.nonce;
  useEffect(() => {
    if (!flyToId) return;
    const p = points.find((pt) => pt.id === flyToId);
    if (p) map.flyTo([p.lat, p.lng], Math.max(map.getZoom(), 13), { duration: 0.7 });
  }, [flyToId, flyToNonce, map, points]);
  return (
    <>
      {points.map((p) => (
        <UserPointMarker
          key={p.id}
          point={p}
          autoOpen={p.id === openPointId}
          openNonce={flyTo && flyTo.id === p.id ? flyTo.nonce : 0}
          onSave={(data) => onUpdatePoint(p.id, data)}
          onDelete={() => onDeletePoint(p.id)}
        />
      ))}
    </>
  );
}
