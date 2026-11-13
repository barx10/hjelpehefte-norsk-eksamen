import { getCollection, type CollectionEntry } from 'astro:content';
import { NIVAAER, type Nivaa } from './nivaa';
import { deler, finnFeilIndekser, kommaOppsett, leseMarkering, rettTekst, utenKomma } from './tekstverktoy';

/**
 * Utkast vises bare under utvikling, eller når siden bygges med `npm run build:utkast`.
 * Den publiserte siden viser bare øvelser med status «godkjent».
 */
export const visUtkast: boolean = import.meta.env.DEV || import.meta.env.PUBLIC_VIS_UTKAST === '1';

export type Kapittel = CollectionEntry<'hefte'>;
export type Mal = CollectionEntry<'mal'>;
export type Ovelse = CollectionEntry<'ovelser'>;
export type Eksamenspakke = CollectionEntry<'eksamen'>;
export type Besvarelse = CollectionEntry<'besvarelser'>;

/** Uten nivå hentes alt. Med nivå hentes bare innholdet som er merket for det nivået. */
export async function hentKapitler(nivaa?: Nivaa): Promise<Kapittel[]> {
  const alle = (await getCollection('hefte'))
    .filter((k) => visUtkast || k.data.status === 'godkjent')
    .filter((k) => !nivaa || k.data.nivaa.includes(nivaa.kode))
    .map((k) => {
      const eget = nivaa && k.data.perNivaa?.[nivaa.kode];
      return eget ? { ...k, data: { ...k.data, ...eget } } : k;
    });
  return alle.sort((a, b) => a.data.rekkefolge - b.data.rekkefolge);
}

export async function hentMal(nivaa?: Nivaa): Promise<Mal[]> {
  const alle = (await getCollection('mal')).filter((m) => !nivaa || m.data.nivaa === nivaa.kode);
  return alle.sort((a, b) => a.id.localeCompare(b.id));
}

export async function hentOvelser(nivaa?: Nivaa): Promise<Ovelse[]> {
  const alle = await getCollection('ovelser');
  const kapitler = new Map((await hentKapitler(nivaa)).map((k) => [k.id, k]));
  return alle
    .filter((o) => visUtkast || o.data.status === 'godkjent')
    .filter((o) => {
      const k = kapitler.get(o.data.kapittel.id);
      if (!k) return false;
      // En øvelse uten eget nivå følger kapittelet.
      return !nivaa || (o.data.nivaa ?? k.data.nivaa).includes(nivaa.kode);
    })
    .sort((a, b) => a.id.localeCompare(b.id, 'nb'));
}

export async function hentBesvarelser(nivaa?: Nivaa): Promise<Besvarelse[]> {
  const alle = (await getCollection('besvarelser'))
    .filter((b) => visUtkast || b.data.status === 'godkjent')
    .filter((b) => !nivaa || b.data.nivaa.includes(nivaa.kode));
  return alle.sort((a, b) => a.id.localeCompare(b.id, 'nb'));
}

/** Stier til alle nivåsider, brukt i getStaticPaths. */
export function nivaaStier() {
  return NIVAAER.map((n) => ({ params: { nivaa: n.id }, props: { nivaa: n } }));
}

export const typeTittel: Record<Besvarelse['data']['type'], string> = {
  'retorisk-analyse': 'Retorisk analyse',
  novelleanalyse: 'Novelleanalyse',
  diktanalyse: 'Diktanalyse',
  reklameanalyse: 'Reklameanalyse',
  fagartikkel: 'Fagartikkel',
  essay: 'Essay',
  'reflekterende-tekst': 'Reflekterende tekst',
  'droftende-tekst': 'Drøftende tekst',
};

export async function hentEksamen(nivaa?: Nivaa): Promise<Eksamenspakke[]> {
  const alle = (await getCollection('eksamen'))
    .filter((e) => visUtkast || e.data.status === 'godkjent')
    .filter((e) => !nivaa || e.data.nivaa.includes(nivaa.kode));
  return alle.sort((a, b) => a.id.localeCompare(b.id, 'nb'));
}

/** Kapittelet som hører til en teksttype: kapittelet med samme id, eller et som velger typen med tekstTyper. */
export function kapittelForType(kapitler: Kapittel[], type: string): string | undefined {
  return (kapitler.find((k) => k.id === type) ?? kapitler.find((k) => (k.data.tekstTyper as string[] | undefined)?.includes(type)))?.id;
}

export function kapittelNavn(k: Kapittel): string {
  return k.data.nummer ? `${k.data.nummer} ${k.data.tittel}` : k.data.tittel;
}

export type Ovelsestype = Ovelse['data']['type'];

