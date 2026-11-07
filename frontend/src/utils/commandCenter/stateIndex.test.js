import test from 'node:test';
import assert from 'node:assert/strict';
import registry from '../../data/gis/indiaStates.js';
import polygonsByCode from '../../data/gis/indiaStatePolygons.js';
import { createStateIndex, pointInPolygons, pointInRing, viewportStateShares } from './stateIndex.js';
import {
  MIN_STATE_SHARE,
  MIN_VIEW_HEIGHT_DEG,
  NATIONAL_ID,
  NCR_ID,
  STICKY_STATE_SHARE,
  ZOOM_ENTER_NCR,
  ZOOM_ENTER_STATE,
  ZOOM_KEEP_NCR,
  ZOOM_LEAVE_STATE,
  resolveScope,
} from './scope.js';

const index = createStateIndex(polygonsByCode, registry);

test('ring and polygon containment, including holes', () => {
  const square = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
  const hole = [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]];
  assert.equal(pointInRing(5, 5, square), true);
  assert.equal(pointInRing(15, 5, square), false);
  assert.equal(pointInPolygons(5, 5, [[square, hole]]), false, 'inside the hole');
  assert.equal(pointInPolygons(2, 2, [[square, hole]]), true);
});

test('the registry covers every state and union territory with polygons', () => {
  assert.equal(registry.length, 36);
  assert.equal(Object.keys(polygonsByCode).length, 36);
  for (const state of registry) {
    assert.ok(state.name && state.code.startsWith('IN-'), state.code);
    assert.ok(state.capital, `${state.name} has a capital`);
    assert.ok(state.cities.length >= 1, `${state.name} has at least one city for forecasts`);
    assert.ok(state.bounds[0][0] < state.bounds[1][0] && state.bounds[0][1] < state.bounds[1][1], `${state.name} bounds`);
  }
  const territories = registry.filter((state) => state.kind === 'ut').map((state) => state.code).sort();
  assert.deepEqual(territories, ['IN-AN', 'IN-CH', 'IN-DH', 'IN-DL', 'IN-JK', 'IN-LA', 'IN-LD', 'IN-PY']);
});

test('well-known places resolve to their state', () => {
  const expected = {
    'Delhi centre': [28.6139, 77.209, 'IN-DL'],
    'Gurugram': [28.4595, 77.0266, 'IN-HR'],
    'Noida': [28.5355, 77.391, 'IN-UP'],
    'Lucknow': [26.8467, 80.9462, 'IN-UP'],
    'Jaipur': [26.9124, 75.7873, 'IN-RJ'],
    'Pune': [18.5204, 73.8567, 'IN-MH'],
    'Hyderabad': [17.385, 78.4867, 'IN-TG'],
    'Bengaluru': [12.9716, 77.5946, 'IN-KA'],
    'Chennai': [13.0827, 80.2707, 'IN-TN'],
    'Kolkata': [22.5726, 88.3639, 'IN-WB'],
    'Gangtok': [27.3389, 88.6065, 'IN-SK'],
    'Guwahati': [26.1445, 91.7362, 'IN-AS'],
    'Patna': [25.5941, 85.1376, 'IN-BR'],
    'Srinagar': [34.0837, 74.7973, 'IN-JK'],
    'Leh': [34.1526, 77.5771, 'IN-LA'],
    'Shimla': [31.1048, 77.1734, 'IN-HP'],
    'Bhopal': [23.2599, 77.4126, 'IN-MP'],
  };
  for (const [place, [lat, lng, code]] of Object.entries(expected)) {
    assert.equal(index.find(lat, lng), code, place);
  }
});

test('points outside India resolve to nothing', () => {
  assert.equal(index.find(15, 68), null, 'Arabian Sea');
  assert.equal(index.find(27.7, 85.3), null, 'Kathmandu');
  assert.equal(index.find(31.55, 74.34), null, 'Lahore');
  assert.equal(index.find(Number.NaN, 77), null);
  assert.equal(index.find(undefined, undefined), null);
});

