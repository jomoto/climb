import {
  DESTINATIONS,
  MONTHS,
  MONTH_LABELS,
  isPrimeMonth,
  isGoodMonth,
  isPrimaryBoulderingDestination,
  monthScore,
  styleMatches,
  rockTypeMatches,
  pitchTypeMatches,
} from "./data.js";

const ALLOWED_STYLES = new Set(["all", "trad", "sport", "boulder", "mixed"]);
const ALLOWED_ROCKS = new Set(["all", "granite", "limestone", "sandstone", "volcanic", "other"]);
const ALLOWED_PITCH = new Set(["all", "single", "multi"]);
const ALL_MONTH_KEY = "all";

const params = new URLSearchParams(window.location.search);
const monthQuery = params.get("month");
const styleQuery = params.get("style");
const rockQuery = params.get("rock");
const pitchQuery = params.get("pitch");
const mapLatQuery = params.get("lat");
const mapLngQuery = params.get("lng");
const mapZoomQuery = params.get("zoom");
const BACK_STATE_STORAGE_KEY = "where2climb:lastMapState";

function toFiniteNumber(value, fallback) {
  if (value === null || value === "") return fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function persistBackState(destinationId, destinationParams, center) {
  const state = {
    id: destinationId,
    month: destinationParams.get("month"),
    style: destinationParams.get("style"),
    rock: destinationParams.get("rock"),
    pitch: destinationParams.get("pitch"),
    lat: toFiniteNumber(center.lat, null),
    lng: toFiniteNumber(center.lng, null),
    zoom: toFiniteNumber(map.getZoom(), null),
    updatedAt: Date.now(),
  };

  try {
    sessionStorage.setItem(BACK_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage failures (e.g., blocked storage mode).
  }
}

const state = {
  month:
    monthQuery === ALL_MONTH_KEY || MONTHS.some((month) => month.key === monthQuery)
      ? monthQuery
      : ALL_MONTH_KEY,
  style: ALLOWED_STYLES.has(styleQuery) ? styleQuery : "all",
  rockType: ALLOWED_ROCKS.has(rockQuery) ? rockQuery : "all",
  pitch: ALLOWED_PITCH.has(pitchQuery) ? pitchQuery : "all",
};

const monthSelect = document.querySelector("#monthSelect");
const styleSelect = document.querySelector("#styleSelect");
const rockSelect = document.querySelector("#rockSelect");
const pitchToggle = document.querySelector("#pitchToggle");
const destinationCount = document.querySelector("#destinationCount");

const map = L.map("map", {
  minZoom: 2,
  worldCopyJump: true,
  zoomControl: true,
}).setView(
  [toFiniteNumber(mapLatQuery, 20), toFiniteNumber(mapLngQuery, 3)],
  toFiniteNumber(mapZoomQuery, 2)
);

L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  maxZoom: 19,
  subdomains: "abcd",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
}).addTo(map);

const markerLayer = L.layerGroup().addTo(map);

const MARKER_COLORS = {
  sport: "#ff8a2a",
  trad: "#4a8dff",
  boulder: "#f5d442",
  mixed: "#a05cff",
};

populateMonthSelect();
wireEvents();
render();

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

  monthSelect.value = state.month;
  styleSelect.value = state.style;
  rockSelect.value = state.rockType;
  syncPitchToggle();
}

function wireEvents() {
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
    const btn = event.target.closest(".pitch-btn");
    if (!btn) return;
    state.pitch = btn.dataset.pitch;
    syncPitchToggle();
    render();
  });
}

function syncPitchToggle() {
  for (const btn of pitchToggle.querySelectorAll(".pitch-btn")) {
    btn.classList.toggle("active", btn.dataset.pitch === state.pitch);
  }
}

function render() {
  const visibleDestinations = getFilteredDestinations();
  renderMap(visibleDestinations);
  renderCount(visibleDestinations.length);
  syncQueryParams();
}

function getFilteredDestinations() {
  return DESTINATIONS.filter((destination) => {
    if (!styleMatches(destination, state.style)) return false;
    if (!rockTypeMatches(destination, state.rockType)) return false;
    if (!pitchTypeMatches(destination, state.pitch)) return false;

    if (state.month === ALL_MONTH_KEY) return true;

    return isPrimeMonth(destination, state.month) || isGoodMonth(destination, state.month);
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
    let color, radius, fillOpacity;

    if (monthSelected) {
      const isPeak = isPrimeMonth(destination, state.month);
      color = isPeak ? "#20d072" : "#f3aa1a";
      radius = isPeak ? 8 : 7;
      fillOpacity = isPeak ? 0.92 : 0.72;
    } else {
      color = markerColor(computeStyle(destination));
      radius = 8;
      fillOpacity = 0.92;
    }

    const marker = L.circleMarker([destination.lat, destination.lng], {
      radius,
      color,
      fillColor: color,
      fillOpacity,
      opacity: 1,
      weight: 2,
    });

    marker.bindTooltip(destination.name, {
      direction: "top",
      offset: [0, -9],
      opacity: 0.95,
      className: "destination-tooltip",
    });

    marker.on("click", () => {
      const destinationParams = new URLSearchParams();
      destinationParams.set("id", destination.id);
      destinationParams.set("month", state.month);
      destinationParams.set("style", state.style);
      destinationParams.set("rock", state.rockType);
      destinationParams.set("pitch", state.pitch);
      const center = map.getCenter();
      destinationParams.set("lat", center.lat);
      destinationParams.set("lng", center.lng);
      destinationParams.set("zoom", map.getZoom());
      persistBackState(destination.id, destinationParams, center);
      window.location.href = `./destination.html?${destinationParams.toString()}`;
    });

    marker.addTo(markerLayer);
  }
}

function renderCount(count) {
  destinationCount.textContent = `${count} destinations`;
}

function markerColor(style) {
  return MARKER_COLORS[style] || MARKER_COLORS.mixed;
}

function computeStyle(destination) {
  const rc = destination.routeCounts || {};
  const total = Object.values(rc).reduce((sum, value) => sum + (Number(value) || 0), 0);

  if (isPrimaryBoulderingDestination(destination)) return "boulder";

  if (total > 0) {
    const boulderPct = (Number(rc.boulder) || 0) / total;
    const tradPct = (Number(rc.trad) || 0) / total;
    const sportPct = (Number(rc.sport) || 0) / total;

    if (boulderPct > 0.7) return "boulder";
    if (tradPct > 0.9) return "trad";
    if (sportPct > 0.9) return "sport";
  }

  if (destination.predominantStyle) {
    if (["sport", "trad", "boulder"].includes(destination.predominantStyle)) {
      return destination.predominantStyle;
    }
  }

  if (Array.isArray(destination.styles) && destination.styles.length > 0) {
    return destination.styles[0];
  }

  return "mixed";
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
      <span><i class="dot dot-mixed"></i> Sport & Trad</span>
    `;
  }
}

function syncQueryParams() {
  const nextParams = new URLSearchParams();
  if (state.month !== ALL_MONTH_KEY) nextParams.set("month", state.month);
  if (state.style !== "all") nextParams.set("style", state.style);
  if (state.rockType !== "all") nextParams.set("rock", state.rockType);
  if (state.pitch !== "all") nextParams.set("pitch", state.pitch);
  const qs = nextParams.toString();
  window.history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
}
