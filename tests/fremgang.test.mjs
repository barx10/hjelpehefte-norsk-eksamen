import test from 'node:test';
import assert from 'node:assert/strict';
import {
  tom, oppdater, mestret, antallMestret, velgOkt, stokk, eksporter, importer, les, lagre,
} from '../src/lib/fremgang.ts';

const fast = (v) => () => v;

test('riktig svar flytter øvelsen opp, feil sender den til boks 1', () => {
  let f = tom();
  f = oppdater(f, 'a', true, 1);
  assert.equal(f.a.box, 1);
  f = oppdater(f, 'a', true, 2);
  f = oppdater(f, 'a', true, 3);
  f = oppdater(f, 'a', true, 4);
  assert.equal(f.a.box, 4);
  assert.ok(mestret(f, 'a'));
  f = oppdater(f, 'a', false, 5);
  assert.equal(f.a.box, 1);
  assert.equal(f.a.feil, 1);
  assert.equal(f.a.riktig, 4);
  assert.ok(!mestret(f, 'a'));
});

test('boksen går ikke over 5', () => {
  let f = tom();
  for (let i = 0; i < 20; i++) f = oppdater(f, 'a', true, i);
  assert.equal(f.a.box, 5);
});

test('oppdater endrer ikke originalen', () => {
  const f = tom();
  oppdater(f, 'a', true);
  assert.deepEqual(f, {});
});

test('velgOkt tar svake og ubrukte øvelser først', () => {
  let f = tom();
  f = oppdater(oppdater(oppdater(oppdater(f, 'god', true), 'god', true), 'god', true), 'god', true);
  const ider = ['god', 'ny1', 'ny2', 'ny3'];
  const okt = velgOkt(ider, f, 3, fast(0.5));
  assert.equal(okt.length, 3);
  assert.ok(!okt.includes('god'));
});

test('velgOkt gir ingen duplikater og respekterer antall', () => {
  const ider = Array.from({ length: 30 }, (_, i) => 'id' + i);
  const okt = velgOkt(ider, tom(), 10);
  assert.equal(okt.length, 10);
  assert.equal(new Set(okt).size, 10);
  assert.equal(velgOkt(['a', 'b'], tom(), 10).length, 2);
});

test('stokk beholder alle elementene', () => {
  const x = [1, 2, 3, 4, 5, 6];
  assert.deepEqual([...stokk(x)].sort(), x);
});

test('antallMestret teller bare de oppgitte idene', () => {
  let f = tom();
  for (let i = 0; i < 4; i++) f = oppdater(f, 'a', true);
  f = oppdater(f, 'b', true);
  assert.equal(antallMestret(f, ['a', 'b', 'c']), 1);
});

test('eksport og import gir samme data', () => {
  const f = oppdater(oppdater(tom(), 'a', true, 10), 'b', false, 20);
  assert.deepEqual(importer(eksporter(f)), f);
});

test('import avviser ugyldig tekst', () => {
  assert.equal(importer('ikke json'), null);
  assert.equal(importer('{"versjon":2,"fremgang":{}}'), null);
  assert.equal(importer('{"versjon":1,"fremgang":{"a":{"box":"x"}}}'), null);
  assert.equal(importer('null'), null);
});

test('lagring fungerer og tåler manglende eller ødelagt lager', () => {
  const data = new Map();
  const lager = { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
  const f = oppdater(tom(), 'a', true, 1);
  assert.ok(lagre(f, lager));
  assert.deepEqual(les(lager), f);
  assert.deepEqual(les({ getItem: () => 'søppel' }), {});
  assert.deepEqual(les({ getItem: () => { throw new Error('blokkert'); } }), {});
  assert.equal(lagre(f, { setItem: () => { throw new Error('full'); } }), false);
  assert.equal(lagre(f, null), false);
});

test('kode for flytting tåler tur-retur og bærer nivået', async () => {
  const { lagKode, lesKode } = await import('../src/lib/fremgang.ts');
  let f = tom();
  f = oppdater(f, 'vgs-a', true, 1700000000000);
  f = oppdater(f, 'vgs-b', false, 1700000001000);
  const kode = await lagKode(f, 'vgs');
  assert.match(kode, /^NORSK\.vgs\.z\.[A-Za-z0-9_-]+$/);
  assert.deepEqual(await lesKode(kode), { nivaa: 'vgs', fremgang: f });
  assert.deepEqual(await lesKode(`  https://eksempel.no/vgs/fremgang/#hent=${kode}\n`), { nivaa: 'vgs', fremgang: f });
  assert.deepEqual(await lesKode(eksporter(f)), { nivaa: null, fremgang: f });
  assert.equal(await lesKode(kode.slice(0, kode.length - 6)), null);
  assert.equal(await lesKode('hei'), null);
  assert.deepEqual(await lesKode(await lagKode(tom(), 'ungdomstrinn')), { nivaa: 'ungdomstrinn', fremgang: {} });
});

test('sist øvde tema, temaer som bør øves og tidstekst', async () => {
  const { sistFeil, sistOvdeTema, borOves, naarTekst } = await import('../src/lib/fremgang.ts');
  let f = tom();
  f = oppdater(f, 'a1', true, 100);           // første svar riktig: boks 1, men ikke feil
  f = oppdater(f, 'b1', false, 300);          // feil sist
  f = oppdater(f, 'b2', false, 200);
  f = oppdater(f, 'b2', true, 250);           // rettet: boks 2
  f = oppdater(f, 'c1', false, 50);
  f = oppdater(f, 'c2', false, 60);
  assert.equal(sistFeil(f, 'a1'), false);
  assert.equal(sistFeil(f, 'b1'), true);
  assert.equal(sistFeil(f, 'b2'), false);
  const temaer = [{ navn: 'A', ider: ['a1'] }, { navn: 'B', ider: ['b1', 'b2'] }, { navn: 'C', ider: ['c1', 'c2', 'c3'] }, { navn: 'D', ider: ['d1'] }];
  assert.equal(sistOvdeTema(f, temaer).tema.navn, 'B');
  assert.equal(sistOvdeTema(f, temaer).sist, 300);
  assert.equal(sistOvdeTema(tom(), temaer), null);
  assert.deepEqual(borOves(f, temaer).map((t) => [t.tema.navn, t.antall]), [['C', 2], ['B', 1]]);
  const naa = new Date(2026, 10, 18, 9).getTime();
  assert.equal(naarTekst(new Date(2026, 10, 18, 1).getTime(), naa), 'I dag');
  assert.equal(naarTekst(new Date(2026, 10, 17, 23).getTime(), naa), 'I går');
  assert.equal(naarTekst(new Date(2026, 10, 14, 12).getTime(), naa), 'For 4 dager siden');
  assert.match(naarTekst(new Date(2026, 9, 2).getTime(), naa), /2\. oktober/);
});
