import { defineCollection, reference, z } from 'astro:content';
import { glob, file } from 'astro/loaders';
import type { Loader } from 'astro/loaders';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import yaml from 'js-yaml';

/**
 * Leser alle YAML-filer i en mappe. Hver fil er en liste med øvelser, og hver øvelse har en unik id.
 * Dermed kan øvelser samles i filer etter tema uten at hver øvelse trenger en egen fil.
 */
function yamlListeLoader(mappe: string): Loader {
  return {
    name: 'yaml-liste',
    load: async ({ store, parseData, generateDigest, watcher, logger }) => {
      const last = async () => {
        store.clear();
        const filer = (await readdir(mappe)).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml')).sort();
        for (const fil of filer) {
          const sti = join(mappe, fil);
          const liste = yaml.load(await readFile(sti, 'utf-8'));
          if (!Array.isArray(liste)) throw new Error(`${sti}: filen må inneholde en liste.`);
          for (const rå of liste) {
            const id = typeof rå?.id === 'string' ? rå.id : undefined;
            if (!id) throw new Error(`${sti}: en øvelse mangler id.`);
            if (store.has(id)) throw new Error(`${sti}: id «${id}» er brukt mer enn én gang.`);
            const { id: _id, ...resten } = rå;
            const data = await parseData({ id, data: resten, filePath: sti });
            store.set({ id, data, digest: generateDigest(resten), filePath: sti });
          }
        }
        logger.info(`Leste ${store.keys().length} øvelser`);
      };
      await last();
      watcher?.add(mappe);
      watcher?.on('change', (endret) => {
        if (endret.startsWith(mappe) || endret.includes(`${mappe}`)) void last();
      });
    },
  };
}

const status = z.enum(['utkast', 'godkjent']);

// Kapitlene i heftet. Hvert kapittel er også et øvingstema.
const hefte = defineCollection({
  loader: glob({ pattern: '*.md', base: './innhold/hefte' }),
  schema: z.object({
    tittel: z.string(),
    nummer: z.string().default(''),
    rekkefolge: z.number(),
    ingress: z.string().optional(),
  }),
});

// Kompetansemål. Teksten er hentet ordrett fra Udir.
const mal = defineCollection({
  loader: file('innhold/mal/10-trinn.yaml'),
  schema: z.object({
    nivaa: z.string(),
    tekst: z.string(),
    omfang: z.enum(['dekkes', 'delvis', 'senere', 'utenfor']),
    merknad: z.string().optional(),
  }),
});

const base = z.object({
  kapittel: reference('hefte'),
  mal: z.array(reference('mal')).default([]),
  nivaa: z.string().default('10'),
  status,
  vanskegrad: z.number().int().min(1).max(3).default(1),
});

const flashkort = base.extend({
  type: z.literal('flashkort'),
  forside: z.string(),
  bakside: z.string(),
});

const flervalg = base.extend({
  type: z.literal('flervalg'),
  spm: z.string(),
  alternativer: z.array(z.string()).min(2).max(5),
  riktig: z.number().int().min(0),
  forklaring: z.string(),
});

const ovelser = defineCollection({
  loader: yamlListeLoader('innhold/ovelser'),
  schema: z.discriminatedUnion('type', [flashkort, flervalg]).superRefine((o, ctx) => {
    if (o.type === 'flervalg' && o.riktig >= o.alternativer.length) {
      ctx.addIssue({ code: 'custom', message: 'riktig peker utenfor alternativene' });
    }
  }),
});

export const collections = { hefte, mal, ovelser };
