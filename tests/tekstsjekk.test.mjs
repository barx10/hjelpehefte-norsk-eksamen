import test from 'node:test';
import assert from 'node:assert/strict';
import { vedleggKjennetegn, sjekkTekst, setninger, avsnitt, harTittel, avsnittsoversikt, utenSitater, lagLedetekst, sjangerFor } from '../src/lib/tekstsjekk.ts';

const ider = (tekst, valg = { sjanger: 'annet' }) => sjekkTekst(tekst, valg).map((f) => f.id);
const fyll = ' Dette er en vanlig setning som gjør teksten lang nok til at sjekkene kjører.';

test('setninger deler ikke ved forkortelser og ordenstall', () => {
  assert.deepEqual(setninger('Vi leste f.eks. Ibsen. Talen ble holdt 17. mai i fjor. Ny setning her.'), [
    'Vi leste f.eks. Ibsen.',
    'Talen ble holdt 17. mai i fjor.',
    'Ny setning her.',
  ]);
});

test('avsnitt og tittel', () => {
  const t = 'Ensomhet i byen\n\nFørste avsnitt. Med to setninger.\n\nAndre avsnitt her.';
  assert.equal(avsnitt(t).length, 3);
  assert.equal(harTittel(t), true);
  assert.equal(harTittel('Dette er en setning med punktum.\n\nMer tekst.'), false);
  assert.deepEqual(avsnittsoversikt(t), ['Første avsnitt.', 'Andre avsnitt her.']);
});

test('sitater holdes utenfor', () => {
  assert.equal(utenSitater('Han skriver «når vi går ut vi ser» her.'), 'Han skriver «…» her.');
});

test('leddsetning først uten komma', () => {
  assert.ok(ids('Når jeg kommer hjem lager jeg middag til hele familien.' + fyll).includes('leddsetning-forst'));
  assert.ok(ids('Selv om teksten er kort sier den svært mye om sorg.' + fyll).includes('leddsetning-forst'));
  // Riktig med komma, spørsmål, adverbet «da» og sitat skal ikke gi funn.
  assert.ok(!ids('Når jeg kommer hjem, lager jeg middag til hele familien.' + fyll).includes('leddsetning-forst'));
  assert.ok(!ids('Når kommer bussen som skal ta oss hjem i dag?' + fyll).includes('leddsetning-forst'));
  assert.ok(!ids('Da var det endelig slutt på den lange vinteren.' + fyll).includes('leddsetning-forst'));
  assert.ok(!ids('Hun skriver: «Når natten kommer går vi ut i mørket.»' + fyll).includes('leddsetning-forst'));
});

function ids(t) { return ider(t); }

test('komma foran at og men', () => {
  assert.ok(ids('Forfatteren mener, at språket endrer seg raskt.' + fyll).includes('komma-at'));
  assert.ok(!ids('Forfatteren mener at språket endrer seg raskt.' + fyll).includes('komma-at'));
  assert.ok(ids('Teksten er kort men den sier mye om livet.' + fyll).includes('komma-men'));
  assert.ok(!ids('Teksten er kort, men den sier mye om livet.' + fyll).includes('komma-men'));
  assert.ok(!ids('Men det er ikke hele sannheten om saken.' + fyll).includes('komma-men'));
  assert.ok(!ids('Det er ikke bare trist men også vakkert.' + fyll).includes('komma-men'));
});

test('liten forbokstav etter punktum', () => {
  assert.ok(ids('Hun gikk ut. det regnet hele dagen.' + fyll).includes('stor-forbokstav'));
  assert.ok(!ids('Vi leste f.eks. diktet. Talen var 17. mai i fjor.' + fyll).includes('stor-forbokstav'));
});

test('lange setninger og like starter', () => {
  const lang = Array(55).fill('ord').join(' ') + '.';
  assert.ok(ids(lang + fyll).includes('lange-setninger'));
  const like = 'Han går ut. Han ser seg om. Han går inn igjen. Han setter seg.' + fyll;
  assert.ok(ids(like).includes('like-starter'));
  assert.ok(!ids('Han går ut. Hun ser seg om. Han går inn igjen. Han setter seg.' + fyll).includes('like-starter'));
});

