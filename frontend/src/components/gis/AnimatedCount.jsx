import { useEffect, useRef, useState } from 'react';
import { getAnimatedCountDuration } from '../../utils/gis/incidentArrivalSequence';
const DURATION_MS = 900;
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
// Ticks a count up from its previous value (0 on first show) so changes read as live data.
export default function AnimatedCount({ value, format = String, initialDuration = DURATION_MS, easing = 'easeOut' }) {
  const [shown, setShown] = useState(0);
  const fromRef = useRef(0);
  const hasCompletedInitialAnimationRef = useRef(false);
  useEffect(() => {
    if (!Number.isFinite(value)) return undefined;
    const from = fromRef.current;
    if (value === from) return undefined;
    const duration = prefersReducedMotion()
      ? 0
      : getAnimatedCountDuration(hasCompletedInitialAnimationRef.current, initialDuration, DURATION_MS);
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      const eased = easing === 'linear' ? t : 1 - (1 - t) ** 3;
      const current = Math.round(from + (value - from) * eased);
      fromRef.current = current;
      setShown(current);
      if (t < 1) frame = requestAnimationFrame(tick);
      else hasCompletedInitialAnimationRef.current = true;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, initialDuration, easing]);
  return format(Number.isFinite(value) ? shown : value);
}
