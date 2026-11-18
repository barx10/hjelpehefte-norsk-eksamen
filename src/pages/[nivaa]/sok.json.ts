// Søkeindeksen for ett nivå. Den lages når siden bygges, og søkesiden henter den først når eleven søker.
import type { APIRoute } from 'astro';
import { render } from 'astro:content';
import { hentBesvarelser, hentEksamen, hentKapitler, hentOvelser, kapittelNavn } from '../../lib/innhold';
import { NIVAAER, type Nivaa } from '../../lib/nivaa';
import { ovelseTilSok, rensMarkdown, type Sokepost } from '../../lib/sok';
import { nurl } from '../../lib/url';

export function getStaticPaths() {
  return NIVAAER.map((n) => ({ params: { nivaa: n.id }, props: { nivaa: n } }));
}

/** Deler kapittelet ved hver overskrift på nivå 2, slik at et treff kan lede rett til riktig del. */
function delKapittel(body: string): { overskrift: string | null; tekst: string }[] {
  const deler: { overskrift: string | null; tekst: string }[] = [{ overskrift: null, tekst: '' }];
  for (const linje of body.split('\n')) {
    const m = /^##\s+(.+?)\s*$/.exec(linje);
    if (m) deler.push({ overskrift: m[1]!, tekst: '' });
    else deler[deler.length - 1]!.tekst += `${linje}\n`;
  }
  return deler;
}

export const GET: APIRoute = async ({ props }) => {
  const nivaa = props.nivaa as Nivaa;
  const poster: Sokepost[] = [];
  const kapitler = await hentKapitler(nivaa);
  const navn = new Map(kapitler.map((k) => [k.id, kapittelNavn(k)]));

  for (const k of kapitler) {
    const { headings } = await render(k);
    const ankre = headings.filter((h) => h.depth === 2);
    const deler = delKapittel(k.body ?? '');
    const side = nurl(nivaa, `hefte/${k.id}/`);
    for (const d of deler) {
      const tekst = rensMarkdown(d.tekst);
      if (d.overskrift === null) {
        poster.push({ slag: 'hefte', tittel: kapittelNavn(k), tekst: [k.data.ingress, tekst].filter(Boolean).join(' '), url: side });
        continue;
      }
      const tittel = rensMarkdown(d.overskrift);
      // Overskriftene finnes i samme rekkefølge som i teksten. Den første med samme tekst som ikke er brukt, gir ankeret.
      const i = ankre.findIndex((h) => rensMarkdown(h.text) === tittel);
      const anker = i >= 0 ? ankre.splice(i, 1)[0] : undefined;
      poster.push({ slag: 'hefte', tittel, tekst, url: anker ? `${side}#${anker.slug}` : side, kontekst: kapittelNavn(k) });
    }
  }

  for (const t of await hentBesvarelser(nivaa)) {
    poster.push({
      slag: 'tekst',
      tittel: t.data.tittel,
      tekst: [t.data.oppgave, rensMarkdown(t.body ?? '')].join(' '),
      url: nurl(nivaa, `tekster/${t.id}/`),
      kontekst: t.data.kategori,
    });
  }

  for (const o of await hentOvelser(nivaa)) {
    const { tittel, tekst } = ovelseTilSok(o.data as Parameters<typeof ovelseTilSok>[0]);
    poster.push({
      slag: 'ovelse',
      tittel: rensMarkdown(tittel),
      tekst: rensMarkdown(tekst),
      url: `${nurl(nivaa, `ovelser/${o.data.kapittel.id}/`)}?ovelse=${encodeURIComponent(o.id)}`,
      kontekst: navn.get(o.data.kapittel.id),
    });
  }

  for (const e of await hentEksamen(nivaa)) {
    const d = e.data;
    poster.push({
      slag: 'eksamen',
      tittel: d.tittel,
      tekst: [d.beskrivelse, ...d.vedlegg.map((v) => v.tittel), ...d.oppgave2.valg.map((v) => `${v.tittel} ${v.tekst}`), d.oppgave3?.tekst].filter(Boolean).join(' '),
      url: nurl(nivaa, `eksamen/${e.id}/`),
    });
  }

  return new Response(JSON.stringify(poster), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
