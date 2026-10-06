// Tilføjer billeder til data/udeluk.json ud fra koder fra kontaktarket.
// Kode: "<dansk navn>:<del>:<nr>", fx "Bøg:blade:1" (nr starter ved 1, som i kontaktarket).
// Kør: node scripts/udeluk.mjs "Bøg:blade:1" "Stilkeg:frugt:4" ...
// Kør derefter scripts/hent-billeder.mjs igen – berørte arter hentes på ny.

import { readFile, writeFile } from "node:fs/promises";

const UD = new URL("../data/udeluk.json", import.meta.url);
const { arter } = JSON.parse(await readFile(new URL("../data/traeer.json", import.meta.url), "utf8"));
let liste = { beskrivelse: "Billeder fundet forkerte/uegnede ved manuel kontrol. Springes over af hent-billeder.mjs.", filer: [] };
try { liste = JSON.parse(await readFile(UD, "utf8")); } catch {}

for (const kode of process.argv.slice(2)) {
  const [navn, del, nr] = kode.split(":");
  const b = arter.find((a) => a.dansk === navn)?.billeder[del]?.[Number(nr) - 1];
  if (!b) { console.error(`Ukendt: ${kode}`); process.exitCode = 1; continue; }
  if (!liste.filer.includes(b.titel)) liste.filer.push(b.titel);
  console.log(`${kode} -> ${b.titel}`);
}
await writeFile(UD, JSON.stringify(liste, null, 1));
console.log(`${liste.filer.length} filer i udeluk.json`);