test('analyse: mange avsnitt uten sitat', () => {
  const tekst = [
    'Tittel på analysen',
    'Innledning om novellen «Ventetid» av Kari Nordmann, som handler om en mor og en datter som venter.' + fyll,
    'Forfatteren bruker mange korte setninger som viser at personen er urolig og ikke klarer å slappe av i det hele tatt.' + fyll,
    'Teksten bruker også kontrast mellom lys og mørke, og det viser at stemningen endrer seg mot slutten av novellen.' + fyll,
    'Personifikasjonen viser spenningen når forfatteren skriver at «huset holdt pusten», og leseren merker uroen.' + fyll,
    'Avslutning som samler trådene og svarer på oppgaven.' + fyll,
  ].join('\n\n');
  const f = ider(tekst, { sjanger: 'analyse', vedlegg: [{ tittel: 'Ventetid', forfatter: 'Kari Nordmann' }] });
  assert.ok(f.includes('avsnitt-uten-sitat'));
  assert.ok(!f.includes('vedlegg'));
  assert.ok(!f.includes('vedlegg-innledning'));
  // Når de fleste analyseavsnittene har sitat, skal det ikke meldes.
  const medSitat = tekst.replace('korte setninger som', 'korte setninger som «Hun venter.», som');
  assert.ok(!ider(medSitat, { sjanger: 'analyse' }).includes('avsnitt-uten-sitat'));
});

test('vedlegg som ikke nevnes', () => {
  const mye = fyll.repeat(10);
  const t = 'Tittel\n\nInnledning uten navn på teksten.' + mye + '\n\nMer om temaet her.' + mye + '\n\nNoe om «Ventetid» av Nordmann senere.' + fyll;
  assert.ok(ider(t, { sjanger: 'analyse', vedlegg: [{ tittel: 'Ventetid', forfatter: 'Kari Nordmann' }] }).includes('vedlegg-innledning'));
  assert.ok(ider(t, { sjanger: 'analyse', vedlegg: [{ tittel: 'Stolen', forfatter: 'Ola Hansen' }] }).includes('vedlegg'));
  assert.ok(!ider(t.replace('Noe om', 'I vedlegg 3 står det noe om'), { sjanger: 'analyse', vedlegg: [{ tittel: 'Vedlegg 3: Stolen (novelle)' }] }).includes('vedlegg'));
});

test('fagartikkel: kilder', () => {
  const uten = 'Språk i endring\n\n' + Array(30).fill('Dette er en setning om språk og identitet i dag.').join(' ');
  assert.ok(ider(uten, { sjanger: 'fagartikkel' }).includes('kilder'));
  const med = uten + ' Det viser også Dyrendal (Dyrendal, 2020).\n\nKilder\n\nDyrendal, A. (2020). Tittel.';
  assert.ok(!ider(med, { sjanger: 'fagartikkel' }).includes('kilder'));
});

test('ordbruk avhenger av sjanger', () => {
  const t = 'Jeg synes teksten er sykt bra skrevet og viser mye om livet.' + fyll;
  assert.ok(ider(t, { sjanger: 'analyse' }).includes('ordbruk'));
  const funn = sjekkTekst(t, { sjanger: 'essay' }).find((f) => f.id === 'ordbruk');
  assert.ok(funn && !funn.utdrag.includes('«jeg synes»'));
  assert.ok(!ider('Teksten viser hvordan bilder skaper stemning i diktet.' + fyll, { sjanger: 'analyse' }).includes('ordbruk'));
});

test('korte tekster gir ingen funn', () => {
  assert.deepEqual(sjekkTekst('Hun gikk ut. det regnet.', { sjanger: 'annet' }), []);
});

test('ledetekst og sjanger', () => {
  const l = lagLedetekst({ trinn: 'vg3', oppgave: 'Tolk novellen.', kjennetegn: ['Har en tese'], svar: 'Svaret mitt.' });
  assert.match(l, /vg3/);
  assert.match(l, /- Har en tese/);
  assert.match(l, /ELEVENS TEKST:\nSvaret mitt\./);
  assert.equal(sjangerFor('fagartikkel-vgs'), 'fagartikkel');
  assert.equal(sjangerFor('ukjent'), 'annet');
  assert.equal(sjangerFor(undefined), 'annet');
});

test('vedleggstitler fra pakkene', () => {
  assert.deepEqual(vedleggKjennetegn({ tittel: 'Vedlegg 1: Trappa (novelleutdrag)', forfatter: 'Utdrag fra en novelle (fiktiv tekst for øving)' }), ['vedlegg 1', 'trappa']);
  assert.deepEqual(vedleggKjennetegn({ tittel: 'Vedlegg 3: Sjøboden av Hanna Dahl (1886)' }), ['vedlegg 3', 'sjøboden', 'dahl']);
  assert.deepEqual(vedleggKjennetegn({ tittel: 'Vedlegg 2: «Du snakker allerede norrønt» (kronikk, 2024)', forfatter: 'Marte Lunde, språkforsker' }), ['vedlegg 2', 'du snakker allerede norrønt', 'lunde']);
});
