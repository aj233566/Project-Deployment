import { useEffect, useState } from 'react';
import api, { apiBaseUrl } from '../services/api';
import { getToken } from '../context/session';

const BEAT_MS = 30000;

// While a SENETRY page is showing, tell the server "I am here" every 30 s. A hidden tab, a closed tab, a logout or a lost connection
// stops the beats, and the server stops counting that person about a minute later. Nothing is sent from a signed-out browser.
export function usePresenceBeat() {
  useEffect(() => {
    let timer = null;
    const send = () => {
      if (!getToken() || document.visibilityState !== 'visible') return;
      api.post('/presence/heartbeat').catch(() => {});
    };
    const stop = () => {
      if (timer) window.clearInterval(timer);
      timer = null;
    };
    const start = () => {
      stop();
      send();
      timer = window.setInterval(send, BEAT_MS);
    };
    const onVisibility = () => { if (document.visibilityState === 'visible') start(); else stop(); };
    const onLeave = () => {
      const token = getToken();
      if (!token) return;
      fetch(`${apiBaseUrl}/presence/leave`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, keepalive: true }).catch(() => {});
    };
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onLeave);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onLeave);
    };
  }, []);
}

// How many authorities are on a page right now (a number only). Null until the first answer, and again if the server cannot say.
export function useAuthoritiesOnline(enabled) {
  const [count, setCount] = useState(null);
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    const load = async () => {
      try {
        const response = await api.get('/presence/summary');
        const value = response.data?.data?.authorities;
        if (alive) setCount(Number.isFinite(value) ? value : null);
      } catch {
        if (alive) setCount(null);
      }
    };
    // The first read waits a moment so this browser's own first heartbeat has landed and is counted.
    const first = window.setTimeout(load, 1500);
    const timer = window.setInterval(() => { if (!document.hidden) void load(); }, BEAT_MS);
    return () => {
      alive = false;
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [enabled]);
  return count;
}
