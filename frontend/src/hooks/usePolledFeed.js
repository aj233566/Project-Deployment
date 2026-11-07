import { useEffect, useRef, useState } from 'react';

const IDLE = Object.freeze({ key: null, status: 'loading', data: null, updatedAt: null, error: null });

// Loads a feed now and then every `intervalMs` while the tab is visible.
// A failed refresh keeps the last good data and flips status to 'error' so panels can say it is stale.
// `key` identifies what the data is for (for example the region); data for another key is never shown.
export function usePolledFeed(key, loader, intervalMs) {
  const [state, setState] = useState(IDLE);
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const run = async () => {
      try {
        const data = await loaderRef.current(controller.signal);
        if (!cancelled) setState({ key, status: 'live', data, updatedAt: Date.now(), error: null });
      } catch (error) {
        if (cancelled || error?.name === 'AbortError') return;
        setState((previous) => ({
          key,
          status: 'error',
          data: previous.key === key ? previous.data : null,
          updatedAt: previous.key === key ? previous.updatedAt : null,
          error: error?.message || 'Feed unavailable',
        }));
      }
    };

    void run();
    const timer = intervalMs
      ? window.setInterval(() => { if (!document.hidden) void run(); }, intervalMs)
      : null;
    return () => {
      cancelled = true;
      controller.abort();
      if (timer) window.clearInterval(timer);
    };
  }, [key, intervalMs]);

  return state.key === key ? state : { ...IDLE, key };
}
