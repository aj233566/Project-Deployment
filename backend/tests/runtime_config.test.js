const assert = require('node:assert/strict');
const test = require('node:test');
const { resolvePort } = require('../config/runtime');
test('uses PORT before legacy RPORT', () => {
  assert.equal(resolvePort({ PORT: '7000', RPORT: '6000' }), 7000);
});
test('uses legacy RPORT when PORT is absent', () => {
  assert.equal(resolvePort({ RPORT: '6000' }), 6000);
});
test('uses port 5000 when no valid port is configured', () => {
  assert.equal(resolvePort({ PORT: 'not-a-port' }), 5000);
});
