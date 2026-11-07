import { useCallback, useEffect, useRef, useState } from 'react';
import { nearbyApi, stopSharingOnLeave } from '../services/nearbyApi';

const BEAT_MS = 30000;

// Citizen side: while `sharing` is on, send the place every 30 s (only while the page is visible) and read who else is near.
// Turning it off, leaving the page or closing the tab removes the person from everyone else's list.
export function useNearbyPeople({ sharing, lat, lng, status, radiusKm }) {
  const [state, setState] = useState({ people: [], mine: null, error: '', loaded: false });
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const ready = Number.isFinite(lat) && Number.isFinite(lng);

  const beat = useCallback(async () => {
    try {
      await nearbyApi.share(lat, lng, status);
      const response = await nearbyApi.list({ lat, lng, radiusKm });
      if (alive.current) setState({ people: response.data || [], mine: response.mine || null, error: '', loaded: true });
    } catch (error) {
      if (alive.current) setState((current) => ({ ...current, error: error.response?.data?.message || error.message || 'Could not reach the nearby service.' }));
    }
  }, [lat, lng, status, radiusKm]);

  useEffect(() => {
    if (!sharing || !ready) return undefined;
    const first = window.setTimeout(() => { void beat(); }, 0);
    const timer = window.setInterval(() => { if (!document.hidden) void beat(); }, BEAT_MS);
    window.addEventListener('pagehide', stopSharingOnLeave);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      window.removeEventListener('pagehide', stopSharingOnLeave);
      void nearbyApi.stop().catch(() => {});
    };
  }, [sharing, ready, beat]);

  useEffect(() => {
    if (sharing) return;
    const reset = window.setTimeout(() => setState({ people: [], mine: null, error: '', loaded: false }), 0);
    return () => window.clearTimeout(reset);
  }, [sharing]);

  return state;
}

// Authority side: every person who is sharing, refreshed every 20 s while the page is visible. `refresh` loads the list again at once.
export function useAllSharingPeople(enabled) {
  const [people, setPeople] = useState([]);
  const load = useCallback(async () => {
    try {
      const response = await nearbyApi.list();
      setPeople(response.data || []);
    } catch {
      // keep the last list; the next refresh tries again
    }
  }, []);
  useEffect(() => {
    if (!enabled) return undefined;
    const first = window.setTimeout(() => { void load(); }, 0);
    const timer = window.setInterval(() => { if (!document.hidden) void load(); }, 20000);
    return () => { window.clearTimeout(first); window.clearInterval(timer); };
  }, [enabled, load]);
  return { people, refresh: load };
}
