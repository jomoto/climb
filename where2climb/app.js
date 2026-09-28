import {
  DESTINATIONS,
  MONTHS,
  MONTH_LABELS,
  destinationStyle,
  isPrimeMonth,
  isGoodMonth,
  monthScore,
  styleMatches,
  rockTypeMatches,
  pitchTypeMatches,
} from "./data.js?v=20260927e";
import { destinationLocation } from "./locations.js?v=20260927d";

const ALLOWED_STYLES = new Set(["all", "trad", "sport", "boulder", "mixed"]);
const ALLOWED_ROCKS = new Set(["all", "granite", "limestone", "sandstone", "volcanic", "other"]);
const ALLOWED_PITCH = new Set(["all", "single", "multi"]);
const ALL_MONTH_KEY = "all";
const DEFAULT_MAP_CENTER = [20, 3];
const DEFAULT_MAP_ZOOM = 2;
const BACK_STATE_STORAGE_KEY = "where2climb:lastMapState";
const MAP_FOCUSABLE_SELECTOR = "a[href], button, input, select, textarea, [tabindex]";
const MISSING_TABINDEX = "__missing__";

const params = new URLSearchParams(window.location.search);
const monthQuery = params.get("month");
const styleQuery = params.get("style");
const rockQuery = params.get("rock");
const pitchQuery = params.get("pitch");
const mapLatQuery = params.get("lat");
const mapLngQuery = params.get("lng");
const mapZoomQuery = params.get("zoom");

const state = {
  month:
    monthQuery === ALL_MONTH_KEY || MONTHS.some((month) => month.key === monthQuery)
      ? monthQuery
      : ALL_MONTH_KEY,
  style: ALLOWED_STYLES.has(styleQuery) ? styleQuery : "all",
  rockType: ALLOWED_ROCKS.has(rockQuery) ? rockQuery : "all",
  pitch: ALLOWED_PITCH.has(pitchQuery) ? pitchQuery : "all",
  search: sanitizeSearch(params.get("q")),
};

const monthSelect = document.querySelector("#monthSelect");
const styleSelect = document.querySelector("#styleSelect");
const rockSelect = document.querySelector("#rockSelect");
const pitchToggle = document.querySelector("#pitchToggle");
const destinationCount = document.querySelector("#destinationCount");
const mobileDestinationCount = document.querySelector("#mobileDestinationCount");
const mapElement = document.querySelector("#map");
const topbar = document.querySelector(".topbar");
const filterToggle = document.querySelector("#filterToggle");
const resultsToggle = document.querySelector("#resultsToggle");
const mobileResultsToggle = document.querySelector("#mobileResultsToggle");
const resultsPanel = document.querySelector("#resultsPanel");
const resultsClose = document.querySelector("#resultsClose");
const resultsSummary = document.querySelector("#resultsSummary");
const destinationList = document.querySelector("#destinationList");
const destinationSearch = document.querySelector("#destinationSearch");
const searchClear = document.querySelector("#searchClear");
const resetFilters = document.querySelector("#resetFilters");
const mapEmptyState = document.querySelector("#mapEmptyState");
let resultsReturnFocus = null;

const map = L.map("map", {
  minZoom: 2,
  worldCopyJump: true,
  zoomControl: true,
}).setView(
  [
    toFiniteNumber(mapLatQuery, DEFAULT_MAP_CENTER[0]),
    toFiniteNumber(mapLngQuery, DEFAULT_MAP_CENTER[1]),
  ],
  toFiniteNumber(mapZoomQuery, DEFAULT_MAP_ZOOM)
);

L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
  {
    maxNativeZoom: 16,
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, and the GIS user community',
  }
).addTo(map);

map.createPane("basemap-labels");
map.getPane("basemap-labels").style.zIndex = 250;
map.getPane("basemap-labels").style.pointerEvents = "none";

L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
  {
    pane: "basemap-labels",
    maxNativeZoom: 16,
    maxZoom: 19,
    attribution: "",
  }
).addTo(map);

