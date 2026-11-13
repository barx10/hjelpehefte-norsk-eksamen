// Automatiske sjekker av elevtekster. Ren tekstlogikk uten nettleserkode, slik at den kan testes med node --test.
// Sjekkene gir råd, ikke dom. De skal heller la være å melde fra enn å melde feil.

import { ordTelling } from './tekstverktoy.ts';

export type Sjanger = 'analyse' | 'sammensatt' | 'kortsvar' | 'fagartikkel' | 'essay' | 'drofting' | 'annet';

export type Funn = {
  id: string;
  melding: string;
  /** Setninger eller ord funnet gjelder, slik eleven skrev dem. */
  utdrag: string[];
  /** Kapitler som forklarer regelen. Den første som finnes på nivået, brukes som lenke. */
  kapitler: string[];
  /** Sjekken er usikker. Visningen merker funnet slik at eleven vurderer det selv. */
  mulig?: boolean;
};

export type Skrivefeil = { feil: string; rettelse: string };

export type Sjekkvalg = {
  sjanger: Sjanger;
  /** Vedleggene oppgaven bygger på. Brukes til å sjekke at teksten presenterer dem. */
  vedlegg?: { tittel: string; forfatter?: string }[];
  /** Vanlige skrivefeil fra finn feilen-øvelsene. */
  skrivefeil?: Skrivefeil[];
};

const SJANGER_PER_KAPITTEL: Record<string, Sjanger> = {
  'litteraer-tolkning-vgs': 'analyse',
  'retorisk-analyse-vgs': 'analyse',
  'retorisk-analyse': 'analyse',
  novelleanalyse: 'analyse',
  diktanalyse: 'analyse',
  reklameanalyse: 'sammensatt',
  'sammensatte-tekster-vgs': 'sammensatt',
  'kortsvar-vgs': 'kortsvar',
  'oppgave-1': 'kortsvar',
  fagartikkel: 'fagartikkel',
  'fagartikkel-vgs': 'fagartikkel',
  'essay-vgs': 'essay',
  'reflekterende-tekst': 'essay',
  'droftende-tekst': 'drofting',
};

export function sjangerFor(kapittelId: string | undefined | null): Sjanger {
  return (kapittelId && SJANGER_PER_KAPITTEL[kapittelId]) || 'annet';
}

// ---------- oppdeling ----------

/** Avsnitt er tekstblokker adskilt av en tom linje. */
export function avsnitt(tekst: string): string[] {
  return tekst.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
}

const FORKORTELSER = ['f.eks.', 'bl.a.', 'osv.', 'ca.', 'dvs.', 'm.m.', 'mv.', 'nr.', 'kap.', 's.', 'jf.', 'ev.', 'evt.', 'mht.', 'pga.', 'o.l.'];

