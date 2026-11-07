import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import { shouldFitInitialBounds } from "../../utils/gis/mapOverview.js";
const DEMO_BOUNDS = [
  [27.165, 88.475],
  [27.345, 88.625],
];
const SIMULATION_BOUNDS = [
  [27.225, 88.485],
  [27.335, 88.615],
];
export default function MapResetController({
  resetTrigger = 0,
  isSimActive = false,
  demoMode = false,
  points = [],
}) {
  const map = useMap();
  const hasFittedInitialBounds = useRef(false);
  const userInteracted = useRef(false);
  const lastResetTrigger = useRef(resetTrigger);

  useEffect(() => {
    const markUserInteraction = () => {
      userInteracted.current = true;
    };
    map.on("dragstart zoomstart", markUserInteraction);
    return () => map.off("dragstart zoomstart", markUserInteraction);
  }, [map]);

  useEffect(() => {
    if (demoMode) {
      if (hasFittedInitialBounds.current || userInteracted.current) return;
      hasFittedInitialBounds.current = true;
      map.fitBounds(DEMO_BOUNDS, { padding: [30, 30], maxZoom: 14, animate: false });
    } else if (shouldFitInitialBounds({
      pointCount: points.length,
      hasFitted: hasFittedInitialBounds.current,
      userInteracted: userInteracted.current,
    })) {
      hasFittedInitialBounds.current = true;
      map.fitBounds(points, { padding: [40, 40], maxZoom: 10, animate: false });
    }
  }, [demoMode, map, points]);
  useEffect(() => {
    if (demoMode && isSimActive) {
      map.stop();
      map.flyToBounds(SIMULATION_BOUNDS, { padding: [35, 35], maxZoom: 15, duration: 0.9 });
    }
  }, [demoMode, isSimActive, map]);
  useEffect(() => {
    if (resetTrigger <= 0 || resetTrigger === lastResetTrigger.current || isSimActive) return;
    lastResetTrigger.current = resetTrigger;
    map.stop();
    if (demoMode) {
      map.flyToBounds(DEMO_BOUNDS, { padding: [30, 30], maxZoom: 14, duration: 0.8 });
    } else if (points.length) {
      map.flyToBounds(points, { padding: [40, 40], maxZoom: 10, duration: 0.8 });
    } else {
      map.setView([22.5, 82.5], 5, { animate: true });
    }
  }, [demoMode, isSimActive, map, points, resetTrigger]);
  return null;
}