const markerLayer =
  typeof L.markerClusterGroup === "function"
    ? L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 34,
        disableClusteringAtZoom: 8,
        spiderfyOnMaxZoom: true,
        chunkedLoading: true,
        iconCreateFunction(cluster) {
          const count = cluster.getChildCount();
          const size = count < 10 ? 36 : count < 50 ? 42 : 48;
          return L.divIcon({
            html: `<span aria-label="${count} destinations">${count}</span>`,
            className: "destination-cluster",
            iconSize: [size, size],
          });
        },
      })
    : L.layerGroup();

markerLayer.addTo(map);

populateMonthSelect();
wireEvents();
destinationSearch.value = state.search;
render();
map.on("moveend", syncQueryParams);

if (state.search) {
  setResultsOpen(true, null, false);
}

function toFiniteNumber(value, fallback) {
  if (value === null || value === "") return fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function sanitizeSearch(value) {
  return String(value || "").trim().slice(0, 80);
}

function normalizeSearch(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function populateMonthSelect() {
  monthSelect.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = ALL_MONTH_KEY;
  allOption.textContent = "All Months";
  monthSelect.appendChild(allOption);

  for (const month of MONTHS) {
    const option = document.createElement("option");
    option.value = month.key;
    option.textContent = month.label;
    monthSelect.appendChild(option);
  }

  syncControls();
}

function wireEvents() {
  filterToggle.addEventListener("click", () => {
    const isOpen = topbar.classList.toggle("filters-open");
    filterToggle.setAttribute("aria-expanded", String(isOpen));
    filterToggle.querySelector("span").textContent = isOpen ? "−" : "+";
    window.setTimeout(() => map.invalidateSize(), 0);
  });

  resultsToggle.addEventListener("click", () => {
    setResultsOpen(resultsPanel.hidden, resultsToggle);
  });

  mobileResultsToggle.addEventListener("click", () => {
    setResultsOpen(resultsPanel.hidden, mobileResultsToggle);
  });

  resultsClose.addEventListener("click", () => setResultsOpen(false));

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    if (!resultsPanel.hidden) {
      setResultsOpen(false);
      return;
    }

    if (!topbar.classList.contains("filters-open")) return;
    topbar.classList.remove("filters-open");
    filterToggle.setAttribute("aria-expanded", "false");
    filterToggle.querySelector("span").textContent = "+";
    filterToggle.focus();
    window.setTimeout(() => map.invalidateSize(), 0);
  });

  monthSelect.addEventListener("change", (event) => {
    state.month = event.target.value;
    render();
  });

  styleSelect.addEventListener("change", (event) => {
    state.style = event.target.value;
    render();
  });

  rockSelect.addEventListener("change", (event) => {
    state.rockType = event.target.value;
    render();
  });

  pitchToggle.addEventListener("click", (event) => {
    const button = event.target.closest(".pitch-btn");
    if (!button) return;
    setPitch(button.dataset.pitch);
  });

  pitchToggle.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;

    event.preventDefault();
    const buttons = [...pitchToggle.querySelectorAll(".pitch-btn")];
    const currentIndex = buttons.findIndex((button) => button.dataset.pitch === state.pitch);
    let nextIndex = currentIndex;

    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = buttons.length - 1;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
    }
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % buttons.length;
    }

    setPitch(buttons[nextIndex].dataset.pitch);
    buttons[nextIndex].focus();
  });

  destinationSearch.addEventListener("input", (event) => {
    state.search = sanitizeSearch(event.target.value);
    render();
  });

  destinationSearch.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const matches = getFilteredDestinations();
    if (matches.length !== 1) return;
    event.preventDefault();
    navigateToDestination(matches[0]);
  });

  searchClear.addEventListener("click", () => {
    state.search = "";
    destinationSearch.value = "";
    render();
    destinationSearch.focus();
  });

  resetFilters.addEventListener("click", resetAllFilters);
  mapEmptyState.addEventListener("click", (event) => {
    if (event.target.closest("[data-reset-filters]")) resetAllFilters();
  });

  destinationList.addEventListener("click", (event) => {
    const link = event.target.closest("[data-destination-id]");
    if (!link) return;
    const destination = DESTINATIONS.find((item) => item.id === link.dataset.destinationId);
    if (!destination) return;
    persistBackState(destination.id, destinationParams(destination), map.getCenter());
  });
}

