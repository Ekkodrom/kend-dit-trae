# Kend dit træ

Billedquiz der hjælper dig med at lære de danske træer at kende – på barken, bladene og frugterne.

- 66 træarter: Danmarks hjemmehørende træer og de almindelige skov-, park- og læhegnstræer
- Kategorier: De nemme, De svære, Dem alle – og filter for bark, blade eller frugt
- Tilfældig rækkefølge, kører af sig selv, med tæller "X ud af Y rigtige"
- Mobilvenlig, statisk side (HTML/CSS/JS uden build)

## Billeder
Alle billeder er fra [Wikimedia Commons](https://commons.wikimedia.org/) under frie licenser (CC0, Public domain, CC BY, CC BY-SA). Fotograf og licens vises ved hvert billede.

## Kør lokalt
```
python -m http.server 8000
```

## Opdater billeder
```
node scripts/hent-billeder.mjs   # lang tid – Wikimedia begrænser antallet af søgninger
node scripts/kontaktark.mjs      # lav kontaktark.html og gennemse billederne
```
Forkerte billeder tilføjes til `data/udeluk.json`, og `hent-billeder.mjs` køres igen.
