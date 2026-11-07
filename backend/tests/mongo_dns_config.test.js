const assert = require('node:assert/strict');
const test = require('node:test');
const { configureMongoDns } = require('../config/db');
test('configures public DNS servers for MongoDB SRV lookups when requested', () => {
  let configuredServers = null;
  const dnsModule = {
    setServers(servers) {
      configuredServers = servers;
    },
  };
  const configured = configureMongoDns(dnsModule, {
    MONGO_DNS_SERVERS: '8.8.8.8, 1.1.1.1',
  });
  assert.equal(configured, true);
  assert.deepEqual(configuredServers, ['8.8.8.8', '1.1.1.1']);
});
test('leaves Node DNS unchanged when no MongoDB DNS fallback is configured', () => {
  let calls = 0;
  const dnsModule = { setServers() { calls += 1; } };
  const configured = configureMongoDns(dnsModule, {});
  assert.equal(configured, false);
  assert.equal(calls, 0);
});
test('uses public DNS for a MongoDB SRV URI when no server override is supplied', () => {
  let configuredServers = null;
  const dnsModule = { setServers(servers) { configuredServers = servers; } };
  const configured = configureMongoDns(dnsModule, {
    MONGO_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/sentry',
  });
  assert.equal(configured, true);
  assert.deepEqual(configuredServers, ['8.8.8.8', '1.1.1.1']);
});
