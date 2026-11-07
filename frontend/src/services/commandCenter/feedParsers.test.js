import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAirQuality, parseForecastGrid, parsePointWeather, parseRiverFlows } from './openMeteoFeeds.js';
import { parseGdacsEvents, parseUsgsQuakes } from './hazardFeeds.js';
import { alertMentionsRegion, classifySachetAlert, prepareSachetAlerts } from '../../utils/commandCenter/sachetAlerts.js';

test('current weather keeps visibility and ignores missing values', () => {
  const weather = parsePointWeather({
    current: { time: '2026-10-30T18:00', temperature_2m: 20.2, relative_humidity_2m: 94, wind_speed_10m: 2.1, visibility: 3980, weather_code: 1, is_day: 0 },
  });
  assert.equal(weather.temperature, 20.2);
  assert.equal(weather.visibilityM, 3980);
  assert.equal(weather.windGust, null);
  assert.equal(weather.isDay, false);
  assert.equal(parsePointWeather({}), null);
});

test('multi-location forecast keeps results aligned with the requested places', () => {
  const places = [{ name: 'Delhi', lat: 28.6, lng: 77.2 }, { name: 'Mumbai', lat: 19, lng: 72.8 }];
  const hourlyRain = Array.from({ length: 24 }, () => 1);
  const grid = parseForecastGrid(places, [
    { current: { visibility: 800, temperature_2m: 22, weather_code: 3 }, hourly: { precipitation: hourlyRain, wind_gusts_10m: [10, 40, 20] } },
    { current: { temperature_2m: 30 }, hourly: { precipitation: [0, 0, 0], wind_gusts_10m: [5] } },
  ]);
  assert.equal(grid[0].name, 'Delhi');
  assert.equal(grid[0].rain24h, 24);
  assert.equal(grid[0].maxGust24h, 40);
  assert.equal(grid[0].visibilityM, 800);
  assert.equal(grid[1].name, 'Mumbai');
  assert.equal(grid[1].rain24h, 0);
  assert.equal(grid[1].visibilityM, null);
  // A single-location response is an object, not an array.
  const single = parseForecastGrid([places[0]], { hourly: { precipitation: [2, 3] } });
  assert.equal(single[0].rain24h, 5);
});

test('air quality aligns with places and tolerates missing readings', () => {
  const aq = parseAirQuality([{ name: 'Delhi' }, { name: 'Kolkata' }], [
    { current: { us_aqi: 72, pm2_5: 32.1, pm10: 34.1 } },
    { current: {} },
  ]);
  assert.deepEqual(aq[0], { name: 'Delhi', aqi: 72, pm25: 32.1, pm10: 34.1 });
  assert.equal(aq[1].aqi, null);
});

test('river flows use the GMT calendar day as today and expose a trend', () => {
  const points = [{ id: 'yamuna-delhi', river: 'Yamuna', place: 'Delhi' }];
  const flows = parseRiverFlows(points, {
    latitude: 28.63, longitude: 77.23, daily_units: { river_discharge: 'm³/s' },
    daily: {
      time: ['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31'],
      river_discharge: [200, 220, 260, 300, 400],
    },
  }, '2026-10-30');
  assert.equal(flows[0].id, 'yamuna-delhi');
  assert.equal(flows[0].today, 300);
  assert.equal(flows[0].status, 'rising-fast');
  assert.deepEqual(flows[0].snapped, { lat: 28.63, lng: 77.23 });
});

