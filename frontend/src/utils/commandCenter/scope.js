// Decides which view the Command Center shows from the map position: national, Delhi NCR, or one state.
// Zooming in from the national map onto a state switches the dashboard to that state; zooming out returns to India.
//
// The state under the centre of the map is the one being looked at. It becomes the view once the map is zoomed to
// roughly that state's size (a big state needs less zoom than a small one, but never more than MIN_VIEW_HEIGHT_DEG).

import { viewportStateShares } from './stateIndex.js';

export const NATIONAL_ID = 'india';
export const NCR_ID = 'ncr';
export const DELHI_CODE = 'IN-DL';

// Zoom levels: entering a state needs a closer zoom than leaving it, so the view does not flicker at the boundary.
export const ZOOM_ENTER_STATE = 5.8;
export const ZOOM_LEAVE_STATE = 5.0;
export const ZOOM_ENTER_NCR = 7.5;
export const ZOOM_KEEP_NCR = 6.8;

// The map counts as "zoomed onto a state" when it is at most this many times the state's height ...
export const STATE_FIT_RATIO = 2.4;
// ... or at most this many degrees of latitude tall, whichever is larger (so small states can be reached too).
export const MIN_VIEW_HEIGHT_DEG = 6.5;
// A view stays on its state while that state still covers this much of the map, even if the centre crossed the border.
export const STICKY_STATE_SHARE = 0.4;
// With the centre over the sea or another country, a state needs this share of the map to be chosen.
export const MIN_STATE_SHARE = 0.3;
// Leaving a state tolerates a view this much taller than the one that entered it.
const LEAVE_SLACK = 1.25;

const NCR_BOUNDS = { south: 27, north: 29.3, west: 76.4, east: 78 };

function inside(point, box) {
  return point.lat >= box.south && point.lat <= box.north && point.lng >= box.west && point.lng <= box.east;
}

function viewLimit(state) {
  const height = state.bounds[1][0] - state.bounds[0][0];
  return Math.max(STATE_FIT_RATIO * height, MIN_VIEW_HEIGHT_DEG);
}

const asScope = (code) => (code === DELHI_CODE ? NCR_ID : code);

// viewport: { south, north, west, east } of the visible map; center: { lat, lng }.
// With no boundary index yet the current view is kept.
export function resolveScope({ zoom, center, viewport, index, currentId = NATIONAL_ID }) {
  if (!Number.isFinite(zoom) || !center || !viewport) return currentId;
  const alreadyZoomedIn = currentId !== NATIONAL_ID;
  if (zoom < (alreadyZoomedIn ? ZOOM_LEAVE_STATE : ZOOM_ENTER_STATE)) return NATIONAL_ID;
  if (!index) return currentId;

  if (inside(center, NCR_BOUNDS)) {
    if (zoom >= ZOOM_ENTER_NCR) return NCR_ID;
    if (currentId === NCR_ID && zoom >= ZOOM_KEEP_NCR) return NCR_ID;
  }

  const viewHeight = viewport.north - viewport.south;
  const shares = viewportStateShares(index, viewport);
  const currentCode = currentId === NCR_ID ? DELHI_CODE : currentId;

  // Stay on the current state while it still covers most of the map.
  if (alreadyZoomedIn && index.byCode[currentCode]) {
    const currentShare = (shares.tally.get(currentCode) || 0) / shares.total;
    if (currentShare >= STICKY_STATE_SHARE && viewHeight <= viewLimit(index.byCode[currentCode]) * LEAVE_SLACK) return currentId;
  }

  const centerCode = index.find(center.lat, center.lng);
  if (centerCode && viewHeight <= viewLimit(index.byCode[centerCode])) return asScope(centerCode);

  // Centre over the sea or another country: a state that fills much of the map still counts.
  const { topCode, topShare } = shares;
  if (topCode && topShare >= MIN_STATE_SHARE && viewHeight <= viewLimit(index.byCode[topCode])) return asScope(topCode);
  return NATIONAL_ID;
}
