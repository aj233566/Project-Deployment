import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMap3dStyle, circlePolygon, flatViewport, toGlZoom, toLeafletZoom, DEFAULT_BUILDING_HEIGHT, MAX_BUILDING_RENDER_HEIGHT, INDIA_VIEW_BOUNDS, isActionableMapTileError, IMAGERY_PROVIDERS, MAP_MAX_ZOOM } from './map3dStyle.js';

test('3D map maximum zoom does not exceed native satellite imagery coverage', () => {
  assert.equal(MAP_MAX_ZOOM, IMAGERY_PROVIDERS[0].maxzoom);
});

test('the style refers only to sources and layers that exist, and has real terrain, imagery and 3D buildings', () => {
  const style = buildMap3dStyle();
  const ids = new Set();
  for (const layer of style.layers) {
    assert.ok(!ids.has(layer.id), `duplicate layer ${layer.id}`);
    ids.add(layer.id);
    if (layer.source) assert.ok(style.sources[layer.source], `${layer.id} uses missing source ${layer.source}`);
  }
  assert.equal(style.sources.dem.type, 'raster-dem');
  assert.equal(style.sources.dem.encoding, 'terrarium');
  assert.ok(style.layers.some((l) => l.type === 'hillshade'));
  assert.ok(style.layers.some((l) => l.type === 'fill-extrusion' && l.id === 'buildings-3d'));
  assert.ok(style.layers.some((l) => l.id === 'imagery' && l.type === 'raster'));
});

test('no source needs an API key', () => {
  const text = JSON.stringify(buildMap3dStyle());
  assert.doesNotMatch(text, /key=|apikey|access_token|token=/i);
});

test('all map label text is at least 18 px', () => {
  const sizes = [];
  const collect = (value) => {
    if (typeof value === 'number') sizes.push(value);
    else if (Array.isArray(value)) value.forEach(collect);
  };
  for (const layer of buildMap3dStyle().layers) {
    if (layer.type !== 'symbol' || !layer.layout['text-size']) continue;
    const size = layer.layout['text-size'];
    if (typeof size === 'number') { sizes.push(size); continue; }
    // interpolate expression: ['interpolate', ['linear'], ['zoom'], z1, s1, z2, s2]: sizes are the odd-position outputs
    const stops = size.slice(3);
    for (let i = 1; i < stops.length; i += 2) collect(stops[i]);
  }
  assert.ok(sizes.length >= 6);
  assert.ok(sizes.every((s) => s >= 18 && s <= 32), sizes.join(','));
});

test('buildings at the default height are drawn separately from buildings with a known height', () => {
  const layers = buildMap3dStyle().layers;
  const flat = layers.find((l) => l.id === 'buildings-flat');
  const tall = layers.find((l) => l.id === 'buildings-3d');
  assert.equal(flat.type, 'fill-extrusion', 'buildings without mapped heights still appear as low 3D models');
  assert.equal(flat.paint['fill-extrusion-height'], DEFAULT_BUILDING_HEIGHT);
  assert.equal(flat.paint['fill-extrusion-opacity'], 0.56);
  assert.equal(tall.type, 'fill-extrusion');
  assert.equal(JSON.stringify(tall.paint['fill-extrusion-height']), JSON.stringify(['min', ['get', 'render_height'], MAX_BUILDING_RENDER_HEIGHT]));
  assert.equal(JSON.stringify(flat.filter).includes(`"<=",["coalesce",["get","render_height"],${DEFAULT_BUILDING_HEIGHT}]`), true);
  assert.equal(JSON.stringify(tall.filter).includes(`">",["coalesce",["get","render_height"],${DEFAULT_BUILDING_HEIGHT}]`), true);
});

