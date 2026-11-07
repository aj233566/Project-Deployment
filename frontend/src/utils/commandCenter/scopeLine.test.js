import test from 'node:test';
import assert from 'node:assert/strict';
import { scopeLine } from './scopeLine.js';
import stateDistricts, { unionTerritoryDistricts } from '../../data/stateDistricts.js';

test('a state shows its real district count from the district list', () => {
  const expected = stateDistricts['Andhra Pradesh'].length;
  assert.equal(scopeLine({ kind: 'state', title: 'ANDHRA PRADESH' }), `${expected} DISTRICTS · LIVE MONITORING`);
});

test('India shows how many states and union territories the list covers', () => {
  const line = scopeLine({ kind: 'national' });
  assert.ok(line.startsWith(`${Object.keys(stateDistricts).length} STATES · ${Object.keys(unionTerritoryDistricts).length} UNION TERRITORIES`));
  assert.ok(line.endsWith('LIVE MONITORING'));
});

test('a union territory is found too, and an unknown name falls back to the plain line', () => {
  const ut = Object.keys(unionTerritoryDistricts)[0];
  assert.match(scopeLine({ kind: 'state', title: ut.toUpperCase() }), /DISTRICTS? · LIVE MONITORING$/);
  assert.equal(scopeLine({ kind: 'state', title: 'NOWHERE' }), 'LIVE MONITORING');
  assert.equal(scopeLine({ kind: 'region', label: 'DELHI NCR' }), 'DELHI NCR · LIVE MONITORING');
  assert.equal(scopeLine(null), 'LIVE MONITORING');
});
