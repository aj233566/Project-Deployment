import test from 'node:test';
import assert from 'node:assert/strict';
import { AUTHORITY_COLOR, PEOPLE_STATUS, colorOf, distanceText, labelOf, seenText, sortPeople } from './nearbyPeople.js';

test('every status has a label and a colour; authority accounts are shown apart', () => {
  for (const key of ['need-help', 'can-help', 'safe', 'sharing']) assert.ok(PEOPLE_STATUS[key].label && PEOPLE_STATUS[key].color, key);
  assert.equal(colorOf({ status: 'need-help' }), '#ef4444');
  assert.equal(colorOf({ status: 'need-help', isAuthority: true }), AUTHORITY_COLOR);
  assert.equal(labelOf({ isAuthority: true }), 'Authority');
  assert.equal(labelOf({ status: 'unknown' }), 'Sharing location');
});

test('distance and time are written in plain words', () => {
  const now = Date.parse('2026-10-31T12:00:00Z');
  assert.equal(distanceText(0.3), 'under 1 km away');
  assert.equal(distanceText(2.46), '2.5 km away');
  assert.equal(distanceText(null), '');
  assert.equal(seenText('2026-10-31T11:59:50Z', now), 'just now');
  assert.equal(seenText('2026-10-31T11:59:20Z', now), '40 s ago');
  assert.equal(seenText('2026-10-31T11:57:00Z', now), '3 min ago');
  assert.equal(seenText('nope', now), '');
});

test('people who need help come first, then authority, then the nearest', () => {
  const list = [
    { id: 'a', status: 'sharing', distanceKm: 0.2 },
    { id: 'b', status: 'need-help', distanceKm: 5 },
    { id: 'c', status: 'safe', isAuthority: true, distanceKm: 9 },
    { id: 'd', status: 'can-help', distanceKm: 0.1 },
  ];
  assert.deepEqual(sortPeople(list).map((person) => person.id), ['b', 'c', 'd', 'a']);
  assert.deepEqual(sortPeople(undefined), []);
});
