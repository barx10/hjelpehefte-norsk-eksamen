// Ren logikk for fremgang og utvalg. Ingen DOM, slik at den kan testes med node --test.

export type Post = { box: number; riktig: number; feil: number; sist: number };
export type Fremgang = Record<string, Post>;

import { nokkelForNivaa } from './nivaa.ts';

export const NOKKEL = 'hjelpehefte-norsk:fremgang:v1';

/** Fremgangen lagres per nivå. Nivået står på html-elementet (data-nivaa) på alle nivåsider. */
export function aktivNokkel(): string {
  const nivaa = typeof document === 'undefined' ? undefined : document.documentElement.dataset.nivaa;
  return nokkelForNivaa(NOKKEL, nivaa);
}
export const MESTRET_FRA_BOKS = 4;
export const MAKS_BOKS = 5;

export function tom(): Fremgang {
  return {};
}

export function oppdater(f: Fremgang, id: string, riktig: boolean, naa: number = Date.now()): Fremgang {
  const forrige: Post = f[id] ?? { box: 0, riktig: 0, feil: 0, sist: 0 };
  return {
    ...f,
    [id]: {
      box: riktig ? Math.min(MAKS_BOKS, Math.max(1, forrige.box + 1)) : 1,
      riktig: forrige.riktig + (riktig ? 1 : 0),
      feil: forrige.feil + (riktig ? 0 : 1),
      sist: naa,
    },
  };
}

export function mestret(f: Fremgang, id: string): boolean {
  return (f[id]?.box ?? 0) >= MESTRET_FRA_BOKS;
}

export function antallMestret(f: Fremgang, ider: string[]): number {
  return ider.filter((id) => mestret(f, id)).length;
}

/** Velger øvelser til en økt. Ubrukte og svake øvelser går foran de som sitter. */
export function velgOkt(ider: string[], f: Fremgang, antall: number, rng: () => number = Math.random): string[] {
  const rangert = ider
    .map((id) => ({ id, poeng: (f[id]?.box ?? 0) + rng() * 0.9 }))
    .sort((a, b) => a.poeng - b.poeng)
    .slice(0, antall)
    .map((x) => x.id);
  return stokk(rangert, rng);
}

export function stokk<T>(liste: T[], rng: () => number = Math.random): T[] {
  const ut = [...liste];
  for (let i = ut.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ut[i], ut[j]] = [ut[j]!, ut[i]!];
  }
  return ut;
}

/** Sant når eleven svarte feil sist. Etter et feil svar står øvelsen i boks 1. Et riktig svar gir boks 1
 * bare første gang øvelsen besvares, og da er feil 0. */
export function sistFeil(f: Fremgang, id: string): boolean {
  const p = f[id];
  return p !== undefined && p.box === 1 && p.feil > 0;
}

export type TemaIder = { ider: string[] };

/** Temaet eleven øvde på sist, og når. Null hvis ingen øvelser i temaene er prøvd. */
export function sistOvdeTema<T extends TemaIder>(f: Fremgang, temaer: T[]): { tema: T; sist: number } | null {
  let best: { tema: T; sist: number } | null = null;
  for (const tema of temaer) {
    for (const id of tema.ider) {
      const sist = f[id]?.sist ?? 0;
      if (sist > 0 && (!best || sist > best.sist)) best = { tema, sist };
    }
  }
  return best;
}

/** Temaene med flest øvelser eleven svarte feil på sist. Temaer uten slike øvelser er ikke med. */
export function borOves<T extends TemaIder>(f: Fremgang, temaer: T[], maks = 3): { tema: T; antall: number }[] {
  return temaer
    .map((tema) => ({ tema, antall: tema.ider.filter((id) => sistFeil(f, id)).length }))
    .filter((t) => t.antall > 0)
    .sort((a, b) => b.antall - a.antall)
    .slice(0, maks);
}

/** «I dag», «I går», «For 3 dager siden» eller en dato. */
export function naarTekst(sist: number, naa: number = Date.now()): string {
  const dag = (t: number) => { const d = new Date(t); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000; };
  const dager = dag(naa) - dag(sist);
  if (dager <= 0) return 'I dag';
  if (dager === 1) return 'I går';
  if (dager < 7) return `For ${dager} dager siden`;
  return new Date(sist).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long' });
}

function erPost(x: unknown): x is Post {
  if (typeof x !== 'object' || x === null) return false;
  const p = x as Record<string, unknown>;
  return ['box', 'riktig', 'feil', 'sist'].every((k) => typeof p[k] === 'number' && Number.isFinite(p[k] as number));
}