/** Deler et avsnitt i setninger. Punktum i forkortelser og etter tall deler ikke. */
export function setninger(avsnittTekst: string): string[] {
  const ord = avsnittTekst.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const ut: string[] = [];
  let naa: string[] = [];
  ord.forEach((o, i) => {
    naa.push(o);
    const neste = ord[i + 1];
    const slutt = /[.!?]["»”)]*$/.test(o) || /[!?]$/.test(o);
    if (!slutt || !neste) return;
    const forkortelse = FORKORTELSER.includes(o.toLowerCase());
    const ordenstall = /^\d+\.$/.test(o);
    // Ny setning bare når neste ord begynner med stor bokstav, tall eller anførselstegn.
    if (forkortelse || ordenstall || !/^[«"(A-ZÆØÅ0-9]/.test(neste)) return;
    ut.push(naa.join(' '));
    naa = [];
  });
  if (naa.length) ut.push(naa.join(' '));
  return ut;
}

/** Setninger der nytt avsnitt eller punktum skiller, uavhengig av stor bokstav. Brukes for å finne liten forbokstav. */
function raaSetninger(avsnittTekst: string): string[] {
  return avsnittTekst.replace(/\s+/g, ' ').trim().split(/(?<=[.!?]["»”)]?)\s+/).filter(Boolean);
}

/** Erstatter sitater med en kort markør, slik at sjekkene ikke vurderer språket i vedleggene. */
export function utenSitater(tekst: string): string {
  return tekst.replace(/«[^»]*»/g, '«…»').replace(/"[^"\n]*"/g, '«…»').replace(/“[^”]*”/g, '«…»');
}

const ER_KILDELISTE = /^\s*[#*]*\s*(kilder|kildeliste|litteraturliste)\b/i;

const kort = (s: string, maks = 18): string => {
  const o = s.split(/\s+/);
  return o.length > maks ? o.slice(0, maks).join(' ') + ' …' : s;
};

// ---------- tittel og innledning ----------

/** Første avsnitt regnes som tittel når det er én kort linje uten punktum. */
export function harTittel(tekst: string): boolean {
  const forste = avsnitt(tekst)[0];
  if (!forste || forste.includes('\n')) return false;
  return ordTelling(forste) <= 15 && !/[.]$/.test(forste);
}

/** Avsnittene i selve teksten: uten tittel og uten kildelisten og det som står etter den. */
function brodtekst(tekst: string): string[] {
  const a = avsnitt(tekst);
  const kropp = harTittel(tekst) ? a.slice(1) : a;
  const kilde = kropp.findIndex((x) => ER_KILDELISTE.test(x));
  return kilde >= 0 ? kropp.slice(0, kilde) : kropp;
}

/** Første setning i hvert avsnitt, uten tittel. Viser om teksten har en rød tråd. */
export function avsnittsoversikt(tekst: string): string[] {
  return brodtekst(tekst).filter((a) => !ER_KILDELISTE.test(a)).map((a) => kort(setninger(a)[0] ?? a, 25));
}

// ---------- sjekkene ----------

const SUBJUNKSJONER_FORST = ['når', 'hvis', 'dersom', 'fordi', 'ettersom', 'mens', 'selv om', 'etter at', 'skjønt'];

function leddsetningUtenKomma(alle: string[]): Funn | null {
  const treff = alle.filter((s) => {
    const l = s.toLowerCase();
    if (!/[.!]$/.test(s) || s.includes(',')) return false;
    if (ordTelling(s) < 6) return false;
    return SUBJUNKSJONER_FORST.some((sub) => l.startsWith(sub + ' '));
  });
  return treff.length ? {
    id: 'leddsetning-forst',
    melding: 'Disse setningene begynner med en leddsetning, men har ikke komma. Når leddsetningen står først, skal det være komma etter den.',
    utdrag: treff.map((s) => kort(s)),
    kapitler: ['kommaregler'],
  } : null;
}

const SI_VERB = 'sa|sier|mener|mente|tror|trodde|vet|visste|viser|viste|skriver|skrev|hevder|hevdet|forteller|fortalte|tenker|tenkte|føler|følte|synes|syntes|påstår|påsto|understreker|forklarer|forklarte';

function kommaForanAt(tekst: string): Funn | null {
  const treff = tekst.match(new RegExp(`\\b(${SI_VERB}),\\s+at\\b`, 'gi')) ?? [];
  return treff.length ? {
    id: 'komma-at',
    melding: 'Det skal vanligvis ikke være komma foran «at» når at-setningen kommer etter verbet.',
    utdrag: [...new Set(treff)],
    kapitler: ['komma-vgs', 'kommaregler'],
  } : null;
}

function menUtenKomma(alle: string[]): Funn | null {
  const treff = alle.filter((s) => /[^\s,;:–—-]\s+men\s/.test(s) && !/\bikke\b[^,]*\smen\s/i.test(s));
  return treff.length ? {
    id: 'komma-men',
    melding: 'Det skal alltid være komma foran «men».',
    utdrag: treff.map((s) => kort(s)),
    kapitler: ['kommaregler'],
  } : null;
}

function litenForbokstav(tekst: string): Funn | null {
  const treff: string[] = [];
  for (const a of avsnitt(tekst)) {
    const deler = raaSetninger(a);
    deler.forEach((s, i) => {
      if (i === 0) return;
      const forrige = deler[i - 1]!;
      const sisteOrd = forrige.split(' ').pop()!.toLowerCase();
      if (!/[.!?]$/.test(forrige) || FORKORTELSER.includes(sisteOrd) || /^\d+\.$/.test(sisteOrd)) return;
      if (/^[a-zæøå]/.test(s) && !/^(https?:|www\.)/.test(s)) treff.push(kort(s, 8));
    });
  }
  return treff.length ? {
    id: 'stor-forbokstav',
    melding: 'Disse setningene begynner med liten bokstav etter punktum.',
    utdrag: treff,
    kapitler: ['rettskriving'],
  } : null;
}

function langeSetninger(alle: string[]): Funn | null {
  const treff = alle.filter((s) => ordTelling(s) > 50);
  return treff.length ? {
    id: 'lange-setninger',
    melding: 'Disse setningene er over 50 ord. Sjekk om de blir klarere hvis du deler dem.',
    utdrag: treff.map((s) => kort(s)),
    kapitler: ['setningsoppbygging-vgs'],
  } : null;
}

function avsnittLengde(tekst: string): Funn[] {
  const ut: Funn[] = [];
  const kropp = brodtekst(tekst).filter((a) => !ER_KILDELISTE.test(a));
  const lange = kropp.filter((a) => ordTelling(a) > 220);
  if (lange.length) ut.push({
    id: 'lange-avsnitt',
    melding: 'Disse avsnittene er over 220 ord. Sjekk om de har mer enn ett poeng, og del dem i så fall.',
    utdrag: lange.map((a) => kort(a, 10)),
    kapitler: ['avsnitt'],
  });
  const enkle = kropp.filter((a) => setninger(a).length === 1 && ordTelling(a) > 3);
  if (kropp.length >= 3 && enkle.length >= 2) ut.push({
    id: 'korte-avsnitt',
    melding: 'Disse avsnittene har bare én setning. Et avsnitt bør ha et poeng, et eksempel og en forklaring.',
    utdrag: enkle.map((a) => kort(a, 10)),
    kapitler: ['avsnitt'],
  });
  return ut;
}

const forsteOrd = (s: string) => (s.replace(/^[«"(\s]+/, '').split(/\s+/)[0] ?? '').toLowerCase().replace(/[.,;:!?»"]+$/, '');

function likeStarter(alle: string[], sjanger: Sjanger): Funn | null {
  const starter = alle.map(forsteOrd).filter(Boolean);
  const tillatt = sjanger === 'essay' ? ['jeg'] : [];
  const funnet = new Set<string>();
  // Fire på rad, eller ett ord som starter minst 35 prosent av setningene i en lengre tekst.
  for (let i = 0; i + 3 < starter.length; i++) {
    const o = starter[i]!;
    if (o === starter[i + 1] && o === starter[i + 2] && o === starter[i + 3] && !tillatt.includes(o)) funnet.add(o);
  }
  if (starter.length >= 15) {
    const tell = new Map<string, number>();
    starter.forEach((o) => tell.set(o, (tell.get(o) ?? 0) + 1));
    tell.forEach((n, o) => { if (n / starter.length >= 0.35 && !tillatt.includes(o)) funnet.add(o); });
  }
  return funnet.size ? {
    id: 'like-starter',
    melding: 'Mange setninger begynner med det samme ordet. Varier ved å begynne med et adverbial, en leddsetning eller et bindeord.',
    utdrag: [...funnet].map((o) => `«${o.charAt(0).toUpperCase() + o.slice(1)} …»`),
    kapitler: ['setningsoppbygging-vgs', 'tekstbinding'],
  } : null;
}

function tittel(tekst: string): Funn | null {
  return harTittel(tekst) ? null : {
    id: 'tittel',
    melding: 'Teksten ser ikke ut til å ha en tittel. Skriv en kort tittel på første linje, uten punktum, og hopp over en linje.',
    utdrag: [],
    kapitler: ['innledning-avslutning'],
  };
}

/** Henter det som kan kjennes igjen i en vedleggstittel som «Vedlegg 1: Trappa (novelleutdrag)». */
export function vedleggKjennetegn(v: { tittel: string; forfatter?: string }): string[] {
  const ut: string[] = [];
  const nr = v.tittel.match(/^vedlegg\s*(\d+)/i)?.[1];
  if (nr) ut.push(`vedlegg ${nr}`);
  const ren = v.tittel.replace(/^vedlegg\s*\d+\s*:\s*/i, '').replace(/\([^)]*\)/g, '').replace(/[«»"]/g, '').trim().toLowerCase();
  const [tittel, forfatterITittel] = ren.split(/\s+av\s+/);
  if (tittel && tittel.length > 2) ut.push(tittel.trim());
  if (forfatterITittel) ut.push(forfatterITittel.trim().split(/\s+/).pop()!);
  // Forfatterfeltet er ofte en beskrivelse. Bruk det bare når det ser ut som et navn.
  const navn = (v.forfatter ?? '').split(/[,(]/)[0]!.trim();
  if (/^([A-ZÆØÅ][a-zæøåé-]+\s?){2,4}$/.test(navn)) ut.push(navn.split(/\s+/).pop()!.toLowerCase());
  return ut;
}

function vedleggNevnt(tekst: string, vedlegg: { tittel: string; forfatter?: string }[]): Funn | null {
  const lav = tekst.toLowerCase();
  const kropp = brodtekst(tekst);
  const innledning = ((kropp[0] ?? '') + ' ' + (kropp[1] ?? '')).toLowerCase();
  const nevnt = (v: { tittel: string; forfatter?: string }, i: string) => vedleggKjennetegn(v).some((k) => i.includes(k));
  const mangler = vedlegg.filter((v) => !nevnt(v, lav));
  if (mangler.length) return {
    id: 'vedlegg',
    melding: 'Teksten ser ikke ut til å nevne alle tekstene oppgaven bygger på. Vis til dem med tittel, forfatter eller vedleggsnummer.',
    utdrag: mangler.map((v) => v.tittel),
    kapitler: ['innledning-avslutning'],
  };
  if (vedlegg.length && !vedlegg.some((v) => nevnt(v, innledning))) return {
    id: 'vedlegg-innledning',
    melding: 'Innledningen nevner ikke teksten du skriver om. Presenter tittel og forfatter i innledningen.',
    utdrag: [],
    kapitler: ['innledning-avslutning'],
  };
  return null;
}

function sitater(tekst: string, sjanger: Sjanger): Funn[] {
  const ut: Funn[] = [];
  const alleSitater = tekst.match(/«[^»]*»/g) ?? [];
  const lange = alleSitater.filter((s) => ordTelling(s) > 40);
  if (lange.length) ut.push({
    id: 'lange-sitater',
    melding: 'Disse sitatene er svært lange. Sitér noen få ord, og bruk plassen på å forklare dem.',
    utdrag: lange.map((s) => kort(s, 10)),
    kapitler: ['kilder'],
  });
  let kropp = brodtekst(tekst).filter((a) => !ER_KILDELISTE.test(a));
  // I lengre tekster er første og siste avsnitt innledning og avslutning.
  if (sjanger !== 'kortsvar' && kropp.length >= 4) kropp = kropp.slice(1, -1);
  const utenSitat = kropp.filter((a) => !/«[^»]+»|"[^"]+"|“[^”]+”/.test(a) && ordTelling(a) > 25);
  if (utenSitat.length && utenSitat.length * 2 > kropp.length) ut.push({
    id: 'avsnitt-uten-sitat',
    melding: 'Mange av avsnittene har ikke sitat. I en analyse bør de fleste poengene vises med et kort sitat fra teksten.',
    utdrag: utenSitat.map((a) => kort(a, 10)),
    kapitler: ['avsnitt'],
  });
  return ut;
}

function kilder(tekst: string): Funn | null {
  const harListe = /^\s*[#*]*\s*(kilder|kildeliste|litteraturliste)\b/im.test(tekst);
  const harHenvisning = /\([^)]*\b\d{4}\b[^)]*\)|\bvedlegg\s*\d/i.test(tekst);
  if (harListe && harHenvisning) return null;
  const mangler = [!harListe && 'en kildeliste til slutt', !harHenvisning && 'henvisninger i teksten, for eksempel (Dyrendal, 2020) eller vedlegg 1'].filter(Boolean) as string[];
  return {
    id: 'kilder',
    melding: `En fagartikkel skal oppgi kildene. Teksten ser ut til å mangle ${mangler.join(' og ')}.`,
    utdrag: [],
    kapitler: ['kilder'],
  };
}

const MUNTLIG = ['sykt', 'liksom', 'typ', 'ass', 'digg', 'mega', 'lol', 'kjempebra', 'kjempefin', 'kjempefint', 'dritbra', 'drit', 'jævlig', 'kult', 'mye bra'];
const VAGT = ['man ser at', 'en del ting', 'ting og tang', 'og sånn', 'og sånt'];
const PERSONLIG = ['jeg synes', 'jeg syns', 'jeg føler at'];

function ordbruk(tekst: string, sjanger: Sjanger): Funn | null {
  const lav = ` ${utenSitater(tekst).toLowerCase().replace(/[.,;:!?()]/g, ' ')} `;
  const liste = [...MUNTLIG, ...VAGT, ...(sjanger === 'essay' || sjanger === 'annet' ? [] : PERSONLIG)];
  const treff = liste.filter((o) => lav.includes(` ${o} `));
  return treff.length ? {
    id: 'ordbruk',
    melding: sjanger === 'essay'
      ? 'Sjekk om disse ordene er presise nok. Et essay kan være personlig, men ordene bør være valgt med omhu.'
      : 'Disse ordene er muntlige eller vage. Bruk mer presise ord og fagbegreper.',
    utdrag: treff.map((o) => `«${o}»`),
    kapitler: ['fagsprak-vgs'],
  } : null;
}

// ---------- usikre sjekker (trinn 2) ----------

const PRONOMEN = 'jeg|du|han|hun|vi|de|det|den|dette|man';
const VANLIGE_VERB = 'er|var|har|hadde|kan|kunne|skal|skulle|vil|ville|må|måtte|gikk|kom|sa|så|fikk|ble|tok|ga|lå|sto|satt|dro|vet|visste|blir|får|går|kommer|ser|tar|gir';

/** Etter et komma begynner en ny hovedsetning med pronomen og verb. Gir kommaskjøt eller feil ordstilling. */
function kommaskjot(alle: string[]): Funn[] {
  const skjot: string[] = [];
  const ordstilling: string[] = [];
  const verb = new RegExp(`^(${PRONOMEN})\\s+(${VANLIGE_VERB}|[a-zæøå]{2,}(er|te|de|et))\\b`, 'i');
  for (const s of alle) {
    const deler = s.split(/,\s+/);
    for (let i = 1; i < deler.length; i++) {
      const etter = deler[i]!;
      const for_ = deler.slice(0, i).join(', ');
      // Hopp over oppramsinger etter kolon og ledd som slutter med et sitat.
      if (!verb.test(etter) || ordTelling(for_) < 3 || for_.includes(':') || /»$/.test(for_)) continue;
      const forsteLedd = for_.toLowerCase();
      if (SUBJUNKSJONER_FORST.some((sub) => forsteLedd.startsWith(sub + ' '))) ordstilling.push(kort(s));
      else skjot.push(kort(s));
    }
  }
  const ut: Funn[] = [];
  if (ordstilling.length) ut.push({
    id: 'ordstilling-etter-leddsetning',
    melding: 'Etter en leddsetning først skal verbet komme før subjektet: «Når jeg kom hjem, spiste jeg», ikke «Når jeg kom hjem, jeg spiste».',
    utdrag: [...new Set(ordstilling)],
    kapitler: ['setningsoppbygging-vgs'],
    mulig: true,
  });
  if (skjot.length) ut.push({
    id: 'kommaskjot',
    melding: 'Her ser det ut som to hele setninger er bundet sammen bare med komma. Bruk punktum, eller et bindeord som «og», «men» eller «så».',
    utdrag: [...new Set(skjot)],
    kapitler: ['komma-vgs', 'kommaregler'],
    mulig: true,
  });
  return ut;
}

// Bare former som ikke også er partisipp («har satt», «har åpnet»).
const FORTELLENDE_FORTID = ['gikk', 'sa', 'kom', 'tok', 'fikk', 'sto', 'lå', 'ga', 'dro', 'løp', 'gråt', 'svarte', 'spurte', 'ropte', 'smilte', 'snudde', 'så seg'];

/** I analyse og tolkning skal handlingen gjengis i presens. Mange fortellende fortidsformer tyder på gjenfortelling i fortid. */
function fortid(tekst: string): Funn | null {
  const lav = ` ${utenSitater(tekst).toLowerCase().replace(/[.,;:!?()«»]/g, ' ')} `;
  const treff = FORTELLENDE_FORTID.filter((o) => lav.includes(` ${o} `));
  const antall = FORTELLENDE_FORTID.reduce((n, o) => n + (lav.split(` ${o} `).length - 1), 0);
  return antall >= 6 ? {
    id: 'fortid',
    melding: 'Det ser ut som du gjenforteller handlingen i fortid. Skriv om teksten i presens: «Hun går ut», ikke «Hun gikk ut».',
    utdrag: treff.map((o) => `«${o}»`),
    kapitler: ['fagsprak-vgs'],
    mulig: true,
  } : null;
}

/** Forfatteren er den som skrev teksten. Det er fortelleren eller personen som tenker og føler i fortellingen. */
function forfatterForteller(tekst: string): Funn | null {
  const person = '(forfatteren|dikteren|poeten)';
  const verb = '(tenker|tenkte|føler|følte|husker|lengter|savner|gråter|ler|går|sitter|står|våkner|drømmer)';
  const treff = utenSitater(tekst).match(new RegExp(`\\b(${person}\\s+${verb}|${verb}\\s+${person})\\b`, 'gi')) ?? [];
  return treff.length ? {
    id: 'forfatter-forteller',
    melding: 'Skill mellom forfatteren og fortelleren eller det lyriske jeget. Det er en person i teksten som tenker og føler, ikke forfatteren.',
    utdrag: [...new Set(treff)],
    kapitler: ['fagsprak-vgs'],
    mulig: true,
  } : null;
}

const MOTARGUMENT = ['på den andre siden', 'på den ene siden', 'samtidig', 'derimot', 'likevel', 'imot', 'motargument', 'innvende', 'innvending', 'kritikere', 'kritikken', 'tvert imot', 'riktignok', 'selv om', 'motsatt'];
const KONKLUSJON = ['derfor', 'altså', 'dermed', 'alt i alt', 'samlet', 'oppsummert', 'konklusjon', 'konkluderer', 'mener jeg', 'min vurdering', 'jeg mener', 'etter min mening', 'svaret på'];

/** En drøfting trenger motargumenter og en konklusjon. */
function drofting(tekst: string): Funn[] {
  const lav = utenSitater(tekst).toLowerCase();
  const kropp = brodtekst(tekst).filter((a) => !ER_KILDELISTE.test(a));
  const slutt = (kropp[kropp.length - 1] ?? '').toLowerCase();
  const ut: Funn[] = [];
  if (!MOTARGUMENT.some((o) => lav.includes(o))) ut.push({
    id: 'motargument',
    melding: 'Teksten ser ikke ut til å ha motargumenter. Når du drøfter, skal du vise flere sider av saken, for eksempel med «på den andre siden» eller «samtidig».',
    utdrag: [],
    kapitler: ['fagartikkel-vgs', 'droftende-tekst'],
    mulig: true,
  });
  if (kropp.length >= 3 && !KONKLUSJON.some((o) => slutt.includes(o))) ut.push({
    id: 'konklusjon',
    melding: 'Avslutningen ser ikke ut til å konkludere. Svar på problemstillingen og si hva drøftingen viser.',
    utdrag: [],
    kapitler: ['fagartikkel-vgs', 'innledning-avslutning'],
    mulig: true,
  });
  return ut;
}

/** Vanlige skrivefeil fra finn feilen-øvelsene. */
function skrivefeil(tekst: string, liste: Skrivefeil[]): Funn | null {
  const lav = ` ${utenSitater(tekst).toLowerCase().replace(/[.,;:!?()«»"]/g, ' ').replace(/\s+/g, ' ')} `;
  const sett = new Map<string, string>();
  for (const f of liste) {
    const feil = f.feil.toLowerCase();
    if (lav.includes(` ${feil} `)) sett.set(feil, f.rettelse.toLowerCase());
  }
  return sett.size ? {
    id: 'skrivefeil',
    melding: 'Disse ordene ser ut til å være skrevet feil.',
    utdrag: [...sett].map(([f, r]) => `«${f}» skal være «${r}»`),
    kapitler: ['rettskriving'],
    mulig: true,
  } : null;
}

/** Kjører sjekkene som passer for sjangeren. De viktigste kommer først. */
export function sjekkTekst(tekst: string, valg: Sjekkvalg): Funn[] {
  const t = tekst.trim();
  if (ordTelling(t) < 20) return [];
  const { sjanger } = valg;
  const lang = sjanger !== 'kortsvar' && ordTelling(t) > 200;
  const renset = utenSitater(t);
  const alle = avsnitt(renset).flatMap(setninger);

  const funn: (Funn | null)[] = [];
  if (lang && sjanger !== 'annet') funn.push(tittel(t));
  if (valg.vedlegg?.length && lang && sjanger !== 'essay') funn.push(vedleggNevnt(t, valg.vedlegg));
  if (sjanger === 'fagartikkel' && lang) funn.push(kilder(t));
  if (sjanger === 'analyse' || sjanger === 'kortsvar') funn.push(...sitater(t, sjanger));
  funn.push(leddsetningUtenKomma(alle), menUtenKomma(alle), kommaForanAt(renset), litenForbokstav(renset));
  if (lang) funn.push(...avsnittLengde(t));
  funn.push(likeStarter(alle, sjanger), langeSetninger(alle), ordbruk(t, sjanger));
  // Usikre sjekker kommer etter de sikre.
  if (valg.skrivefeil?.length) funn.push(skrivefeil(t, valg.skrivefeil));
  funn.push(...kommaskjot(alle));
  if (sjanger === 'analyse' || sjanger === 'kortsvar') funn.push(fortid(t), forfatterForteller(t));
  if ((sjanger === 'fagartikkel' || sjanger === 'drofting') && lang) funn.push(...drofting(t));
  return funn.filter((f): f is Funn => f !== null);
}

/** Ledetekst eleven kan lime inn i et KI-verktøy skolen har godkjent. */
export function lagLedetekst(o: { trinn: string; oppgave: string; kjennetegn: string[]; svar: string }): string {
  const deler = [
    `Du er norsklærer for en elev på ${o.trinn}. Gi tilbakemelding på elevens tekst ut fra oppgaven${o.kjennetegn.length ? ' og kjennetegnene på et godt svar' : ''}.`,
    '',
    'Slik skal tilbakemeldingen være:',
    '- Gi to konkrete styrker og to konkrete forbedringspunkter.',
    '- Vis til et kort sitat fra elevteksten for hvert punkt.',
    '- Forklar hvordan eleven kan gjøre forbedringene, men ikke skriv om teksten og ikke skriv nye avsnitt for eleven.',
    '- Ikke gi karakter.',
    '- Skriv kort og tydelig på norsk bokmål.',
    '',
    'OPPGAVE:',
    o.oppgave.trim(),
  ];
  if (o.kjennetegn.length) deler.push('', 'KJENNETEGN PÅ ET GODT SVAR:', ...o.kjennetegn.map((k) => `- ${k}`));
  deler.push('', 'ELEVENS TEKST:', o.svar.trim());
  return deler.join('\n');
}
