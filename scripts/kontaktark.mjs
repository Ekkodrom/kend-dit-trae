// Laver kontaktark.html med alle billeder (til manuel kvalitetskontrol).
// Forkerte billeder tilføjes til data/udeluk.json (filtitel, fx "File:Xxx.jpg"),
// hvorefter scripts/hent-billeder.mjs køres igen.
// Kør: node scripts/kontaktark.mjs [fra] [til]   (artsnumre, valgfrit)

import { readFile, writeFile } from "node:fs/promises";

const { arter } = JSON.parse(await readFile(new URL("../data/traeer.json", import.meta.url), "utf8"));
const fra = Number(process.argv[2] ?? 0);
const til = Number(process.argv[3] ?? arter.length);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const raekker = arter.slice(fra, til).map((a, i) => {
  const celler = ["trae", "bark", "blade", "frugt"]
    .map((del) => `<td><b>${del}</b><div class="r">${(a.billeder[del] ?? [])
      .map((b, j) => `<figure><img src="${esc(b.url)}"><figcaption>${del[0]}${j + 1}: ${esc(b.titel.replace("File:", "").slice(0, 38))}</figcaption></figure>`)
      .join("")}</div></td>`)
    .join("");
  return `<tr><th>${fra + i}. ${esc(a.dansk)}<br><i>${esc(a.latin)}</i></th>${celler}</tr>`;
});

await writeFile(
  new URL("../kontaktark.html", import.meta.url),
  `<!doctype html><meta charset="utf-8"><title>Kontaktark</title>
<style>body{font:11px sans-serif;margin:4px}table{border-collapse:collapse}th{width:110px;text-align:left;vertical-align:top}
td,th{border:1px solid #ccc;padding:3px;vertical-align:top}.r{display:flex;gap:3px}figure{margin:0;width:120px}
img{width:120px;height:90px;object-fit:cover;display:block}figcaption{font-size:9px;word-break:break-all;height:22px;overflow:hidden}</style>
<table>${raekker.join("")}</table>`
);
console.log(`kontaktark.html: arter ${fra}-${til - 1}`);
