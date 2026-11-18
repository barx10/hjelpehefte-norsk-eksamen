// Søk i heftet, modelltekstene, øvelsene og eksamenstreningen. Ren logikk uten Astro, slik at den kan testes med node --test.

export type Sokeslag = 'hefte' | 'tekst' | 'ovelse' | 'eksamen';

/** Ett treff i indeksen. `kontekst` er for eksempel kapittelet øvelsen hører til. */
export type Sokepost = { slag: Sokeslag; tittel: string; tekst: string; url: string; kontekst?: string };

export const SLAGNAVN: Record<Sokeslag, string> = {
  hefte: 'Hefte',
  tekst: 'Modelltekster',
  ovelse: 'Øvelser',
  eksamen: 'Eksamenstrening',
};

/** Små bokstaver og vanlige aksenter fjernet. Æ, ø og å beholdes, fordi de er egne bokstaver på norsk. */
export function normaliserSok(tekst: string): string {
  return tekst
    .toLocaleLowerCase('nb')
    .replace(/[éèêë]/g, 'e')
    .replace(/[óòô]/g, 'o')
    .replace(/[áàâ]/g, 'a')
    .replace(/[üú]/g, 'u')
    .replace(/[íì]/g, 'i')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Ordene i søket. Tegn som ikke er bokstaver eller tall, skiller ordene. */
export function sokeord(sporring: string): string[] {
  return [...new Set(normaliserSok(sporring).split(/[^\p{L}\p{N}]+/u).filter((o) => o.length > 0))];
}

const bokstav = /[\p{L}\p{N}]/u;

/** 2 hvis ordet står først i et ord i teksten, 1 hvis det står inne i et ord (som «regel» i «kommaregel»), ellers 0. */
function treff(tekst: string, ord: string): number {
  let fra = 0;
  let best = 0;
  while (true) {
    const i = tekst.indexOf(ord, fra);
    if (i < 0) return best;
    if (i === 0 || !bokstav.test(tekst[i - 1]!)) return 2;
    best = 1;
    fra = i + 1;
  }
}

/** Hvor mange ganger ordet står først i et ord i teksten, høyst fem. */
function antall(tekst: string, ord: string): number {
  let n = 0;
  let i = tekst.indexOf(ord);
  while (i >= 0 && n < 5) {
    if (i === 0 || !bokstav.test(tekst[i - 1]!)) n++;
    i = tekst.indexOf(ord, i + ord.length);
  }
  return n;
}

const ENDINGER = ['ernes', 'enes', 'ene', 'ane', 'ers', 'er', 'ar', 'en', 'et', 'a', 'e', 's'];

/** En enkel stamme, slik at bøyde former finner hverandre: «kommaregler» finner «kommareglene». Stammen har minst fire bokstaver. */
export function stamme(ord: string): string {
  for (const e of ENDINGER) {
    if (ord.endsWith(e) && ord.length - e.length >= 4) return ord.slice(0, -e.length);
  }
  return ord;
}

/** Fjerner markdown slik at teksten kan søkes i og vises som utdrag. */
export function rensMarkdown(md: string): string {
  return md
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[\[|\]\]/g, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*#{1,6}\s+/gm, '')
    .replace(/^\s*\|?[\s:|-]+\|[\s:|-]*$/gm, ' ')
    .replace(/\|/g, ' ')
    .replace(/[*_`]/g, '')
    .replace(/^\s*(?:[-+]|\d+\.)\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

type Klargjort = Sokepost & { nTittel: string; nTekst: string; nKontekst: string };

export function klargjor(poster: Sokepost[]): Klargjort[] {
  return poster.map((p) => ({ ...p, nTittel: normaliserSok(p.tittel), nTekst: normaliserSok(p.tekst), nKontekst: normaliserSok(p.kontekst ?? '') }));
}

export type Resultat = { post: Sokepost; poeng: number };

/** Alle ordene i søket må finnes i posten. Treff i tittelen teller mest, og hele uttrykket i tittelen gir ekstra poeng. */
export function sok(indeks: Klargjort[], sporring: string): Resultat[] {
  const ord = sokeord(sporring);
  if (ord.length === 0) return [];
  const hele = normaliserSok(sporring);
  const ut: Resultat[] = [];
  for (const p of indeks) {
    let poeng = 0;
    let alle = true;
    let iTittelNoen = false;
    for (const o of ord) {
      const s = stamme(o);
      // Stammen må stå først i et ord. Ellers gir korte stammer som «komm» treff i ord som «velkommen».
      const finn = (tekst: string) => treff(tekst, o) || (s !== o && treff(tekst, s) === 2 ? 1.4 : 0);
      const iTittel = finn(p.nTittel);
      const iTekst = iTittel ? 0 : finn(p.nTekst);
      const iKontekst = iTittel || iTekst ? 0 : finn(p.nKontekst);
      if (!iTittel && !iTekst && !iKontekst) { alle = false; break; }
      if (iTittel) iTittelNoen = true;
      // Et ord som går igjen i teksten, tyder på at teksten handler om det.
      const ekstra = iTekst ? 0.5 * Math.max(0, antall(p.nTekst, iTekst === 1.4 ? s : o) - 1) : 0;
      poeng += iTittel * 5 + iTekst * 1.5 + ekstra + iKontekst;
    }
    if (!alle) continue;
    if (ord.length > 1 && p.nTittel.includes(hele)) poeng += 6;
    if (p.nTittel === hele) poeng += 6;
    // Når ordet står i tittelen, kommer korte titler først. «Hva er etos?» passer bedre enn en lang setning som nevner etos.
    if (iTittelNoen) poeng += 3 * Math.min(1, 30 / Math.max(1, p.nTittel.length));
    // Kapitler og tekster er lengre og mer generelle enn øvelser og kommer først når poengene er like.
    if (p.slag === 'hefte') poeng += 0.5;
    ut.push({ post: p, poeng });
  }
  return ut.sort((a, b) => b.poeng - a.poeng || a.post.tittel.localeCompare(b.post.tittel, 'nb'));
}

/** Et utdrag av teksten rundt det første ordet fra søket. */
export function utdrag(tekst: string, sporring: string, lengde = 180): string {
  const n = normaliserSok(tekst);
  const ord = sokeord(sporring);
  // Normaliseringen slår sammen mellomrom, så posisjonen regnes i den normaliserte teksten, som også vises.
  const vist = tekst.replace(/\s+/g, ' ').trim();
  const pos = ord.map((o) => n.indexOf(o)).filter((i) => i >= 0).sort((a, b) => a - b)[0] ?? 0;
  if (vist.length <= lengde) return vist;
  let start = Math.max(0, pos - Math.floor(lengde / 3));
  if (start > 0) {
    const mellomrom = vist.indexOf(' ', start);
    if (mellomrom > 0 && mellomrom < pos) start = mellomrom + 1;
  }
  let slutt = Math.min(vist.length, start + lengde);
  if (slutt < vist.length) {
    const mellomrom = vist.lastIndexOf(' ', slutt);
    if (mellomrom > start + lengde / 2) slutt = mellomrom;
  }
  return `${start > 0 ? '… ' : ''}${vist.slice(start, slutt)}${slutt < vist.length ? ' …' : ''}`;
}

/** Deler en tekst i biter der ordene fra søket er markert, slik at siden kan vise dem uten å bygge HTML av teksten. */
export function markerBiter(tekst: string, sporring: string): { tekst: string; treff: boolean }[] {
  const ord = sokeord(sporring);
  const n = normaliserSok(tekst);
  // Normaliseringen endrer ikke lengden når mellomrommene allerede er slått sammen.
  if (ord.length === 0 || n.length !== tekst.length) return [{ tekst, treff: false }];
  const merket = new Array<boolean>(tekst.length).fill(false);
  const merk = (o: string, barePaStart: boolean) => {
    let i = n.indexOf(o);
    while (i >= 0) {
      if (!barePaStart || i === 0 || !bokstav.test(n[i - 1]!)) merket.fill(true, i, i + o.length);
      i = n.indexOf(o, i + 1);
    }
  };
  for (const o of ord) {
    merk(o, false);
    // Stammen markeres bare først i et ord, slik den også bare gir treff der.
    if (stamme(o) !== o) merk(stamme(o), true);
  }
  const biter: { tekst: string; treff: boolean }[] = [];
  for (let i = 0; i < tekst.length; i++) {
    const siste = biter[biter.length - 1];
    if (siste && siste.treff === merket[i]) siste.tekst += tekst[i];
    else biter.push({ tekst: tekst[i]!, treff: merket[i]! });
  }
  return biter;
}

type Ovelsesdata =
  | { type: 'flashkort'; forside: string; bakside: string }
  | { type: 'flervalg'; spm: string; alternativer: string[]; riktig: number; forklaring: string; utdrag?: string }
  | { type: 'komma'; setning: string; forklaring: string }
  | { type: 'finnfeil'; tekst: string; feil: string; rettelse: string; forklaring: string }
  | { type: 'sortering'; oppdrag: string; kategorier: string[]; elementer: { tekst: string }[]; forklaring: string }
  | { type: 'rekkefolge'; oppdrag: string; elementer: string[]; forklaring: string }
  | { type: 'matching'; oppdrag: string; par: { venstre: string; hoyre: string }[]; forklaring: string }
  | { type: 'marker'; oppdrag: string; tekst: string; forklaring: string }
  | { type: 'boyingstabell'; oppdrag: string; kolonner: string[]; rader: string[][]; forklaring: string }
  | { type: 'skriv'; oppdrag: string; utdrag?: string; kriterier: string[]; modelltekst: string };

/** Overskriften og den søkbare teksten til en øvelse. Kommaøvelsen er uten komma, slik eleven ser den. */
export function ovelseTilSok(d: Ovelsesdata): { tittel: string; tekst: string } {
  const sammen = (...deler: (string | undefined)[]) => deler.filter(Boolean).join(' ');
  switch (d.type) {
    case 'flashkort':
      return { tittel: d.forside, tekst: d.bakside };
    case 'flervalg':
      return { tittel: d.spm, tekst: sammen(d.utdrag, d.alternativer[d.riktig], d.forklaring) };
    // Setningene i komma- og finn feilen-øvelsene er bare eksempler. De står i teksten, slik at et ord i setningen ikke teller som et treff i tittelen.
    case 'komma':
      return { tittel: 'Sett komma', tekst: sammen(d.setning.replace(/,/g, ''), d.forklaring) };
    case 'finnfeil':
      return { tittel: 'Finn feilen', tekst: sammen(d.tekst, d.rettelse, d.forklaring) };
    case 'sortering':
      return { tittel: d.oppdrag, tekst: sammen(...d.kategorier, ...d.elementer.map((e) => e.tekst), d.forklaring) };
    case 'rekkefolge':
      return { tittel: d.oppdrag, tekst: sammen(...d.elementer, d.forklaring) };
    case 'matching':
      return { tittel: d.oppdrag, tekst: sammen(...d.par.flatMap((p) => [p.venstre, p.hoyre]), d.forklaring) };
    case 'marker':
      return { tittel: d.oppdrag, tekst: sammen(d.tekst.replace(/\[\[|\]\]/g, ''), d.forklaring) };
    case 'boyingstabell':
      return { tittel: d.oppdrag, tekst: sammen(...d.kolonner, ...d.rader.map((r) => r.map((c) => c.replace('|', '')).join(' ')), d.forklaring) };
    case 'skriv':
      return { tittel: d.oppdrag, tekst: sammen(d.utdrag, ...d.kriterier, d.modelltekst) };
  }
}