test('the viewport sampler reports the state that fills most of the map', () => {
  const delhiView = { south: 28.5, north: 28.75, west: 77.05, east: 77.3 };
  const shares = viewportStateShares(index, delhiView);
  assert.equal(shares.topCode, 'IN-DL');
  assert.ok(shares.topShare > 0.8);
  const sea = viewportStateShares(index, { south: 10, north: 12, west: 64, east: 67 });
  assert.equal(sea.topCode, null);
  assert.equal(sea.outsideShare, 1);
});

const view = (lat, lng, half) => ({ south: lat - half, north: lat + half, west: lng - half, east: lng + half });

test('zoomed out the dashboard is national; zooming into a state switches to it', () => {
  const lucknow = { lat: 26.85, lng: 80.95 };
  assert.equal(resolveScope({ zoom: 4.5, center: lucknow, viewport: view(26.85, 80.95, 9), index, currentId: NATIONAL_ID }), NATIONAL_ID);
  assert.equal(resolveScope({ zoom: ZOOM_ENTER_STATE - 0.1, center: lucknow, viewport: view(26.85, 80.95, 2.5), index, currentId: NATIONAL_ID }), NATIONAL_ID);
  assert.equal(resolveScope({ zoom: 6.5, center: lucknow, viewport: view(26.85, 80.95, 2.4), index, currentId: NATIONAL_ID }), 'IN-UP');
});

test('leaving a state needs a clearly wider view than entering it (no flicker)', () => {
  const lucknow = { lat: 26.85, lng: 80.95 };
  const between = (ZOOM_ENTER_STATE + ZOOM_LEAVE_STATE) / 2;
  assert.equal(resolveScope({ zoom: between, center: lucknow, viewport: view(26.85, 80.95, 3), index, currentId: 'IN-UP' }), 'IN-UP');
  assert.equal(resolveScope({ zoom: between, center: lucknow, viewport: view(26.85, 80.95, 3), index, currentId: NATIONAL_ID }), NATIONAL_ID);
  assert.equal(resolveScope({ zoom: ZOOM_LEAVE_STATE - 0.1, center: lucknow, viewport: view(26.85, 80.95, 3), index, currentId: 'IN-UP' }), NATIONAL_ID);
});

test('Delhi and the surrounding region show the Delhi NCR view', () => {
  const delhi = { lat: 28.6139, lng: 77.209 };
  assert.equal(resolveScope({ zoom: ZOOM_ENTER_NCR + 0.5, center: delhi, viewport: view(28.61, 77.2, 0.6), index, currentId: NATIONAL_ID }), NCR_ID);
  // Gurugram is in Haryana but inside the NCR box, so a close zoom there is still the NCR view.
  assert.equal(resolveScope({ zoom: 8, center: { lat: 28.46, lng: 77.03 }, viewport: view(28.46, 77.03, 0.4), index, currentId: 'IN-HR' }), NCR_ID);
  // Zoomed less far in, Delhi's own state view is the NCR view too.
  assert.equal(resolveScope({ zoom: 6.4, center: delhi, viewport: view(28.61, 77.2, 0.05), index, currentId: NATIONAL_ID }), NCR_ID);
});

test('a view that is mostly sea, or an index that has not loaded yet, does not invent a state', () => {
  assert.equal(resolveScope({ zoom: 7, center: { lat: 11, lng: 65 }, viewport: view(11, 65, 1.5), index, currentId: 'IN-KL' }), NATIONAL_ID);
  assert.equal(resolveScope({ zoom: 7, center: { lat: 26.85, lng: 80.95 }, viewport: view(26.85, 80.95, 1), index: null, currentId: NATIONAL_ID }), NATIONAL_ID);
  assert.equal(resolveScope({ zoom: 7, center: { lat: 26.85, lng: 80.95 }, viewport: view(26.85, 80.95, 1), index: null, currentId: 'IN-UP' }), 'IN-UP');
  assert.equal(resolveScope({ zoom: Number.NaN, center: null, viewport: null, index, currentId: 'IN-UP' }), 'IN-UP');
  assert.ok(MIN_STATE_SHARE > 0 && MIN_STATE_SHARE < 1);
});

