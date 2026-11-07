import { useEffect, useState } from 'react';
import indiaStates from '../data/gis/indiaStates';
import { createStateIndex } from '../utils/commandCenter/stateIndex';

// The boundary polygons are only used to find which state a point is in (they are never drawn), so they
// load after the first paint. Until then `null` is returned and callers fall back to bounding boxes.
export function useStateIndex() {
  const [index, setIndex] = useState(null);

  useEffect(() => {
    let cancelled = false;
    import('../data/gis/indiaStatePolygons')
      .then((module) => {
        if (!cancelled) setIndex(createStateIndex(module.default, indiaStates));
      })
      .catch(() => {
        // The dashboard keeps working at national / Delhi NCR level without state boundaries.
      });
    return () => { cancelled = true; };
  }, []);

  return index;
}
