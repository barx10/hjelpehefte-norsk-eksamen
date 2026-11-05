// Deler en tekst i avsnitt og andre blokker, slik at merknader kan knyttes til avsnittsnummer.

export type Blokk =
  | { type: 'avsnitt'; nr: number; tekst: string }
  | { type: 'sitat'; tekst: string }
  | { type: 'overskrift'; tekst: string }
  | { type: 'kilde'; tekst: string };

/**
 * Avsnitt er tekstblokker adskilt av tom linje. Blokker som starter med «> » er blokksitat,
 * «## » er overskrifter. Alt etter en overskrift med «litteratur» eller «kilde» er kildeliste og telles ikke.
 */
export function lesBlokker(tekst: string): Blokk[] {
  const deler = tekst
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  let nr = 0;
  let iKilder = false;
  return deler.map((b): Blokk => {
    if (b.startsWith('## ')) {
      iKilder = /litteratur|kilde/i.test(b);
      return { type: 'overskrift', tekst: b.slice(3).trim() };
    }
    if (b.startsWith('> ')) {
      return { type: 'sitat', tekst: b.split('\n').map((l) => l.replace(/^>\s?/, '')).join(' ').trim() };
    }
    if (iKilder) return { type: 'kilde', tekst: b };
    nr++;
    return { type: 'avsnitt', nr, tekst: b };
  });
}

export function antallAvsnittI(tekst: string): number {
  return lesBlokker(tekst).filter((b) => b.type === 'avsnitt').length;
}

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const URL = /(https?:\/\/[^\s<>"]+[^\s<>".,;:!?)»])/g;

/** Gjør ren tekst til trygg HTML: _kursiv_ blir <em>, og nettadresser blir lenker. */
export function tilHtml(tekst: string): string {
  return tekst
    .split(URL)
    .map((del, i) => {
      if (i % 2 === 1) return `<a href="${escape(del)}" rel="noopener">${escape(del)}</a>`;
      return escape(del).replace(/(^|[\s(«"'])_([^_\n]+)_(?=[\s.,;:!?)»"']|$)/g, '$1<em>$2</em>');
    })
    .join('');
}
