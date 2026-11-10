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

Siden har to nivåer: ungdomstrinn (`/ungdomstrinn/`) og videregående (`/vgs/`, vg3 studieforberedende hovedmål). Eleven velger nivå på forsiden eller øverst på siden. Valget huskes i nettleseren, og fremgangen lagres hver for seg per nivå.

Feltet `nivaa` styrer hvor innholdet vises. Kodene er `'10'` og `'vg3'`.

| Innhold | Uten `nivaa` | Eksempel |
|---|---|---|
| Kapittel i `innhold/hefte/` | Vises for 10. trinn | `nivaa: ['10', 'vg3']` |
| Øvelse | Følger kapittelet sitt | `nivaa: 'vg3'` |
| Modelltekst | Vises for 10. trinn | `nivaa: ['10', 'vg3']` |
| Eksamenspakke | Vises for 10. trinn | `nivaa: 'vg3'` |
| Kompetansemål | Må ha nivå | `nivaa: 'vg3'` |

En øvelse vises bare når kapittelet den hører til, også vises på nivået. Nye nivåer legges til i `src/lib/nivaa.ts`.

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

Alle typer kan ha `fraTekst: <id>` som peker på en tekst i `innhold/besvarelser/`. Da vises forfatter, lisens og kilde under øvelsen.

### Modelltekster

Modelltekster ligger i `innhold/besvarelser/`, én fil per tekst. Frontmatter har metadata (se README i mappen), blant annet `kategori` (merkelappen som vises ved teksten) og `nivaa`, og `avsnitt`: en liste med `nr`, `funksjon`, `kommentar` og eventuelt `vurdering` (`styrke` eller `svakhet`) for hvert avsnitt. En test sjekker at merknadene stemmer med antall avsnitt. Siden `/tekster/` viser teksten med nummererte avsnitt og merknader som kan slås av og på. Tekster med `status: utkast` vises ikke på den publiserte siden.

### Eksamenstrening

Eksamenspakker ligger i `innhold/eksamen/`, én YAML-fil per pakke. En pakke har vedlegg, oppgave 1 (tre delspørsmål med modellsvar), oppgave 2 (ett eller flere valg, hvert knyttet til en mal i heftet) og oppgave 3. Byggingen stopper hvis en oppgave peker på et vedlegg eller en mal som ikke finnes. Tekstene skal være skrevet for øvingen. Pakker med `status: utkast` vises ikke på den publiserte siden.

Byggingen stopper med en feilmelding hvis en øvelse peker på et kapittel eller mål som ikke finnes, hvis en id er brukt to ganger, eller hvis `riktig` peker utenfor alternativene.

### Status

- `utkast`: vises bare lokalt og med `npm run build:utkast`.
- `godkjent`: vises på den publiserte siden.

Sett `status: godkjent` først etter faglig gjennomgang.

### Kompetansemål

`omfang` styrer hvordan målet vises på siden Kompetansemål: `dekkes`, `delvis`, `senere` eller `utenfor`. Målene ligger i én fil per nivå i `innhold/mal/`, og siden viser bare målene for nivået eleven har valgt. Id-er følger mønsteret `m<nivå>-<nr>`, for eksempel `m10-01` og `mvg3-01`.

## Publisering

`.github/workflows/deploy.yml` bygger og publiserer til GitHub Pages når `main` oppdateres. Slå på Pages under Settings, Pages, Source: GitHub Actions.

Standard adresse er `https://barx10.github.io/hjelpehefte-norsk-eksamen/`. Ved eget domene bygges det med miljøvariablene `SITE` og `BASE`, for eksempel `SITE=https://ovinger.laererliv.no BASE=/ npm run build`.

## Personvern

Siden har ingen innlogging og sender ingen data. Fremgangen lagres i nettleserens lokale lagring på elevens enhet.
