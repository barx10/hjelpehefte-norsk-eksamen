import test from 'node:test';
import assert from 'node:assert/strict';
import { normaliser, beleggFinnes, forbedringspunkter, byttAvsnitt } from '../src/lib/revisjon.ts';

const svar = 'Tittel\n\nNovellen viser at moren er urolig. Hun «legger koppen fra seg».\n\nDe korte setningene skaper spenning.';

test('normaliser', () => {
  assert.equal(normaliser('  Hun «legger  koppen», fra seg! '), 'hun legger koppen fra seg');
});

test('belegg må stå i svaret og ha minst tre ord', () => {
  assert.ok(beleggFinnes(svar, 'novellen viser at moren er urolig'));
  assert.ok(beleggFinnes(svar, 'Hun legger koppen fra seg'));
  assert.ok(!beleggFinnes(svar, 'moren'));
  assert.ok(!beleggFinnes(svar, 'Novellen viser at faren er sint'));
  assert.ok(!beleggFinnes(svar, ''));
});

test('forbedringspunkter', () => {
  const v = {
    0: { ok: true, belegg: 'Novellen viser at moren er urolig' },
    1: { ok: true, belegg: '' },
    2: { ok: false, belegg: 'De korte setningene skaper spenning' },
  };
  assert.deepEqual(forbedringspunkter(4, svar, v), [1, 2, 3]);
});

test('bytt avsnitt', () => {
  assert.equal(byttAvsnitt(svar, 2, '  Nytt avsnitt.  '), 'Tittel\n\nNovellen viser at moren er urolig. Hun «legger koppen fra seg».\n\nNytt avsnitt.');
  assert.equal(byttAvsnitt(svar, 9, 'x'), svar);
});
