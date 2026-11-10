import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { NIVAAER, NIVAAKODER, finnNivaa, tilNivaaliste, nokkelForNivaa, STANDARD_NIVAA } from '../src/lib/nivaa.ts';
import { NOKKEL, les, lagre, oppdater, tom } from '../src/lib/fremgang.ts';

test('hvert nivå har unik id og en gyldig kode', () => {
  assert.equal(new Set(NIVAAER.map((n) => n.id)).size, NIVAAER.length);
  assert.equal(new Set(NIVAAER.map((n) => n.kode)).size, NIVAAER.length);
  for (const n of NIVAAER) assert.ok(NIVAAKODER.includes(n.kode), n.id);
  assert.equal(finnNivaa('vgs')?.kode, 'vg3');
  assert.equal(finnNivaa('finnes-ikke'), undefined);
});

test('nivåfeltet kan være én verdi, en liste eller mangle', () => {
  assert.deepEqual(tilNivaaliste(undefined), ['10']);
  assert.deepEqual(tilNivaaliste('vg3'), ['vg3']);
  assert.deepEqual(tilNivaaliste(10), ['10']);
  assert.deepEqual(tilNivaaliste(['10', 'vg3']), ['10', 'vg3']);
});

test('fremgang lagres hver for seg per nivå', () => {
  const data = new Map();
  const lager = { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
  const ung = nokkelForNivaa(NOKKEL, STANDARD_NIVAA.id);
  const vgs = nokkelForNivaa(NOKKEL, 'vgs');
  assert.equal(ung, NOKKEL);
  assert.notEqual(ung, vgs);
  lagre(oppdater(tom(), 'a', true, 1), lager, ung);
  assert.deepEqual(Object.keys(les(lager, ung)), ['a']);
  assert.deepEqual(les(lager, vgs), {});
});

function frontmatter(sti) {
  const m = readFileSync(sti, 'utf-8').match(/^---\n([\s\S]*?)\n---\n/);
  return m ? yaml.load(m[1]) : {};
}
const gyldig = (v) => [v].flat().every((x) => NIVAAKODER.includes(String(x)));

test('nivå i innholdsfilene er gyldige koder', () => {
  for (const mappe of ['innhold/hefte', 'innhold/besvarelser']) {
    for (const f of readdirSync(mappe).filter((f) => f.endsWith('.md') && f !== 'README.md')) {
      const d = frontmatter(join(mappe, f));
      if (d.nivaa !== undefined) assert.ok(gyldig(d.nivaa), `${mappe}/${f}: ugyldig nivå ${d.nivaa}`);
    }
  }
  for (const mappe of ['innhold/ovelser', 'innhold/mal']) {
    for (const f of readdirSync(mappe).filter((f) => f.endsWith('.yaml'))) {
      for (const o of yaml.load(readFileSync(join(mappe, f), 'utf-8')) ?? []) {
        if (o.nivaa !== undefined) assert.ok(gyldig(o.nivaa), `${mappe}/${f}: ${o.id} har ugyldig nivå ${o.nivaa}`);
      }
    }
  }
  for (const f of readdirSync('innhold/eksamen').filter((f) => f.endsWith('.yaml'))) {
    const d = yaml.load(readFileSync(join('innhold/eksamen', f), 'utf-8'));
    if (d.nivaa !== undefined) assert.ok(gyldig(d.nivaa), `${f}: ugyldig nivå`);
  }
});

test('alle kompetansemål har nivå, og id-ene er unike på tvers av filene', () => {
  const ider = new Set();
  for (const f of readdirSync('innhold/mal').filter((f) => f.endsWith('.yaml'))) {
    for (const m of yaml.load(readFileSync(join('innhold/mal', f), 'utf-8')) ?? []) {
      assert.ok(NIVAAKODER.includes(String(m.nivaa)), `${f}: ${m.id} mangler gyldig nivå`);
      assert.ok(!ider.has(m.id), `${m.id} er brukt to ganger`);
      ider.add(m.id);
    }
  }
});

test('forenklede modelltekster vises på et nivå der originalen også vises', () => {
  const mappe = 'innhold/besvarelser';
  const alle = new Map(readdirSync(mappe).filter((f) => f.endsWith('.md') && f !== 'README.md').map((f) => [f.replace(/\.md$/, ''), frontmatter(join(mappe, f))]));
  for (const [id, d] of alle) {
    if (!d.bearbeidetFra) continue;
    const original = alle.get(d.bearbeidetFra);
    assert.ok(original, `${id}: originalen ${d.bearbeidetFra} finnes ikke`);
    const mine = tilNivaaliste(d.nivaa);
    assert.ok(mine.every((n) => tilNivaaliste(original.nivaa).includes(n)), `${id}: originalen mangler på et nivå`);
  }
});
