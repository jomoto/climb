import {
  MONTHS,
  MONTH_LABELS,
  getDestinationById,
  getGoodMonths,
} from "./data.js";

const params = new URLSearchParams(window.location.search);
const destinationId = params.get("id");
const requestedMonth = params.get("month");
const requestedStyle = params.get("style") || "all";
const requestedRock = params.get("rock") || "all";
const requestedPitch = params.get("pitch") || "all";
const requestedLat = params.get("lat");
const requestedLng = params.get("lng");
const requestedZoom = params.get("zoom");

const ALLOWED_STYLES = new Set(["all", "trad", "sport", "boulder", "mixed"]);
const ALLOWED_ROCKS = new Set(["all", "granite", "limestone", "sandstone", "volcanic", "other"]);
const ALLOWED_PITCH = new Set(["all", "single", "multi"]);
const ALL_MONTH_KEY = "all";

function sanitizeMonth(value) {
  if (value === ALL_MONTH_KEY) return ALL_MONTH_KEY;
  return MONTHS.some((month) => month.key === value) ? value : null;
}

function sanitizeQueryValue(value, allowed, fallback) {
  return allowed.has(value) ? value : fallback;
}

function normalizeNumericValue(value, fallback = null) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? value : fallback;
}

function getReferrerParams() {
  if (!document.referrer) return null;

  try {
    const referrer = new URL(document.referrer);
    if (
      referrer.origin !== window.location.origin ||
      !referrer.pathname.endsWith("/where2climb/") &&
      !referrer.pathname.endsWith("/where2climb/index.html")
    ) {
      return null;
    }
    return referrer.searchParams;
  } catch {
    return null;
  }
}

function getReferrerValue(referrerParams, key) {
  return referrerParams ? referrerParams.get(key) : null;
}

const detailRoot = document.querySelector("#detailRoot");
const backToMap = document.querySelector("#backToMap");
const detailHero = document.querySelector("#detailHero");
const detailMetrics = document.querySelector("#detailMetrics");
const detailMonth = document.querySelector("#detailMonth");
const detailAllMonths = document.querySelector("#detailAllMonths");
const detailSources = document.querySelector("#detailSources");

const destination = getDestinationById(destinationId);

const safeStyle = sanitizeQueryValue(requestedStyle, ALLOWED_STYLES, "all");
const safeRock = sanitizeQueryValue(requestedRock, ALLOWED_ROCKS, "all");
const safePitch = sanitizeQueryValue(requestedPitch, ALLOWED_PITCH, "all");
const referrerParams = getReferrerParams();
const referrerMonth = referrerParams ? referrerParams.get("month") : null;
const resolvedMonth = sanitizeMonth(requestedMonth) || sanitizeMonth(referrerMonth) || ALL_MONTH_KEY;
const resolvedStyle = sanitizeQueryValue(getReferrerValue(referrerParams, "style"), ALLOWED_STYLES, safeStyle);
const resolvedRock = sanitizeQueryValue(getReferrerValue(referrerParams, "rock"), ALLOWED_ROCKS, safeRock);
const resolvedPitch = sanitizeQueryValue(getReferrerValue(referrerParams, "pitch"), ALLOWED_PITCH, safePitch);
const resolvedLat =
  getReferrerValue(referrerParams, "lat") ||
  requestedLat ||
  null;
const resolvedLng =
  getReferrerValue(referrerParams, "lng") ||
  requestedLng ||
  null;
const resolvedZoom =
  getReferrerValue(referrerParams, "zoom") ||
  requestedZoom ||
  null;

