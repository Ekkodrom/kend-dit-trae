// Finder frit licenserede billeder af bark, blade og frugt for hver træart på Wikimedia Commons.
//
// Fremgangsmåde pr. art og del:
//  1. Søg i Commons med deepcat:"<latinsk navn>" <søgeord> (kun filer i artens kategoritræ).
//  2. Ranger: søgeordet (på flere sprog) i filnavnet giver point; illustrationer, kort,
//     herbarieark og havesorter frasorteres.
//  3. Hent licens og fotograf; kun Public domain, CC0, CC BY, CC BY-SA accepteres.
//  4. Filer i data/udeluk.json springes over (manuel kvalitetskontrol).
//
// Output: data/traeer.json (bruges af appen)
// Kør: node scripts/hent-billeder.mjs

import { readFile, writeFile, rename } from "node:fs/promises";

const API = "https://commons.wikimedia.org/w/api.php";
const HEADERS = { "User-Agent": "KendDitTrae/0.1 (privat hobbyprojekt; billedopslag)" };
const PR_DEL = 4; // billeder pr. del
const WIDTH = 900;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stripHtml = (s) => (s ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

const { arter } = JSON.parse(await readFile(new URL("../data/arter.json", import.meta.url), "utf8"));
let udeluk = new Set();
try {
  udeluk = new Set(JSON.parse(await readFile(new URL("../data/udeluk.json", import.meta.url), "utf8")).filer);
} catch {}

const DELE = {
  bark: { soeg: () => ["bark", "trunk"], ord: /bark|rinde|schors|écorce|corteza|kora|stamm|trunk|stam/i },
  blade: {
    soeg: (a) => (a.type === "naal" ? ["needles", "shoot", "foliage"] : ["leaves", "leaf"]),
    ord: /lea[fv]|blatt|blätter|blad|feuille|hoja|liść|needle|nadel|nål|shoot|foliage|twig|branch/i,
  },
  trae: { soeg: () => ["tree"], ord: /tree|baum|træ|boom|arbre|árbol|drzewo|habit|solitär|einzelbaum/i },
  frugt: {
    soeg: (a) => a.frugtSoeg,
    ord: /fruit|frucht|frugt|seed|samen|frø|nut|nuss|nød|acorn|eichel|agern|cone|zapfen|kogle|catkin|kätzchen|rakle|berr|beere|bær|aril|pod|hülse|samara|cherr|kirsch|apple|apfel|plum|conker|chestnut|kastanie|walnut|haw/i,
  },
};

// Frasorter tegninger, kort, herbarier, mikroskopi, havesorter m.m.
const DAARLIG = /illustrat|köhler|kohler|thom[eé]|drawing|zeichnung|plate|tafel|herbar|specimen|map|distribution|verbreitung|range|\.svg|\.tiff?$|stamp|briefmarke|logo|diagram|microscop|mikroskop|section|schnitt|purpurea|atropurpurea|variegat|aurea|laciniata|fastigiata|'[^']+'|‘[^’]+’|"[^"]+"|bonsai|wood ?(sample|texture)|holz|lumber|furniture|xylotheque|epiderm|leaf print|canoe|roasted|geröstet|mosaic|collage|knop|bud|knospe|aerial root|gall|galle|seedling|keimling|sapling/i;

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: HEADERS });
    if (res.ok) return res.json();
    if (res.status !== 429 || attempt === 8) throw new Error(`${res.status} ${url}`);
    await sleep((Number(res.headers.get("retry-after")) || 10 * attempt) * 1000);
  }
}

async function soeg(latin, term) {
  const j = await api({ action: "query", list: "search", srnamespace: "6", srlimit: "30", srsearch: `deepcat:"${latin}" ${term} filetype:bitmap` });
  await sleep(800);
  return (j.query?.search ?? []).map((r) => r.title);
}

const OK_LICENSE = /^(public domain|pd|cc0( 1\.0)?|cc by(-sa)?( [0-9.]+)?( [a-z]{2})?)$/i;

async function filInfo(titler) {
  const ud = new Map();
  for (let i = 0; i < titler.length; i += 50) {
    const j = await api({ action: "query", prop: "imageinfo", iiprop: "url|extmetadata|size", iiurlwidth: String(WIDTH), titles: titler.slice(i, i + 50).join("|") });
    for (const p of j.query.pages) {
      const ii = p.imageinfo?.[0];
      if (!ii) continue;
      const m = ii.extmetadata ?? {};
      ud.set(p.title, {
        titel: p.title,
        url: ii.thumburl ?? ii.url,
        side: ii.descriptionurl,
        licens: m.LicenseShortName?.value ?? null,
        licensUrl: m.LicenseUrl?.value ?? null,
        fotograf: stripHtml(m.Artist?.value) || null,
        bredde: ii.width,
        hoejde: ii.height,
      });
    }
    await sleep(800);
  }
  return ud;
}

