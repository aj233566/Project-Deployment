import test from 'node:test';
import assert from 'node:assert/strict';
import { ageText, buildHeaderLines } from './headerLines.js';

const NOW = new Date('2026-10-31T16:00:00Z').getTime();
const minutesAgo = (m) => new Date(NOW - m * 60000).toISOString();
const region = { kind: 'state', title: 'ANDHRA PRADESH' };
const incident = (over) => ({ type: 'landslide', severity: 'high', status: 'verified', createdAt: minutesAgo(5), location: { address: 'Kakinada' }, ...over });

test('ages read in minutes, hours and days, and bad dates give nothing', () => {
  assert.equal(ageText(minutesAgo(0), NOW), 'JUST NOW');
  assert.equal(ageText(minutesAgo(5), NOW), '5 MIN AGO');
  assert.equal(ageText(minutesAgo(180), NOW), '3 H AGO');
  assert.equal(ageText(minutesAgo(60 * 24 * 3), NOW), '3 D AGO');
  assert.equal(ageText('not a date', NOW), null);
});

test('the area line is always there, so the header is never empty', () => {
  assert.deepEqual(buildHeaderLines({ region, incidents: null, authoritiesOnline: null, now: NOW }).map((l) => l.key), ['scope']);
});

test('the ticker shows the newest open incident, marked NEW when it is under a day old', () => {
  const lines = buildHeaderLines({ region, incidents: [incident({ createdAt: minutesAgo(600) }), incident({ createdAt: minutesAgo(5) }), incident({ createdAt: minutesAgo(1), status: 'resolved' })], authoritiesOnline: null, now: NOW });
  assert.equal(lines.find((l) => l.key === 'ticker').text, 'NEW · LANDSLIDE · Kakinada · 5 MIN AGO');
  const old = buildHeaderLines({ region, incidents: [incident({ createdAt: minutesAgo(60 * 48) })], authoritiesOnline: null, now: NOW });
  assert.match(old.find((l) => l.key === 'ticker').text, /^LATEST · /);
});

test('the all-clear line appears only when no critical incident is open', () => {
  const clear = buildHeaderLines({ region, incidents: [incident({})], authoritiesOnline: null, now: NOW });
  assert.equal(clear.find((l) => l.key === 'clear').text, 'NO CRITICAL INCIDENT RIGHT NOW');
  const critical = buildHeaderLines({ region, incidents: [incident({ severity: 'critical' })], authoritiesOnline: null, now: NOW });
  assert.equal(critical.find((l) => l.key === 'clear'), undefined);
  const empty = buildHeaderLines({ region, incidents: [], authoritiesOnline: null, now: NOW });
  assert.equal(empty.find((l) => l.key === 'clear').text, 'NO ACTIVE INCIDENTS IN THIS AREA');
});

test('the online line needs a real count, and says AUTHORITY for one', () => {
  assert.equal(buildHeaderLines({ region, incidents: null, authoritiesOnline: 0, now: NOW }).some((l) => l.key === 'online'), false);
  assert.equal(buildHeaderLines({ region, incidents: null, authoritiesOnline: undefined, now: NOW }).some((l) => l.key === 'online'), false);
  assert.equal(buildHeaderLines({ region, incidents: null, authoritiesOnline: 1, now: NOW }).at(-1).text, '1 AUTHORITY ONLINE');
  assert.equal(buildHeaderLines({ region, incidents: null, authoritiesOnline: 4, now: NOW }).at(-1).text, '4 AUTHORITIES ONLINE');
});
