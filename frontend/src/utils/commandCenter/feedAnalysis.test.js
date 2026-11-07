import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aqiBand,
  aqiCategory,
  deriveForecastAlerts,
  maxNext,
  rainfallCategory,
  sumNext,
  visibilityCategory,
  windCategory,
} from './forecastAlerts.js';
import { analyseRiverSeries, formatDischarge, percentChange } from './riverStatus.js';

test('rainfall follows the IMD 24-hour classes', () => {
  assert.equal(rainfallCategory(10), null);
  assert.deepEqual(rainfallCategory(40), { level: 'yellow', label: 'Significant rainfall' });
  assert.deepEqual(rainfallCategory(64.5), { level: 'orange', label: 'Heavy rainfall' });
  assert.deepEqual(rainfallCategory(120), { level: 'red', label: 'Very heavy rainfall' });
  assert.deepEqual(rainfallCategory(210), { level: 'red', label: 'Extremely heavy rainfall' });
  assert.equal(rainfallCategory(null), null);
});

test('wind, air quality and visibility thresholds', () => {
  assert.equal(windCategory(40), null);
  assert.equal(windCategory(55).level, 'yellow');
  assert.equal(windCategory(70).level, 'orange');
  assert.equal(windCategory(95).level, 'red');
  assert.equal(aqiCategory(120), null);
  assert.equal(aqiCategory(180).level, 'yellow');
  assert.equal(aqiCategory(250).level, 'orange');
  assert.equal(aqiCategory(400).level, 'red');
  assert.equal(visibilityCategory(5000), null);
  assert.equal(visibilityCategory(300).level, 'yellow');
  assert.equal(visibilityCategory(120).level, 'orange');
  assert.equal(visibilityCategory(30).level, 'red');
  assert.equal(aqiBand(72).label, 'Moderate');
  assert.equal(aqiBand(null).tone, 'muted');
});

test('forecast alerts only fire above a threshold and sort most severe first', () => {
  const alerts = deriveForecastAlerts([
    { name: 'Calm City', lat: 1, lng: 1, rain24h: 2, maxGust24h: 20, aqi: 60, visibilityM: 8000 },
    { name: 'Wet Town', lat: 2, lng: 2, rain24h: 70, maxGust24h: 30, aqi: 90, visibilityM: 9000 },
    { name: 'Storm Port', lat: 3, lng: 3, rain24h: 130, maxGust24h: 95, aqi: 90, visibilityM: 9000 },
    { name: 'Smog Delhi', lat: 4, lng: 4, rain24h: 0, maxGust24h: 10, aqi: 320, visibilityM: 400 },
  ]);
  assert.deepEqual(alerts.map((alert) => `${alert.place}:${alert.kind}:${alert.level}`), [
    'Storm Port:rain:red',
    'Storm Port:wind:red',
    'Smog Delhi:aqi:red',
    'Wet Town:rain:orange',
    'Smog Delhi:visibility:yellow',
  ]);
  assert.match(alerts[0].detail, /130 mm/);
  assert.equal(deriveForecastAlerts([], { limit: 3 }).length, 0);
  assert.equal(deriveForecastAlerts(undefined).length, 0);
});

test('sumNext and maxNext ignore missing hours', () => {
  assert.equal(sumNext([1, 2, null, 3], 24), 6);
  assert.equal(sumNext([1, 2, 3, 4], 2), 3);
  assert.equal(sumNext([], 24), null);
  assert.equal(maxNext([5, null, 9, 2], 24), 9);
  assert.equal(maxNext(undefined), null);
});

const dates = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'];

test('river trend: falling, steady, rising and rising fast', () => {
  const falling = analyseRiverSeries(dates, [900, 800, 700, 600, 500, 480, 470], '2026-10-30');
  assert.equal(falling.status, 'falling');
  assert.equal(falling.tone, 'blue');
  assert.equal(Math.round(falling.percentOfPeak), 56);

  const steady = analyseRiverSeries(dates, [300, 302, 298, 301, 300, 305, 304], '2026-10-30');
  assert.equal(steady.status, 'steady');

  const rising = analyseRiverSeries(dates, [300, 300, 300, 300, 340, 350, 360], '2026-10-30');
  assert.equal(rising.status, 'rising');

  const fast = analyseRiverSeries(dates, [200, 220, 260, 300, 400, 520, 640], '2026-10-30');
  assert.equal(fast.status, 'rising-fast');
  assert.equal(fast.forecastPeak.value, 640);
  assert.equal(fast.series.filter((point) => point.future).length, 2);
});

test('river with no meaningful flow is reported as unavailable instead of invented', () => {
  assert.equal(analyseRiverSeries(dates, [0, 0, 0, 1, 1, 1, 1], '2026-10-30').status, 'unavailable');
  assert.equal(analyseRiverSeries(dates, [null, null, null, null, null, null, null], '2026-10-30').status, 'unavailable');
  assert.equal(analyseRiverSeries([], [], '2026-10-30').status, 'unavailable');
});

test('percentChange and discharge formatting', () => {
  assert.equal(percentChange(100, 125), 25);
  assert.equal(percentChange(0, 5), 100);
  assert.equal(percentChange(null, 5), null);
  assert.equal(formatDischarge(7446), '7.4k');
  assert.equal(formatDischarge(293.4), '293');
  assert.equal(formatDischarge(undefined), '—');
});

import { summarizeCities } from './forecastAlerts.js';

test('city summary averages what the cities report and names the wettest and hottest', () => {
  const summary = summarizeCities([
    { name: 'A', temperature: 30, humidity: 60, windSpeed: 10, rain24h: 0.2 },
    { name: 'B', temperature: 20, humidity: 80, windSpeed: 20, rain24h: 42 },
    { name: 'C', temperature: null, humidity: null, windSpeed: 30, rain24h: null },
  ]);
  assert.equal(summary.count, 3);
  assert.equal(summary.temperature, 25);
  assert.equal(summary.humidity, 70);
  assert.equal(summary.windSpeed, 20);
  assert.deepEqual(summary.wettest, { name: 'B', rain24h: 42 });
  assert.deepEqual(summary.hottest, { name: 'A', temperature: 30 });
  assert.equal(summarizeCities([{ name: 'D', rain24h: 0.1 }]).wettest, null, 'a dry day has no wettest city');
  assert.equal(summarizeCities(undefined).temperature, null);
});
