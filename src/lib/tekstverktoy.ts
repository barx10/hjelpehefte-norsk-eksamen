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

export type MarkertOrd = { ord: string; riktig: boolean };

/**
 * Leser en tekst der riktige ord står i dobbel hakeparentes, for eksempel «[[Drøft]] hvilke fordeler ...».
 * Flere ord kan stå i samme parentes: «[[Gjør rede for]]».
 */
export function leseMarkering(tekst: string): MarkertOrd[] {
  let inne = false;
  return deler(tekst).map((rå) => {
    if (rå.includes('[[')) inne = true;
    const riktig = inne;
    if (rå.includes(']]')) inne = false;
    return { ord: rå.replace('[[', '').replace(']]', ''), riktig };
  });
}

/** Stokker en liste og sørger for at resultatet ikke blir identisk med originalen. */
export function stokkForskjellig<T>(liste: T[], rng: () => number = Math.random): T[] {
  if (liste.length < 2) return [...liste];
  for (let forsok = 0; forsok < 20; forsok++) {
    const ut = [...liste];
    for (let i = ut.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [ut[i], ut[j]] = [ut[j]!, ut[i]!];
    }
    if (ut.some((x, i) => x !== liste[i])) return ut;
  }
  return [...liste].reverse();
}

/** Antall ord, slik de fleste tekstbehandlere teller dem. */
export function ordTelling(tekst: string): number {
  return deler(tekst).length;
}

/** Avsnitt er tekstblokker adskilt av en tom linje. */
export function antallAvsnitt(tekst: string): number {
  return tekst.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean).length;
}

/** Sjekker hvilke nøkkelord som brukes. Treffer også bøyde former (metafor, metaforen). */
export function brukteNokkelord(tekst: string, nokkelord: string[]): { brukt: string[]; mangler: string[] } {
  const lav = tekst.toLocaleLowerCase('nb');
  const brukt: string[] = [];
  const mangler: string[] = [];
  for (const ord of nokkelord) (lav.includes(ord.toLocaleLowerCase('nb')) ? brukt : mangler).push(ord);
  return { brukt, mangler };
}

/** Finner ut om teksten har minst ett sitat i anførselstegn. */
export function harSitat(tekst: string): boolean {
  return /«[^»]{2,}»|"[^"]{2,}"|“[^”]{2,}”/.test(tekst);
}

export type Ordkrav = { min: number; maks: number };

export function ordStatus(antall: number, krav: Ordkrav): 'for-kort' | 'ok' | 'for-lang' {
  return antall < krav.min ? 'for-kort' : antall > krav.maks ? 'for-lang' : 'ok';
}

export type Tabellcelle = { start: string; fasit: string | null };

/** Leser en celle i en bøyingstabell. «lærar|ar» gir stammen «lærar» og ordet eleven skal skrive, «ar». En celle uten | er gitt. */
export function leseTabellcelle(celle: string): Tabellcelle {
  const i = celle.indexOf('|');
  if (i === -1) return { start: celle.trim(), fasit: null };
  return { start: celle.slice(0, i).trimStart(), fasit: celle.slice(i + 1).trim() };
}

/** Sjekker svaret i en celle. Eleven kan skrive bare endingen (med eller uten bindestrek) eller hele ordet. */
export function riktigTabellsvar(svar: string, celle: Tabellcelle): boolean {
  if (celle.fasit === null) return true;
  const rent = svar.trim().toLocaleLowerCase('nn').replace(/^[-–]\s*/, '');
  if (!rent) return false;
  const fasit = celle.fasit.toLocaleLowerCase('nn');
  return rent === fasit || rent === `${celle.start}${celle.fasit}`.toLocaleLowerCase('nn');
}
