# Hjelpehefte norsk eksamen

Hjelpehefte og øvingsside for skriftlig eksamen i norsk, 10. trinn. Innholdet ligger åpent på Lærerliv.

Nettsiden og heftet bygges fra samme innhold. Originalen fra Canva ligger i `kilde/`.

## Kjøre lokalt

```bash
npm install
npm run dev            # viser også utkast
npm run build          # bygger det som publiseres (bare godkjente øvelser)
npm run build:utkast   # bygger med utkast
npm test
```

## Innhold

Alt innhold ligger i `innhold/`. Du trenger ikke endre kode for å rette eller legge til noe.

| Mappe | Innhold |
|---|---|
| `innhold/hefte/` | Kapitlene i heftet, ett Markdown-dokument per kapittel. Hvert kapittel er også et øvingstema. |
| `innhold/mal/` | Kompetansemål med id, nivå og omfang. Én YAML-fil per nivå. |
| `innhold/ovelser/` | Øvelser. Hver YAML-fil er en liste. |
| `innhold/besvarelser/` | Modelltekster og besvarelser med merknader. |
| `innhold/eksamen/` | Eksamenspakker til eksamenstreningen. |

### Nivå

Siden har to nivåer: ungdomstrinn (`/ungdomstrinn/`) og videregående (`/vgs/`, studieforberedende hovedmål, med mål fra vg1, vg2 og vg3). Eleven velger nivå på forsiden eller øverst på siden. Valget huskes i nettleseren, og fremgangen lagres hver for seg per nivå.

Feltet `nivaa` styrer hvor innholdet vises. Kodene er `'10'` og `'vg3'`.

| Innhold | Uten `nivaa` | Eksempel |
|---|---|---|
| Kapittel i `innhold/hefte/` | Vises for 10. trinn | `nivaa: ['10', 'vg3']` |
| Øvelse | Følger kapittelet sitt | `nivaa: 'vg3'` |
| Modelltekst | Vises for 10. trinn | `nivaa: ['10', 'vg3']` |
| Eksamenspakke | Vises for 10. trinn | `nivaa: 'vg3'` |
| Kompetansemål | Må ha nivå | `nivaa: 'vg3'` |

En øvelse vises bare når kapittelet den hører til, også vises på nivået.

Modelltekster vises i kapittelet som har samme id som tekstens `type`. Et kapittel med en annen id kan velge typer selv med `tekstTyper: [novelleanalyse, diktanalyse]` i toppen av kapittelet. Nye nivåer legges til i `src/lib/nivaa.ts`.

### Heftet

Siden `/hefte/last-ned/` lager heftet eleven kan skrive ut eller lagre som PDF. Eleven kan ta med hele heftet eller velge kapitler. Heftet bygges fra de samme kapittelfilene som nettsiden, så de kan ikke komme i utakt.

- `gruppe` i kapittelet styrer hvor det står i valglisten: `eksamen`, `sjanger`, `litteratur`, `sprakNorge`, `virkemidler` eller `sprak`.
- Heftet er en kortversjon. Det som bare skal stå på nettsiden, pakkes inn slik, med en tom linje før og etter innholdet:

```markdown
<div class="bare-nett">

> **Eksempel**
>
> Teksten her vises på nettsiden, men ikke i kortversjonen av heftet.

</div>
```

Eleven kan krysse av for «Ta med alle eksemplene» og får da også disse delene med.

### Legge til en øvelse

Legg den til i en YAML-fil i `innhold/ovelser/`.

```yaml
- id: kommaregler-eksempel     # unik, bare små bokstaver, tall og bindestrek
  type: flervalg               # flashkort eller flervalg
  kapittel: kommaregler        # id til kapittelet (filnavnet i innhold/hefte/ uten .md)
  mal: [m10-11]                # id-er fra innhold/mal/
  status: utkast               # utkast eller godkjent
  spm: "Hvilken setning har riktig komma?"
  alternativer: ["Riktig svar", "Feil 1", "Feil 2", "Feil 3"]
  riktig: 0                    # plassen til riktig svar i listen, første er 0
  forklaring: "Hvorfor dette er riktig."
```

