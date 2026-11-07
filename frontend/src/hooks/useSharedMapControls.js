import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchHospitalsInBounds } from '../services/gis/liveFeeds';
import { routingService } from '../services/gis/routingService';
import { incidentCoords } from '../utils/commandCenter/incidentStats';
import {
  ARRIVAL_MOTION_STORAGE_KEY, USER_POINTS_STORAGE_KEY, filterBySeverity, nearestOf, readUserPoints, routableSites,
} from '../utils/commandCenter/mapControls';

// The state behind the Controls panel, kept above the maps so the 3D map and the 3D globe show the same severity filter,
// saved points, chosen relocation site and road route, and the same arrival-alert switch as the Live Map.
export function useSharedMapControls({ incidents, sites }) {
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [arrivalEnabled, setArrivalEnabledState] = useState(() => {
    try { return window.localStorage.getItem(ARRIVAL_MOTION_STORAGE_KEY) !== 'false'; } catch { return true; }
  });
  const [userPoints, setUserPoints] = useState(() => readUserPoints(window.localStorage));
  const [addPointMode, setAddPointMode] = useState(false);
  const [focusPoint, setFocusPoint] = useState({ id: null, nonce: 0 });
  const [siteId, setSiteId] = useState('');
  const [siteNonce, setSiteNonce] = useState(0);
  const [incidentId, setIncidentId] = useState('');
  const [route, setRoute] = useState({ status: 'idle', error: '', summary: null });

  useEffect(() => {
    try { window.localStorage.setItem(USER_POINTS_STORAGE_KEY, JSON.stringify(userPoints)); } catch { void 0; }
  }, [userPoints]);

  const setArrivalEnabled = useCallback((enabled) => {
    setArrivalEnabledState(enabled);
    if (!enabled) window.dispatchEvent(new Event('gis:clear-incident-arrivals'));
    try { window.localStorage.setItem(ARRIVAL_MOTION_STORAGE_KEY, String(enabled)); } catch { void 0; }
  }, []);

  const addPoint = useCallback((lat, lng) => {
    setUserPoints((points) => [...points, { id: `up-${Date.now()}`, lat, lng, name: '', notes: '' }]);
    setAddPointMode(false);
  }, []);
  const deletePoint = useCallback((id) => setUserPoints((points) => points.filter((point) => point.id !== id)), []);
  const flyToPoint = useCallback((id) => setFocusPoint((current) => ({ id, nonce: current.nonce + 1 })), []);

  const visibleIncidents = useMemo(() => filterBySeverity(incidents, severityFilter), [incidents, severityFilter]);
  const selectedSite = useMemo(() => (sites || []).find((site) => site._id === siteId) || null, [sites, siteId]);
  const selectSite = useCallback((site) => { setSiteId(site?._id || ''); setSiteNonce((value) => value + 1); }, []);
  const selectedIncident = useMemo(
    () => (incidents || []).find((incident) => String(incident._id || incident.id) === incidentId) || null,
    [incidents, incidentId],
  );

  const requestRoute = useCallback(async () => {
    const origin = selectedIncident ? incidentCoords(selectedIncident) : null;
    if (!origin) {
      setRoute({ status: 'error', error: 'Select an incident with a recorded location first.', summary: null });
      return;
    }
    setRoute({ status: 'loading', error: '', summary: null });
    try {
      const radiusLat = 0.22;
      const radiusLng = radiusLat / Math.max(0.2, Math.cos((origin.lat * Math.PI) / 180));
      const hospitals = await fetchHospitalsInBounds({ south: origin.lat - radiusLat, west: origin.lng - radiusLng, north: origin.lat + radiusLat, east: origin.lng + radiusLng });
      const candidates = [
        ...hospitals.map((hospital) => ({ id: hospital.id, name: hospital.name || 'Nearby hospital', lat: hospital.lat, lng: hospital.lng, kind: hospital.kind === 'clinic' ? 'clinic' : 'hospital' })),
        ...routableSites(sites),
      ];
      const destination = nearestOf(origin, candidates);
      if (!destination) throw new Error('No nearby hospital or available relocation site was found.');
      const name = selectedIncident.title || selectedIncident.type || 'Selected incident';
      const summary = await routingService.calculateRoute({ origin: { ...origin, name }, destination, routeId: 'ROUTE-LIVE-01' });
      summary.name = `${name} to ${destination.name}`;
      summary.destinationType = destination.kind;
      setRoute({ status: 'success', error: '', summary });
    } catch (error) {
      setRoute({ status: 'error', error: error?.message || 'A live road route could not be calculated.', summary: null });
    }
  }, [selectedIncident, sites]);

  return {
    severityFilter, setSeverityFilter, visibleIncidents,
    arrivalEnabled, setArrivalEnabled,
    userPoints, addPointMode, toggleAddPoint: () => setAddPointMode((mode) => !mode), addPoint, deletePoint, focusPoint, flyToPoint,
    selectedSite, siteNonce, selectSite,
    selectedIncident, selectIncident: setIncidentId,
    route, requestRoute,
  };
}