/** Navn i flertall, brukt i tellinger på forsiden. */
export const typeNavn: Record<Ovelsestype, string> = {
  flashkort: 'flashkort',
  flervalg: 'flervalg',
  komma: 'kommaoppgaver',
  finnfeil: '«finn feilen»-oppgaver',
  sortering: 'sorteringsoppgaver',
  rekkefolge: 'rekkefølgeoppgaver',
  matching: 'koblingsoppgaver',
  marker: '«marker i teksten»-oppgaver',
  skriv: 'skriveoppgaver',
};

/** Det klienten trenger for å kjøre en øvelse. */
export function tilKlient(o: Ovelse, kapittelTittel: string, tekster: Map<string, Besvarelse> = new Map()) {
  const t = o.data.fraTekst ? tekster.get(o.data.fraTekst.id) : undefined;
  const tekstKilde = t
    ? { tittel: t.data.tittel, forfatter: t.data.forfatter ?? '', lisens: t.data.lisens ?? '', lisensUrl: t.data.lisensUrl ?? '', kilde: t.data.kilde ?? '', side: t.id }
    : null;
  const felles = { id: o.id, kapittel: kapittelTittel, utkast: o.data.status === 'utkast', tekstKilde };
  const d = o.data;
  switch (d.type) {
    case 'flashkort':
      return { ...felles, type: 'flashkort' as const, forside: d.forside, bakside: d.bakside };
    case 'flervalg':
      return {
        ...felles,
        type: 'flervalg' as const,
        spm: d.spm,
        alternativer: d.alternativer,
        riktig: d.riktig,
        forklaring: d.forklaring,
        utdrag: d.utdrag ?? null,
      };
    case 'komma': {
      const { ord, komma } = kommaOppsett(d.setning);
      return {
        ...felles,
        type: 'komma' as const,
        ord,
        komma,
        regler: d.regler,
        forklaring: d.forklaring,
        fasit: d.setning,
        utenKomma: utenKomma(d.setning),
      };
    }
    case 'sortering':
      return {
        ...felles,
        type: 'sortering' as const,
        oppdrag: d.oppdrag,
        kategorier: d.kategorier,
        elementer: d.elementer,
        forklaring: d.forklaring,
        fasitTekst: d.elementer.map((e) => `${e.tekst} → ${d.kategorier[e.kategori]}`).join('. '),
      };
    case 'rekkefolge':
      return {
        ...felles,
        type: 'rekkefolge' as const,
        oppdrag: d.oppdrag,
        elementer: d.elementer,
        forklaring: d.forklaring,
        fasitTekst: d.elementer.map((e, i) => `${i + 1}. ${e}`).join(' '),
      };
    case 'matching':
      return {
        ...felles,
        type: 'matching' as const,
        oppdrag: d.oppdrag,
        par: d.par,
        forklaring: d.forklaring,
        fasitTekst: d.par.map((p) => `${p.venstre} = ${p.hoyre}`).join('. '),
      };
    case 'marker': {
      const ord = leseMarkering(d.tekst);
      return {
        ...felles,
        type: 'marker' as const,
        oppdrag: d.oppdrag,
        ord: ord.map((x) => x.ord),
        riktig: ord.map((x) => x.riktig),
        forklaring: d.forklaring,
        fasitTekst: ord.filter((x) => x.riktig).map((x) => x.ord).join(' '),
      };
    }
    case 'skriv':
      return {
        ...felles,
        type: 'skriv' as const,
        oppdrag: d.oppdrag,
        utdrag: d.utdrag ?? null,
        starttekst: d.starttekst ?? '',
        ord: d.ord,
        nokkelord: d.nokkelord,
        nokkelordMinst: d.nokkelordMinst ?? d.nokkelord.length,
        sitat: d.sitat,
        kriterier: d.kriterier,
        modelltekst: d.modelltekst,
        modellkommentar: d.modellkommentar ?? '',
        fasitTekst: d.modelltekst,
        forklaring: d.modellkommentar ?? '',
      };
    case 'finnfeil':
      return {
        ...felles,
        type: 'finnfeil' as const,
        ord: deler(d.tekst),
        feilIndekser: finnFeilIndekser(d.tekst, d.feil) ?? [],
        feil: d.feil,
        rettelse: d.rettelse,
        rettet: rettTekst(d.tekst, d.feil, d.rettelse) ?? d.tekst,
        forklaring: d.forklaring,
        tekst: d.tekst,
      };
  }
}

/** Trygg innbygging av JSON i en script-tagg. */
export function tilJson(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(new RegExp('[\\u2028\\u2029]', 'g'), (tegn) => '\\u' + tegn.charCodeAt(0).toString(16));
}
