// Ren tekstlogikk for egenvurdering og omskriving. Ingen nettleserkode, slik at den kan testes med node --test.

import { avsnitt } from './tekstsjekk.ts';

export type Vurdering = { ok: boolean; belegg: string };

/** Gjør tekst sammenlignbar: små bokstaver, uten tegnsetting og anførselstegn, og med enkle mellomrom. */
export function normaliser(tekst: string): string {
  return tekst.toLowerCase().replace(/[«»"“”'.,;:!?()–—-]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Om belegget eleven har limt inn, faktisk står i svaret. Krever minst tre ord, så det ikke treffer tilfeldig. */
export function beleggFinnes(tekst: string, belegg: string): boolean {
  const b = normaliser(belegg);
  if (b.split(' ').filter(Boolean).length < 3) return false;
  return normaliser(tekst).includes(b);
}

/** Kjennetegn eleven ikke har krysset av for, eller ikke har funnet belegg for i teksten. */
export function forbedringspunkter(antall: number, tekst: string, vurdering: Record<number, Vurdering>): number[] {
  const ut: number[] = [];
  for (let i = 0; i < antall; i++) {
    const v = vurdering[i];
    if (!v || !v.ok || !beleggFinnes(tekst, v.belegg)) ut.push(i);
  }
  return ut;
}

/** Bytter ut ett avsnitt. Avsnittene telles slik `avsnitt` deler dem, med tittelen som første avsnitt. */
export function byttAvsnitt(tekst: string, indeks: number, nytt: string): string {
  const deler = avsnitt(tekst);
  if (indeks < 0 || indeks >= deler.length) return tekst;
  deler[indeks] = nytt.trim();
  return deler.filter(Boolean).join('\n\n');
}

/** Forbedringspunkter å velge mellom når oppgaven ikke har kjennetegn. */
export const GENERELLE_PUNKTER = [
  'Avsnittet begynner med en tydelig temasetning.',
  'Eksempelet eller sitatet blir forklart, ikke bare nevnt.',
  'Fagbegrepene er presise.',
  'Setningene henger sammen med bindeord.',
  'Språket er variert, med både korte og lange setninger.',
];
