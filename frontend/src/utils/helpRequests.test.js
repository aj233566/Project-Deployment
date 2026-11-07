import test from 'node:test';
import assert from 'node:assert/strict';
import { newHelpRequests } from './helpRequests.js';

test('nothing is new on the first look, then only ids not seen before', () => {
  const list = [{ id: 'a' }, { id: 'b' }];
  assert.deepEqual(newHelpRequests(list, null), []);
  assert.deepEqual(newHelpRequests(list, new Set(['a'])).map((person) => person.id), ['b']);
  assert.deepEqual(newHelpRequests(list, new Set(['a', 'b'])), []);
  assert.deepEqual(newHelpRequests(undefined, new Set()), []);
});