// Genoptag: arter der allerede er hentet genbruges; udelukkede billeder fjernes, og kun
// dele der mangler (eller er blevet tomme) hentes.
// Kør med --forfra for at hente alt igen.
const UD = new URL("../data/traeer.json", import.meta.url);
const gemte = new Map();
if (!process.argv.includes("--forfra")) {
  try {
    for (const a of JSON.parse(await readFile(UD, "utf8")).arter) {
      // Fjern udelukkede/dårlige billeder; en del der bliver tom, hentes igen
      for (const [del, liste] of Object.entries(a.billeder)) {
        const ok = liste.filter((b) => !udeluk.has(b.titel) && !DAARLIG.test(b.titel));
        if (ok.length || !liste.length) a.billeder[del] = ok;
        else delete a.billeder[del];
      }
      gemte.set(a.latin, a);
    }
  } catch {}
}

// Skriv til midlertidig fil og omdøb (Windows kan låse filen, hvis den læses samtidig)
async function gem() {
  const liste = arter.map((a) => gemte.get(a.latin)).filter(Boolean);
  const tmp = new URL("../data/traeer.json.tmp", import.meta.url);
  await writeFile(tmp, JSON.stringify({ kilde: "Wikimedia Commons (https://commons.wikimedia.org/)", hentet: new Date().toISOString().slice(0, 10), arter: liste }, null, 1));
  for (let forsoeg = 1; ; forsoeg++) {
    try { await rename(tmp, UD); break; } catch (err) { if (forsoeg >= 10) throw err; await sleep(1000); }
  }
  return liste;
}

// --rens: fjern kun udelukkede/dårlige billeder fra de gemte data, uden at hente nyt
if (process.argv.includes("--rens")) {
  const liste = await gem();
  console.log(`Renset: ${liste.length} arter, ${liste.reduce((s, a) => s + Object.values(a.billeder).flat().length, 0)} billeder`);
  process.exit(0);
}

for (const [n, art] of arter.entries()) {
  process.stdout.write(`${n + 1}/${arter.length} ${art.dansk}                    `);
  // Hent kun de dele, der mangler (fx en ny del tilføjet til DELE)
  const gammel = gemte.get(art.latin);
  const mangler = Object.keys(DELE).filter((d) => !gammel?.billeder?.[d]);
  if (!mangler.length) continue;
  const kandidater = {};
  for (const [del, cfg] of Object.entries(DELE).filter(([d]) => mangler.includes(d))) {
    const set = new Map();
    for (const term of cfg.soeg(art)) {
      for (const [rang, t] of (await soeg(art.latin, term)).entries()) {
        if (DAARLIG.test(t) || udeluk.has(t)) continue;
        const point = (cfg.ord.test(t) ? 10 : 0) + (t.toLowerCase().includes(art.latin.split(" ")[0].toLowerCase()) ? 3 : 0) - rang * 0.1;
        if (!set.has(t) || set.get(t) < point) set.set(t, point);
      }
      // Nok gode kandidater (søgeordet i filnavnet)? Så spring de næste søgeord over
      if ([...set.values()].filter((p) => p >= 10).length >= PR_DEL * 2) break;
    }
    kandidater[del] = [...set.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t).slice(0, PR_DEL * 3);
  }
  const info = await filInfo([...new Set(Object.values(kandidater).flat())]);
  const billeder = { ...(gammel?.billeder ?? {}) };
  const brugt = new Set(Object.values(billeder).flat().map((b) => b.titel));
  for (const del of mangler) {
    billeder[del] = kandidater[del]
      .map((t) => info.get(t))
      .filter((i) => i && i.licens && OK_LICENSE.test(i.licens) && i.bredde >= 400 && !brugt.has(i.titel))
      .slice(0, PR_DEL);
    billeder[del].forEach((b) => brugt.add(b.titel)); // samme billede må ikke bruges til to dele
  }
  const { frugtSoeg, ...uden } = art;
  gemte.set(art.latin, { ...uden, billeder });
  await gem(); // gem efter hver art, så et afbrud ikke koster alt
}

const resultat = await gem();
const antal = resultat.reduce((s, a) => s + Object.values(a.billeder).flat().length, 0);
const mangler = resultat.flatMap((a) => Object.entries(a.billeder).filter(([, b]) => !b.length).map(([d]) => `${a.dansk}: ${d}`));
console.log(`
${resultat.length} arter, ${antal} billeder`);
if (mangler.length) console.log("Mangler:", mangler.join(", "));
