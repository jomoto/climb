import {
  MONTHS,
  MONTH_LABELS,
  destinationStyle,
  getDestinationById,
  getGoodMonths,
} from "./data.js?v=20260930a";
import { destinationLocation } from "./locations.js?v=20260929a";

const params = new URLSearchParams(window.location.search);
const destinationId = params.get("id");
const requestedMonth = params.get("month");
const requestedStyle = params.get("style") || "all";
const requestedRock = params.get("rock") || "all";
const requestedPitch = params.get("pitch") || "all";
const requestedSearch = params.get("q") || "";
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
const detailGuide = document.querySelector("#detailGuide");
const pageDescription = document.querySelector("#pageDescription");
const canonicalLink = document.querySelector("#canonicalLink");
const ogTitle = document.querySelector("#ogTitle");
const ogDescription = document.querySelector("#ogDescription");
const ogUrl = document.querySelector("#ogUrl");
const twitterTitle = document.querySelector("#twitterTitle");
const twitterDescription = document.querySelector("#twitterDescription");

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
const resolvedSearch = String(getReferrerValue(referrerParams, "q") || requestedSearch).trim().slice(0, 80);
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

if (!destination) {
  detailRoot.innerHTML = `
    <section class="detail-hero">
      <h1>Destination not found</h1>
      <p>This guide entry could not be loaded.</p>
      <a class="back-link" href="./index.html">Return to map</a>
    </section>
  `;
} else {
  updateMetadata();
  updateBackLink();
  render();

  function render() {
    const peakSet = new Set(destination.primeMonths);
    const goodSet = new Set(getGoodMonths(destination));
    const cleanedOverview = cleanEditorialText(destination.overview);
    const cleanedMonthNotes = Object.fromEntries(
      Object.entries(destination.monthlyNotes || {})
        .map(([monthKey, note]) => [monthKey, cleanEditorialText(note)])
        .filter(([, note]) => note && normalizeCopy(note) !== normalizeCopy(cleanedOverview))
    );
    const extraNotes = Object.entries(cleanedMonthNotes);
    const resolvedDestinationStyle = destinationStyle(destination);
    const resolvedDestinationStyleLabel =
      destination.styleSummary || humanStyle(resolvedDestinationStyle);
    const location = destinationLocation(destination);
    const rockType =
      destination.rockType && destination.rockType.toLowerCase() !== "unknown"
        ? destination.rockType
        : "Rock varies";
    const tldr = destination.tldr || cleanedOverview;
    const peakMonths = destination.primeMonths.map((month) => MONTH_LABELS[month]).filter(Boolean);
    const peakMonthLabel = formatList(peakMonths);

    detailHero.innerHTML = `
      <p class="section-index">Climbing area / ${escapeHtml(location)}</p>
      <h1>${escapeHtml(destination.name)}</h1>
      <p class="detail-lead"><span class="tldr-label">TL;DR</span> ${escapeHtml(tldr)}</p>
      <div class="metadata-line" aria-label="Area details">
        <span>${escapeHtml(location)}</span>
        <span>${escapeHtml(resolvedDestinationStyleLabel)}</span>
        <span>${escapeHtml(rockType)}</span>
        <span>${escapeHtml(humanPitch(destination.pitchType))}</span>
      </div>
    `;

    detailMonth.innerHTML = `
      <div class="season-head">
        <div>
          <h2>Best months</h2>
        </div>
        <p class="season-summary">Peak: ${escapeHtml(peakMonthLabel || "Not listed")}</p>
      </div>
      <div class="season-grid" aria-label="Season quality by month">
        ${MONTHS.map((month) => {
          const status = peakSet.has(month.key) ? "peak" : goodSet.has(month.key) ? "good" : "off";
          const statusLabel = status === "off" ? "Less ideal" : status === "peak" ? "Peak" : "Good";
          return `
            <div class="season-cell ${status}" aria-label="${month.label}: ${statusLabel}">
              <span class="month-name">${month.label.slice(0, 3)}</span>
              <span class="visually-hidden">${statusLabel}</span>
            </div>
          `;
        }).join("")}
      </div>
      <div class="season-legend-row">
        <span><i class="dot legend-peak"></i> Peak</span>
        <span><i class="dot legend-good"></i> Good</span>
        <span><i class="dot legend-off"></i> Less ideal</span>
      </div>
    `;

    const routes = (destination.classicRoutes || []).slice(0, 5);
    const sectorCount = routes.filter((r) => isSectorEntry(r.name)).length;
    const classicLabel = sectorCount > routes.length / 2 ? "Classic Sectors" : "Classic Routes";

    detailMetrics.innerHTML = `
      <article class="stats-card">
        <h2>At a glance</h2>
        <div class="stats-grid">
          <div>
            <h3>Total Routes</h3>
            <p>${escapeHtml(destination.routeVolume)}</p>
          </div>
          <div>
            <h3>Style Mix</h3>
            <p>${escapeHtml(routeMixText(destination))}</p>
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

    const showExtraBeta = isUsefulExtraBeta(cleanedOverview, tldr);
    detailAllMonths.hidden = !showExtraBeta;
    detailAllMonths.innerHTML = showExtraBeta
      ? `
          <h2>Extra beta</h2>
          <p>${escapeHtml(cleanedOverview)}</p>
        `
      : "";

    if (extraNotes.length) {
      detailSources.hidden = false;
      detailSources.innerHTML = `
        <h2>Notes by month</h2>
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
      detailSources.hidden = true;
    }

    const detailStory = detailAllMonths.closest(".detail-story");
    const detailContentGrid = detailAllMonths.closest(".detail-content-grid");
    const storyHasContent = showExtraBeta || extraNotes.length > 0;
    detailStory.hidden = !storyHasContent;
    detailContentGrid.classList.toggle("detail-content-grid--sidebar-only", !storyHasContent);

    const guideUrl = safeExternalUrl(destination.mpAreaUrl);
    detailGuide.hidden = !guideUrl;
    detailGuide.innerHTML = guideUrl
      ? `
          <div>
            <p class="section-index">External reference</p>
            <h2>Routes and access</h2>
            <p>Current route details, access notes, and community updates.</p>
          </div>
          <a class="guide-link" href="${escapeHtml(guideUrl)}" target="_blank" rel="noopener noreferrer">
            View ${escapeHtml(destination.mpAreaTitle || destination.name)} <span aria-hidden="true">↗</span>
          </a>
        `
      : "";
  }

  function updateBackLink() {
    const backParams = new URLSearchParams();
    backParams.set("month", resolvedMonth || "all");
    backParams.set("style", resolvedStyle);
    backParams.set("rock", resolvedRock);
    backParams.set("pitch", resolvedPitch);
    if (resolvedSearch) backParams.set("q", resolvedSearch);

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

  function updateMetadata() {
    const title = `${destination.name} Climbing Guide | Where2Climb`;
    const resolvedStyle = destinationStyle(destination);
    const stylePhrase =
      resolvedStyle === "boulder" ? "bouldering" : `${humanStyle(resolvedStyle).toLowerCase()} climbing`;
    const description = destination.tldr || `Plan a climbing trip to ${destination.name}: best months, ${stylePhrase}, grades, classic routes, and travel logistics.`;
    const canonicalUrl = `https://shinojomoto.com/where2climb/destination.html?id=${encodeURIComponent(
      destination.id
    )}`;

    document.title = title;
    pageDescription.setAttribute("content", description);
    canonicalLink.setAttribute("href", canonicalUrl);
    ogTitle.setAttribute("content", title);
    ogDescription.setAttribute("content", description);
    ogUrl.setAttribute("content", canonicalUrl);
    twitterTitle.setAttribute("content", title);
    twitterDescription.setAttribute("content", description);
  }
}

