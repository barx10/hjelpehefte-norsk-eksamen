import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

function frontmatter(sti) {
  const tekst = readFileSync(sti, 'utf-8');
  const m = tekst.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(m, `${sti}: mangler frontmatter`);
  return yaml.load(m[1]);
}

for (const mappe of ['innhold/hefte', 'innhold/besvarelser']) {
  test(`frontmatter i ${mappe} er gyldig YAML`, () => {
    const filer = readdirSync(mappe).filter((f) => f.endsWith('.md') && f !== 'README.md');
    assert.ok(filer.length > 0);
    for (const f of filer) {
      const data = frontmatter(join(mappe, f));
      assert.ok(data && typeof data === 'object', `${f}: tom frontmatter`);
      assert.ok(typeof data.tittel === 'string' && data.tittel.length > 0, `${f}: mangler tittel`);
    }
  });
}

test('besvarelser med lisens har forfatter og lisenslenke', () => {
  const filer = readdirSync('innhold/besvarelser').filter((f) => f.endsWith('.md') && f !== 'README.md');
  for (const f of filer) {
    const d = frontmatter(join('innhold/besvarelser', f));
    if (d.lisens) {
      assert.ok(d.forfatter, `${f}: lisens uten forfatter`);
      assert.ok(d.lisensUrl, `${f}: lisens uten lisensUrl`);
      assert.match(d.kilde ?? '', /^https?:\/\//, `${f}: lisens uten kilde med lenke`);
    }
  }
});

test('styrker og forbedringer i modelltekstene viser til avsnitt som finnes', () => {
  const filer = readdirSync('innhold/besvarelser').filter((f) => f.endsWith('.md') && f !== 'README.md');
  for (const f of filer) {
    const d = frontmatter(join('innhold/besvarelser', f));
    const nr = new Set((d.avsnitt ?? []).map((a) => a.nr));
    for (const s of [...(d.styrker ?? []), ...(d.forbedringer ?? [])]) {
      assert.ok(typeof s.tekst === 'string' && s.tekst.length > 0, `${f}: styrke uten tekst`);
      for (const n of s.avsnitt ?? []) assert.ok(nr.has(n), `${f}: styrken viser til avsnitt ${n}, som ikke har merknad`);
    }
  }
});

test('undertema i øvelsene finnes i kapittelets liste over undertemaer', () => {
  const kapitler = new Map(
    readdirSync('innhold/hefte').filter((f) => f.endsWith('.md')).map((f) => [f.replace(/\.md$/, ''), frontmatter(join('innhold/hefte', f))]),
  );
  for (const f of readdirSync('innhold/ovelser').filter((f) => f.endsWith('.yaml'))) {
    for (const o of yaml.load(readFileSync(join('innhold/ovelser', f), 'utf-8'))) {
      if (!o.undertema) continue;
      const liste = kapitler.get(o.kapittel)?.undertemaer ?? [];
      assert.ok(liste.includes(o.undertema), `${f}: ${o.id} har undertema «${o.undertema}», som kapittelet ${o.kapittel} ikke oppgir`);
    }
  }
});

test('ord i den automatiske ordlisten står ikke i modelltekstene og eksamenstekstene', () => {
  const feil = [];
  for (const f of readdirSync('innhold/ovelser').filter((f) => f.endsWith('.yaml'))) {
    for (const o of yaml.load(readFileSync(join('innhold/ovelser', f), 'utf-8'))) {
      if (o.type === 'finnfeil' && o.ordliste) feil.push(o.feil.toLowerCase());
    }
  }
  assert.ok(feil.length > 0);
  const filer = [
    ...readdirSync('innhold/besvarelser').filter((f) => f.endsWith('.md')).map((f) => join('innhold/besvarelser', f)),
    ...readdirSync('innhold/eksamen').map((f) => join('innhold/eksamen', f)),
  ];
  for (const fil of filer) {
    const tekst = ` ${readFileSync(fil, 'utf-8').toLowerCase().replace(/[^a-zæøåé]+/g, ' ')} `;
    for (const ord of feil) assert.ok(!tekst.includes(` ${ord} `), `${fil}: inneholder «${ord}», som den automatiske sjekken melder som feil`);
  }
});
