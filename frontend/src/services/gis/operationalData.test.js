import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGisOperationalData } from './operationalData.js';
test('provided incidents do not suppress registered GIS decision layers', async () => {
  const calls = [];
  const api = {
    getActiveIncidents: async () => {
      calls.push('incidents');
      return { data: [] };
    },
    getHabitations: async (params) => {
      calls.push(['habitations', params]);
      return { data: [{ _id: 'habitation-1' }] };
    },
    getRedZones: async () => {
      calls.push('zones');
      return { data: [{ _id: 'zone-1' }] };
    },
    getRelocationSites: async () => {
      calls.push('sites');
      return { data: [{ _id: 'site-1' }] };
    },
  };
  const result = await loadGisOperationalData(api, [{ id: 'parent-incident' }]);
  assert.equal(calls.some((call) => call === 'incidents'), false);
  assert.deepEqual(calls, [
    ['habitations', { active: true }],
    'zones',
    'sites',
  ]);
  assert.equal(result.incidents, null);
  assert.equal(result.habitations[0]._id, 'habitation-1');
  assert.equal(result.redZones[0]._id, 'zone-1');
  assert.equal(result.relocationSites[0]._id, 'site-1');
});
test('loads incidents from SENTRY when no parent incident feed is supplied', async () => {
  const api = {
    getActiveIncidents: async () => ({ data: [{ id: 'api-incident' }] }),
    getHabitations: async () => ({ data: [] }),
    getRedZones: async () => ({ data: [] }),
    getRelocationSites: async () => ({ data: [] }),
  };
  const result = await loadGisOperationalData(api);
  assert.deepEqual(result.incidents, [{ id: 'api-incident' }]);
});
