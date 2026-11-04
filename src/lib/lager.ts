// Små hjelpere for lagring i nettleseren. Alt er pakket i try/catch fordi lagring kan være blokkert.

function hentLager(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function lesJson<T>(nokkel: string, standard: T, lager: Pick<Storage, 'getItem'> | null = hentLager()): T {
  try {
    const tekst = lager?.getItem(nokkel);
    return tekst ? (JSON.parse(tekst) as T) : standard;
  } catch {
    return standard;
  }
}

export function skrivJson(nokkel: string, verdi: unknown, lager: Pick<Storage, 'setItem'> | null = hentLager()): boolean {
  try {
    if (!lager) return false;
    lager.setItem(nokkel, JSON.stringify(verdi));
    return true;
  } catch {
    return false;
  }
}

export function slettJson(nokkel: string, lager: Pick<Storage, 'removeItem'> | null = hentLager()): void {
  try {
    lager?.removeItem(nokkel);
  } catch {
    /* ingen lagring */
  }
}

export const SKRIV_NOKKEL = 'hjelpehefte-norsk:skriv:v1';
export const eksamenNokkel = (pakke: string) => `hjelpehefte-norsk:eksamen:v1:${pakke}`;

type Tekster = Record<string, string>;

export function lesSkriveutkast(id: string, lager?: Pick<Storage, 'getItem'> | null): string {
  const alle = lesJson<Tekster>(SKRIV_NOKKEL, {}, lager);
  return typeof alle[id] === 'string' ? alle[id]! : '';
}

export function lagreSkriveutkast(
  id: string,
  tekst: string,
  lager?: Pick<Storage, 'getItem' | 'setItem'> | null,
): boolean {
  const alle = lesJson<Tekster>(SKRIV_NOKKEL, {}, lager);
  if (tekst.trim() === '') delete alle[id];
  else alle[id] = tekst;
  return skrivJson(SKRIV_NOKKEL, alle, lager);
}
