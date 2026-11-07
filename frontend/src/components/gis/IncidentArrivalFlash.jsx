import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

export default function IncidentArrivalFlash({ enabled = true }) {
  const map = useMap();
  const timeout = useRef(null);

  useEffect(() => {
    const container = map.getContainer();
    if (!enabled) {
      window.clearTimeout(timeout.current);
      timeout.current = null;
      container.classList.remove('gis-live-arrival-flash');
      return undefined;
    }
    const flash = () => {
      container.classList.remove('gis-live-arrival-flash');
      void container.offsetWidth;
      container.classList.add('gis-live-arrival-flash');
      window.clearTimeout(timeout.current);
      timeout.current = window.setTimeout(() => {
        container.classList.remove('gis-live-arrival-flash');
        timeout.current = null;
      }, 1100);
    };
    window.addEventListener('gis:incident-arrival', flash);
    return () => window.removeEventListener('gis:incident-arrival', flash);
  }, [enabled, map]);

  useEffect(() => () => {
    window.clearTimeout(timeout.current);
    map.getContainer().classList.remove('gis-live-arrival-flash');
  }, [map]);

  return null;
}
