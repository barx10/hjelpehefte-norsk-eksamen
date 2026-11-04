import { getCollection, type CollectionEntry } from 'astro:content';

/**
 * Utkast vises bare under utvikling, eller når siden bygges med `npm run build:utkast`.
 * Den publiserte siden viser bare øvelser med status «godkjent».
 */
export const visUtkast: boolean = import.meta.env.DEV || import.meta.env.PUBLIC_VIS_UTKAST === '1';

export type Kapittel = CollectionEntry<'hefte'>;
export type Mal = CollectionEntry<'mal'>;
export type Ovelse = CollectionEntry<'ovelser'>;

export async function hentKapitler(): Promise<Kapittel[]> {
  const alle = await getCollection('hefte');
  return alle.sort((a, b) => a.data.rekkefolge - b.data.rekkefolge);
}

export async function hentMal(): Promise<Mal[]> {
  const alle = await getCollection('mal');
  return alle.sort((a, b) => a.id.localeCompare(b.id));
}

export async function hentOvelser(): Promise<Ovelse[]> {
  const alle = await getCollection('ovelser');
  return alle
    .filter((o) => visUtkast || o.data.status === 'godkjent')
    .sort((a, b) => a.id.localeCompare(b.id, 'nb'));
}

export function kapittelNavn(k: Kapittel): string {
  return k.data.nummer ? `${k.data.nummer} ${k.data.tittel}` : k.data.tittel;
}

/** Det klienten trenger for å kjøre en øvelse. */
export function tilKlient(o: Ovelse, kapittelTittel: string) {
  const felles = { id: o.id, kapittel: kapittelTittel, utkast: o.data.status === 'utkast' };
  if (o.data.type === 'flashkort') {
    return { ...felles, type: 'flashkort' as const, forside: o.data.forside, bakside: o.data.bakside };
  }
  return {
    ...felles,
    type: 'flervalg' as const,
    spm: o.data.spm,
    alternativer: o.data.alternativer,
    riktig: o.data.riktig,
    forklaring: o.data.forklaring,
  };
}

/** Trygg innbygging av JSON i en script-tagg. */
export function tilJson(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(new RegExp('[\\u2028\\u2029]', 'g'), (tegn) => '\\u' + tegn.charCodeAt(0).toString(16));
}
