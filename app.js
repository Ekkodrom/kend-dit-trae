const DELE = {
  trae: "Hele træet",
  bark: "Bark",
  blade: "Blade",
  frugt: "Frugt",
};
const PAUSE_RET = 1600; // ms før næste billede efter rigtigt svar
const PAUSE_FORKERT = 3200; // ... efter forkert svar

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function hent(noegle, standard) {
  try { return JSON.parse(localStorage.getItem(noegle)) ?? standard; } catch { return standard; }
}
function gem(noegle, vaerdi) {
  try { localStorage.setItem(noegle, JSON.stringify(vaerdi)); } catch {}
}

const state = {
  kategori: hent("trae-kategori", "let"),
  del: hent("trae-del", "alle"),
  score: hent("trae-score", { rigtige: 0, i_alt: 0 }),
  listeKategori: "alle",
};

let arter = [];
let bunke = [];
let aktuel = null;
let sidsteArt = null;
let timer = null;

/* ---------- Hjælpere ---------- */

function bland(liste) {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const slaegt = (art) => art.latin.split(" ")[0];

function artsPulje() {
  return state.kategori === "alle" ? arter : arter.filter((a) => a.svaerhed === state.kategori);
}

function kredit(b, medLink) {
  if (!b) return "";
  const licens = b.licensUrl ? `<a href="${esc(b.licensUrl)}" target="_blank" rel="noopener">${esc(b.licens)}</a>` : esc(b.licens);
  const kilde = medLink ? ` · <a href="${esc(b.side)}" target="_blank" rel="noopener">Wikimedia Commons</a>` : "";
  return `Foto: ${esc(b.fotograf || "ukendt")} · ${licens}${kilde}`;
}

function spoergsmaal(item) {
  if (item.del === "trae") return "Hvilket træ er det?";
  if (item.del === "bark") return "Hvilket træ har denne bark?";
  if (item.del === "blade") return item.art.type === "naal" ? "Hvilket træ har disse nåle?" : "Hvilket træ har disse blade?";
  return "Hvilket træ kommer denne frugt fra?";
}

function delNavn(item) {
  if (item.del === "frugt") return item.art.frugt.toLowerCase();
  if (item.del === "blade") return item.art.type === "naal" ? "nåle" : "blade";
  if (item.del === "trae") return "hele træet";
  return "bark";
}

/* ---------- Quiz ---------- */

// Alle (art, del, billede) for de valgte filtre, i tilfældig rækkefølge
function nyBunke() {
  const dele = state.del === "alle" ? Object.keys(DELE) : [state.del];
  const items = [];
  for (const art of artsPulje()) for (const del of dele) for (const billede of art.billeder[del] ?? []) items.push({ art, del, billede });
  bunke = bland(items);
}

function traek() {
  if (!bunke.length) nyBunke();
  if (!bunke.length) return null;
  // Undgå samme art to gange i træk
  let i = bunke.findIndex((it) => it.art !== sidsteArt);
  if (i < 0) i = 0;
  return bunke.splice(i, 1)[0];
}

// Tre forkerte svar: helst samme slægt, så samme type (løv/nål), ellers tilfældige.
// "De nemme" bruger kun nemme træer som svar; ellers kan alle træer være fælder
// (fx Stilkeg som fælde for Vintereg).
function svarmuligheder(art) {
  const nemme = arter.filter((a) => a.svaerhed === "let");
  const pulje = state.kategori === "let" && nemme.length >= 4 ? nemme : arter;
  const andre = pulje
    .filter((a) => a !== art && a.dansk !== art.dansk)
    .map((a) => ({ a, point: (slaegt(a) === slaegt(art) ? 3 : 0) + (a.type === art.type ? 1 : 0) + Math.random() * 2.5 }))
    .sort((x, y) => y.point - x.point)
    .slice(0, 3)
    .map((x) => x.a);
  return bland([art, ...andre]);
}

function forudindlaes(item) {
  if (item) new Image().src = item.billede.url;
}

function visNaeste() {
  clearTimeout(timer);
  aktuel = traek();
  if (!aktuel) {
    $("#spoergsmaal").textContent = "Ingen billeder for dette valg.";
    $("#svar").innerHTML = "";
    return;
  }
  sidsteArt = aktuel.art;
  const img = $("#billede");
  img.src = aktuel.billede.url;
  img.alt = "Billede af " + delNavn(aktuel);
  $("#spoergsmaal").textContent = spoergsmaal(aktuel);
  $("#kredit").innerHTML = kredit(aktuel.billede, false);
  $("#feedback").hidden = true;
  $("#naeste").hidden = true;
  $("#svar").innerHTML = svarmuligheder(aktuel.art)
    .map((a, i) => `<button type="button" data-nr="${i}" data-navn="${esc(a.dansk)}">${esc(a.dansk)}<small>${esc(a.latin)}</small></button>`)
    .join("");
  forudindlaes(bunke[0]);
}

function svar(knap) {
  if (!aktuel || knap.disabled) return;
  const rigtigt = knap.dataset.navn === aktuel.art.dansk;
  state.score.i_alt++;
  if (rigtigt) state.score.rigtige++;
  gem("trae-score", state.score);
  visScore();

  for (const b of $("#svar").querySelectorAll("button")) {
    b.disabled = true;
    if (b.dataset.navn === aktuel.art.dansk) b.classList.add("ret");
  }
  if (!rigtigt) knap.classList.add("forkert");

  const fb = $("#feedback");
  fb.textContent = `${rigtigt ? "Rigtigt!" : "Forkert –"} ${rigtigt ? "" : "det er "}${aktuel.art.dansk} (${delNavn(aktuel)})`;
  fb.hidden = false;
  $("#kredit").innerHTML = kredit(aktuel.billede, true);
  $("#naeste").hidden = false;
  timer = setTimeout(visNaeste, rigtigt ? PAUSE_RET : PAUSE_FORKERT);
}

function visScore() {
  const { rigtige, i_alt } = state.score;
  $("#score").textContent = `${rigtige} ud af ${i_alt} rigtige`;
}

/* ---------- Træerne ---------- */

function visListe() {
  const pulje = state.listeKategori === "alle" ? arter : arter.filter((a) => a.svaerhed === state.listeKategori);
  const sorteret = [...pulje].sort((a, b) => a.dansk.localeCompare(b.dansk, "da"));
  $("#liste").innerHTML = sorteret
    .map((a) => {
      const fig = Object.keys(DELE)
        .flatMap((del) => (a.billeder[del] ?? []).slice(0, 1).map((b) => ({ del, b })))
        .map(({ del, b }) => `<figure><img src="${esc(b.url)}" alt="${esc(a.dansk)} – ${esc(DELE[del])}" loading="lazy" data-url="${esc(b.url)}" data-kredit="${esc(kredit(b, true))}"><figcaption>${del === "frugt" ? esc(a.frugt) : del === "blade" && a.type === "naal" ? "Nåle" : DELE[del]}</figcaption></figure>`)
        .join("");
      return `<article class="art"><h3>${esc(a.dansk)}<span class="tag">${a.svaerhed === "let" ? "Nem" : "Svær"}</span></h3><div class="latin">${esc(a.latin)}</div><div class="galleri">${fig}</div></article>`;
    })
    .join("");
  for (const b of $("#liste-filter").querySelectorAll("button")) b.setAttribute("aria-pressed", b.dataset.kategori === state.listeKategori);
}

/* ---------- Faner ---------- */

const SIDER = { quiz: "Kend dit træ", traeer: "Træerne – Kend dit træ", om: "Om – Kend dit træ" };

function visSide() {
  const hash = location.hash.slice(1);
  const aktiv = hash in SIDER ? hash : "quiz";
  for (const side of Object.keys(SIDER)) {
    $(`#side-${side}`).hidden = side !== aktiv;
    if (side === aktiv) $(`#fane-${side}`).setAttribute("aria-current", "page");
    else $(`#fane-${side}`).removeAttribute("aria-current");
  }
  $("#taeller").hidden = aktiv !== "quiz";
  document.title = SIDER[aktiv];
  if (aktiv === "traeer" && !$("#liste").innerHTML) visListe();
}

/* ---------- Opsætning ---------- */

function opdaterKnapper() {
  for (const b of $("#kategori").querySelectorAll("button")) b.setAttribute("aria-pressed", b.dataset.kategori === state.kategori);
  for (const b of $("#dele").querySelectorAll("button")) b.setAttribute("aria-pressed", b.dataset.del === state.del);
}

function opsaet() {
  $("#kategori").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    state.kategori = b.dataset.kategori;
    gem("trae-kategori", state.kategori);
    opdaterKnapper();
    nyBunke();
    visNaeste();
  });
  $("#dele").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    state.del = b.dataset.del;
    gem("trae-del", state.del);
    opdaterKnapper();
    nyBunke();
    visNaeste();
  });
  $("#svar").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) svar(b);
  });
  $("#naeste").addEventListener("click", visNaeste);
  $("#nulstil").addEventListener("click", () => {
    state.score = { rigtige: 0, i_alt: 0 };
    gem("trae-score", state.score);
    visScore();
  });
  $("#billede").addEventListener("error", () => { if (!$("#svar button:disabled")) visNaeste(); });
  document.addEventListener("keydown", (e) => {
    if ($("#side-quiz").hidden || e.target.matches("input, textarea")) return;
    const nr = Number(e.key) - 1;
    const knapper = $("#svar").querySelectorAll("button");
    if (nr >= 0 && nr < knapper.length) svar(knapper[nr]);
    else if ((e.key === "Enter" || e.key === " ") && !$("#naeste").hidden) { e.preventDefault(); visNaeste(); }
  });
  $("#liste-filter").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    state.listeKategori = b.dataset.kategori;
    visListe();
  });
  $("#liste").addEventListener("click", (e) => {
    const img = e.target.closest("img[data-url]");
    if (!img) return;
    $("#stort-billede").src = img.dataset.url;
    $("#stort-billede").alt = img.alt;
    $("#stort-kredit").innerHTML = img.dataset.kredit;
    $("#stort").showModal();
  });
  $("#stort").addEventListener("click", (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });
  window.addEventListener("hashchange", () => { visSide(); window.scrollTo(0, 0); });
}

async function start() {
  opsaet();
  opdaterKnapper();
  visScore();
  try {
    arter = (await (await fetch("data/traeer.json")).json()).arter;
  } catch (err) {
    $("#spoergsmaal").textContent = "Kunne ikke indlæse data. Siden skal åbnes via en webserver.";
    throw err;
  }
  // Skjul dele, der (endnu) ikke har billeder
  for (const b of $("#dele").querySelectorAll("button[data-del]")) {
    const del = b.dataset.del;
    if (del !== "alle" && !arter.some((a) => a.billeder[del]?.length)) {
      b.hidden = true;
      if (state.del === del) state.del = "alle";
    }
  }
  opdaterKnapper();
  visSide();
  nyBunke();
  visNaeste();
}

start();
