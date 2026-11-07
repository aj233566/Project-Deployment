import test from 'node:test';
import assert from 'node:assert/strict';
import registry from '../../data/gis/indiaStates.js';
import polygonsByCode from '../../data/gis/indiaStatePolygons.js';
import { createStateIndex } from './stateIndex.js';
import { getCommandCenterRegion } from '../gis/commandCenterRegions.js';
import { airAtWeatherPoint, filterGeoJsonRecords, filterNearbyEvents, filterPointRecords, resourcesInRegion, scopeFeedToRegion } from './scopeData.js';

const index = createStateIndex(polygonsByCode, registry);
const sikkim = getCommandCenterRegion('IN-SK');
const ncr = getCommandCenterRegion('ncr');
const india = getCommandCenterRegion('india');
const haryana = getCommandCenterRegion('IN-HR');

test('habitations and sites (GeoJSON order) are kept only inside the view', () => {
  const records = [
    { name: 'Palla', location: { coordinates: [77.221, 28.781] } },
    { name: 'Sonipat', location: { coordinates: [77.018, 28.996] } },
    { name: 'Gangtok camp', location: { coordinates: [88.61, 27.33] } },
    { name: 'Test record in Africa', location: { coordinates: [12.33, 23.56] } },
    { name: 'No location' },
  ];
  assert.deepEqual(filterGeoJsonRecords(records, ncr, index).map((r) => r.name), ['Palla', 'Sonipat']);
  assert.deepEqual(filterGeoJsonRecords(records, haryana, index).map((r) => r.name), ['Sonipat']);
  assert.deepEqual(filterGeoJsonRecords(records, sikkim, index).map((r) => r.name), ['Gangtok camp']);
  assert.deepEqual(filterGeoJsonRecords(records, india, index).map((r) => r.name), ['Palla', 'Sonipat', 'Gangtok camp']);
});

test('risk alerts and feed items with plain coordinates are filtered the same way', () => {
  const alerts = [
    { location: { latitude: 27.33, longitude: 88.6, name: 'Sikkim' } },
    { location: { latitude: 28.6, longitude: 77.2, name: 'Delhi' } },
    { lat: 28.5, lng: 77.1 },
    { location: {} },
  ];
  assert.equal(filterPointRecords(alerts, sikkim, index).length, 1);
  assert.equal(filterPointRecords(alerts, ncr, index).length, 2);
});

test('nearby hazard events include a small margin around the view', () => {
  const events = [
    { id: 'in', lat: 27.5, lng: 88.5 },
    { id: 'just-outside', lat: 28.9, lng: 88.5 },
    { id: 'far', lat: 12, lng: 80 },
    { id: 'broken' },
  ];
  assert.deepEqual(filterNearbyEvents(events, sikkim).map((e) => e.id), ['in', 'just-outside']);
  assert.deepEqual(filterNearbyEvents(events, sikkim, 0).map((e) => e.id), ['in']);
});

test('resources are matched by the place written on the record', () => {
  const resources = [
    { name: 'Ambulance', location: 'Sikkim' },
    { name: 'Boat', location: 'Gangtok, Sikkim' },
    { name: 'Pump', location: 'East Delhi depot' },
    { name: 'Truck', location: 'Sonipat' },
    { name: 'Unplaced' },
  ];
  assert.deepEqual(resourcesInRegion(resources, sikkim).map((r) => r.name), ['Ambulance', 'Boat']);
  assert.deepEqual(resourcesInRegion(resources, ncr).map((r) => r.name), ['Pump', 'Truck']);
  assert.equal(resourcesInRegion(resources, india).length, 5);
});

test('the header air quality is the reading for the place the weather describes', () => {
  const readings = [{ name: 'Delhi', aqi: 180 }, { name: 'Gurugram', aqi: 150 }, { name: 'Gangtok', aqi: 40 }];
  assert.equal(airAtWeatherPoint(ncr, readings).aqi, 180);
  assert.equal(airAtWeatherPoint(sikkim, readings).aqi, 40);
  assert.equal(airAtWeatherPoint(india, readings), null, 'one point cannot stand for the whole country');
  assert.equal(airAtWeatherPoint(sikkim, null), null);
  assert.equal(airAtWeatherPoint(sikkim, [{ name: 'Delhi', aqi: 180 }]), null);
});

test('a polled feed is narrowed to the view, except for all of India and feeds that have not loaded', () => {
  const feed = { status: 'live', error: null, data: [{ id: 'near', lat: 27.5, lng: 88.5 }, { id: 'far', lat: 12, lng: 80 }] };
  assert.deepEqual(scopeFeedToRegion(feed, sikkim).data.map((event) => event.id), ['near']);
  assert.equal(scopeFeedToRegion(feed, sikkim).status, 'live');
  assert.equal(scopeFeedToRegion(feed, india), feed);
  const loading = { status: 'loading', data: null, error: null };
  assert.equal(scopeFeedToRegion(loading, sikkim), loading);
});
