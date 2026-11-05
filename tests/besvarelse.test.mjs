import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { lesBlokker, antallAvsnittI, tilHtml } from '../src/lib/besvarelse.ts';

test('lesBlokker nummererer bare avsnitt', () => {
  const b = lesBlokker('Første.\n\n> Sitat\n> mer\n\n## Overskrift\n\nAndre.\n\n## Litteraturliste\n\nKilde 1.\n\nKilde 2.');
  assert.deepEqual(b.map((x) => x.type), ['avsnitt', 'sitat', 'overskrift', 'avsnitt', 'overskrift', 'kilde', 'kilde']);
  assert.equal(b[0].nr, 1);
  assert.equal(b[3].nr, 2);
  assert.equal(b[1].tekst, 'Sitat mer');
  assert.equal(antallAvsnittI('A.\n\nB.\n\nC.'), 3);
});

test('tilHtml escaper og lager kursiv og lenker', () => {
  assert.equal(tilHtml('a < b & c'), 'a &lt; b &amp; c');
  assert.equal(tilHtml('Se _Kjønnskampen_ nå.'), 'Se <em>Kjønnskampen</em> nå.');
  assert.equal(tilHtml('Se _Kjønnskampen._ Neste.'), 'Se <em>Kjønnskampen.</em> Neste.');
  assert.ok(tilHtml('Les https://snl.no/Sions_vises_protokoller.').includes('<a href="https://snl.no/Sions_vises_protokoller" rel="noopener">'));
  assert.ok(!tilHtml('https://snl.no/Sions_vises_protokoller').includes('<em>'));
  assert.equal(tilHtml('<script>x</script>'), '&lt;script&gt;x&lt;/script&gt;');
});

test('merknader peker på avsnitt som finnes', () => {
  const mappe = 'innhold/besvarelser';
  for (const f of readdirSync(mappe).filter((x) => x.endsWith('.md') && x !== 'README.md')) {
    const tekst = readFileSync(join(mappe, f), 'utf-8');
    const m = tekst.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    const fm = yaml.load(m[1]);
    const antall = antallAvsnittI(m[2]);
    for (const a of fm.avsnitt ?? []) {
      assert.ok(a.nr >= 1 && a.nr <= antall, `${f}: merknad for avsnitt ${a.nr}, men teksten har ${antall} avsnitt`);
    }
    if ((fm.avsnitt ?? []).length > 0) {
      assert.equal(fm.avsnitt.length, antall, `${f}: ${fm.avsnitt.length} merknader, men ${antall} avsnitt`);
    }
  }
});
