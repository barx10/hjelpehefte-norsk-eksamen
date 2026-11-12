// Nivåene siden kan vises for. Ren data, slik at den kan testes med node --test.
// `id` brukes i adressen, `kode` brukes i innholdsfilene (feltet `nivaa`).

export const NIVAAKODER = ['10', 'vg3'] as const;
export type Nivaakode = (typeof NIVAAKODER)[number];

export type Nivaa = {
  id: string;
  kode: Nivaakode;
  navn: string;
  kort: string;
  beskrivelse: string;
  malTittel: string;
  laereplan: string;
  // Flere sider i læreplanen når målene hentes fra mer enn én. Første lenke er `laereplan`.
  laereplanLenker: readonly { tekst: string; href: string }[];
};

export const NIVAAER: readonly Nivaa[] = [
  {
    id: 'ungdomstrinn',
    kode: '10',
    navn: 'Ungdomstrinn',
    kort: '10. trinn',
    beskrivelse: 'Skriftlig eksamen i norsk etter 10. trinn.',
    malTittel: 'Kompetansemål etter 10. trinn',
    laereplan: 'https://www.udir.no/lk20/nor01-08/kompetansemaal-og-vurdering/kv1110',
    laereplanLenker: [{ tekst: 'etter 10. trinn', href: 'https://www.udir.no/lk20/nor01-08/kompetansemaal-og-vurdering/kv1110' }],
  },
  {
    id: 'vgs',
    kode: 'vg3',
    navn: 'Videregående',
    kort: 'vg1 til vg3 studieforberedende',
    beskrivelse: 'Skriftlig eksamen i norsk hovedmål etter vg3 studieforberedende.',
    malTittel: 'Kompetansemål i videregående (vg1 til vg3)',
    laereplan: 'https://www.udir.no/lk20/nor01-08/kompetansemaal-og-vurdering/kv1114',
    laereplanLenker: [
      { tekst: 'etter vg1', href: 'https://www.udir.no/lk20/nor01-08/kompetansemaal-og-vurdering/kv1113' },
      { tekst: 'etter vg2', href: 'https://www.udir.no/lk20/nor01-08/kompetansemaal-og-vurdering/kv1112' },
      { tekst: 'etter vg3', href: 'https://www.udir.no/lk20/nor01-08/kompetansemaal-og-vurdering/kv1114' },
    ],
  },
];

export const STANDARD_NIVAA = NIVAAER[0]!;
export const NIVAA_NOKKEL = 'hjelpehefte-norsk:nivaa';

export function finnNivaa(id: string | undefined | null): Nivaa | undefined {
  return NIVAAER.find((n) => n.id === id);
}

/** Gjør feltet `nivaa` i en innholdsfil om til en liste. Tomt felt gir standardverdien. */
export function tilNivaaliste(verdi: unknown, standard: Nivaakode[] = ['10']): unknown {
  if (verdi === undefined || verdi === null) return standard;
  return (Array.isArray(verdi) ? verdi : [verdi]).map((v) => String(v));
}

/** Nøkkel for lagring per nivå. Ungdomstrinnet beholder den opprinnelige nøkkelen. */
export function nokkelForNivaa(grunn: string, nivaaId: string | undefined | null): string {
  return !nivaaId || nivaaId === STANDARD_NIVAA.id ? grunn : `${grunn}:${nivaaId}`;
}
