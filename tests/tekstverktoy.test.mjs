import test from 'node:test';
import assert from 'node:assert/strict';
import { deler, rensk, kommaOppsett, finnFeilIndekser, rettTekst, utenKomma } from '../src/lib/tekstverktoy.ts';

test('deler og rensk', () => {
  assert.deepEqual(deler('  a  b\nc '), ['a', 'b', 'c']);
  assert.equal(rensk('«Faderen»,'), 'Faderen');
  assert.equal(rensk('imorgen.'), 'imorgen');
});

test('kommaOppsett leser komma etter ord', () => {
  const { ord, komma } = kommaOppsett('Når vi er ferdige, kan vi ta pause.');
  assert.deepEqual(ord, ['Når', 'vi', 'er', 'ferdige', 'kan', 'vi', 'ta', 'pause.']);
  assert.deepEqual(komma, [false, false, false, true, false, false, false, false]);
});

test('kommaOppsett håndterer sitattegn før komma', () => {
  const { ord, komma } = kommaOppsett('Novellen «Faderen», som er kort, er sterk.');
  assert.equal(ord[1], '«Faderen»');
  assert.equal(komma[1], true);
  assert.equal(komma[4], true);
});

test('utenKomma fjerner alle komma', () => {
  assert.equal(utenKomma('Hun var sliten, men fornøyd.'), 'Hun var sliten men fornøyd.');
});

test('finnFeilIndekser finner ett ord og flere ord', () => {
  assert.deepEqual(finnFeilIndekser('Vi har eksamen imorgen.', 'imorgen'), [3]);
  assert.deepEqual(finnFeilIndekser('Jeg leste eksamen oppgaven nøye.', 'eksamen oppgaven'), [2, 3]);
});

test('finnFeilIndekser avviser manglende og tvetydige treff', () => {
  assert.equal(finnFeilIndekser('Vi har eksamen i dag.', 'imorgen'), null);
  assert.equal(finnFeilIndekser('de og de', 'de'), null);
  assert.equal(finnFeilIndekser('noe', ''), null);
});

test('rettTekst beholder tegnsetting og stor bokstav', () => {
  assert.equal(rettTekst('Vi har eksamen imorgen.', 'imorgen', 'i morgen'), 'Vi har eksamen i morgen.');
  assert.equal(rettTekst('Tilslutt oppsummerer jeg.', 'Tilslutt', 'Til slutt'), 'Til slutt oppsummerer jeg.');
  assert.equal(rettTekst('Jeg leste eksamen oppgaven nøye.', 'eksamen oppgaven', 'eksamensoppgaven'), 'Jeg leste eksamensoppgaven nøye.');
});
