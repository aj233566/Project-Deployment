export function reportTomTomTileFailure(onStatusChange) {
  onStatusChange?.('unavailable');
}
export function tomtomTrafficStatusMessage(status) {
  return status === 'unavailable'
    ? 'Live TomTom traffic unavailable — congestion data is not current'
    : null;
}
