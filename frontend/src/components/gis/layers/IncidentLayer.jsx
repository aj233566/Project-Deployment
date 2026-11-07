import React, { memo, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Tooltip, useMap } from 'react-leaflet';
import GisMarker from '../GisMarker';
import MapPopup from '../MapPopup';
import { shouldKeepIncidentLabelVisible } from '../../../utils/gis/incidentLabelPolicy';
import {
  getChangedIncidentIds,
  getIncidentCalloutPosition
} from '../../../utils/gis/incidentArrivalSequence';

const ARRIVAL_STAGGER_MS = 480;
const ARRIVAL_CARD_DURATION_MS = 2700;
const EMPTY_INCIDENTS = Object.freeze([]);

function incidentKey(incident) {
  return String(incident?.id ?? `${incident?.location?.lat ?? ''},${incident?.location?.lng ?? ''}`);
}

function scheduleIncidentArrivals(ids, timers, setArrivalIds) {
  ids.forEach((id, index) => {
    const enterTimer = window.setTimeout(() => {
      setArrivalIds((previous) => [...new Set([...previous, id])]);
      window.dispatchEvent(new Event('gis:incident-arrival'));
      const leaveTimer = window.setTimeout(() => {
        setArrivalIds((previous) => previous.filter((arrivalId) => arrivalId !== id));
        timers.delete(leaveTimer);
      }, ARRIVAL_CARD_DURATION_MS);
      timers.add(leaveTimer);
      timers.delete(enterTimer);
    }, index * ARRIVAL_STAGGER_MS);
    timers.add(enterTimer);
  });
}