Flashkort har `forside` og `bakside` i stedet for spørsmål, alternativer og forklaring. Flervalg kan ha et kort `utdrag` som spørsmålet gjelder. Utdrag skal være skrevet for øvingen eller være fri for opphavsrett.

### Øvelsestyper

| `type` | Hva eleven gjør | Viktige felt |
|---|---|---|
| `flashkort` | Vender kort | `forside`, `bakside` |
| `flervalg` | Velger ett svar | `spm`, `alternativer`, `riktig`, `forklaring`, `utdrag` (valgfri) |
| `komma` | Trykker på ordene der det skal være komma | `setning` (riktig setning med komma), `regler`, `forklaring` |
| `finnfeil` | Trykker på ordet som er feil | `tekst`, `feil`, `rettelse`, `forklaring` |
| `sortering` | Plasserer hvert element i en kategori | `oppdrag`, `kategorier`, `elementer` (`tekst`, `kategori` som tall fra 0), `forklaring` |
| `rekkefolge` | Setter elementene i riktig rekkefølge | `oppdrag`, `elementer` (skriv dem i riktig rekkefølge), `forklaring` |
| `matching` | Kobler begrep til forklaring | `oppdrag`, `par` (`venstre`, `hoyre`), `forklaring` |
| `marker` | Trykker på riktige ord i en tekst | `oppdrag`, `tekst` (riktige ord i `[[dobbel hakeparentes]]`), `forklaring` |
| `skriv` | Skriver en egen tekst, får automatisk sjekk og vurderer seg selv | `oppdrag`, `utdrag`, `starttekst`, `ord` (`min`, `maks`), `nokkelord`, `nokkelordMinst`, `sitat`, `kriterier`, `modelltekst` |

### Mengdetrening

Eleven velger hvor mange øvelser økten skal ha (10, 20, 40 eller alle). I temaet med kommaoppgaver kan eleven også øve på én kommaregel om gangen. Valget bruker feltet `regler`.

Filene som slutter på `-mengde.yaml`, har mange korte oppgaver av samme slag: komma, finn feilen, overgangsord og virkemidler. De står som `utkast` til de er gjennomgått.

Alle typer kan ha `fraTekst: <id>` som peker på en tekst i `innhold/besvarelser/`. Da vises forfatter, lisens og kilde under øvelsen.

### Modelltekster

Modelltekster ligger i `innhold/besvarelser/`, én fil per tekst. Frontmatter har metadata (se README i mappen), blant annet `kategori` (merkelappen som vises ved teksten) og `nivaa`, og `avsnitt`: en liste med `nr`, `funksjon`, `kommentar` og eventuelt `vurdering` (`styrke` eller `svakhet`) for hvert avsnitt. En test sjekker at merknadene stemmer med antall avsnitt. Feltet `styrker` er en liste med punkter som viser hva som gjør teksten god (`tekst` og eventuelt `avsnitt` med numrene punktet viser til). Punktene vises øverst på siden når teksten har `styrkerStatus: godkjent`. Elevtekster kan i tillegg ha `forbedringer` med samme oppbygging, som viser hva som kan løfte teksten. De vises når teksten har `forbedringerStatus: godkjent`. Siden `/tekster/` viser teksten med nummererte avsnitt og merknader som kan slås av og på. Tekster med `status: utkast` vises ikke på den publiserte siden.

### Eksamenstrening

Eksamenspakker ligger i `innhold/eksamen/`, én YAML-fil per pakke. En pakke har vedlegg, oppgave 1 (tre delspørsmål med modellsvar), oppgave 2 (ett eller flere valg, hvert knyttet til en mal i heftet) og oppgave 3. Byggingen stopper hvis en oppgave peker på et vedlegg eller en mal som ikke finnes. Tekstene skal være skrevet for øvingen. Pakker med `status: utkast` vises ikke på den publiserte siden.

