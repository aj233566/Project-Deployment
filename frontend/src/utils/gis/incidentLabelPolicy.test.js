import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldKeepIncidentLabelVisible } from './incidentLabelPolicy.js';
test('keeps an incident label open only for the selected incident', () => {
  assert.equal(shouldKeepIncidentLabelVisible(false), false);
  assert.equal(shouldKeepIncidentLabelVisible(true), true);
});
