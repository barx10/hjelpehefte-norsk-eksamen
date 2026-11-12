import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';
import type { Loader } from 'astro/loaders';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { deler, finnFeilIndekser, kommaOppsett, leseMarkering } from './lib/tekstverktoy';
import { NIVAAKODER, tilNivaaliste } from './lib/nivaa';

/**
 * Leser alle YAML-filer i en mappe. Hver fil er en liste med øvelser, og hver øvelse har en unik id.
 * Dermed kan øvelser samles i filer etter tema uten at hver øvelse trenger en egen fil.
 */
function yamlListeLoader(mappe: string, hva = 'øvelser'): Loader {
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
            if (!id) throw new Error(`${sti}: en oppføring mangler id.`);
            if (store.has(id)) throw new Error(`${sti}: id «${id}» er brukt mer enn én gang.`);
            const { id: _id, ...resten } = rå;
            const data = await parseData({ id, data: resten, filePath: sti });
            store.set({ id, data, digest: generateDigest(resten), filePath: sti });
          }
        }
        logger.info(`Leste ${store.keys().length} ${hva}`);
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
const nivaakode = z.enum(NIVAAKODER);
// Hvilke nivåer innholdet vises for. Kan skrives som én verdi eller en liste. Standard er 10. trinn.
const nivaaliste = z.preprocess((v) => tilNivaaliste(v), z.array(nivaakode).min(1));

// Kapitlene i heftet. Hvert kapittel er også et øvingstema.
const hefte = defineCollection({
  loader: glob({ pattern: '*.md', base: './innhold/hefte' }),
  schema: z.object({
    tittel: z.string(),
    nummer: z.string().default(''),
    rekkefolge: z.number(),
    // Styrer hvor kapittelet står når eleven velger kapitler til heftet.
    gruppe: z.enum(['eksamen', 'sjanger', 'litteratur', 'sprakNorge', 'virkemidler', 'sprak']).default('eksamen'),
    ingress: z.string().optional(),
    // Typer modelltekster som vises i kapittelet. Uten feltet vises tekster med samme type som kapittelets id.
    tekstTyper: z.array(z.enum(['retorisk-analyse', 'novelleanalyse', 'diktanalyse', 'reklameanalyse', 'fagartikkel', 'reflekterende-tekst', 'droftende-tekst'])).optional(),
    // Kapitler som ikke er gjennomgått vises ikke på den publiserte siden.
    status: status.default('godkjent'),
    nivaa: nivaaliste,
  }),
});

// Kompetansemål. Teksten er hentet ordrett fra Udir.
const mal = defineCollection({
  loader: yamlListeLoader('innhold/mal', 'kompetansemål'),
  schema: z.object({
    nivaa: nivaakode,
    tekst: z.string(),
    omfang: z.enum(['dekkes', 'delvis', 'senere', 'utenfor']),
    merknad: z.string().optional(),
  }),
});

const base = z.object({
  kapittel: reference('hefte'),
  // Teksten øvelsen bygger på. Brukes til å vise kilde og lisens.
  fraTekst: reference('besvarelser').optional(),
  mal: z.array(reference('mal')).default([]),
  // Uten nivå følger øvelsen nivåene til kapittelet sitt.
  nivaa: z.preprocess((v) => (v === undefined || v === null ? undefined : tilNivaaliste(v)), z.array(nivaakode).min(1).optional()),
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
  // Kort tekst som spørsmålet gjelder. Skal være skrevet for øvingen eller være fri for opphavsrett.
  utdrag: z.string().optional(),
});

// Eleven setter komma ved å trykke på ordene. `setning` er den riktige setningen, med komma.
const komma = base.extend({
  type: z.literal('komma'),
  setning: z.string(),
  regler: z.array(z.number().int().min(1).max(6)).default([]),
  forklaring: z.string(),
});

// Eleven trykker på ordet som er feil. `feil` er ordet (eller ordene) slik det står i teksten.
const finnfeil = base.extend({
  type: z.literal('finnfeil'),
  tekst: z.string(),
  feil: z.string(),
  rettelse: z.string(),
  forklaring: z.string(),
});

// Eleven plasserer hvert element i riktig kategori.
const sortering = base.extend({
  type: z.literal('sortering'),
  oppdrag: z.string(),
  kategorier: z.array(z.string()).min(2).max(5),
  elementer: z.array(z.object({ tekst: z.string(), kategori: z.number().int().min(0) })).min(3).max(8),
  forklaring: z.string(),
});

