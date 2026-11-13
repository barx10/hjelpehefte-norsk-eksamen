// Felles visning av tilbakemelding på skriving: automatiske sjekker, oversikt over avsnittene og ledetekst til KI.
// Brukes både i eksamenstreningen og i skriveøvelsene.

import { sjekkTekst, avsnittsoversikt, avsnitt, lagLedetekst, type Sjanger, type Skrivefeil } from './tekstsjekk.ts';
import { beleggFinnes, forbedringspunkter, byttAvsnitt, GENERELLE_PUNKTER, type Vurdering } from './revisjon.ts';
import { ordTelling } from './tekstverktoy.ts';

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
  skrivefeil?: Skrivefeil[];
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
  const funn = sjekkTekst(o.tekst, { sjanger: o.sjanger, vedlegg: o.vedlegg, skrivefeil: o.skrivefeil }).slice(0, 6);
  const sjekker = el('div', { class: 'funn' }, el('h4', {}, 'Dette bør du sjekke'));
  if (funn.length === 0) {
    sjekker.append(el('p', {}, 'De automatiske sjekkene fant ingenting å peke på. Det betyr ikke at teksten er feilfri, så les den likevel en gang til.'));
  } else {
    const liste = el('ul', { class: 'funn-liste' });
    for (const f of funn) {
      const li = el('li', {}, f.mulig ? el('p', {}, el('span', { class: 'merke usikker' }, 'Usikker'), ' ', f.melding) : el('p', {}, f.melding));
      if (f.utdrag.length) li.append(el('ul', { class: 'funn-utdrag' }, ...f.utdrag.slice(0, 3).map((u) => el('li', {}, u))));
      const k = f.kapitler.map((id) => o.kapitler[id]).find(Boolean);
      if (k) li.append(el('p', { class: 'tastehint' }, 'Les mer: ', el('a', { href: k.url, target: '_blank', rel: 'noopener' }, k.tittel)));
      liste.append(li);
    }
    sjekker.append(liste, el('p', { class: 'tastehint' }, 'Sjekkene er automatiske og kan ta feil. Punkter merket «Usikker» treffer oftere feil enn de andre. Vurder hvert punkt selv.'));
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

// ---------- egenvurdering med belegg ----------

export type Egenvurderingsvalg = {
  kjennetegn: string[];
  tekst: string;
  /** Unik del av id-ene i skjemaet. */
  prefiks: string;
  overskrift: string;
  lagret: Record<number, Vurdering>;
  vedEndring: (vurdering: Record<number, Vurdering>) => void;
};

/** Eleven krysser av for hvert kjennetegn og limer inn setningen fra svaret som viser det. */
export function lagEgenvurdering(o: Egenvurderingsvalg): { el: HTMLElement; vurdering: () => Record<number, Vurdering> } {
  const vurdering: Record<number, Vurdering> = { ...o.lagret };
  const sett = el('fieldset', { class: 'egenvurdering' }, el('legend', {}, o.overskrift));
  sett.append(el('p', { class: 'tastehint' }, 'Kryss av for det du har fått med, og lim inn setningen fra svaret ditt som viser det. Finner du ingen setning, er det et forbedringspunkt.'));
  o.kjennetegn.forEach((k, i) => {
    const v = (vurdering[i] ??= { ok: false, belegg: '' });
    const id = `ev-${o.prefiks}-${i}`;
    const boks = el('input', { type: 'checkbox', id });
    boks.checked = v.ok;
    const felt = el('input', { type: 'text', class: 'belegg', id: `${id}-b`, placeholder: 'Lim inn setningen som viser det', 'aria-label': `Setning fra svaret som viser: ${k}` });
    felt.value = v.belegg;
    const status = el('p', { class: 'belegg-status tastehint', 'aria-live': 'polite' });
    const oppdater = () => {
      v.ok = boks.checked;
      v.belegg = felt.value;
      if (!v.belegg.trim()) status.textContent = v.ok ? 'Lim inn setningen som viser det.' : '';
      else status.textContent = beleggFinnes(o.tekst, v.belegg) ? 'Setningen står i svaret ditt.' : 'Finner ikke denne teksten i svaret ditt. Lim inn minst tre ord nøyaktig slik de står.';
      o.vedEndring(vurdering);
    };
    boks.addEventListener('change', oppdater);
    felt.addEventListener('input', oppdater);
    oppdater();
    sett.append(el('div', { class: 'kriterium kriterium-belegg' }, boks, el('label', { for: id }, k), felt, status));
  });
  return { el: sett, vurdering: () => vurdering };
}

// ---------- omskriving ----------

export type Omskrivingsvalg = {
  tekst: string;
  prefiks: string;
  kjennetegn: string[];
  /** Hvilke kjennetegn eleven ikke har vist i teksten ennå. Leses hver gang listen bygges. */
  vurdering: () => Record<number, Vurdering>;
  /** Kalles med hele den nye teksten når eleven bytter inn avsnittet. */
  vedBytt: (nyTekst: string) => void;
};

/** Eleven velger et forbedringspunkt og ett avsnitt, skriver det om og ser før og etter. */
export function lagOmskriving(o: Omskrivingsvalg): HTMLElement {
  const deler = avsnitt(o.tekst);
  const boks = el('section', { class: 'omskriving' }, el('h4', {}, 'Skriv om ett avsnitt'));
  if (deler.length === 0) return boks;
  boks.append(el('p', {}, 'Velg ett forbedringspunkt og ett avsnitt. Skriv avsnittet bedre, og sammenlign med det du skrev først.'));

  const punktValg = el('select', { id: `om-${o.prefiks}-punkt` });
  const fyllPunkter = () => {
    const valgt = punktValg.value;
    punktValg.replaceChildren();
    const svake = o.kjennetegn.length ? forbedringspunkter(o.kjennetegn.length, o.tekst, o.vurdering()) : [];
    const liste = o.kjennetegn.length ? (svake.length ? svake.map((i) => o.kjennetegn[i]!) : o.kjennetegn) : GENERELLE_PUNKTER;
    for (const p of liste) punktValg.append(el('option', { value: p }, p));
    if (liste.includes(valgt)) punktValg.value = valgt;
  };
  fyllPunkter();
  punktValg.addEventListener('focus', fyllPunkter);

  const avsnittValg = el('select', { id: `om-${o.prefiks}-avsnitt` });
  deler.forEach((a, i) => avsnittValg.append(el('option', { value: String(i) }, `Avsnitt ${i + 1}: ${a.split(/\s+/).slice(0, 8).join(' ')} …`)));
  // Start på det første avsnittet som er mer enn en tittel.
  const forste = deler.findIndex((a) => ordTelling(a) > 15);
  avsnittValg.value = String(Math.max(0, forste));

  const felt = el('textarea', { id: `om-${o.prefiks}-tekst`, rows: '6', spellcheck: 'true', lang: 'nb' });
  felt.value = deler[Number(avsnittValg.value)] ?? '';
  avsnittValg.addEventListener('change', () => { felt.value = deler[Number(avsnittValg.value)] ?? ''; sammenligning.replaceChildren(); });

  const sammenligning = el('div', { class: 'sammenligning', 'aria-live': 'polite' });
  const sammenlign = el('button', { class: 'knapp sekundar', type: 'button' }, 'Sammenlign');
  sammenlign.addEventListener('click', () => {
    const for_ = deler[Number(avsnittValg.value)] ?? '';
    const etter = felt.value.trim();
    const bytt = el('button', { class: 'knapp', type: 'button' }, 'Bytt inn i svaret');
    bytt.addEventListener('click', () => o.vedBytt(byttAvsnitt(o.tekst, Number(avsnittValg.value), etter)));
    sammenligning.replaceChildren(
      el('p', {}, el('strong', {}, 'Forbedringspunkt: '), punktValg.value),
      el('div', { class: 'for-etter' },
        el('div', {}, el('h5', {}, `Før (${ordTelling(for_)} ord)`), el('p', {}, for_)),
        el('div', {}, el('h5', {}, `Etter (${ordTelling(etter)} ord)`), el('p', {}, etter))),
      el('p', { class: 'tastehint' }, 'Er det nye avsnittet bedre på punktet du valgte? Bytt det inn hvis du vil beholde det.'),
      el('div', { class: 'knapp-rad' }, bytt));
  });

  boks.append(
    el('label', { for: punktValg.id }, 'Forbedringspunkt'), punktValg,
    el('label', { for: avsnittValg.id }, 'Avsnitt'), avsnittValg,
    el('label', { for: felt.id }, 'Skriv avsnittet på nytt'), felt,
    el('div', { class: 'knapp-rad' }, sammenlign), sammenligning);
  return boks;
}
