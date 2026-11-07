const MIN_OVERVIEW_ZOOM = 1;
const MAX_OVERVIEW_ZOOM = 19;
const OVERVIEW_PADDING = [32, 32];

export function shouldFitInitialBounds({ pointCount, hasFitted, userInteracted }) {
  return pointCount > 0 && !hasFitted && !userInteracted;
}

export function getOverviewZoomForBounds(overviewMap, viewportBounds) {
  if (!overviewMap || !viewportBounds) return MIN_OVERVIEW_ZOOM;
  const zoom = overviewMap.getBoundsZoom(viewportBounds, false, OVERVIEW_PADDING);
  if (!Number.isFinite(zoom)) return MIN_OVERVIEW_ZOOM;
  return Math.max(MIN_OVERVIEW_ZOOM, Math.min(MAX_OVERVIEW_ZOOM, zoom));
}

export function getMapScaleBar(latitude, zoom, targetWidth = 120) {
  if (!Number.isFinite(latitude) || !Number.isFinite(zoom) || targetWidth <= 0) {
    return { distanceMeters: 0, width: 0, label: '—' };
  }

  const metersPerPixel = (156543.03392 * Math.cos((latitude * Math.PI) / 180)) / (2 ** zoom);
  const targetDistance = metersPerPixel * targetWidth;
  if (!Number.isFinite(targetDistance) || targetDistance <= 0) {
    return { distanceMeters: 0, width: 0, label: '—' };
  }

  const magnitude = 10 ** Math.floor(Math.log10(targetDistance));
  const scaleFactor = [1, 2, 5, 10].filter((factor) => factor * magnitude <= targetDistance).at(-1) || 1;
  const distanceMeters = scaleFactor * magnitude;
  const label = distanceMeters >= 1000
    ? `${Number((distanceMeters / 1000).toFixed(1))} km`
    : `${Math.round(distanceMeters)} m`;

  return {
    distanceMeters,
    width: distanceMeters / metersPerPixel,
    label,
  };
}
