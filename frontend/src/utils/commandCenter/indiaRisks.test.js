import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveForecastAlerts, landslideWatch, waveCategory } from './forecastAlerts.js';
import { parseMarine, parseForecastGrid } from '../../services/commandCenter/openMeteoFeeds.js';
import { parseUsgsQuakes } from '../../services/commandCenter/hazardFeeds.js';

test('sea waves follow the rough / very rough / high classes', () => {
  assert.equal(waveCategory(2), null);
  assert.equal(waveCategory(3).label, 'Rough seas');
  assert.equal(waveCategory(4.5).level, 'orange');
  assert.equal(waveCategory(6.2).label, 'High waves');
  assert.equal(waveCategory(null), null);
});

test('landslide watch needs heavy rain on high ground and says only "watch"', () => {
  assert.equal(landslideWatch(120, 300), null, 'heavy rain on the plains is a flood matter, not a landslide watch');
  assert.equal(landslideWatch(70, 650).level, 'orange');
  assert.equal(landslideWatch(130, 650).level, 'red');
  assert.equal(landslideWatch(40, 1500).level, 'yellow');
  assert.equal(landslideWatch(40, 700), null);
  assert.equal(landslideWatch(NaN, 700), null);
  assert.match(landslideWatch(70, 650).label, /watch/i);
});

test('the new alerts carry their figure and appear next to the others', () => {
  const alerts = deriveForecastAlerts([
    { name: 'Dehradun', lat: 30.3, lng: 78, rain24h: 90, elevation: 650 },
    { name: 'Chennai', lat: 13, lng: 80.2, maxWave24h: 4.4 },
    { name: 'Delhi', lat: 28.6, lng: 77.2, maxWave24h: null, elevation: 220, rain24h: 10 },
  ]);
  const slide = alerts.find((alert) => alert.kind === 'landslide');
  const wave = alerts.find((alert) => alert.kind === 'wave');
  assert.ok(slide.detail.includes('90') && slide.detail.includes('650'));
  assert.ok(wave.detail.includes('4.4'));
  assert.equal(alerts.some((alert) => alert.place === 'Delhi' && ['wave', 'landslide'].includes(alert.kind)), false);
});

test('marine answers keep inland places empty; the forecast grid keeps the height of each place; USGS flags tsunami messages', () => {
  const places = [{ name: 'Delhi' }, { name: 'Mumbai' }];
  const marine = parseMarine(places, [{ hourly: { wave_height: [null, null] } }, { hourly: { wave_height: [0.3, 1.8, 1.2] } }]);
  assert.equal(marine[0].maxWave24h, null);
  assert.equal(marine[1].maxWave24h, 1.8);
  const grid = parseForecastGrid(places, [{ elevation: 221, hourly: {} }, { elevation: 14, hourly: {} }]);
  assert.deepEqual(grid.map((place) => place.elevation), [221, 14]);
  const quakes = parseUsgsQuakes({ features: [
    { id: 'a', geometry: { coordinates: [92, 12, 20] }, properties: { mag: 7.1, tsunami: 1, place: 'Andaman', time: 1 } },
    { id: 'b', geometry: { coordinates: [77, 30, 10] }, properties: { mag: 3, tsunami: 0, place: 'Uttarakhand', time: 2 } },
  ] });
  assert.equal(quakes.find((quake) => quake.id === 'a').tsunami, true);
  assert.equal(quakes.find((quake) => quake.id === 'b').tsunami, false);
});
