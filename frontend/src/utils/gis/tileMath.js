export function lonLatToTileXY(lon, lat, z) {
  const n = 2 ** z;
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n
  );
  const clamp = (v) => Math.min(n - 1, Math.max(0, v));
  return { x: clamp(x), y: clamp(y) };
}
export function tileRangeForBounds({ west, south, east, north }, z) {
  const nw = lonLatToTileXY(west, north, z);                             
  const se = lonLatToTileXY(east, south, z);                             
  return {
    minX: Math.min(nw.x, se.x),
    maxX: Math.max(nw.x, se.x),
    minY: Math.min(nw.y, se.y),
    maxY: Math.max(nw.y, se.y)
  };
}
export function tilesForBounds(bounds, z) {
  const { minX, maxX, minY, maxY } = tileRangeForBounds(bounds, z);
  const out = [];
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      out.push({ z, x, y });
    }
  }
  return out;
}
export function buildTileUrl(template, z, x, y, sub) {
  return template
    .replace('{s}', sub || 'a')
    .replace('{z}', z)
    .replace('{x}', x)
    .replace('{y}', y);
}
