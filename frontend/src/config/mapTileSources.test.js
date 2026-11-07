import test from 'node:test';
import assert from 'node:assert/strict';

test('Esri basemaps overzoom their last usable India tile instead of requesting gray placeholders', async () => {
  const { MAP_TILE_SOURCES } = await import('./mapTileSources.js');

  assert.equal(MAP_TILE_SOURCES.satellite.maxNativeZoom, 18);
  assert.equal(MAP_TILE_SOURCES.terrain.maxNativeZoom, 17);
  assert.equal(MAP_TILE_SOURCES.dark.maxNativeZoom, 16);
  for (const key of ['satellite', 'terrain', 'dark']) {
    assert.equal(MAP_TILE_SOURCES[key].maxZoom, 19);
    assert.ok(MAP_TILE_SOURCES[key].maxZoom > MAP_TILE_SOURCES[key].maxNativeZoom);
    if (MAP_TILE_SOURCES[key].labels) {
      assert.equal(MAP_TILE_SOURCES[key].labelsMaxNativeZoom, MAP_TILE_SOURCES[key].maxNativeZoom);
    }
  }
});

test('OpenStreetMap basemaps retain their own native zoom limit', async () => {
  const { MAP_TILE_SOURCES } = await import('./mapTileSources.js');

  assert.equal(MAP_TILE_SOURCES.osm.maxNativeZoom, 19);
  assert.equal(MAP_TILE_SOURCES.osmdark.maxNativeZoom, 19);
});
