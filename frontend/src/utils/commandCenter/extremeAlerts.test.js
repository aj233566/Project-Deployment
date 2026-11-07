import test from 'node:test';
import assert from 'node:assert/strict';
import { coldCategory, deriveForecastAlerts, heatCategory, minNext, snowCategory, stormCategory, uvCategory } from './forecastAlerts.js';

test('heat, cold, storm, snow and UV follow their thresholds', () => {
  assert.equal(heatCategory(39.9), null);
  assert.equal(heatCategory(41).level, 'yellow');
  assert.equal(heatCategory(44).label, 'Heat wave');
  assert.equal(heatCategory(46).level, 'red');
  assert.equal(coldCategory(8), null);
  assert.equal(coldCategory(5).level, 'yellow');
  assert.equal(coldCategory(3).label, 'Cold wave');
  assert.equal(coldCategory(1).level, 'red');
  assert.equal(stormCategory(1000), null);
  assert.equal(stormCategory(2600).level, 'orange');
  assert.equal(snowCategory(4), null);
  assert.equal(snowCategory(16).level, 'orange');
  assert.equal(uvCategory(9).level, 'yellow');
  assert.equal(uvCategory(12).label, 'Extreme UV');
  for (const fn of [heatCategory, coldCategory, stormCategory, snowCategory, uvCategory]) assert.equal(fn(NaN), null);
});

test('minNext ignores gaps and the alerts carry the figure that triggered them', () => {
  assert.equal(minNext([5, null, 2, 9], 4), 2);
  assert.equal(minNext([], 4), null);
  const alerts = deriveForecastAlerts([{ name: 'Churu', lat: 28.3, lng: 75, maxTemp24h: 46, minTemp24h: 24 }, { name: 'Leh', lat: 34, lng: 77.6, minTemp24h: 1, maxCape24h: 3700, snow24h: 20, uvMax: 11 }]);
  const kinds = alerts.map((alert) => `${alert.kind}:${alert.place}:${alert.level}`);
  assert.ok(kinds.includes('heat:Churu:red'));
  assert.ok(kinds.includes('cold:Leh:red'));
  assert.ok(kinds.includes('storm:Leh:red'));
  assert.ok(kinds.includes('snow:Leh:orange'));
  assert.ok(alerts.find((alert) => alert.kind === 'heat').detail.includes('46'));
  assert.equal(alerts[0].level, 'red');
});
