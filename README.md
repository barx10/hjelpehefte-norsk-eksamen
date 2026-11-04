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
| `innhold/mal/` | Kompetansemål med id, nivå og omfang. |
| `innhold/ovelser/` | Øvelser. Hver YAML-fil er en liste. |

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

Byggingen stopper med en feilmelding hvis en øvelse peker på et kapittel eller mål som ikke finnes, hvis en id er brukt to ganger, eller hvis `riktig` peker utenfor alternativene.

### Status

- `utkast`: vises bare lokalt og med `npm run build:utkast`.
- `godkjent`: vises på den publiserte siden.

Sett `status: godkjent` først etter faglig gjennomgang.

### Kompetansemål

`omfang` i `innhold/mal/10-trinn.yaml` styrer hvordan målet vises på siden Kompetansemål: `dekkes`, `delvis`, `senere` eller `utenfor`. Mål for nye nivåer (for eksempel vg1) legges til i samme fil med ny verdi i `nivaa`. Id-er bør følge mønsteret `m<nivå>-<nr>`.

## Publisering

`.github/workflows/deploy.yml` bygger og publiserer til GitHub Pages når `main` oppdateres. Slå på Pages under Settings, Pages, Source: GitHub Actions.

Standard adresse er `https://barx10.github.io/hjelpehefte-norsk-eksamen/`. Ved eget domene bygges det med miljøvariablene `SITE` og `BASE`, for eksempel `SITE=https://ovinger.laererliv.no BASE=/ npm run build`.

## Personvern

Siden har ingen innlogging og sender ingen data. Fremgangen lagres i nettleserens lokale lagring på elevens enhet.