const COUNTRY_BY_ID = {
  ailefroide: "France",
  "bow-valley": "Canada",
  bugaboos: "Canada",
  ceuse: "France",
  chamonix: "France",
  "costa-blanca": "Spain",
  dolomites: "Italy",
  "el-potrero-chico": "Mexico",
  "el-salto": "Mexico",
  "finale-ligure": "Italy",
  frankenjura: "Germany",
  "hatun-machay": "Peru",
  kalymnos: "Greece",
  lofoten: "Norway",
  "mineral-del-chico": "Mexico",
  paklenica: "Croatia",
  "pena-de-bernal": "Mexico",
  siurana: "Spain",
  "skaha-bluffs": "Canada",
  squamish: "Canada",
  "todra-gorge": "Morocco",
  "valle-dellorco": "Italy",
  "verdon-gorge": "France",
  arco: "Italy",
  tafraoute: "Morocco",
  margalef: "Spain",
  leonidio: "Greece",
  "mount-arapiles": "Australia",
  liming: "China",
  tsaranoro: "Madagascar",
  "blue-mountains-au": "Australia",
  "waterval-boven": "South Africa",
  nowra: "Australia",
  "frog-buttress": "Australia",
  ogawayama: "Japan",
  "wadi-rum": "Jordan",
  albarracin: "Spain",
  rodellar: "Spain",
  alcaniz: "Spain",
  quiros: "Spain",
  fontainebleau: "France",
  briancon: "France",
  "les-calanques": "France",
  buoux: "France",
  tarn: "France",
  cadarese: "Italy",
  ogliastra: "Italy",
  "val-di-mello": "Italy",
  meteora: "Greece",
  "athens-crags": "Greece",
  lagada: "Greece",
  bohuslan: "Sweden",
  skien: "Norway",
  vingsand: "Norway",
  aland: "Finland",
  "peak-district": "United Kingdom",
  osp: "Slovenia",
  omis: "Croatia",
  "magic-wood": "Switzerland",
  geyikbayiri: "Türkiye",
  aladaglar: "Türkiye",
  quetzaltenango: "Guatemala",
  "cerro-quemado": "Guatemala",
  itatim: "Brazil",
  "el-chonta": "Peru",
  yangshuo: "China",
  palchan: "India",
  aleo: "India",
  "chichoga-road": "India",
  "solang-valley": "India",
  mizugaki: "Japan",
  rocklands: "South Africa",
  "djebel-zaghouan": "Tunisia",
  "djebel-ressas": "Tunisia",
  "oman-climbing": "Oman",
  grampians: "Australia",
  wanaka: "New Zealand",
  "the-remarkables": "New Zealand",
  "castle-hill": "New Zealand",
  flatanger: "Norway",
  "piedra-parada": "Argentina",
  "serra-do-cipo": "Brazil",
  "valle-de-los-condores": "Argentina",
  "railay-tonsai": "Thailand",
  longdong: "Taiwan",
  "paynes-ford": "New Zealand",
  "rocha-da-pena": "Portugal",
  corsica: "France",
  "valle-cochamo": "Chile",
  frey: "Argentina",
  "los-arenales": "Argentina",
  suesca: "Colombia",
  "chalten-massif": "Argentina",
  "banff-national-park": "Canada",
  riglos: "Spain",
  "la-pedriza": "Spain",
  cresciano: "Switzerland",
  chironico: "Switzerland",
  varazze: "Italy",
  hampi: "India",
  gastlosen: "Switzerland",
  wendenstocke: "Switzerland",
  "eldorado-grimsel": "Switzerland",
  salbitschijen: "Switzerland",
  lehn: "Switzerland",
};

