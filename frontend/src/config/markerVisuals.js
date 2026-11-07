export function markerSurfaceStyle(color) {
  return [
    'display: flex',
    'align-items: center',
    'justify-content: center',
    'box-sizing: border-box',
    `background-color: ${color}`,
    'border-style: solid',
    'border-width: 2px',
    'border-color: #ffffff',
    'border-radius: 50%',
    'color: #ffffff',
    `box-shadow: 0 0 0 4px ${color}40, 0 3px 10px rgba(15, 23, 42, 0.34)`,
  ].join('; ');
}
export function roadMarkerVisual(status = 'Blocked') {
  if (status === 'Blocked') {
    return { color: '#D64545', glyph: '⛔', label: 'Road closed' };
  }
  return { color: '#D97732', glyph: '⚠', label: 'Road restricted' };
}