// Eleven setter elementene i riktig rekkefølge. Elementene står i riktig rekkefølge i filen.
const rekkefolge = base.extend({
  type: z.literal('rekkefolge'),
  oppdrag: z.string(),
  elementer: z.array(z.string()).min(3).max(8),
  forklaring: z.string(),
});

// Eleven kobler hvert begrep til riktig forklaring.
const matching = base.extend({
  type: z.literal('matching'),
  oppdrag: z.string(),
  par: z.array(z.object({ venstre: z.string(), hoyre: z.string() })).min(3).max(6),
  forklaring: z.string(),
});

// Eleven markerer ord i en tekst. Riktige ord står i [[dobbel hakeparentes]].
const marker = base.extend({
  type: z.literal('marker'),
  oppdrag: z.string(),
  tekst: z.string(),
  forklaring: z.string(),
});

const ordkrav = z.object({ min: z.number().int().min(1), maks: z.number().int().min(1) }).refine((o) => o.min <= o.maks, {
  message: 'min kan ikke være større enn maks',
});

// Eleven skriver en egen tekst, får automatisk sjekk og vurderer seg selv mot kriterier.
const skriv = base.extend({
  type: z.literal('skriv'),
  oppdrag: z.string(),
  utdrag: z.string().optional(),
  starttekst: z.string().optional(), // ferdig tekst eleven skal forbedre
  ord: ordkrav,
  nokkelord: z.array(z.string()).default([]), // begreper teksten bør bruke
  nokkelordMinst: z.number().int().min(1).optional(), // hvor mange av dem som må brukes (standard: alle)
  sitat: z.boolean().default(false),
  kriterier: z.array(z.string()).min(2).max(8),
  modelltekst: z.string(),
  modellkommentar: z.string().optional(),
});

const ovelser = defineCollection({
  loader: yamlListeLoader('innhold/ovelser'),
  schema: z.discriminatedUnion('type', [flashkort, flervalg, komma, finnfeil, sortering, rekkefolge, matching, marker, skriv]).superRefine((o, ctx) => {
    if (o.type === 'flervalg' && o.riktig >= o.alternativer.length) {
      ctx.addIssue({ code: 'custom', message: 'riktig peker utenfor alternativene' });
    }
    if (o.type === 'komma') {
      const { ord, komma: k } = kommaOppsett(o.setning);
      if (ord.length < 2) ctx.addIssue({ code: 'custom', message: 'setningen er for kort' });
      if (k[k.length - 1]) ctx.addIssue({ code: 'custom', message: 'siste ord kan ikke ha komma etter seg' });
    }
    if (o.type === 'sortering') {
      o.elementer.forEach((e, i) => {
        if (e.kategori >= o.kategorier.length) ctx.addIssue({ code: 'custom', message: `element ${i + 1} peker på en kategori som ikke finnes` });
      });
      const brukte = new Set(o.elementer.map((e) => e.kategori));
      if (brukte.size < 2) ctx.addIssue({ code: 'custom', message: 'elementene må høre til minst to ulike kategorier' });
    }
    if (o.type === 'matching') {
      const hoyre = o.par.map((p) => p.hoyre);
      if (new Set(hoyre).size !== hoyre.length) ctx.addIssue({ code: 'custom', message: 'høyre side må være unik for hvert par' });
    }
    if (o.type === 'marker') {
      const ord = leseMarkering(o.tekst);
      if (!ord.some((x) => x.riktig)) ctx.addIssue({ code: 'custom', message: 'ingen ord er markert med [[ ]]' });
      if (o.tekst.split('[[').length !== o.tekst.split(']]').length) ctx.addIssue({ code: 'custom', message: 'ulikt antall [[ og ]]' });
    }
    if (o.type === 'finnfeil') {
      if (!finnFeilIndekser(o.tekst, o.feil)) {
        ctx.addIssue({ code: 'custom', message: `«${o.feil}» må stå nøyaktig én gang i teksten` });
      }
      if (o.feil === o.rettelse) ctx.addIssue({ code: 'custom', message: 'rettelsen er lik feilen' });
    }
  }),
});

