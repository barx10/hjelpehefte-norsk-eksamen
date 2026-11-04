// Ren tekstlogikk for oppgaver der eleven jobber med enkeltord i en setning.

const KANT = /^[.,;:!?«»"'()]+|[.,;:!?«»"'()]+$/g;

export function deler(tekst: string): string[] {
  return tekst.trim().split(/\s+/).filter(Boolean);
}

/** Fjerner tegnsetting i begynnelsen og slutten av et ord. */
export function rensk(ord: string): string {
  return ord.replace(KANT, '');
}

/** Leser en riktig skrevet setning og skiller ord fra komma. */
export function kommaOppsett(setning: string): { ord: string[]; komma: boolean[] } {
  const deler_ = deler(setning);
  return {
    ord: deler_.map((d) => d.replace(/,$/, '')),
    komma: deler_.map((d) => d.endsWith(',')),
  };
}

/**
 * Finner posisjonen til feilen i en setning. `feil` kan være ett eller flere ord.
 * Returnerer indeksene til ordene, eller null hvis feilen ikke finnes nøyaktig én gang.
 */
export function finnFeilIndekser(tekst: string, feil: string): number[] | null {
  const ord = deler(tekst).map(rensk);
  const sok = deler(feil).map(rensk);
  if (sok.length === 0) return null;
  const treff: number[] = [];
  for (let i = 0; i + sok.length <= ord.length; i++) {
    if (sok.every((s, j) => ord[i + j] === s)) treff.push(i);
  }
  if (treff.length !== 1) return null;
  const start = treff[0]!;
  return sok.map((_, j) => start + j);
}

/** Setter inn rettelsen og beholder tegnsettingen rundt feilen. */
export function rettTekst(tekst: string, feil: string, rettelse: string): string | null {
  const indekser = finnFeilIndekser(tekst, feil);
  if (!indekser) return null;
  const ord = deler(tekst);
  const forste = indekser[0]!;
  const siste = indekser[indekser.length - 1]!;
  const prefiks = ord[forste]!.match(/^[.,;:!?«»"'()]*/)![0];
  const suffiks = ord[siste]!.match(/[.,;:!?«»"'()]*$/)![0];
  ord.splice(forste, indekser.length, prefiks + rettelse + suffiks);
  return ord.join(' ');
}

/** Setningen uten komma, slik eleven ser den. */
export function utenKomma(setning: string): string {
  return kommaOppsett(setning).ord.join(' ');
}
