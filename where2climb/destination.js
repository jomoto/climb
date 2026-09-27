import {
  MONTHS,
  MONTH_LABELS,
  destinationStyle,
  getDestinationById,
  getGoodMonths,
} from "./data.js?v=20260927c";
import { destinationLocation } from "./locations.js?v=20260927d";

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
  const state = {
    month: resolvedMonth,
  };

  updateMetadata();
  updateBackLink();
  render();

  detailMonth.addEventListener("click", (event) => {
    const button = event.target.closest("[data-month]");
    if (!button) return;

    const nextMonth = sanitizeMonth(button.dataset.month);
    if (!nextMonth || nextMonth === state.month) return;

    state.month = nextMonth;
    syncDetailUrl();
    updateBackLink();
    render();
    detailMonth.querySelector(`[data-month="${nextMonth}"]`)?.focus();
  });

  function render() {
    const peakSet = new Set(destination.primeMonths);
    const goodSet = new Set(getGoodMonths(destination));
    const selectedMonthNote =
      state.month === ALL_MONTH_KEY ? null : destination.monthlyNotes?.[state.month] || null;
    const selectedMonthStatus =
      state.month === ALL_MONTH_KEY
        ? null
        : peakSet.has(state.month)
          ? "a peak month"
          : goodSet.has(state.month)
            ? "a good month"
            : "off season";
    const selectedOverview =
      state.month === ALL_MONTH_KEY
        ? destination.overview
        : selectedMonthNote ||
          `${MONTH_LABELS[state.month]} is rated as ${selectedMonthStatus} for ${destination.name}. A month-specific write-up has not been added yet; use the season calendar as a planning signal and verify current local conditions.`;
    const extraNotes = Object.entries(destination.monthlyNotes || {}).filter(
      ([monthKey]) => state.month === ALL_MONTH_KEY || monthKey !== state.month
    );
    const resolvedDestinationStyle = destinationStyle(destination);

    detailHero.innerHTML = `
      <h1>${escapeHtml(destination.name)}</h1>
      <p class="detail-subtitle">${escapeHtml(destination.mpAreaTitle)} (${escapeHtml(
        destinationLocation(destination)
      )})</p>
      <div class="chip-row">
        <span class="chip">${escapeHtml(humanStyle(resolvedDestinationStyle))}</span>
        <span class="chip">${escapeHtml(destination.rockType || "Unknown")}</span>
        <span class="chip">${escapeHtml(humanPitch(destination.pitchType))}</span>
      </div>
    `;

    detailMonth.innerHTML = `
      <div class="season-head">
        <h2>Season Calendar</h2>
        <button
          class="season-all-button${state.month === ALL_MONTH_KEY ? " selected" : ""}"
          type="button"
          data-month="all"
          aria-pressed="${state.month === ALL_MONTH_KEY}"
        >All months</button>
      </div>
      <div class="season-grid">
        ${MONTHS.map((month) => {
          const status = peakSet.has(month.key) ? "peak" : goodSet.has(month.key) ? "good" : "off";
          const statusLabel = status === "off" ? "Off season" : status === "peak" ? "Peak" : "Good";
          const isSelected = month.key === state.month;
          return `
            <button
              class="season-cell ${status}${isSelected ? " selected" : ""}"
              type="button"
              data-month="${month.key}"
              aria-label="${month.label}: ${statusLabel}"
              aria-pressed="${isSelected}"
            >
              <span class="month-name">${month.label.slice(0, 3)}</span>
              <span class="visually-hidden">${statusLabel}</span>
            </button>
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
      <h2>${
        state.month === ALL_MONTH_KEY
          ? "Overview"
          : selectedMonthNote
            ? `${escapeHtml(MONTH_LABELS[state.month])} Notes`
            : `${escapeHtml(MONTH_LABELS[state.month])} Season`
      }</h2>
      <p>${escapeHtml(selectedOverview)}</p>
    `;

    if (extraNotes.length) {
      detailSources.hidden = false;
      detailSources.innerHTML = `
        <h2>${state.month === ALL_MONTH_KEY ? "Month Notes" : "Other Month Notes"}</h2>
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

    const guideUrl = safeExternalUrl(destination.mpAreaUrl);
    detailGuide.hidden = !guideUrl;
    detailGuide.innerHTML = guideUrl
      ? `
          <div>
            <h2>Reference Guide</h2>
            <p>Continue planning with route details, access notes, and community updates.</p>
          </div>
          <a class="guide-link" href="${escapeHtml(guideUrl)}" target="_blank" rel="noopener noreferrer">
            View ${escapeHtml(destination.mpAreaTitle || destination.name)} <span aria-hidden="true">↗</span>
          </a>
        `
      : "";
  }

  function updateBackLink() {
    const backParams = new URLSearchParams();
    backParams.set("month", state.month || "all");
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

  function syncDetailUrl() {
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.set("id", destination.id);
    nextParams.set("month", state.month);
    window.history.replaceState(null, "", `${window.location.pathname}?${nextParams.toString()}`);
  }

  function updateMetadata() {
    const title = `${destination.name} Climbing Guide | Where2Climb`;
    const resolvedStyle = destinationStyle(destination);
    const stylePhrase =
      resolvedStyle === "boulder" ? "bouldering" : `${humanStyle(resolvedStyle).toLowerCase()} climbing`;
    const description = `Plan a climbing trip to ${destination.name}: best months, ${stylePhrase}, grades, classic routes, and travel logistics.`;
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

function routeMixText(routeCounts = {}) {
  const styles = [
    { label: "sport", count: Number(routeCounts.sport) || 0 },
    { label: "trad", count: Number(routeCounts.trad) || 0 },
    { label: "boulder", count: Number(routeCounts.boulder) || 0 },
  ].filter((style) => style.count > 0);

  if (styles.length) {
    const total = styles.reduce((sum, style) => sum + style.count, 0);
    let allocatedPct = 0;

    return styles
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
  }

  return "Route mix unavailable";
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
