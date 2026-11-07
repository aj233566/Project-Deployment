import test from 'node:test';
import assert from 'node:assert/strict';
import census from '../../data/gis/stateCensus2011.js';
import registry from '../../data/gis/indiaStates.js';
import { parseWorldBankPopulation } from '../../services/commandCenter/populationFeed.js';
import { estimateStatePopulations, rankEstimatedStates } from './populationEstimate.js';

test('the newest World Bank year with a value is used', () => {
  const payload = [{ lastupdated: '2026-10-08' }, [
    { date: '2024', value: 1450000000 }, { date: '2025', value: 1463865525 }, { date: '2026', value: null },
  ]];
  assert.deepEqual(parseWorldBankPopulation(payload), { year: 2025, value: 1463865525, updated: '2026-10-08' });
  assert.equal(parseWorldBankPopulation([{}, []]), null);
  assert.equal(parseWorldBankPopulation(null), null);
});

test('state estimates add up to the national figure and keep the 2011 order', () => {
  const national = 1463865525;
  const estimates = estimateStatePopulations(national, census);
  const sum = Object.values(estimates).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - national) < 40, `sum ${sum}`);
  assert.ok(estimates['IN-UP'] > estimates['IN-MH'] && estimates['IN-MH'] > estimates['IN-BR']);
  assert.ok(estimates['IN-UP'] > 200_000_000, 'UP is above 200 million on a 1.46 billion country');
  assert.deepEqual(estimateStatePopulations(0, census), {});
  assert.deepEqual(estimateStatePopulations(5, null), {});
});

test('every registered state has a census share', () => {
  for (const state of registry) assert.ok(census[state.code] > 0, state.code);
});

test('ranking carries the at-risk share and skips states without an estimate', () => {
  const rows = rankEstimatedStates({ A: 1000, B: 4000 }, [{ code: 'A', name: 'Alpha' }, { code: 'B', name: 'Beta' }, { code: 'C', name: 'Gamma' }], [{ code: 'A', atRisk: 100 }]);
  assert.deepEqual(rows.map((r) => r.code), ['B', 'A']);
  assert.equal(rows[1].share, 0.1);
});