test('a circle polygon is closed, centred, and about the right size', () => {
  const [ring] = circlePolygon(28.6, 77.2, 1000);
  assert.deepEqual(ring[0], ring.at(-1));
  const lats = ring.map((p) => p[1]);
  assert.ok(Math.abs((Math.max(...lats) - Math.min(...lats)) * 111320 - 2000) < 20);
  const lngs = ring.map((p) => p[0]);
  assert.ok(Math.abs((Math.max(...lngs) + Math.min(...lngs)) / 2 - 77.2) < 1e-4);
});

test('zoom conversion and the flat viewport match the 2D map convention', () => {
  assert.equal(toLeafletZoom(toGlZoom(7.5)), 7.5);
  const view = flatViewport({ lat: 0, lng: 0 }, 4, 800, 600);
  assert.ok(Math.abs(view.east - view.west - (800 * 360) / (512 * 16)) < 1e-9);
  assert.ok(view.north > view.south);
});

test('the national camera bounds include India from the southern islands to the northern border', () => {
  const [[south, west], [north, east]] = INDIA_VIEW_BOUNDS;
  assert.ok(south <= 6.5 && north >= 37.2, `${south}..${north}`);
  assert.ok(west <= 68 && east >= 97.5, `${west}..${east}`);
});

test('canceled tile requests are ignored when deciding whether to show a map-layer warning', () => {
  assert.equal(isActionableMapTileError({ sourceId: 'imagery', error: { name: 'AbortError', message: 'request aborted' } }), false);
  assert.equal(isActionableMapTileError({ sourceId: 'dem', error: { message: 'Request cancelled' } }), false);
  assert.equal(isActionableMapTileError({ sourceId: 'dem', error: { status: 503, message: 'Service unavailable' } }), true);
  assert.equal(isActionableMapTileError({ sourceId: 'dem' }), false);
});

test('the state tint fades with zoom and is a valid zoom expression', async () => {
  const { stateFillOpacity } = await import('./map3dStyle.js');
  for (const code of ['', 'IN-DL']) {
    const expr = stateFillOpacity(code);
    assert.deepEqual(expr.slice(0, 3), ['interpolate', ['linear'], ['zoom']]);
    assert.ok(expr[4] !== undefined && expr.length === 11);
  }
});

test('the style has heat, fire and hazard-icon layers and uses NASA’s latest available fire tiles', async () => {
  const { fireTileUrl } = await import('./map3dStyle.js');
  const style = buildMap3dStyle();
  for (const id of ['heat', 'fires', 'hazard-icon', 'incident-icon']) assert.ok(style.layers.some((l) => l.id === id), id);
  assert.equal(style.sources.fires.maxzoom, 9, 'NASA VIIRS tiles stop at zoom level 9');
  assert.match(style.sources.fires.tiles[0], /TIME=default/);
  assert.ok(fireTileUrl().includes('{bbox-epsg-3857}'));
});

test('imagery fallbacks are listed from best to coarsest and the layer groups point at real layers', async () => {
  const { IMAGERY_PROVIDERS, LAYER_GROUPS } = await import('./map3dStyle.js');
  assert.deepEqual(IMAGERY_PROVIDERS.map((p) => p.id), ['esri', 'eox', 'gibs']);
  assert.ok(IMAGERY_PROVIDERS[0].maxzoom > IMAGERY_PROVIDERS[1].maxzoom && IMAGERY_PROVIDERS[1].maxzoom > IMAGERY_PROVIDERS[2].maxzoom);
  const ids = new Set(buildMap3dStyle().layers.map((l) => l.id));
  for (const [key, group] of Object.entries(LAYER_GROUPS)) {
    for (const id of group.ids) assert.ok(ids.has(id), `${key}: ${id}`);
  }
});

test('incidents cluster, and clusters have a count label of at least 18 px', () => {
  const style = buildMap3dStyle();
  assert.equal(style.sources.incidents.cluster, true);
  const count = style.layers.find((l) => l.id === 'incident-cluster-count');
  assert.ok(count.layout['text-size'] >= 18);
});
