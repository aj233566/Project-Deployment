// Which Indian state or union territory a coordinate belongs to, from simplified boundary polygons.
// The polygons are used only for this lookup; they are never drawn. They come from Natural Earth at 1:50m,
// so a point within a few kilometres of a border can be assigned to the neighbouring state.

export function pointInRing(lat, lng, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// polygons: [[outerRing, ...holeRings], ...] with [lng, lat] points.
export function pointInPolygons(lat, lng, polygons) {
  return polygons.some(([outer, ...holes]) => pointInRing(lat, lng, outer) && !holes.some((hole) => pointInRing(lat, lng, hole)));
}

function polygonBounds(polygons) {
  let south = 90;
  let north = -90;
  let west = 180;
  let east = -180;
  for (const [outer] of polygons) {
    for (const [lng, lat] of outer) {
      if (lat < south) south = lat;
      if (lat > north) north = lat;
      if (lng < west) west = lng;
      if (lng > east) east = lng;
    }
  }
  return { south, north, west, east };
}

export function createStateIndex(polygonsByCode, registry) {
  const entries = (Array.isArray(registry) ? registry : [])
    .filter((state) => polygonsByCode?.[state.code])
    .map((state) => {
      const polygons = polygonsByCode[state.code];
      return { code: state.code, state, polygons, bbox: polygonBounds(polygons) };
    });
  const byCode = Object.fromEntries(entries.map((entry) => [entry.code, entry.state]));

  function find(lat, lng) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    for (const entry of entries) {
      const { bbox } = entry;
      if (lat < bbox.south || lat > bbox.north || lng < bbox.west || lng > bbox.east) continue;
      if (pointInPolygons(lat, lng, entry.polygons)) return entry.code;
    }
    return null;
  }

  return { find, byCode, entries };
}

// Samples a grid of points across the visible map and reports which state covers most of it.
export function viewportStateShares(index, viewport, grid = 7) {
  const { south, north, west, east } = viewport;
  const tally = new Map();
  let outside = 0;
  for (let row = 0; row < grid; row += 1) {
    for (let column = 0; column < grid; column += 1) {
      const lat = south + ((north - south) * (row + 0.5)) / grid;
      const lng = west + ((east - west) * (column + 0.5)) / grid;
      const code = index.find(lat, lng);
      if (code) tally.set(code, (tally.get(code) || 0) + 1);
      else outside += 1;
    }
  }
  let topCode = null;
  let topCount = 0;
  for (const [code, count] of tally) {
    if (count > topCount) {
      topCount = count;
      topCode = code;
    }
  }
  const total = grid * grid;
  return { topCode, topShare: topCount / total, outsideShare: outside / total, tally, total };
}