function isUsefulExtraBeta(overview, tldr) {
  if (!overview || normalizeCopy(overview) === normalizeCopy(tldr)) return false;

  const genericPrefixes = [
    "country and region:",
    "high-potential destination",
    "overview.",
    "solid option",
    "top climbing area",
    "typical april weather:",
  ];
  const normalizedOverview = overview.trim().toLowerCase();
  return !genericPrefixes.some((prefix) => normalizedOverview.startsWith(prefix));
}

function routeMixText(destination) {
  if (destination.styleSummary) return destination.styleSummary;

  const routeCounts = destination.routeCounts || {};
  const styles = [
    { label: "sport", count: Number(routeCounts.sport) || 0 },
    { label: "trad", count: Number(routeCounts.trad) || 0 },
    { label: "boulder", count: Number(routeCounts.boulder) || 0 },
    { label: "DWS", count: Number(routeCounts.dws) || 0 },
  ].filter((style) => style.count > 0);

  if (styles.length) {
    const total = styles.reduce((sum, style) => sum + style.count, 0);
    let allocatedPct = 0;

    const mix = styles
      .sort((a, b) => b.count - a.count)
      .map((style, index) => {
        const pct =
          index === styles.length - 1
            ? Math.max(0, 100 - allocatedPct)
            : Math.round((style.count / total) * 100);
        allocatedPct += pct;
        return `${pct}% ${style.label}`;
      })
      .join(" / ");
    if (destination.routeCountsPartial) return `Listed subset: ${mix}`;
    if (destination.routeCountsEstimated) return `Estimated: ${mix}`;
    return mix;
  }

  const styleLabels = { sport: "sport", trad: "trad", boulder: "bouldering" };
  const listedStyles = (destination.styles || [])
    .map((style) => styleLabels[style])
    .filter(Boolean);
  return listedStyles.length
    ? `${listedStyles.join(", ")} (breakdown unavailable)`
    : "Route mix unavailable";
}

function humanStyle(style) {
  if (style === "boulder") return "Bouldering";
  if (style === "mixed") return "Sport & Trad";
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

function safeExternalUrl(value) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function cleanEditorialText(value) {
  return String(value || "")
    .replace(/^Country and region:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCopy(value) {
  return cleanEditorialText(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function formatList(values) {
  if (values.length < 2) return values[0] || "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
