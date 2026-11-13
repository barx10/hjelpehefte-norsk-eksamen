// Felles visning av tilbakemelding på skriving: automatiske sjekker, oversikt over avsnittene og ledetekst til KI.
// Brukes både i eksamenstreningen og i skriveøvelsene.

import { sjekkTekst, avsnittsoversikt, lagLedetekst, type Sjanger } from './tekstsjekk.ts';

export type KapittelLenker = Record<string, { url: string; tittel: string }>;

export type Tilbakemeldingsvalg = {
  tekst: string;
  sjanger: Sjanger;
  vedlegg?: { tittel: string; forfatter?: string }[];
  /** Oppgaveteksten, slik den skal stå i ledeteksten. */
  oppgave: string;
  kjennetegn: string[];
  trinn: string;
  kapitler: KapittelLenker;
  /** Oversikt over avsnittene gir bare mening for tekster med flere avsnitt. */
  visOversikt: boolean;
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, egenskaper: Record<string, string> = {}, ...barn: (Node | string)[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(egenskaper)) {
    if (k === 'class') e.className = v;
    else e.setAttribute(k, v);
  }
  e.append(...barn);
  return e;
}

export function lagTilbakemelding(o: Tilbakemeldingsvalg): HTMLElement {
  const boks = el('div', { class: 'tilbakemelding-skriv' });

  // Automatiske sjekker
  const funn = sjekkTekst(o.tekst, { sjanger: o.sjanger, vedlegg: o.vedlegg }).slice(0, 6);
  const sjekker = el('div', { class: 'funn' }, el('h4', {}, 'Dette bør du sjekke'));
  if (funn.length === 0) {
    sjekker.append(el('p', {}, 'De automatiske sjekkene fant ingenting å peke på. Det betyr ikke at teksten er feilfri, så les den likevel en gang til.'));
  } else {
    const liste = el('ul', { class: 'funn-liste' });
    for (const f of funn) {
      const li = el('li', {}, el('p', {}, f.melding));
      if (f.utdrag.length) li.append(el('ul', { class: 'funn-utdrag' }, ...f.utdrag.slice(0, 3).map((u) => el('li', {}, u))));
      const k = f.kapitler.map((id) => o.kapitler[id]).find(Boolean);
      if (k) li.append(el('p', { class: 'tastehint' }, 'Les mer: ', el('a', { href: k.url, target: '_blank', rel: 'noopener' }, k.tittel)));
      liste.append(li);
    }
    sjekker.append(liste, el('p', { class: 'tastehint' }, 'Sjekkene er automatiske og kan ta feil. Vurder hvert punkt selv.'));
  }
  boks.append(sjekker);

  // Oversikt over avsnittene
  const oversikt = avsnittsoversikt(o.tekst);
  if (o.visOversikt && oversikt.length >= 2) {
    boks.append(el('details', { class: 'modell' },
      el('summary', {}, 'Se den røde tråden: første setning i hvert avsnitt'),
      el('p', { class: 'tastehint' }, 'Les bare disse setningene. Sier hver av dem hva avsnittet handler om? Henger de sammen, og svarer de på oppgaven?'),
      el('ol', { class: 'avsnittsoversikt' }, ...oversikt.map((s) => el('li', {}, s)))));
  }

  // Ledetekst til KI
  const melding = el('p', { class: 'melding', role: 'status' });
  const knapp = el('button', { class: 'knapp sekundar', type: 'button' }, 'Kopier ledetekst');
  knapp.addEventListener('click', async () => {
    const tekst = lagLedetekst({ trinn: o.trinn, oppgave: o.oppgave, kjennetegn: o.kjennetegn, svar: o.tekst });
    try {
      await navigator.clipboard.writeText(tekst);
      melding.textContent = 'Ledeteksten er kopiert. Lim den inn i KI-verktøyet.';
    } catch {
      melding.textContent = 'Kunne ikke kopiere automatisk. Marker teksten under og kopier den selv.';
      boks.querySelector('.ledetekst')?.remove();
      melding.after(el('textarea', { class: 'ledetekst', rows: '8', readonly: 'true' }, tekst));
    }
  });
  boks.append(el('details', { class: 'modell' },
    el('summary', {}, 'Få tilbakemelding fra KI'),
    el('p', {}, 'Knappen lager en ledetekst med oppgaven, kjennetegnene og svaret ditt. Den ber om to styrker og to forbedringer, uten at teksten skrives om for deg.'),
    el('ul', {},
      el('li', {}, 'Bruk bare et KI-verktøy som skolen din har godkjent.'),
      el('li', {}, 'Ta bort navnet ditt og andre personopplysninger før du limer inn.'),
      el('li', {}, 'KI kan ta feil. Vurder rådene selv, og spør læreren hvis du er usikker.'),
      el('li', {}, 'KI er ikke lov på eksamen. Bruk det bare når du øver.')),
    el('div', { class: 'knapp-rad' }, knapp), melding));

  return boks;
}
