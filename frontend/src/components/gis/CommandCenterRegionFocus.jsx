import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { getCommandCenterRegion } from '../../utils/gis/commandCenterRegions.js';

export default function CommandCenterRegionFocus({ regionId = 'india', resetToken = 0 }) {
  const map = useMap();
  useEffect(() => {
    const region = getCommandCenterRegion(regionId);
    map.stop();
    map.fitBounds(region.bounds, {
      // The all-India view uses a thinner margin so the country fills a wide, short map as much as it can.
      padding: region.kind === 'national' ? [8, 8] : [36, 36],
      maxZoom: region.maxZoom,
      animate: false,
    });
  }, [map, regionId, resetToken]);
  return null;
}