function setPitch(pitch) {
  if (!ALLOWED_PITCH.has(pitch)) return;
  state.pitch = pitch;
  syncPitchToggle();
  render();
}

function syncControls() {
  monthSelect.value = state.month;
  styleSelect.value = state.style;
  rockSelect.value = state.rockType;
  destinationSearch.value = state.search;
  syncPitchToggle();
}

function syncPitchToggle() {
  for (const button of pitchToggle.querySelectorAll(".pitch-btn")) {
    const isActive = button.dataset.pitch === state.pitch;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-checked", String(isActive));
    button.tabIndex = isActive ? 0 : -1;
  }
}

function setResultsOpen(isOpen, trigger = null, moveFocus = true) {
  resultsPanel.hidden = !isOpen;
  resultsToggle.setAttribute("aria-expanded", String(isOpen));
  mobileResultsToggle.setAttribute("aria-expanded", String(isOpen));
  setMapInteractive(!isOpen);

  if (isOpen) {
    resultsReturnFocus = trigger || document.activeElement;

    if (topbar.classList.contains("filters-open")) {
      topbar.classList.remove("filters-open");
      filterToggle.setAttribute("aria-expanded", "false");
      filterToggle.querySelector("span").textContent = "+";
      window.setTimeout(() => map.invalidateSize(), 0);
    }

    if (moveFocus) window.requestAnimationFrame(() => destinationSearch.focus());
    return;
  }

  if (moveFocus && resultsReturnFocus instanceof HTMLElement) {
    resultsReturnFocus.focus();
  }
}

function setMapInteractive(isInteractive) {
  mapElement.toggleAttribute("inert", !isInteractive);
  if (isInteractive) mapElement.removeAttribute("aria-hidden");
  else mapElement.setAttribute("aria-hidden", "true");

  if (!isInteractive) {
    for (const element of mapElement.querySelectorAll(MAP_FOCUSABLE_SELECTOR)) {
      if (!element.hasAttribute("data-map-previous-tabindex")) {
        element.setAttribute(
          "data-map-previous-tabindex",
          element.hasAttribute("tabindex") ? element.getAttribute("tabindex") : MISSING_TABINDEX
        );
      }
      element.setAttribute("tabindex", "-1");
    }
    return;
  }

  for (const element of mapElement.querySelectorAll("[data-map-previous-tabindex]")) {
    const previousTabIndex = element.getAttribute("data-map-previous-tabindex");
    if (previousTabIndex === MISSING_TABINDEX) element.removeAttribute("tabindex");
    else element.setAttribute("tabindex", previousTabIndex);
    element.removeAttribute("data-map-previous-tabindex");
  }
}

function resetAllFilters() {
  state.month = ALL_MONTH_KEY;
  state.style = "all";
  state.rockType = "all";
  state.pitch = "all";
  state.search = "";
  syncControls();
  render();
}

function render() {
  const visibleDestinations = getFilteredDestinations();
  renderMap(visibleDestinations);
  renderResults(visibleDestinations);
  renderCount(visibleDestinations.length);
  mapEmptyState.hidden = visibleDestinations.length !== 0;
  searchClear.hidden = !state.search;
  syncQueryParams();
}

function getFilteredDestinations() {
  const searchTerms = normalizeSearch(state.search).split(" ").filter(Boolean);

  return DESTINATIONS.filter((destination) => {
    if (!styleMatches(destination, state.style)) return false;
    if (!rockTypeMatches(destination, state.rockType)) return false;
    if (!pitchTypeMatches(destination, state.pitch)) return false;

    if (state.month !== ALL_MONTH_KEY) {
      if (!isPrimeMonth(destination, state.month) && !isGoodMonth(destination, state.month)) return false;
    }

    if (searchTerms.length) {
      const searchIndex = normalizeSearch(
        [
          destination.name,
          destinationLocation(destination),
          destination.rockType,
          destination.mpAreaTitle,
          destination.nearestAirport,
        ].join(" ")
      );
      if (!searchTerms.every((term) => searchIndex.includes(term))) return false;
    }

    return true;
  }).sort((a, b) => {
    if (state.month === ALL_MONTH_KEY) {
      const bestA = Math.max(...a.primeMonths.map((month) => monthScore(a, month)));
      const bestB = Math.max(...b.primeMonths.map((month) => monthScore(b, month)));
      return bestB - bestA || a.name.localeCompare(b.name);
    }

    return monthScore(b, state.month) - monthScore(a, state.month) || a.name.localeCompare(b.name);
  });
}

