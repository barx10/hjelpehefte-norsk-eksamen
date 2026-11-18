import test from 'node:test';
import assert from 'node:assert/strict';
import { deler, rensk, kommaOppsett, finnFeilIndekser, rettTekst, utenKomma, leseMarkering, stokkForskjellig, leseTabellcelle, riktigTabellsvar } from '../src/lib/tekstverktoy.ts';

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

test('leseMarkering finner ett og flere markerte ord', () => {
  const a = leseMarkering('[[Drøft]] hvilke fordeler det har.');
  assert.deepEqual(a.map((x) => x.riktig), [true, false, false, false, false]);
  assert.equal(a[0].ord, 'Drøft');
  const b = leseMarkering('Du skal [[gjøre rede for]] hva en metafor er.');
  assert.deepEqual(b.filter((x) => x.riktig).map((x) => x.ord), ['gjøre', 'rede', 'for']);
});

test('leseMarkering tåler tegnsetting etter parentesen', () => {
  const a = leseMarkering('Hva mener [[du]]?');
  assert.equal(a[2].ord, 'du?');
  assert.equal(a[2].riktig, true);
});

test('stokkForskjellig gir aldri samme rekkefølge', () => {
  const x = ['a', 'b', 'c', 'd'];
  for (let i = 0; i < 50; i++) {
    const y = stokkForskjellig(x);
    assert.deepEqual([...y].sort(), x);
    assert.notDeepEqual(y, x);
  }
  assert.deepEqual(stokkForskjellig(['a']), ['a']);
});

import { ordTelling, antallAvsnitt, brukteNokkelord, harSitat, ordStatus } from '../src/lib/tekstverktoy.ts';

test('ordTelling og antallAvsnitt', () => {
  assert.equal(ordTelling('  Dette er   fem ord. '), 4);
  assert.equal(ordTelling(''), 0);
  assert.equal(antallAvsnitt('Første.\n\nAndre.\n\n\nTredje.'), 3);
  assert.equal(antallAvsnitt('Én linje\nmed linjeskift'), 1);
  assert.equal(antallAvsnitt('   '), 0);
});

test('brukteNokkelord finner bøyde former', () => {
  const r = brukteNokkelord('Forfatteren bruker en Metafor, og metaforen virker.', ['metafor', 'frampek']);
  assert.deepEqual(r.brukt, ['metafor']);
  assert.deepEqual(r.mangler, ['frampek']);
});

test('harSitat godtar vanlige anførselstegn', () => {
  assert.ok(harSitat('Han skriver «natten er en vegg».'));
  assert.ok(harSitat('Han skriver "natten er en vegg".'));
  assert.ok(harSitat('Han skriver “natten er en vegg”.'));
  assert.ok(!harSitat('Han skriver at natten er en vegg.'));
  assert.ok(!harSitat('Tomt «» sitat'));
});

test('ordStatus', () => {
  assert.equal(ordStatus(5, { min: 10, maks: 20 }), 'for-kort');
  assert.equal(ordStatus(10, { min: 10, maks: 20 }), 'ok');
  assert.equal(ordStatus(20, { min: 10, maks: 20 }), 'ok');
  assert.equal(ordStatus(21, { min: 10, maks: 20 }), 'for-lang');
});

test('leseTabellcelle skiller gitt tekst fra felt som skal fylles ut', () => {
  assert.deepEqual(leseTabellcelle('ein lærar'), { start: 'ein lærar', fasit: null });
  assert.deepEqual(leseTabellcelle('lærar|ar'), { start: 'lærar', fasit: 'ar' });
});

test('riktigTabellsvar godtar ending, ending med bindestrek og helt ord', () => {
  const c = leseTabellcelle('lærar|ane');
  assert.equal(riktigTabellsvar('ane', c), true);
  assert.equal(riktigTabellsvar(' -Ane ', c), true);
  assert.equal(riktigTabellsvar('lærarane', c), true);
  assert.equal(riktigTabellsvar('ene', c), false);
  assert.equal(riktigTabellsvar('', c), false);
});

test('leseTabellcelle beholder mellomrom foran feltet og godtar tomt startled', () => {
  assert.deepEqual(leseTabellcelle('har |funne'), { start: 'har ', fasit: 'funne' });
  assert.equal(riktigTabellsvar('funne', leseTabellcelle('har |funne')), true);
  assert.equal(riktigTabellsvar('har funne', leseTabellcelle('har |funne')), true);
  assert.deepEqual(leseTabellcelle('|fann'), { start: '', fasit: 'fann' });
});

test('brukteNokkelord treffer bare i starten av et ord', async () => {
  const { brukteNokkelord } = await import('../src/lib/tekstverktoy.ts');
  const r = brukteNokkelord('Det er primært individet og familien i dag. (Rytme)', ['rim', 'individ', 'familie', 'i dag', 'rytme', 'dag']);
  assert.deepEqual(r.brukt, ['individ', 'familie', 'i dag', 'rytme', 'dag']);
  assert.deepEqual(r.mangler, ['rim']);
  assert.deepEqual(brukteNokkelord('Han er individuell.', ['individ']).brukt, ['individ']);
});

