import test from 'node:test';
import assert from 'node:assert/strict';
import { lesJson, skrivJson, slettJson, lesSkriveutkast, lagreSkriveutkast } from '../src/lib/lager.ts';

function fakeLager() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k), m };
}

test('skrivJson og lesJson gir samme verdi', () => {
  const l = fakeLager();
  assert.ok(skrivJson('a', { x: 1 }, l));
  assert.deepEqual(lesJson('a', null, l), { x: 1 });
  slettJson('a', l);
  assert.equal(lesJson('a', 'standard', l), 'standard');
});

test('lesJson tåler ødelagt innhold og blokkert lager', () => {
  assert.equal(lesJson('a', 5, { getItem: () => '{ikke json' }), 5);
  assert.equal(lesJson('a', 5, { getItem: () => { throw new Error('blokkert'); } }), 5);
  assert.equal(skrivJson('a', 1, { setItem: () => { throw new Error('full'); } }), false);
  assert.equal(skrivJson('a', 1, null), false);
});

test('skriveutkast lagres per øvelse og slettes ved tom tekst', () => {
  const l = fakeLager();
  lagreSkriveutkast('a', 'Hei', l);
  lagreSkriveutkast('b', 'Du', l);
  assert.equal(lesSkriveutkast('a', l), 'Hei');
  assert.equal(lesSkriveutkast('b', l), 'Du');
  lagreSkriveutkast('a', '   ', l);
  assert.equal(lesSkriveutkast('a', l), '');
  assert.equal(lesSkriveutkast('b', l), 'Du');
});
