import test from 'node:test';
import assert from 'node:assert/strict';
import { klargjor, markerBiter, normaliserSok, ovelseTilSok, rensMarkdown, sok, sokeord, utdrag } from '../src/lib/sok.ts';

const poster = klargjor([
  { slag: 'hefte', tittel: 'De viktigste kommareglene', tekst: 'Komma før men. Komma etter leddsetning.', url: '/a/' },
  { slag: 'ovelse', tittel: 'Sett komma: Jeg ville men han ville ikke', tekst: 'Komma før men.', url: '/b/', kontekst: 'Kommaregler' },
  { slag: 'tekst', tittel: 'Kongen som ønsket alle velkommen', tekst: 'Kongen bruker etos, logos og patos.', url: '/c/' },
  { slag: 'ovelse', tittel: 'Hva er etos?', tekst: 'Troverdighet.', url: '/d/', kontekst: 'Retorisk analyse' },
]);

test('normaliserSok beholder æøå og fjerner aksenter', () => {
  assert.equal(normaliserSok('  Idé  og  ÆØÅ '), 'ide og æøå');
});

test('sokeord deler ved tegn og fjerner dobbelt', () => {
  assert.deepEqual(sokeord('«Etos», etos og logos!'), ['etos', 'og', 'logos']);
});

test('alle ordene må finnes, og treff i tittelen kommer først', () => {
  const r = sok(poster, 'etos');
  assert.deepEqual(r.map((x) => x.post.url), ['/d/', '/c/']);
  assert.equal(sok(poster, 'etos komma').length, 0);
});

test('begynnelsen av et ord og ord inne i sammensatte ord gir treff', () => {
  assert.ok(sok(poster, 'komm').some((x) => x.post.url === '/a/'));
  assert.ok(sok(poster, 'regl').some((x) => x.post.url === '/a/'));
});

test('treff i konteksten gjelder også', () => {
  assert.deepEqual(sok(poster, 'retorisk').map((x) => x.post.url), ['/d/']);
});

test('tomt søk gir ingen treff', () => {
  assert.equal(sok(poster, '  ').length, 0);
});

test('utdrag viser teksten rundt treffet', () => {
  const tekst = `${'Innledning. '.repeat(40)}Her står ordet sonett midt i teksten. ${'Slutt. '.repeat(40)}`;
  const u = utdrag(tekst, 'sonett', 80);
  assert.ok(u.includes('sonett'));
  assert.ok(u.startsWith('… ') && u.endsWith(' …'));
  assert.ok(u.length <= 90);
});

test('markerBiter markerer treffene uten å endre teksten', () => {
  const biter = markerBiter('Etos og ETOS', 'etos');
  assert.equal(biter.map((b) => b.tekst).join(''), 'Etos og ETOS');
  assert.deepEqual(biter.filter((b) => b.treff).map((b) => b.tekst), ['Etos', 'ETOS']);
});

test('rensMarkdown fjerner formatering', () => {
  assert.equal(rensMarkdown('> **Mal:** Se [kapittelet](/x/).\n\n| A | B |\n|---|---|\n| 1 | 2 |'), 'Mal: Se kapittelet. A B 1 2');
});

test('ovelseTilSok viser kommaøvelsen uten komma og markeringsøvelsen uten hakeparenteser', () => {
  assert.deepEqual(ovelseTilSok({ type: 'komma', setning: 'Jeg ville, men han ville ikke.', forklaring: 'Komma før men.' }), { tittel: 'Sett komma', tekst: 'Jeg ville men han ville ikke. Komma før men.' });
  assert.equal(ovelseTilSok({ type: 'marker', oppdrag: 'Marker', tekst: 'Et [[sterkt]] ord', forklaring: 'F' }).tekst, 'Et sterkt ord F');
});

test('stamme gjør at bøyde former finner hverandre', async () => {
  const { stamme } = await import('../src/lib/sok.ts');
  assert.equal(stamme('kommaregler'), 'kommaregl');
  assert.equal(stamme('sonetter'), 'sonett');
  assert.equal(stamme('etos'), 'etos');
  assert.ok(sok(poster, 'kommaregler').some((x) => x.post.url === '/a/'));
});

test('korte titler kommer før lange når ordet står i tittelen', () => {
  const p = klargjor([
    { slag: 'ovelse', tittel: 'Sett komma: Etos logos og patos er de tre appellformene i en tale.', tekst: '', url: '/lang/' },
    { slag: 'ovelse', tittel: 'Hva er etos?', tekst: '', url: '/kort/' },
  ]);
  assert.equal(sok(p, 'etos')[0].post.url, '/kort/');
});

test('markerBiter markerer stammen bare først i et ord', () => {
  const merket = markerBiter('Kommareglene og velkommen', 'kommaregler').filter((b) => b.treff).map((b) => b.tekst);
  assert.deepEqual(merket, ['Kommaregl']);
});
