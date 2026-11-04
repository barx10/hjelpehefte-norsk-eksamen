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
    }
  }
});
