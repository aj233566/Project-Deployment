import { useEffect, useState } from 'react';

// Tracks the rendered width of an element so SVG charts can be drawn at real pixel size.
// Charts drawn through a scaled viewBox would shrink their labels below the page's minimum text size.
export function useMeasuredWidth(ref, fallback = 320) {
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width);
      if (next > 0) setWidth(next);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}