if (!destination) {
  detailRoot.innerHTML = `
    <section class="detail-hero">
      <h1>Destination not found</h1>
      <p>This guide entry could not be loaded.</p>
      <a class="back-link" href="./index.html">Return to map</a>
    </section>
  `;
} else {
  const state = {
    month: resolvedMonth,
  };

  updateBackLink();
  render();

  function render() {
    const peakSet = new Set(destination.primeMonths);
    const goodSet = new Set(getGoodMonths(destination));

    const selectedOverview =
      (destination.monthlyNotes && destination.monthlyNotes[state.month]) || destination.overview;
    const extraNotes = Object.entries(destination.monthlyNotes || {}).filter(
      ([monthKey]) => monthKey !== state.month
    );

    detailHero.innerHTML = `
      <h1>${escapeHtml(destination.name)}</h1>
      <p class="detail-subtitle">${escapeHtml(destination.mpAreaTitle)} (${escapeHtml(
            locationLabel(destination)
          )})</p>
      <div class="chip-row">
        <span class="chip">${escapeHtml(humanStyle(destination.predominantStyle))}</span>
        <span class="chip">${escapeHtml(destination.rockType || "Unknown")}</span>
        <span class="chip">${escapeHtml(humanPitch(destination.pitchType))}</span>
      </div>
    `;

    detailMonth.innerHTML = `
      <div class="season-head">
        <h2>Season Calendar</h2>
      </div>
      <div class="season-grid">
        ${MONTHS.map((month) => {
          const status = peakSet.has(month.key) ? "peak" : goodSet.has(month.key) ? "good" : "off";
          const isSelected = month.key === state.month;
          return `
            <div class="season-cell ${status}${isSelected ? " selected" : ""}">
              <span class="month-name">${month.label.slice(0, 3)}</span>
            </div>
          `;
        }).join("")}
      </div>
      <div class="season-legend-row">
        <span><i class="dot legend-peak"></i> Peak</span>
        <span><i class="dot legend-good"></i> Good</span>
        <span><i class="dot legend-off"></i> Off season</span>
      </div>
    `;

    const routes = (destination.classicRoutes || []).slice(0, 5);
    const sectorCount = routes.filter((r) => isSectorEntry(r.name)).length;
    const classicLabel = sectorCount > routes.length / 2 ? "Classic Sectors" : "Classic Routes";

    detailMetrics.innerHTML = `
      <article class="stats-card">
        <h2>Quick Stats</h2>
        <div class="stats-grid">
          <div>
            <h3>Total Routes</h3>
            <p>${escapeHtml(destination.routeVolume)}</p>
          </div>
          <div>
            <h3>Style Mix</h3>
            <p>${escapeHtml(routeMixText(destination.routeCounts))}</p>
          </div>
          <div>
            <h3>Grade Range</h3>
            <p>${escapeHtml(destination.gradeRange || "Not available")}</p>
          </div>
          <div>
            <h3>Nearest Airport</h3>
            <p>${escapeHtml(destination.nearestAirport || "Not available")}</p>
          </div>
        </div>
      </article>
      ${routes.length ? `
      <article class="stats-card classic-routes-card">
        <h2>${classicLabel}</h2>
        <ul class="classic-routes-list">
          ${routes.map((r) => `
            <li class="classic-route">
              <span class="route-name">${escapeHtml(r.name)}</span>
              <span class="route-meta">${escapeHtml(r.grade)} · ${escapeHtml(r.type)}</span>
            </li>
          `).join("")}
        </ul>
      </article>
      ` : ""}
    `;

    detailAllMonths.innerHTML = `
      <h2>Overview</h2>
      <p>${escapeHtml(selectedOverview)}</p>
    `;

    if (extraNotes.length) {
      detailSources.innerHTML = `
        <h2>Other Month Notes</h2>
        <ul class="source-list">
          ${extraNotes
            .map(
              ([monthKey, note]) =>
                `<li><strong>${escapeHtml(MONTH_LABELS[monthKey])}:</strong> ${escapeHtml(note)}</li>`
            )
            .join("")}
        </ul>
      `;
    } else {
      detailSources.innerHTML = "";
    }
  }

  function updateBackLink() {
    const backParams = new URLSearchParams();
    backParams.set("month", resolvedMonth || "all");
    backParams.set("style", resolvedStyle);
    backParams.set("rock", resolvedRock);
    backParams.set("pitch", resolvedPitch);

    const backLat = resolvedLat || requestedLat;
    const backLng = resolvedLng || requestedLng;
    const backZoom = resolvedZoom || requestedZoom;

    if (backLat && Number.isFinite(Number(backLat))) {
      backParams.set("lat", backLat);
    }

    if (backLng && Number.isFinite(Number(backLng))) {
      backParams.set("lng", backLng);
    }

    if (backZoom && Number.isFinite(Number(backZoom))) {
      backParams.set("zoom", backZoom);
    }

    backToMap.href = `./index.html?${backParams.toString()}`;
  }
}

function routeMixText(routeCounts = {}) {
  const trad = routeCounts.trad || 0;
  const sport = routeCounts.sport || 0;
  const total = trad + sport;
  if (trad && sport) {
    const tradPct = Math.round((trad / total) * 100);
    const sportPct = 100 - tradPct;
    if (tradPct === 0) return "~100% sport";
    if (sportPct === 0) return "~100% trad";
    return `${sportPct}% sport / ${tradPct}% trad`;
  }
  if (trad) {
    return "100% trad";
  }
  if (sport) {
    return "100% sport";
  }
  return "Route mix unavailable";
}

function humanStyle(style) {
  if (style === "mixed") {
    return "Trad + Sport";
  }
  return style === "trad" ? "Trad" : "Sport";
}

function humanPitch(pitchType) {
  if (pitchType === "both") return "Single + Multi";
  if (pitchType === "multi") return "Multi-pitch";
  return "Single-pitch";
}

function isSectorEntry(name) {
  const lower = name.toLowerCase();
  return /\b(sector|routes|area|walls?|crags?|boulders|classics|gorge|cave)\b/.test(lower);
}

function locationLabel(destination) {
  const region = destination.region || "";
  if (typeof region === "string" && region.toLowerCase() !== "international") {
    return region;
  }

  return COUNTRY_BY_ID[destination.id] || region || "Unknown";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
