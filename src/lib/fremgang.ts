// Ren logikk for fremgang og utvalg. Ingen DOM, slik at den kan testes med node --test.

export type Post = { box: number; riktig: number; feil: number; sist: number };
export type Fremgang = Record<string, Post>;

export const NOKKEL = 'hjelpehefte-norsk:fremgang:v1';
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

// Lagring. Nettleseren kan blokkere lagring (privat modus), så alt er pakket i try/catch.
export function les(lager: Pick<Storage, 'getItem'> | null = hentLager()): Fremgang {
  try {
    const tekst = lager?.getItem(NOKKEL);
    return (tekst && importer(tekst)) || tom();
  } catch {
    return tom();
  }
}

export function lagre(f: Fremgang, lager: Pick<Storage, 'setItem'> | null = hentLager()): boolean {
  try {
    lager?.setItem(NOKKEL, eksporter(f));
    return lager !== null;
  } catch {
    return false;
  }
}

export function nullstill(lager: Pick<Storage, 'removeItem'> | null = hentLager()): void {
  try {
    lager?.removeItem(NOKKEL);
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