const GDACS = {
  features: [
    { geometry: { type: 'Point', coordinates: [81.8, 16.4] }, properties: { eventtype: 'TC', eventid: 1, name: 'Tropical Cyclone ARNAB-26', alertlevel: 'Red', iscurrent: 'true', country: 'India', fromdate: '2026-10-26T00:00:00', todate: '2026-10-28T00:00:00', url: { report: 'https://gdacs/r1' } } },
    { geometry: { type: 'Point', coordinates: [146.2, 18.7] }, properties: { eventtype: 'TC', eventid: 2, name: 'Tropical Cyclone IN-FA-26', alertlevel: 'Green', iscurrent: 'true', country: 'Japan' } },
    { geometry: { type: 'Point', coordinates: [81.7, 17.1] }, properties: { eventtype: 'FL', eventid: 3, name: 'Flood in India', alertlevel: 'Green', iscurrent: 'true', country: 'India', fromdate: '2026-10-20T01:00:00', todate: '2026-10-30T01:00:00' } },
    { geometry: { type: 'Point', coordinates: [80, 15] }, properties: { eventtype: 'FL', eventid: 4, name: 'Old flood', alertlevel: 'Orange', iscurrent: 'false', country: 'India', todate: '2026-08-01T00:00:00' } },
    { geometry: { type: 'Point', coordinates: [98.5, 3.2] }, properties: { eventtype: 'FL', eventid: 5, name: 'Flood in Indonesia', alertlevel: 'Green', iscurrent: 'true', country: 'Indonesia', todate: '2026-10-30T01:00:00' } },
  ],
};

test('GDACS keeps cyclones near India and floods in India or neighbours, drops finished and foreign floods, urgent first', () => {
  const events = parseGdacsEvents(GDACS, Date.parse('2026-10-30T12:00:00Z'));
  assert.deepEqual(events.map((event) => event.id), ['TC-1', 'FL-3']);
  assert.equal(events[0].name, 'Cyclone ARNAB-26');
  assert.equal(events[0].level, 'red');
  assert.equal(events[0].typeLabel, 'Tropical cyclone');
  assert.equal(events[0].url, 'https://gdacs/r1');
});

test('USGS quakes are parsed, newest first, bad rows skipped', () => {
  const quakes = parseUsgsQuakes({
    features: [
      { id: 'a', geometry: { coordinates: [88.1, 27.5, 10] }, properties: { mag: 3.1, place: '20 km N of Gangtok', time: Date.parse('2026-10-29T10:00:00Z'), url: 'u1' } },
      { id: 'b', geometry: { coordinates: [77, 30, 33] }, properties: { mag: 4.4, place: 'Uttarakhand', time: Date.parse('2026-10-30T01:00:00Z') } },
      { id: 'c', geometry: { coordinates: [] }, properties: { mag: 5 } },
      { id: 'd', geometry: { coordinates: [70, 30, 5] }, properties: {} },
    ],
  });
  assert.deepEqual(quakes.map((quake) => quake.id), ['b', 'a']);
  assert.equal(quakes[1].depthKm, 10);
});

test('SACHET alert wording is classified and filtered by region district names', () => {
  assert.equal(classifySachetAlert('Light rain with light Thunderstorms over Diu district'), 'advisory');
  assert.equal(classifySachetAlert('Moderate Thunderstorm with lightning likely over Kota'), 'watch');
  assert.equal(classifySachetAlert('Heavy rain very likely over Karaikal'), 'watch');
  assert.equal(classifySachetAlert('Very heavy rainfall likely at isolated places'), 'high');
  assert.equal(classifySachetAlert('Moderate rain over Pune'), 'moderate');
  const alerts = [
    { id: '1', title: 'Light rain over Sonipat, Panipat in next 3 hours' },
    { id: '2', title: 'Heavy rain over Kota' },
    { id: '3', title: 'Thunderstorm over Delhi and Gurugram' },
  ];
  assert.equal(alertMentionsRegion(alerts[0], ['sonipat']), true);
  assert.equal(alertMentionsRegion(alerts[1], ['delhi', 'sonipat']), false);
  assert.deepEqual(prepareSachetAlerts(alerts, ['delhi', 'sonipat']).map((alert) => alert.id), ['1', '3']);
  assert.equal(prepareSachetAlerts(alerts, []).length, 3);
  assert.deepEqual(prepareSachetAlerts(null), []);
});
