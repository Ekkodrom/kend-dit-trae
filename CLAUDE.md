# Kend dit træ

Billedquiz der hjælper brugeren med at lære de danske træer at kende ud fra **bark, blade/nåle og frugt** (agern, kogler, rakler osv.). Søsterprojekt til `../fugle kalender` og `../svampe kalender`.

## Funktioner
- Quiz: tilfældigt billede + 4 svarmuligheder. Tilfældig rækkefølge (blandet bunke; samme art aldrig to gange i træk). Kører af sig selv: næste billede kommer automatisk efter svar (1,6 s ved rigtigt, 3,2 s ved forkert) – "Næste" springer ventetiden over.
- Kategorier: **De nemme** (`svaerhed: "let"`), **De svære** (`"svaer"`), **Dem alle**. Del-filter: Alt / Bark / Blade / Frugt.
- Forkerte svarmuligheder vælges blandt lignende træer (samme slægt > samme type løv/nål > tilfældig), så "De svære" er reelt svær.
- Tæller nederst: "X ud af Y rigtige" + Nulstil. Gemmes i localStorage (`trae-score`), ligesom valgt kategori/del.
- Fane "Træerne": oversigt over alle arter med billeder (til at øve).
- Tastatur: 1–4 vælger svar, Enter/mellemrum = næste.

## Data
- `data/arter.json` – artslisten (input): dansk navn, latin, sværhedsgrad, type (loev/naal), frugtens danske navn, engelske søgeord til frugt.
- `data/traeer.json` – det appen bruger (bygges af `scripts/hent-billeder.mjs`).
- `data/udeluk.json` – billeder der er fundet forkerte ved manuel kontrol (filtitler). Køres `hent-billeder.mjs` igen, springes de over.
- Artslisten: Danmarks hjemmehørende træer + almindelige skov-, park- og læhegnstræer (53 arter). Buske (slåen, benved, tørst m.fl.) er ikke med.

## Billeder (Wikimedia Commons)
- Søgning: `deepcat:"<latinsk navn>" <søgeord>` – kun filer i artens kategoritræ.
- Kun Public domain, CC0, CC BY, CC BY-SA; mindst 400 px brede. Fotograf + licens vises altid; link til Commons-siden vises først **efter** svar (filnavnet kan afsløre svaret).
- Illustrationer, herbarier, kort og havesorter (fx blodbøg) frasorteres i scriptet.
- **Kvalitetskontrol er obligatorisk**: kør `node scripts/kontaktark.mjs`, gennemse `kontaktark.html` (ikke med i git), tilføj forkerte filer til `data/udeluk.json`, og kør `hent-billeder.mjs` igen.

## Struktur
```
index.html, style.css, app.js   Statisk webside (vanilla JS, ingen build), mobil først
data/                           Se ovenfor
scripts/hent-billeder.mjs       Commons -> traeer.json (lang tid pga. Wikimedias grænse for søgninger;
                                gemmer efter hver art og genoptager – brug --forfra for at hente alt igen)
scripts/kontaktark.mjs          Laver kontaktark.html til visuel kontrol
```

## Udgivelse (GitHub Pages)
- Repo: https://github.com/Ekkodrom/kend-dit-trae – Live: https://ekkodrom.github.io/kend-dit-trae/
- Push til `main` udgiver automatisk. GitHub CLI: `E:\Program Files\GitHub CLI\gh.exe` (konto: Ekkodrom).

## Kode
- Al brugervendt tekst på dansk. Escape data med `esc()` før det sættes i HTML.
- Samme stil som fugle-/svampesiden (faner via hash, localStorage i try/catch).
