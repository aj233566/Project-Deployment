import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraRangeFor, describeGlobeRoute, selectGlobeRoute } from './photorealRoute.js';

test('keys alone never switch Google on: an ion token gives OSM Buildings, Google needs an explicit opt-in', () => {
  assert.equal(selectGlobeRoute({ googleKey: 'k', ionToken: 't' }), 'ion-osm');
  assert.equal(selectGlobeRoute({ googleKey: 'k' }), 'keyless');
  assert.equal(selectGlobeRoute({ ionToken: 't' }), 'ion-osm');
  assert.equal(selectGlobeRoute({ googleKey: 'k', ionToken: 't', allowGoogle: true }), 'google-direct');
  assert.equal(selectGlobeRoute({ ionToken: 't', allowGoogle: true }), 'google-ion');
  assert.equal(selectGlobeRoute({ googleKey: '  ', ionToken: '', allowGoogle: true }), 'keyless');
  assert.equal(selectGlobeRoute(), 'keyless');
});

test('only the keyed routes claim photorealistic buildings, and each says what it costs or restricts', () => {
  assert.equal(describeGlobeRoute('keyless').photoreal, false);
  assert.equal(describeGlobeRoute('ion-osm').photoreal, false);
  assert.match(describeGlobeRoute('ion-osm').note, /government/i);
  assert.equal(describeGlobeRoute('google-ion').photoreal, true);
  assert.match(describeGlobeRoute('google-direct').note, /metered/i);
  assert.match(describeGlobeRoute('google-ion').note, /non-commercial/i);
  assert.equal(describeGlobeRoute('nonsense').photoreal, false);
});

test('camera range grows with the region and never gets uncomfortably close', () => {
  const india = cameraRangeFor([[6.5, 68], [36, 97.5]]);
  const delhi = cameraRangeFor([[27, 76.4], [29.3, 78]]);
  const tiny = cameraRangeFor([[28.6, 77.2], [28.601, 77.201]]);
  assert.ok(india > delhi && delhi > tiny);
  assert.ok(tiny >= 20 * 1000 * 1.7);
});

test('the globe Esri imagery template caps native requests at the last usable detail level', async () => {
  const { createEsriImageryProvider, ESRI_IMAGERY_TILE_URL, ESRI_IMAGERY_MAX_NATIVE_ZOOM } = await import('./photorealRoute.js');
  const instances = [];
  class UrlTemplateImageryProvider {
    constructor(options) { this.options = options; instances.push(this); }
  }
  class WebMercatorTilingScheme {}

  const provider = createEsriImageryProvider({ UrlTemplateImageryProvider, WebMercatorTilingScheme });

  assert.equal(ESRI_IMAGERY_TILE_URL, 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}');
  assert.equal(ESRI_IMAGERY_MAX_NATIVE_ZOOM, 18);
  assert.ok(provider instanceof UrlTemplateImageryProvider);
  assert.equal(provider.options.url, ESRI_IMAGERY_TILE_URL);
  assert.equal(provider.options.maximumLevel, 18);
  assert.ok(provider.options.tilingScheme instanceof WebMercatorTilingScheme);
});