function renderMap(destinations) {
  markerLayer.clearLayers();
  const monthSelected = state.month !== ALL_MONTH_KEY;
  updateLegend(monthSelected);

  for (const destination of destinations) {
    const isPeak = monthSelected && isPrimeMonth(destination, state.month);
    const markerStyle = monthSelected
      ? isPeak
        ? "peak"
        : "good"
      : destinationStyle(destination);
    const markerSize = isPeak ? 18 : 16;
    const markerLabel = monthSelected
      ? `${destination.name}, ${isPeak ? "peak" : "good"} in ${MONTH_LABELS[state.month]}`
      : `${destination.name}, ${styleLabel(destinationStyle(destination))}`;

    const icon = L.divIcon({
      className: "destination-marker-shell",
      html: `<span class="destination-marker marker-${markerStyle}" aria-hidden="true"></span>`,
      iconSize: [markerSize, markerSize],
      iconAnchor: [markerSize / 2, markerSize / 2],
    });

    const marker = L.marker([destination.lat, destination.lng], {
      icon,
      keyboard: true,
      riseOnHover: true,
      title: destination.name,
      alt: markerLabel,
    });

    marker.bindTooltip(destination.name, {
      direction: "top",
      offset: [0, -9],
      opacity: 0.95,
      className: "destination-tooltip",
    });

    marker.on("add", () => {
      const element = marker.getElement();
      if (!element) return;
      element.setAttribute("role", "link");
      element.setAttribute("aria-label", markerLabel);
    });

    marker.on("click", () => navigateToDestination(destination));
    marker.addTo(markerLayer);
  }

  if (!resultsPanel.hidden) setMapInteractive(false);
}

function renderResults(destinations) {
  const resultLabel = countLabel(destinations.length);
  resultsSummary.textContent = state.search
    ? `${resultLabel} matching “${state.search}” and the current filters.`
    : `${resultLabel} matching the current filters.`;

  if (!destinations.length) {
    destinationList.innerHTML = `
      <div class="destination-result-empty">
        <strong>No matches yet</strong>
        <p>Try another search or reset the filters below.</p>
      </div>
    `;
    return;
  }

  destinationList.innerHTML = destinations
    .map((destination) => {
      const style = styleLabel(destinationStyle(destination));
      const region = destinationLocation(destination);
      const href = destinationHref(destination);
      const season = seasonLabel(destination);

      return `
        <a
          class="destination-result"
          href="${escapeHtml(href)}"
          data-destination-id="${escapeHtml(destination.id)}"
        >
          <span class="destination-result-heading">
            <h3>${escapeHtml(destination.name)}</h3>
            <span class="destination-result-region">${escapeHtml(region)}</span>
          </span>
          <span class="destination-result-meta">
            <span>${escapeHtml(style)}</span>
            <span>${escapeHtml(destination.rockType || "Unknown rock")}</span>
            <span>${escapeHtml(pitchLabel(destination.pitchType))}</span>
          </span>
          <span class="destination-result-season">${escapeHtml(season)}</span>
        </a>
      `;
    })
    .join("");
}

function renderCount(count) {
  const label = countLabel(count);
  destinationCount.textContent = label;
  mobileDestinationCount.textContent = String(count);
  resultsToggle.setAttribute("aria-label", `Browse ${label}`);
  mobileResultsToggle.setAttribute("aria-label", `Browse ${label}`);
}

function countLabel(count) {
  return `${count} destination${count === 1 ? "" : "s"}`;
}