test('the viewport sampler reports how many samples it took', () => {
  const shares = viewportStateShares(index, { south: 28.5, north: 28.75, west: 77.05, east: 77.3 }, 5);
  assert.equal(shares.total, 25);
  assert.equal(shares.tally.get('IN-DL') / shares.total, shares.topShare);
});

test('a state stays the view while it still covers most of the map, even if the centre crossed its border', () => {
  // Window centred just inside Bihar but mostly Uttar Pradesh.
  const center = { lat: 26.3, lng: 84.9 };
  const viewport = { south: 23.3, north: 29.3, west: 78.9, east: 84.9 };
  const shares = viewportStateShares(index, viewport);
  assert.ok((shares.tally.get('IN-UP') || 0) / shares.total >= STICKY_STATE_SHARE, 'precondition: UP covers most of the window');
  assert.equal(index.find(center.lat, center.lng), 'IN-BR', 'precondition: the centre is in Bihar');
  assert.equal(resolveScope({ zoom: 6.5, center, viewport, index, currentId: 'IN-UP' }), 'IN-UP');
  assert.equal(resolveScope({ zoom: 6.5, center, viewport, index, currentId: NATIONAL_ID }), 'IN-BR');
});

test('a neighbouring state takes over once the map is mostly about it', () => {
  const biharView = view(25.8, 86, 1.8);
  assert.equal(resolveScope({ zoom: 7, center: { lat: 25.8, lng: 86 }, viewport: biharView, index, currentId: 'IN-UP' }), 'IN-BR');
});

test('zooming onto a state switches at about the size of that state: later for small states, sooner for big ones', () => {
  // Big state: a view of about 14 degrees (zoom 6) centred on Rajasthan is enough.
  assert.equal(resolveScope({ zoom: 6, center: { lat: 26.9, lng: 73.5 }, viewport: view(26.9, 73.5, 7), index, currentId: NATIONAL_ID }), 'IN-RJ');
  // Uttar Pradesh at zoom 7, where the state covers well under a third of a wide map.
  assert.equal(resolveScope({ zoom: 7, center: { lat: 26.85, lng: 80.95 }, viewport: { south: 23.2, north: 30.4, west: 74.6, east: 87.3 }, index, currentId: NATIONAL_ID }), 'IN-UP');
  // Small state: Goa is reached once the view is at most MIN_VIEW_HEIGHT_DEG tall, and not before.
  const goa = { lat: 15.4, lng: 74.0 };
  assert.equal(resolveScope({ zoom: 7.7, center: goa, viewport: view(goa.lat, goa.lng, MIN_VIEW_HEIGHT_DEG / 2 - 0.1), index, currentId: NATIONAL_ID }), 'IN-GA');
  assert.equal(resolveScope({ zoom: 6.5, center: goa, viewport: view(goa.lat, goa.lng, MIN_VIEW_HEIGHT_DEG), index, currentId: NATIONAL_ID }), NATIONAL_ID);
});

test('zooming back out of Delhi NCR leaves the NCR view before the national one', () => {
  const nearNcr = { lat: 28.15, lng: 77.2 };
  assert.equal(resolveScope({ zoom: ZOOM_KEEP_NCR + 0.1, center: nearNcr, viewport: view(28.15, 77.2, 3.5), index, currentId: NCR_ID }), NCR_ID);
  assert.notEqual(resolveScope({ zoom: ZOOM_KEEP_NCR - 0.4, center: nearNcr, viewport: view(28.15, 77.2, 4.1), index, currentId: NCR_ID }), NCR_ID);
  assert.equal(resolveScope({ zoom: ZOOM_LEAVE_STATE - 0.5, center: nearNcr, viewport: view(28.15, 77.2, 12), index, currentId: NCR_ID }), NATIONAL_ID);
});