Feltet `oppsett` styrer formatet. Uten feltet (`ungdomstrinn`) har pakken oppgave 1 med tre delspørsmål, oppgave 2 og oppgave 3. Med `oppsett: vgs` har pakken et kortsvar (ett delspørsmål på 250 til 300 ord) og ett langsvar der eleven velger mellom flere oppgaver, hver med ett eller flere vedlegg (`vedlegg: [v2, v3, v4]`). Oppgave 3 utelates. Se `innhold/eksamen/vgs-pakke-1.yaml`.

Hvert valg i oppgave 2 og oppgave 3 kan ha `kjennetegn`: en liste med punkter som viser hva et godt svar inneholder. Eleven ser dem i tilbakemeldingen etter levering og krysser av selv. Punktene vises bare når pakken har `kjennetegnStatus: godkjent`.

Byggingen stopper med en feilmelding hvis en øvelse peker på et kapittel eller mål som ikke finnes, hvis en id er brukt to ganger, eller hvis `riktig` peker utenfor alternativene.

### Status

- `utkast`: vises bare lokalt og med `npm run build:utkast`.
- `godkjent`: vises på den publiserte siden.

Sett `status: godkjent` først etter faglig gjennomgang.

### Kompetansemål

`omfang` styrer hvordan målet vises på siden Kompetansemål: `dekkes`, `delvis`, `senere` eller `utenfor`. Målene ligger i én fil per nivå i `innhold/mal/`, og siden viser bare målene for nivået eleven har valgt. Id-er følger mønsteret `m<nivå>-<nr>`, for eksempel `m10-01` og `mvg3-01`.

## Lisens og kilder

Innholdet har tre opphav, og hver tekst i `innhold/besvarelser/` sier selv hvilket.

| Opphav | Hvordan det merkes | Krav |
|---|---|---|
| Tekster fra NDLA (modelltekster og elevtekster, også de forenklede) | `lisens: "CC BY-SA 4.0"`, `forfatter`, `kilde` (lenke til NDLA-siden) og `endringer` | Oppgi forfatter, lisens og kilde, og si fra om endringer. Bearbeidelser, for eksempel forenklede tekster og øvelser som bruker teksten, må deles på samme lisens. |
| Tekster skrevet for øvingen (vedlegg, modelltekster og kortsvar på vgs) | `forfatter: "Skrevet for øvingen (fiktiv ...)"`, ingen lisens | Fiktive tekster. De skal ikke utgis som ekte tekster. Faktaopplysninger i dem må kontrolleres før de godkjennes. |
| Tekster uten opphavsrett (for eksempel norrøne kilder) | `forfatter` og `kilde` | Oversettelsen må være laget for øvingen, eller ha en fri lisens. |

Regler:

- Tekster med `lisens` må ha `lisensUrl` og en `kilde` med lenke. En test sjekker det.
- Opphavsrettsbeskyttede tekster som modellteksten analyserer (dikt, noveller, leserinnlegg), legges ikke i repoet. Bruk `diktUrl` eller `analysertTekstUrl` i stedet.
- Elevtekster må være anonymisert og ha samtykke.
- Fordi bearbeidede NDLA-tekster ligger i repoet, må de delene av innholdet som bygger på dem, deles under CC BY-SA 4.0. Hele repoet har ennå ingen lisensfil.

## Publisering

`.github/workflows/deploy.yml` bygger og publiserer til GitHub Pages når `main` oppdateres. Slå på Pages under Settings, Pages, Source: GitHub Actions.

Siden publiseres på `https://eksamenstrening.laererliv.no`. Adressen settes med miljøvariablene `SITE` og `BASE` i arbeidsflyten. Domenet legges inn under Settings, Pages, Custom domain, og hos domeneleverandøren peker en CNAME-oppføring for `eksamenstrening` til `barx10.github.io`.

Uten disse variablene bygges siden for `https://barx10.github.io/hjelpehefte-norsk-eksamen/`, som brukes ved lokal kjøring.

## Personvern

Siden har ingen innlogging og sender ingen data. Fremgangen lagres i nettleserens lokale lagring på elevens enhet.