test('nokkelordPunkt gir lesbar tekst', async () => {
  const { nokkelordPunkt } = await import('../src/lib/tekstverktoy.ts');
  assert.deepEqual(nokkelordPunkt({ brukt: ['renessansen', 'individ', 'familie', 'i dag'], mangler: [] }, 2),
    { ok: true, tekst: 'Du har brukt alle fire begrepene: renessansen, individ, familie og i dag.' });
  assert.deepEqual(nokkelordPunkt({ brukt: ['a', 'b'], mangler: ['c'] }, 2), { ok: true, tekst: 'Du har brukt 2 av 3 begreper: a og b.' });
  assert.deepEqual(nokkelordPunkt({ brukt: ['a'], mangler: ['b', 'c', 'd'] }, 2), { ok: false, tekst: 'Du har brukt 1 av 4 begreper. Prøv å få med b, c eller d.' });
  assert.deepEqual(nokkelordPunkt({ brukt: [], mangler: ['x', 'y'] }, 2), { ok: false, tekst: 'Du har brukt 0 av 2 begreper. Få med x og y.' });
  assert.deepEqual(nokkelordPunkt({ brukt: ['x'], mangler: [] }, 1), { ok: true, tekst: 'Du har brukt begrepet x.' });
});

test('avsnittPunkt teller linjeskift og gir tips om tom linje', async () => {
  const { avsnittPunkt, antallAvsnittLinjer } = await import('../src/lib/tekstverktoy.ts');
  assert.equal(antallAvsnittLinjer('En.\nTo.\n\nTre.\n'), 3);
  assert.deepEqual(avsnittPunkt('En.\n\nTo.\n\nTre.', 3), { ok: true, tekst: 'Avsnitt: 3.' });
  assert.equal(avsnittPunkt('En.\nTo.\nTre.', 3).ok, true);
  assert.match(avsnittPunkt('En.\nTo.\nTre.', 3).tekst, /Tips: Hopp over en linje/);
  assert.deepEqual(avsnittPunkt('Bare ett avsnitt.', 2), { ok: false, tekst: 'Avsnitt: 1. Del teksten i minst 2 avsnitt, og hopp over en linje mellom dem.' });
});

test('sitatPunkt sjekker sitatene mot kilden', async () => {
  const { sitatPunkt, sitatFinnes, sitater } = await import('../src/lib/tekstverktoy.ts');
  const kilde = '«Men ordet um deg / aldri døyr / vinn du eit gjetord gjævt.» (Håvamål, strofe 76)';
  assert.deepEqual(sitater('Han skriver «a b» og "c d" og “e f”.'), ['a b', 'c d', 'e f']);
  assert.ok(sitatFinnes('ordet um deg / aldri døyr', kilde));
  assert.ok(sitatFinnes('Ordet um deg aldri døyr,', kilde));
  assert.ok(sitatFinnes('Men ordet […] aldri døyr', kilde));
  assert.ok(!sitatFinnes('ordet om deg dør aldri', kilde));
  assert.ok(!sitatFinnes('ordet um de', kilde));                              // ikke halve ord
  assert.deepEqual(sitatPunkt('Det står «ordet um deg / aldri døyr».', kilde), { ok: true, tekst: 'Sitatet står ordrett i teksten.' });
  assert.deepEqual(sitatPunkt('Det står «ordet om deg dør aldri».', kilde), { ok: false, tekst: 'Fant ikke sitatet «ordet om deg dør aldri» i teksten. Sjekk at du har sitert ordrett.' });
  assert.equal(sitatPunkt('«ordet um deg aldri døyr» og «dette er diktet selv»', kilde).ok, false);
  assert.deepEqual(sitatPunkt('Diktet «Håvamål» er gammelt.', kilde), { ok: true, tekst: 'Du har brukt sitat i anførselstegn.' }); // korte sitater sjekkes ikke
  assert.deepEqual(sitatPunkt('Ingen sitater her.', kilde), { ok: false, tekst: 'Du har ikke brukt sitat i anførselstegn.' });
  assert.deepEqual(sitatPunkt('Det står «ordet om deg dør aldri».', null), { ok: true, tekst: 'Du har brukt sitat i anførselstegn.' });
});

test('sitatPunkt med valgfri kilde gir merknad i stedet for kryss', async () => {
  const { sitatPunkt } = await import('../src/lib/tekstverktoy.ts');
  const kilde = 'Natten er en vegg av svart glass, sa hun.';
  assert.deepEqual(sitatPunkt('Hun sier «natten er en vegg».', kilde, true), { ok: true, tekst: 'Sitatet står ordrett i vedlegget.' });
  const r = sitatPunkt('Ibsen skriver «det er de døde ideene».', kilde, true);
  assert.equal(r.ok, true);
  assert.match(r.tekst, /^Du har brukt sitat i anførselstegn\. Fant ikke sitatet «det er de døde ideene» i vedleggene\. Siterer du fra en annen tekst, er det greit\./);
  assert.equal(sitatPunkt('Ingen sitat.', kilde, true).ok, false);
});
