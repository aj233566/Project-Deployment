import { useEffect, useRef, useState } from 'react';
import { EVENT_GAP_MS, diffIncidentEvents } from '../utils/commandCenter/incidentEvents';

// Plays `play(event)` for each incident that is new or changed while the page is open, one after another when several arrive
// together. The incidents already there when the map first loads are only remembered. Returns how many have been played.
// `enabled` should be false until the map is ready, so nothing is played into a map that cannot show it yet.
export function useIncidentArrivals(incidents, play, enabled) {
  const previous = useRef(null);
  const playRef = useRef(play);
  const [played, setPlayed] = useState(0);

  useEffect(() => { playRef.current = play; });

  useEffect(() => {
    if (!enabled || !Array.isArray(incidents)) return undefined;
    const before = previous.current;
    const { events, next } = diffIncidentEvents(before, incidents);
    previous.current = next;
    let pending = events.length;
    const timers = events.map((event, index) => window.setTimeout(() => {
      pending -= 1;
      playRef.current(event);
      setPlayed((count) => count + 1);
    }, index * EVENT_GAP_MS));
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      // If the run was cut short (a fresh list arrived, or React remounted the effect), let the unplayed events play next time.
      if (pending > 0) previous.current = before;
    };
  }, [incidents, enabled]);

  return played;
}