function IncidentLayer({
  incidents = EMPTY_INCIDENTS,
  trackedIncidents = null,
  animateArrivals = true,
  visible = true,
  selectedIncidentId = null,
  onSelectIncident
}) {
  const map = useMap();
  const sourceIncidents = Array.isArray(incidents) ? incidents : EMPTY_INCIDENTS;
  const [arrivalIds, setArrivalIds] = useState([]);
  const [mapZoom, setMapZoom] = useState(() => map.getZoom());
  const previousIds = useRef(null);
  const timers = useRef(new Set());
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const trackedSource = Array.isArray(trackedIncidents) ? trackedIncidents : null;
  const currentKey = trackedSource && JSON.stringify(trackedSource
    .filter((incident) => Number.isFinite(incident?.location?.lat) && Number.isFinite(incident?.location?.lng))
    .map((incident) => [incidentKey(incident), `${incident.severity}|${incident.status}`]));

  useEffect(() => {
    const refreshMapView = () => setMapZoom(map.getZoom());
    map.on('moveend zoomend resize', refreshMapView);
    return () => map.off('moveend zoomend resize', refreshMapView);
  }, [map]);

  useEffect(() => {
    const clearArrivals = () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current.clear();
      setArrivalIds([]);
    };
    window.addEventListener('gis:clear-incident-arrivals', clearArrivals);
    return () => window.removeEventListener('gis:clear-incident-arrivals', clearArrivals);
  }, []);

  useEffect(() => {
    if (currentKey === null) return;

    // An incident plays the arrival animation when it is new, and again when its severity or status changes.
    const entries = JSON.parse(currentKey);
    const arriving = getChangedIncidentIds(entries, previousIds.current);
    previousIds.current = new Map(entries.map(([id, signature]) => [String(id), signature]));
    if (!animateArrivals) {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current.clear();
      return;
    }
    if (!visible || prefersReducedMotion) return;
    const visibleIds = new Set(sourceIncidents.map(incidentKey));
    scheduleIncidentArrivals(arriving.filter((id) => visibleIds.has(id)), timers.current, setArrivalIds);
  }, [animateArrivals, currentKey, prefersReducedMotion, sourceIncidents, visible]);

  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.clear();
  }, []);

  if (!visible || sourceIncidents.length === 0) {
    return null;
  }

  const arrivingIncidents = (animateArrivals ? arrivalIds : EMPTY_INCIDENTS)
    .map((id) => sourceIncidents.find((incident) => incidentKey(incident) === id))
    .filter((incident) => Number.isFinite(incident?.location?.lat) && Number.isFinite(incident?.location?.lng));
  const mapSize = map.getSize();
  const calloutSize = { width: Math.min(210, Math.max(120, mapSize.x - 16)), height: 44 };
  const arrivalCallouts = arrivingIncidents.map((incident, index) => {
    const point = map.latLngToContainerPoint([incident.location.lat, incident.location.lng]);
    const position = getIncidentCalloutPosition(point, { width: mapSize.x, height: mapSize.y }, index, calloutSize);
    const title = String(incident.title || incident.type || 'Incident').toUpperCase();
    const severity = String(incident.severity || 'Unknown').toUpperCase();
    const status = String(incident.status || 'ACTIVE').toUpperCase();
    const anchorX = position.side === 'right' ? position.left : position.left + calloutSize.width;
    const anchorY = position.top + (calloutSize.height / 2);
    const deltaX = point.x - anchorX;
    const deltaY = point.y - anchorY;

    return (
      <div
        className={`gis-live-incident-callout side-${position.side}`}
        key={incidentKey(incident)}
        style={{
          left: position.left,
          top: position.top,
          width: calloutSize.width,
          height: calloutSize.height,
          '--leader-angle': `${Math.atan2(deltaY, deltaX)}rad`,
          '--leader-length': `${Math.hypot(deltaX, deltaY)}px`,
          '--leader-origin-x': position.side === 'right' ? '0px' : `${calloutSize.width}px`,
          '--leader-origin-y': `${calloutSize.height / 2}px`,
          '--leader-x': `${point.x - position.left}px`,
          '--leader-y': `${point.y - position.top}px`
        }}
        data-map-zoom={mapZoom}
      >
        <strong>{title}</strong>
        <small>{severity} · {status}</small>
      </div>
    );
  });

  return (
    <>
      {sourceIncidents.map((incident) => {
        if (!incident.location || typeof incident.location.lat !== 'number') return null;
        const id = incidentKey(incident);
        const isSelected = selectedIncidentId === incident.id;
        const isArrival = animateArrivals && arrivalIds.includes(id);
        const position = [incident.location.lat, incident.location.lng];
        const severity = incident.severity || 'Unknown';
        const clickHandler = onSelectIncident ? () => onSelectIncident(incident) : undefined;
        return (
          <React.Fragment key={incident.id}>
            <GisMarker
              kind="incident"
              position={position}
              severity={severity}
              isSelected={isSelected}
              isArrival={isArrival}
              onClick={clickHandler}
            >
              <Tooltip
                permanent={shouldKeepIncidentLabelVisible(isSelected) && !isArrival}
                sticky={!isSelected && !isArrival}
                direction="top"
                offset={[0, -20]}
                className={`gis-disaster-type-label sev-${String(severity).toLowerCase()}`}
              >
                <span>{String(incident.type || 'Incident').toUpperCase()}</span>
              </Tooltip>

              <MapPopup
                title={incident.title}
                type={incident.type || 'Incident'}
                severity={incident.severity || 'Warning'}
                status={incident.status || 'Unknown'}
                location={incident.location}
                description={incident.description}
                reportedAt={incident.reportedAt}
                metrics={[
                  { label: 'Incident ID', value: incident.id },
                  { label: 'Type', value: incident.type || 'Incident' },
                  { label: 'Severity', value: severity },
                  { label: 'Status', value: incident.status || 'Unknown' }
                ]}
              />
            </GisMarker>
          </React.Fragment>
        );
      })}
      {arrivalCallouts.length > 0 && createPortal(
        <div className="gis-live-incident-callouts" aria-hidden="true">
          {arrivalCallouts}
        </div>,
        map.getContainer()
      )}
    </>
  );
}
export default memo(IncidentLayer);
