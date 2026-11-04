import { getCollection, type CollectionEntry } from 'astro:content';
import { deler, finnFeilIndekser, kommaOppsett, rettTekst, utenKomma } from './tekstverktoy';

/**
 * Utkast vises bare under utvikling, eller når siden bygges med `npm run build:utkast`.
 * Den publiserte siden viser bare øvelser med status «godkjent».
 */
export const visUtkast: boolean = import.meta.env.DEV || import.meta.env.PUBLIC_VIS_UTKAST === '1';

export type Kapittel = CollectionEntry<'hefte'>;
export type Mal = CollectionEntry<'mal'>;
export type Ovelse = CollectionEntry<'ovelser'>;

export async function hentKapitler(): Promise<Kapittel[]> {
  const alle = (await getCollection('hefte')).filter((k) => visUtkast || k.data.status === 'godkjent');
  return alle.sort((a, b) => a.data.rekkefolge - b.data.rekkefolge);
}

export async function hentMal(): Promise<Mal[]> {
  const alle = await getCollection('mal');
  return alle.sort((a, b) => a.id.localeCompare(b.id));
}

export async function hentOvelser(): Promise<Ovelse[]> {
  const alle = await getCollection('ovelser');
  const synligeKapitler = new Set((await hentKapitler()).map((k) => k.id));
  return alle
    .filter((o) => visUtkast || o.data.status === 'godkjent')
    .filter((o) => synligeKapitler.has(o.data.kapittel.id))
    .sort((a, b) => a.id.localeCompare(b.id, 'nb'));
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
};

/** Det klienten trenger for å kjøre en øvelse. */
export function tilKlient(o: Ovelse, kapittelTittel: string) {
  const felles = { id: o.id, kapittel: kapittelTittel, utkast: o.data.status === 'utkast' };
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