function seasonLabel(destination) {
  if (state.month !== ALL_MONTH_KEY) {
    const status = isPrimeMonth(destination, state.month) ? "Peak" : "Good";
    return `${status} in ${MONTH_LABELS[state.month]}`;
  }

  const labels = destination.primeMonths.map((month) => MONTH_LABELS[month]).filter(Boolean);
  return `Peak: ${labels.join(" & ")}`;
}

function styleLabel(style) {
  if (style === "boulder") return "Bouldering";
  if (style === "mixed") return "Sport & Trad";
  if (style === "trad") return "Trad";
  return "Sport";
}

function pitchLabel(pitchType) {
  if (pitchType === "both") return "Single + Multi";
  if (pitchType === "multi") return "Multi-pitch";
  return "Single-pitch";
}

function updateLegend(monthSelected) {
  const legend = document.querySelector("#mapLegend");
  if (monthSelected) {
    legend.innerHTML = `
      <span><i class="dot legend-peak"></i> Peak</span>
      <span><i class="dot legend-good"></i> Good</span>
    `;
  } else {
    legend.innerHTML = `
      <span><i class="dot dot-sport"></i> Sport</span>
      <span><i class="dot dot-trad"></i> Trad</span>
      <span><i class="dot dot-boulder"></i> Boulder</span>
      <span><i class="dot dot-mixed"></i> Sport &amp; Trad</span>
    `;
  }
}

function destinationParams(destination) {
  const destinationParamsValue = new URLSearchParams();
  destinationParamsValue.set("id", destination.id);
  destinationParamsValue.set("month", state.month);
  destinationParamsValue.set("style", state.style);
  destinationParamsValue.set("rock", state.rockType);
  destinationParamsValue.set("pitch", state.pitch);
  if (state.search) destinationParamsValue.set("q", state.search);

  const center = map.getCenter();
  destinationParamsValue.set("lat", center.lat.toFixed(5));
  destinationParamsValue.set("lng", center.lng.toFixed(5));
  destinationParamsValue.set("zoom", String(map.getZoom()));
  return destinationParamsValue;
}

function destinationHref(destination) {
  return `./destination.html?${destinationParams(destination).toString()}`;
}

function navigateToDestination(destination) {
  const nextParams = destinationParams(destination);
  persistBackState(destination.id, nextParams, map.getCenter());
  window.location.href = `./destination.html?${nextParams.toString()}`;
}

function persistBackState(destinationId, destinationParamsValue, center) {
  const storedState = {
    id: destinationId,
    month: destinationParamsValue.get("month"),
    style: destinationParamsValue.get("style"),
    rock: destinationParamsValue.get("rock"),
    pitch: destinationParamsValue.get("pitch"),
    q: destinationParamsValue.get("q"),
    lat: toFiniteNumber(center.lat, null),
    lng: toFiniteNumber(center.lng, null),
    zoom: toFiniteNumber(map.getZoom(), null),
    updatedAt: Date.now(),
  };

  try {
    sessionStorage.setItem(BACK_STATE_STORAGE_KEY, JSON.stringify(storedState));
  } catch {
    // Ignore storage failures (for example, when storage is blocked).
  }
}

function syncQueryParams() {
  const nextParams = new URLSearchParams();
  if (state.month !== ALL_MONTH_KEY) nextParams.set("month", state.month);
  if (state.style !== "all") nextParams.set("style", state.style);
  if (state.rockType !== "all") nextParams.set("rock", state.rockType);
  if (state.pitch !== "all") nextParams.set("pitch", state.pitch);
  if (state.search) nextParams.set("q", state.search);

  const center = map.getCenter();
  const zoom = map.getZoom();
  const movedFromDefault =
    zoom !== DEFAULT_MAP_ZOOM ||
    Math.abs(center.lat - DEFAULT_MAP_CENTER[0]) > 0.5 ||
    Math.abs(center.lng - DEFAULT_MAP_CENTER[1]) > 0.5;

  if (movedFromDefault) {
    nextParams.set("lat", center.lat.toFixed(5));
    nextParams.set("lng", center.lng.toFixed(5));
    nextParams.set("zoom", String(zoom));
  }

  const query = nextParams.toString();
  window.history.replaceState(
    null,
    "",
    query ? `${window.location.pathname}?${query}` : window.location.pathname
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
