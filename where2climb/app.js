import {
  DESTINATIONS,
  MONTHS,
  MONTH_LABELS,
  isPrimeMonth,
  isGoodMonth,
  monthScore,
  computeStyle,
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
}).setView([20, 3], 2);

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
      const monthForLink =
        state.month === ALL_MONTH_KEY
          ? destination.primeMonths[0]
          : state.month;
      window.location.href = `./destination.html?id=${encodeURIComponent(
        destination.id
      )}&month=${encodeURIComponent(monthForLink)}&style=${encodeURIComponent(state.style)}`;
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
  nextParams.set("month", state.month);
  nextParams.set("style", state.style);
  nextParams.set("rock", state.rockType);
  nextParams.set("pitch", state.pitch);
  window.history.replaceState(null, "", `${window.location.pathname}?${nextParams.toString()}`);
}
