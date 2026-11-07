import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchEonetEvents, parseEonetEvents } from './eonetFeed.js';

const payload = {
  events: [
    { id: 'A', title: 'Tropical Cyclone Arnab', link: 'https://eonet/a', categories: [{ id: 'severeStorms' }], geometry: [
      { date: '2026-10-27T00:00:00Z', type: 'Point', coordinates: [80, 15], magnitudeValue: 40, magnitudeUnit: 'kts' },
      { date: '2026-10-28T06:00:00Z', type: 'Point', coordinates: [81.8, 16.4], magnitudeValue: 55, magnitudeUnit: 'kts' }] },
    { id: 'B', title: 'Forest fire', categories: [{ id: 'wildfires' }], geometry: [{ date: '2026-10-29T00:00:00Z', type: 'Polygon', coordinates: [[[70, 20], [72, 20], [72, 22], [70, 22], [70, 20]]] }] },
    { id: 'C', title: 'Oil spill', categories: [{ id: 'manmade' }], geometry: [{ date: '2026-10-29T00:00:00Z', type: 'Point', coordinates: [75, 20] }] },
    { id: 'D', title: 'No place', categories: [{ id: 'floods' }], geometry: [] },
  ],
};

test('natural events are read with their latest place; human-made and place-less ones are left out', () => {
  const events = parseEonetEvents(payload);
  assert.deepEqual(events.map((event) => event.id), ['EONET-B', 'EONET-A']);
  const cyclone = events.find((event) => event.id === 'EONET-A');
  assert.equal(cyclone.lat, 16.4);
  assert.equal(cyclone.lng, 81.8);
  assert.equal(cyclone.severity, '55 kts');
  assert.equal(cyclone.typeLabel, 'Severe storm / cyclone');
  assert.equal(cyclone.type, 'EV');
  const fire = events.find((event) => event.id === 'EONET-B');
  assert.ok(Math.abs(fire.lat - 20.8) < 0.01 && Math.abs(fire.lng - 70.8) < 0.01, 'a polygon is placed at the average of its corners');
  assert.deepEqual(parseEonetEvents(null), []);
});

test('the fetch asks for open events around India and fails clearly on an error', async () => {
  let asked = '';
  const ok = await fetchEonetEvents({ fetchImpl: async (url) => { asked = url; return { ok: true, json: async () => payload }; } });
  assert.match(asked, /status=open/);
  assert.match(asked, /bbox=60,38,100,5/);
  assert.equal(ok.length, 2);
  await assert.rejects(fetchEonetEvents({ fetchImpl: async () => ({ ok: false, status: 503 }) }), /HTTP 503/);
});
