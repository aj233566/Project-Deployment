import test from 'node:test';
import assert from 'node:assert/strict';
import { STRINGS, translate } from './citizenLang.js';

test('translate fills placeholders and falls back to the key', () => {
  assert.equal(translate('sp.free', { n: 80 }), '80 places free');
  assert.equal(translate('no.such.key'), 'no.such.key');
  assert.equal(translate('sp.free'), '{n} places free');
});

test('every text used by the cards exists and no Hindi is left in the table', () => {
  assert.ok(!('hi' in STRINGS));
  for (const text of Object.values(STRINGS.en)) assert.ok(!/[ऀ-ॿ]/.test(text), text);
  for (const key of ['nav.area', 'sp.title', 'np.sos', 'alert.title', 'road.OPEN', 'st.need-help']) assert.ok(STRINGS.en[key], key);
});
