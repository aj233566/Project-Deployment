import test from 'node:test';
import assert from 'node:assert/strict';
import { alertMentionsRegion, classifySachetAlert, mergeSachetAlerts, prepareSachetAlerts } from './sachetAlerts.js';

test('severity is read from the alert wording', () => {
  assert.equal(classifySachetAlert('Very heavy rainfall likely over Kollam'), 'high');
  assert.equal(classifySachetAlert('Heavy rain likely over Kota'), 'watch');
  assert.equal(classifySachetAlert('Light rain with gusty winds over Diu'), 'advisory');
  assert.equal(classifySachetAlert('Moderate rainfall over Pune'), 'moderate');
});

test('region keywords match whole words only and are not treated as patterns', () => {
  const alert = { title: 'Heavy rain likely over Port Blair and Delhi (north).' };
  assert.equal(alertMentionsRegion(alert, ['port blair']), true);
  assert.equal(alertMentionsRegion(alert, ['delh']), false, 'part of a word');
  assert.equal(alertMentionsRegion(alert, ['(north']), false, 'regex characters are escaped, not interpreted');
  assert.equal(alertMentionsRegion(alert, ['a+', '.*']), false);
  assert.equal(alertMentionsRegion(alert, []), true, 'no keywords means every alert');
});

test('prepareSachetAlerts adds a level and filters by keywords', () => {
  const alerts = [{ id: 'a', title: 'Heavy rain over Kota' }, { id: 'b', title: 'Light rain over Diu' }];
  assert.deepEqual(prepareSachetAlerts(alerts, ['kota']).map((alert) => [alert.id, alert.level]), [['a', 'watch']]);
  assert.equal(prepareSachetAlerts(null).length, 0);
});

test('merging alert lists keeps one entry per id, newest first', () => {
  const own = [{ id: '1', time: '2026-10-30T10:00:00.000Z' }, { id: '2', time: '2026-10-28T10:00:00.000Z' }];
  const national = [{ id: '2', time: '2026-10-28T10:00:00.000Z' }, { id: '3', time: '2026-10-30T12:00:00.000Z' }, { id: '4', time: null }];
  assert.deepEqual(mergeSachetAlerts(own, national).map((alert) => alert.id), ['3', '1', '2', '4']);
  assert.deepEqual(mergeSachetAlerts(undefined, null), []);
});

test('regional-language alerts are marked local instead of being given a guessed severity', () => {
  const alerts = [
    { id: 'm', title: 'അടുത്ത 24 മണിക്കൂറിൽ മലവെള്ളപ്പാച്ചിലിനു സാധ്യത', language: 'other' },
    { id: 'e', title: 'Very heavy rain likely over Kollam', language: 'en' },
  ];
  assert.deepEqual(prepareSachetAlerts(alerts).map((alert) => alert.level), ['local', 'high']);
});

test('the English alerts come first and the regional-language ones are only counted', async () => {
  const { splitSachetByLanguage } = await import('./sachetAlerts.js');
  const list = [{ id: 1, level: 'high' }, { id: 2, level: 'local' }, { id: 3, level: 'advisory' }, { id: 4, level: 'local' }];
  const { english, localCount } = splitSachetByLanguage(list);
  assert.deepEqual(english.map((alert) => alert.id), [1, 3]);
  assert.equal(localCount, 2);
  assert.deepEqual(splitSachetByLanguage(undefined), { english: [], localCount: 0 });
});
