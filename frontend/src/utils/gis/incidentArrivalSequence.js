export function getArrivingIncidentIds(currentIds, previousIds) {
  const current = [...new Set(currentIds.map(String))];
  if (previousIds === null) return [];

  const previous = new Set(previousIds);
  return current.filter((id) => !previous.has(id));
}

// New or changed incidents. `entries` is [[id, signature]] where the signature changes when the incident's severity or status does;
// `previous` is the Map from the last call, or null on the first call (nothing is animated for what is already there).
export function getChangedIncidentIds(entries, previous) {
  if (previous === null) return [];
  return [...new Set(entries.filter(([id, signature]) => previous.get(String(id)) !== signature).map(([id]) => String(id)))];
}

export function getIncidentSequenceDuration(count, staggerMs = 480) {
  if (!Number.isFinite(count) || count <= 0) return 900;
  return Math.min(9000, Math.max(900, Math.ceil(count) * staggerMs));
}

export function getAnimatedCountDuration(hasCompletedInitialAnimation, initialDuration, updateDuration = 900) {
  return hasCompletedInitialAnimation ? updateDuration : initialDuration;
}

export function getIncidentCalloutPosition(point, viewport, index, cardSize = { width: 210, height: 44 }) {
  const side = index % 2 === 0 ? 'right' : 'left';
  const row = Math.floor(index / 2);
  const verticalDirection = point.y > viewport.height / 2 ? -1 : 1;
  const left = side === 'right' ? point.x + 32 : point.x - cardSize.width - 32;
  const top = point.y - (cardSize.height / 2) + (verticalDirection * row * (cardSize.height + 6));
  const maxLeft = Math.max(8, viewport.width - cardSize.width - 8);
  const maxTop = Math.max(8, viewport.height - cardSize.height - 8);

  return {
    left: Math.max(8, Math.min(left, maxLeft)),
    top: Math.max(8, Math.min(top, maxTop)),
    side
  };
}