// Eksamenspakker for eksamensmodus: vedlegg og tre oppgaver. Tekstene er skrevet for øvingen.
const eksamen = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './innhold/eksamen' }),
  schema: z
    .object({
      tittel: z.string(),
      beskrivelse: z.string(),
      status,
      nivaa: nivaaliste,
      // Kjennetegn på et godt svar i oppgave 2 og 3 vises bare når de er godkjent (eller i utkastmodus).
      kjennetegnStatus: status.default('utkast'),
      vedlegg: z.array(z.object({ id: z.string(), tittel: z.string(), forfatter: z.string().optional(), tekst: z.string() })).min(1),
      oppgave1: z.object({
        vedlegg: z.string(),
        innledning: z.string(),
        delsporsmal: z.array(z.object({ tekst: z.string(), ord: ordkrav, modell: z.string() })).length(3),
      }),
      oppgave2: z.object({
        valg: z
          .array(
            z.object({
              id: z.string(),
              tittel: z.string(),
              tekst: z.string(),
              mal: reference('hefte'),
              vedlegg: z.string().optional(),
              ord: ordkrav,
              nokkelord: z.array(z.string()).default([]),
              nokkelordMinst: z.number().int().min(1).optional(),
              sitat: z.boolean().default(false),
              kjennetegn: z.array(z.string()).max(8).default([]),
            }),
          )
          .min(1),
      }),
      oppgave3: z.object({
        tekst: z.string(),
        vedlegg: z.array(z.string()).min(1),
        ord: ordkrav,
        nokkelord: z.array(z.string()).default([]),
        nokkelordMinst: z.number().int().min(1).optional(),
        sitat: z.boolean().default(false),
        kjennetegn: z.array(z.string()).max(8).default([]),
      }),
    })
    .superRefine((e, ctx) => {
      const ider = new Set(e.vedlegg.map((v) => v.id));
      const sjekk = (id: string | undefined, hvor: string) => {
        if (id && !ider.has(id)) ctx.addIssue({ code: 'custom', message: `${hvor}: vedlegget «${id}» finnes ikke` });
      };
      sjekk(e.oppgave1.vedlegg, 'oppgave 1');
      e.oppgave2.valg.forEach((v) => sjekk(v.vedlegg, `oppgave 2 (${v.id})`));
      e.oppgave3.vedlegg.forEach((v) => sjekk(v, 'oppgave 3'));
    }),
});

// Modelltekster og besvarelser. Metadata og merknader til hvert avsnitt ligger i frontmatter.
const besvarelser = defineCollection({
  loader: glob({ pattern: ['*.md', '!README.md'], base: './innhold/besvarelser' }),
  schema: z.object({
    tittel: z.string(),
    type: z.enum(['retorisk-analyse', 'novelleanalyse', 'diktanalyse', 'reklameanalyse', 'fagartikkel', 'reflekterende-tekst', 'droftende-tekst']),
    // Merkelapp som vises ved teksten, for eksempel «modelltekst, forenklet for 10. trinn».
    kategori: z.string(),
    nivaa: nivaaliste,
    status,
    oppgave: z.string(),
    forfatter: z.string().optional(),
    lisens: z.string().optional(),
    lisensUrl: z.string().optional(),
    kilde: z.string().optional(),
    kildeTittel: z.string().optional(),
    diktUrl: z.string().optional(),
    novelleUrl: z.string().optional(),
    analysertTekstUrl: z.string().optional(),
    bearbeidetFra: z.string().optional(),
    endringer: z.string().optional(),
    merknad: z.string().optional(),
    varsel: z.string().optional(),
    // Punkter som viser hva som gjør teksten god. Vises øverst på siden når de er godkjent.
    styrkerStatus: status.default('utkast'),
    styrker: z.array(z.object({ tekst: z.string(), avsnitt: z.array(z.number().int().min(1)).default([]) })).max(6).default([]),
    // Punkter som viser hva som kan løfte teksten. Brukes på elevtekster med kjente svakheter.
    forbedringerStatus: status.default('utkast'),
    forbedringer: z.array(z.object({ tekst: z.string(), avsnitt: z.array(z.number().int().min(1)).default([]) })).max(6).default([]),
    avsnitt: z
      .array(
        z.object({
          nr: z.number().int().min(1),
          funksjon: z.string(),
          kommentar: z.string().optional(),
          vurdering: z.enum(['styrke', 'svakhet']).optional(),
        }),
      )
      .default([]),
  }),
});

export const collections = { hefte, mal, ovelser, eksamen, besvarelser };