export function eksporter(f: Fremgang): string {
  return JSON.stringify({ versjon: 1, fremgang: f });
}

/** Returnerer null hvis teksten ikke er gyldig fremgang. */
export function importer(tekst: string): Fremgang | null {
  try {
    const data = JSON.parse(tekst.trim());
    if (data?.versjon !== 1 || typeof data.fremgang !== 'object' || data.fremgang === null) return null;
    const ut: Fremgang = {};
    for (const [id, post] of Object.entries(data.fremgang)) {
      if (!erPost(post)) return null;
      ut[id] = post;
    }
    return ut;
  } catch {
    return null;
  }
}

// Kode for å flytte fremgang mellom enheter. Formen er NORSK.<nivå>.<z|r>.<data>, der data er
// base64url av JSON, komprimert (z) når nettleseren støtter det, ellers rå (r). Nivået står i klartekst
// slik at en kode fra feil nivå kan avvises med en forståelig melding.
export const KODE_PREFIKS = 'NORSK';

type Kompakt = Record<string, [number, number, number, number]>;

function tilBase64url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fraBase64url(tekst: string): Uint8Array {
  const bin = atob(tekst.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function gjennom(bytes: Uint8Array, strom: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const svar = new Response(new Blob([bytes]).stream().pipeThrough(strom));
  return new Uint8Array(await svar.arrayBuffer());
}

const kanKomprimere = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

export async function lagKode(f: Fremgang, nivaa: string): Promise<string> {
  const kompakt: Kompakt = {};
  for (const [id, p] of Object.entries(f)) kompakt[id] = [p.box, p.riktig, p.feil, p.sist];
  const bytes = new TextEncoder().encode(JSON.stringify(kompakt));
  const z = kanKomprimere();
  const data = z ? await gjennom(bytes, new CompressionStream('deflate-raw')) : bytes;
  return `${KODE_PREFIKS}.${nivaa}.${z ? 'z' : 'r'}.${tilBase64url(data)}`;
}

export type LestKode = { nivaa: string | null; fremgang: Fremgang };

/** Leser en kode, en lenke med koden i, eller den gamle JSON-formen. Returnerer null hvis den ikke er gyldig. */
export async function lesKode(tekst: string): Promise<LestKode | null> {
  const renset = tekst.trim();
  if (renset.startsWith('{')) {
    const f = importer(renset);
    return f ? { nivaa: null, fremgang: f } : null;
  }
  const treff = renset.replace(/\s+/g, '').match(/NORSK\.([a-z]+)\.([zr])\.([A-Za-z0-9_-]+)/);
  if (!treff) return null;
  const [, nivaa, type, data] = treff;
  try {
    let bytes = fraBase64url(data!);
    if (type === 'z') {
      if (!kanKomprimere()) return null;
      bytes = await gjennom(bytes, new DecompressionStream('deflate-raw'));
    }
    const kompakt: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof kompakt !== 'object' || kompakt === null || Array.isArray(kompakt)) return null;
    const f: Fremgang = {};
    for (const [id, v] of Object.entries(kompakt)) {
      if (!Array.isArray(v) || v.length !== 4) return null;
      const post = { box: v[0], riktig: v[1], feil: v[2], sist: v[3] };
      if (!erPost(post)) return null;
      f[id] = post;
    }
    return { nivaa: nivaa!, fremgang: f };
  } catch {
    return null;
  }
}

// Lagring. Nettleseren kan blokkere lagring (privat modus), så alt er pakket i try/catch.
export function les(lager: Pick<Storage, 'getItem'> | null = hentLager(), nokkel: string = aktivNokkel()): Fremgang {
  try {
    const tekst = lager?.getItem(nokkel);
    return (tekst && importer(tekst)) || tom();
  } catch {
    return tom();
  }
}

export function lagre(f: Fremgang, lager: Pick<Storage, 'setItem'> | null = hentLager(), nokkel: string = aktivNokkel()): boolean {
  try {
    lager?.setItem(nokkel, eksporter(f));
    return lager !== null;
  } catch {
    return false;
  }
}

export function nullstill(lager: Pick<Storage, 'removeItem'> | null = hentLager(), nokkel: string = aktivNokkel()): void {
  try {
    lager?.removeItem(nokkel);
  } catch {
    /* ingen lagring tilgjengelig */
  }
}

function hentLager(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
