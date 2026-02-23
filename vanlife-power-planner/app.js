const DEVICE_LIBRARY = [
  {
    id: "fridge",
    name: "12V Fridge",
    watts: 45,
    dutyFactor: 0.38,
    note: "Compressor cycling phase.",
    fixedDailyHours: 24,
    maxHours: 24,
    step: 0.5,
    defaultOn: true,
    defaultHours: 24
  },
  {
    id: "lights",
    name: "Cabin Lights",
    watts: 12,
    dutyFactor: 1,
    note: "Switch LED or halogen and set daily runtime.",
    maxHours: 12,
    step: 0.5,
    defaultOn: true,
    defaultHours: 4,
    supportsLightType: true
  },
  {
    id: "induction",
    name: "Induction Cooktop",
    watts: 1300,
    dutyFactor: 1,
    note: "Short bursts add up quickly.",
    maxHours: 2,
    step: 0.1,
    defaultOn: false,
    defaultHours: 0.4
  },
  {
    id: "starlink",
    name: "Starlink",
    watts: 65,
    dutyFactor: 1,
    note: "Router + dish average draw.",
    maxHours: 24,
    step: 0.5,
    defaultOn: false,
    defaultHours: 3
  },
  {
    id: "ac",
    name: "A/C",
    watts: 950,
    dutyFactor: 0.5,
    note: "Rooftop or mini-split. 50% duty cycle models compressor cycling.",
    maxHours: 12,
    step: 0.25,
    defaultOn: false,
    defaultHours: 1
  },
  {
    id: "fan",
    name: "Vent Fan",
    watts: 28,
    dutyFactor: 1,
    note: "Roof fan medium speed.",
    maxHours: 24,
    step: 0.5,
    defaultOn: true,
    defaultHours: 6
  },
  {
    id: "phones",
    name: "Phones & USB",
    watts: 20,
    dutyFactor: 1,
    note: "Two phones plus small USB gadgets.",
    maxHours: 10,
    step: 0.5,
    defaultOn: true,
    defaultHours: 2
  },
  {
    id: "laptop",
    name: "Laptop",
    watts: 70,
    dutyFactor: 1,
    note: "Charging and direct use.",
    maxHours: 16,
    step: 0.5,
    defaultOn: true,
    defaultHours: 3
  },
  {
    id: "heaterFan",
    name: "Diesel Heater Fan",
    watts: 35,
    dutyFactor: 1,
    note: "Fan and control board draw.",
    maxHours: 14,
    step: 0.5,
    defaultOn: false,
    defaultHours: 6
  }
];

const CHEMISTRY = {
  lifepo4: { dod: 0.9 },
  agm: { dod: 0.5 },
  nmc: { dod: 0.85 }
};

const DEFAULT_ASSUMPTIONS = {
  temperatureBaselineF: 35,
  panelSystemEfficiencyPct: 75,
  alternatorEfficiencyPct: 88,
  inverterEfficiencyPct: 92,
  inverterIdleWatts: 8,
  baseSunHours: 4.8,
  pvWattsApiKey: "DEMO_KEY",
  ledWatts: 12,
  halogenWatts: 40,
  fridgeDutyFactor: 0.26,
  fridgeReferenceAmbientF: 77,
  fridgeClimateLookbackYears: 10,
  fridgeDayWeight: 0.62,
  fridgeWarmSlope: 0.02,
  fridgeCoolSlope: 0.012,
  exposureMultipliers: {
    full: 1,
    partial: 0.72,
    minimal: 0.48
  }
};

const MONTH_OPTIONS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" }
];

const DEFAULT_COMPONENT_TIERS = {
  batteryAh: [100, 200, 300, 400, 560, 600, 800, 1000, 1200, 1400, 1600, 1800],
  solarWatts: [100, 200, 300, 400, 500, 600, 700, 800, 1000, 1200, 1400, 1600, 1800],
  solarChargerAmps: [20, 30, 40, 50, 60, 80, 100, 120, 150],
  alternatorWatts: [300, 500, 700, 900, 1200, 1500, 1800, 2200, 2600, 3000],
  shoreAmps: [20, 30, 40, 50, 60, 80, 100, 120],
  inverterWatts: [600, 1000, 1200, 1500, 2000, 2500, 3000, 4000]
};
const THEME_STORAGE_KEY = "vanlife-power-theme";

const PRESETS = {
  weekender: {
    loads: {
      fridge: { enabled: true },
      lights: { enabled: true, hours: 4, lightType: "led" },
      fan: { enabled: true, hours: 6 },
      phones: { enabled: true, hours: 2 },
      laptop: { enabled: true, hours: 3 },
      heaterFan: { enabled: false, hours: 3 },
      starlink: { enabled: false, hours: 1 },
      ac: { enabled: false, hours: 1 },
      induction: { enabled: false, hours: 0.2 }
    },
    solar: {
      enabled: true,
      watts: 300,
      efficiencyPct: 75,
      exposure: "full"
    },
    solarPrecision: {
      enabled: false,
      month: 7,
      lat: 39.7392,
      lon: -104.9903,
      hasPinned: false
    },
    fridgeAverageTempF: 77,
    fridgePrecision: {
      enabled: false,
      month: 7,
      lat: 39.7392,
      lon: -104.9903,
      elevationFt: 5200,
      hasPinned: false
    },
    alternator: {
      enabled: true,
      powerWatts: 700,
      driveHoursDay: 0.8
    },
    autonomyDays: 2,
    chemistry: "lifepo4",
    voltage: 12,
    installedAh: 400
  },
  remote: {
    loads: {
      fridge: { enabled: true },
      lights: { enabled: true, hours: 5, lightType: "led" },
      fan: { enabled: true, hours: 8 },
      phones: { enabled: true, hours: 3 },
      laptop: { enabled: true, hours: 8 },
      heaterFan: { enabled: true, hours: 4 },
      starlink: { enabled: true, hours: 8 },
      ac: { enabled: false, hours: 1.5 },
      induction: { enabled: true, hours: 0.5 }
    },
    solar: {
      enabled: true,
      watts: 600,
      efficiencyPct: 76,
      exposure: "partial"
    },
    solarPrecision: {
      enabled: false,
      month: 7,
      lat: 36.1699,
      lon: -115.1398,
      hasPinned: false
    },
    fridgeAverageTempF: 85,
    fridgePrecision: {
      enabled: false,
      month: 7,
      lat: 36.1699,
      lon: -115.1398,
      elevationFt: 2200,
      hasPinned: false
    },
    alternator: {
      enabled: true,
      powerWatts: 900,
      driveHoursDay: 0.6
    },
    autonomyDays: 3,
    chemistry: "lifepo4",
    voltage: 12,
    installedAh: 620
  },
  fulltime: {
    loads: {
      fridge: { enabled: true },
      lights: { enabled: true, hours: 6, lightType: "led" },
      fan: { enabled: true, hours: 10 },
      phones: { enabled: true, hours: 3 },
      laptop: { enabled: true, hours: 6 },
      heaterFan: { enabled: true, hours: 8 },
      starlink: { enabled: true, hours: 5 },
      ac: { enabled: false, hours: 2 },
      induction: { enabled: true, hours: 0.7 }
    },
    solar: {
      enabled: true,
      watts: 800,
      efficiencyPct: 74,
      exposure: "partial"
    },
    solarPrecision: {
      enabled: false,
      month: 8,
      lat: 44.9778,
      lon: -93.265,
      hasPinned: false
    },
    fridgeAverageTempF: 80,
    fridgePrecision: {
      enabled: false,
      month: 8,
      lat: 44.9778,
      lon: -93.265,
      elevationFt: 830,
      hasPinned: false
    },
    alternator: {
      enabled: true,
      powerWatts: 1200,
      driveHoursDay: 1
    },
    autonomyDays: 4,
    chemistry: "lifepo4",
    voltage: 12,
    installedAh: 860
  }
};

const AC_LOAD_IDS = new Set(["starlink", "laptop", "induction", "ac"]);
const COMPONENT_KEYS = [
  "batteryAh",
  "solarWatts",
  "solarChargerAmps",
  "alternatorWatts",
  "shoreAmps",
  "inverterWatts"
];

const MANUAL_SELECT_CONFIG = [
  {
    key: "batteryAh",
    selectId: "manualBatteryAh",
    tierKey: "batteryAh",
    unit: "Ah",
    includeZero: false
  },
  {
    key: "solarWatts",
    selectId: "manualSolarWatts",
    tierKey: "solarWatts",
    unit: "W",
    includeZero: true
  },
  {
    key: "solarChargerAmps",
    selectId: "manualSolarChargerAmps",
    tierKey: "solarChargerAmps",
    unit: "A MPPT",
    includeZero: true
  },
  {
    key: "alternatorWatts",
    selectId: "manualAlternatorWatts",
    tierKey: "alternatorWatts",
    unit: "W DC-DC",
    includeZero: true
  },
  {
    key: "shoreAmps",
    selectId: "manualShoreAmps",
    tierKey: "shoreAmps",
    unit: "A",
    includeZero: true
  },
  {
    key: "inverterWatts",
    selectId: "manualInverterWatts",
    tierKey: "inverterWatts",
    unit: "W pure sine",
    includeZero: true
  }
];

function cloneValue(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

const state = {
  loads: {},
  solar: {
    enabled: true,
    watts: 300,
    efficiencyPct: 75,
    exposure: "full"
  },
  solarPrecision: {
    enabled: false,
    month: 7,
    lat: 39.7392,
    lon: -104.9903,
    hasPinned: false,
    status: "idle",
    monthlySunHours: null,
    error: "",
    lastFetchedKey: ""
  },
  fridgeAverageTempF: 77,
  fridgeTempUnit: "f",
  fridgePrecision: {
    enabled: false,
    month: 7,
    lat: 39.7392,
    lon: -104.9903,
    elevationFt: 5200,
    hasPinned: false
  },
  alternator: {
    enabled: true,
    powerWatts: 700,
    driveHoursDay: 1
  },
  autonomyDays: 2,
  chemistry: "lifepo4",
  voltage: 12,
  installedAh: 400,
  assumptions: cloneValue(DEFAULT_ASSUMPTIONS),
  componentTiers: cloneValue(DEFAULT_COMPONENT_TIERS),
  componentMode: "auto",
  manualComponents: {
    batteryAh: "auto",
    solarWatts: "auto",
    solarChargerAmps: "auto",
    alternatorWatts: "auto",
    shoreAmps: "auto",
    inverterWatts: "auto"
  },
  activePreset: "weekender"
};

const loadUiMap = new Map();
const uiSetters = {};
const manualSelectSetters = {};
let setSolarToggleUi = () => {};
let setAlternatorToggleUi = () => {};
let setExposureUi = () => {};
let setComponentModeUi = () => {};
let lastResults = null;
let precisionMap = null;
let precisionMarker = null;
let loadGridLayoutFrame = null;
let activeMapContext = "fridge";
let solarRequestNonce = 0;
let fridgeElevationStatus = "idle";
let fridgeElevationError = "";
let fridgeElevationRequestNonce = 0;
let fridgeClimateStatus = "idle";
let fridgeClimateError = "";
let fridgeClimateNightTempF = null;
let fridgeClimateYearsRange = "";
let fridgeClimateRequestNonce = 0;
let fridgeClimateDebounceTimer = null;
let fridgeClimateLastRequestAt = 0;
const fridgeClimateCache = new Map();

function byId(id) {
  return document.getElementById(id);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function safeLocalStorageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (_) {
    return null;
  }
}

function safeLocalStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (_) {
    // Ignore storage restrictions (private mode, blocked storage, etc).
  }
}

function resolveInitialTheme() {
  const stored = safeLocalStorageGet(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  const prefersDark =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  return prefersDark ? "dark" : "light";
}

function applyTheme(theme) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.body.dataset.theme = nextTheme;

  const toggle = byId("themeToggle");
  if (toggle) {
    const isDark = nextTheme === "dark";
    toggle.textContent = isDark ? "Light Mode" : "Dark Mode";
    toggle.setAttribute("aria-pressed", String(isDark));
  }
}

function roundToStep(value, step) {
  return Math.round(value / step) * step;
}

function pickTier(value, tiers) {
  if (value <= 0) {
    return 0;
  }

  for (const tier of tiers) {
    if (value <= tier) {
      return tier;
    }
  }

  return tiers[tiers.length - 1] || value;
}

function toPositiveNumber(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function formatEnergy(wh) {
  if (Math.abs(wh) >= 1000) {
    return `${(wh / 1000).toFixed(2)} kWh`;
  }

  return `${Math.round(wh)} Wh`;
}

function formatAh(ah) {
  const rounded = Math.max(0, roundToStep(ah, 10));
  return `${rounded.toFixed(0)} Ah`;
}

function formatDays(days) {
  if (!Number.isFinite(days)) {
    return "Continuous";
  }

  if (days >= 30) {
    return `${days.toFixed(0)}+ days`;
  }

  if (days < 1) {
    return `${(days * 24).toFixed(1)} hr`;
  }

  return `${days.toFixed(1)} days`;
}

function energyPersona(wh) {
  if (wh <= 0) {
    return "Select your appliances to estimate realistic daily energy use.";
  }

  if (wh < 900) {
    return "Light draw profile. Great for short trips and simple setups.";
  }

  if (wh < 1800) {
    return "Balanced profile. Typical for part-time vanlife with remote work.";
  }

  if (wh < 3200) {
    return "High-demand profile. Prioritize robust charging and storage.";
  }

  return "Heavy power profile. Plan for a serious battery and charging system.";
}

function monthLabel(monthValue) {
  const month = MONTH_OPTIONS.find((entry) => entry.value === Number(monthValue));
  return month ? month.label : "Unknown";
}

function getDeviceWatts(device, loadConfig) {
  if (loadConfig.customWatts !== null && loadConfig.customWatts !== undefined) {
    return loadConfig.customWatts;
  }

  if (device.id === "lights") {
    return loadConfig.lightType === "halogen"
      ? state.assumptions.halogenWatts
      : state.assumptions.ledWatts;
  }

  return device.watts;
}

function getDeviceDutyFactor(device) {
  if (device.id === "fridge") {
    return state.assumptions.fridgeDutyFactor;
  }

  return device.dutyFactor;
}

function batteryTempDeratingFactor(tempF, chemistry) {
  // Batteries lose capacity in cold weather. LiFePO4 is most affected;
  // AGM/lead-acid derates somewhat; NMC derates moderately.
  // Returns a multiplier (0.0 - 1.0) on usable capacity.
  // At 77F+: no derating. Below 32F: significant derating.
  const tempC = ((tempF - 32) * 5) / 9;
  if (tempC >= 25) return 1.0;

  if (chemistry === "lifepo4") {
    // LiFePO4 loses ~20% at 0C, ~40% at -10C, cannot charge below 0C
    if (tempC <= -20) return 0.45;
    if (tempC <= 0) return clamp(0.6 + (tempC / 20) * 0.15, 0.45, 0.8);
    return clamp(0.8 + ((tempC) / 25) * 0.2, 0.6, 1.0);
  }

  if (chemistry === "agm") {
    // AGM/lead-acid: slower but still impacted
    if (tempC <= -20) return 0.5;
    if (tempC <= 0) return clamp(0.65 + (tempC / 20) * 0.15, 0.5, 0.85);
    return clamp(0.85 + ((tempC) / 25) * 0.15, 0.65, 1.0);
  }

  // NMC lithium: moderate cold sensitivity
  if (tempC <= -20) return 0.5;
  if (tempC <= 0) return clamp(0.65 + (tempC / 20) * 0.15, 0.5, 0.85);
  return clamp(0.85 + ((tempC) / 25) * 0.15, 0.65, 1.0);
}

function fahrenheitToCelsius(tempF) {
  return ((tempF - 32) * 5) / 9;
}

function celsiusToFahrenheit(tempC) {
  return (tempC * 9) / 5 + 32;
}

function getFridgeTempSliderBounds() {
  if (state.fridgeTempUnit === "c") {
    return { min: -23, max: 43, step: 1 };
  }

  return { min: -10, max: 110, step: 1 };
}

function getFridgeTempSliderValue(tempF) {
  if (state.fridgeTempUnit === "c") {
    return roundToStep(fahrenheitToCelsius(tempF), 1);
  }

  return roundToStep(tempF, 1);
}

function parseFridgeTempSliderValue(value) {
  const numeric = Number(value);
  if (state.fridgeTempUnit === "c") {
    return clamp(celsiusToFahrenheit(numeric), -10, 110);
  }

  return clamp(numeric, -10, 110);
}

function formatFridgeTemperature(tempF) {
  if (state.fridgeTempUnit === "c") {
    return `${fahrenheitToCelsius(tempF).toFixed(0)}\u00B0C`;
  }

  return `${tempF.toFixed(0)}\u00B0F`;
}

function inferNightTemperature(dayTempF) {
  // Hotter days typically cool less overnight in vans/parking areas.
  const swing = clamp(10 + (dayTempF - 60) * 0.12, 6, 24);
  return clamp(dayTempF - swing, -20, 95);
}

function fridgeDutyAtTemp(tempF) {
  const referenceAmbientF = state.assumptions.fridgeReferenceAmbientF;
  const baseDuty = state.assumptions.fridgeDutyFactor;
  const deltaF = tempF - referenceAmbientF;
  const warmSlope = state.assumptions.fridgeWarmSlope;
  const coolSlope = state.assumptions.fridgeCoolSlope;

  if (deltaF <= 0) {
    // Below reference: linear decrease in duty
    return clamp(baseDuty * (1 + deltaF * coolSlope), 0.08, 0.95);
  }

  // Above reference: quadratic increase — compressors run disproportionately
  // harder as ambient rises well above the reference point.
  const linearPart = deltaF * warmSlope;
  const quadraticPart = (deltaF * deltaF) * warmSlope * 0.015;
  return clamp(baseDuty * (1 + linearPart + quadraticPart), 0.08, 0.95);
}

function estimateDaytimeTemperatureFromPrecision() {
  const precision = state.fridgePrecision;
  const month = Number(precision.month);
  const lat = Number(precision.lat);
  const elevationFt = Number(precision.elevationFt);
  const monthAngle = ((month - 1) / 12) * Math.PI * 2;
  const seasonalPeak = lat >= 0 ? ((7 - 1) / 12) * Math.PI * 2 : 0;
  const latAbs = Math.abs(lat);

  const annualMean = 82 - latAbs * 0.88 - (elevationFt / 1000) * 3.6;
  const seasonalAmplitude = clamp(8 + latAbs * 0.48, 8, 35);
  const seasonalOffset = seasonalAmplitude * Math.cos(monthAngle - seasonalPeak);
  const daytimeBoost = clamp(5 + (90 - latAbs) * 0.03, 3.5, 8.5);

  return clamp(annualMean + seasonalOffset + daytimeBoost, -10, 118);
}

function applyPrecisionTemperatureEstimate() {
  if (!state.fridgePrecision.enabled || !state.fridgePrecision.hasPinned) {
    return false;
  }

  const estimated = estimateDaytimeTemperatureFromPrecision();
  state.fridgeAverageTempF = estimated;
  return true;
}

function mapSelectionSummary(context = "fridge") {
  const precision = context === "solar" ? state.solarPrecision : state.fridgePrecision;
  if (!precision.hasPinned) {
    return "No map point selected yet.";
  }

  if (context === "solar") {
    return `Pinned: ${precision.lat.toFixed(4)}, ${precision.lon.toFixed(4)}`;
  }

  if (fridgeElevationStatus === "loading") {
    return "Pinned: estimating elevation...";
  }

  if (fridgeElevationStatus === "error") {
    return `Pinned: at ${Math.round(precision.elevationFt).toLocaleString()} ft (elevation lookup unavailable)`;
  }

  return `Pinned: at ${Math.round(precision.elevationFt).toLocaleString()} ft`;
}

function resetFridgeClimateState() {
  cancelFridgeClimateResolve();
  fridgeClimateStatus = "idle";
  fridgeClimateError = "";
  fridgeClimateNightTempF = null;
  fridgeClimateYearsRange = "";
}

function cancelFridgeClimateResolve() {
  if (fridgeClimateDebounceTimer !== null) {
    window.clearTimeout(fridgeClimateDebounceTimer);
    fridgeClimateDebounceTimer = null;
  }
}

function scheduleFridgeClimateResolve(delayMs = 450) {
  cancelFridgeClimateResolve();
  fridgeClimateDebounceTimer = window.setTimeout(() => {
    fridgeClimateDebounceTimer = null;
    resolveFridgeClimateFromPrecision();
  }, delayMs);
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function buildFridgeClimateCacheKey(lat, lon, month, startYear, endYear) {
  const monthNumber = clamp(Number(month), 1, 12);
  return `${lat.toFixed(3)},${lon.toFixed(3)}|m${monthNumber}|${startYear}-${endYear}`;
}

function parseFridgeClimatePayload(payload, month, startYear, endYear) {
  const daily = payload?.daily;
  const dates = Array.isArray(daily?.time) ? daily.time : [];
  const highs = Array.isArray(daily?.temperature_2m_max) ? daily.temperature_2m_max : [];
  const lows = Array.isArray(daily?.temperature_2m_min) ? daily.temperature_2m_min : [];

  if (dates.length === 0 || dates.length !== highs.length || highs.length !== lows.length) {
    throw new Error("Climate data format was invalid.");
  }

  const selectedMonth = clamp(Number(month), 1, 12);
  let highTotal = 0;
  let lowTotal = 0;
  let count = 0;

  for (let i = 0; i < dates.length; i += 1) {
    const monthFromDate = Number(String(dates[i]).slice(5, 7));
    if (monthFromDate !== selectedMonth) {
      continue;
    }

    const high = Number(highs[i]);
    const low = Number(lows[i]);
    if (!Number.isFinite(high) || !Number.isFinite(low)) {
      continue;
    }

    highTotal += high;
    lowTotal += low;
    count += 1;
  }

  if (count < 10) {
    throw new Error("Not enough monthly climate samples.");
  }

  return {
    dayTempF: highTotal / count,
    nightTempF: lowTotal / count,
    startYear,
    endYear,
    sampleCount: count
  };
}

async function fetchFridgeMonthlyClimateAverages(lat, lon, month) {
  const lookbackYears = clamp(
    Math.round(toPositiveNumber(state.assumptions.fridgeClimateLookbackYears, 10)),
    3,
    30
  );
  const currentYear = new Date().getUTCFullYear();
  const endYear = Math.max(2000, currentYear - 1);
  const startYear = endYear - lookbackYears + 1;
  const baseUrl = "https://archive-api.open-meteo.com/v1/archive";

  const requestParams = {
    latitude: lat.toFixed(6),
    longitude: lon.toFixed(6),
    start_date: `${startYear}-01-01`,
    end_date: `${endYear}-12-31`,
    daily: "temperature_2m_max,temperature_2m_min",
    temperature_unit: "fahrenheit",
    timezone: "auto"
  };

  const cacheKey = buildFridgeClimateCacheKey(lat, lon, month, startYear, endYear);
  const cached = fridgeClimateCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const minIntervalMs = 1100;
  const elapsed = Date.now() - fridgeClimateLastRequestAt;
  if (elapsed < minIntervalMs) {
    await sleep(minIntervalMs - elapsed);
  }

  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const params = new URLSearchParams({
      ...requestParams,
      ...(attempt === 0 ? { models: "era5" } : {})
    });

    fridgeClimateLastRequestAt = Date.now();
    const response = await fetch(`${baseUrl}?${params.toString()}`);
    if (response.ok) {
      const payload = await response.json();
      const parsed = parseFridgeClimatePayload(payload, month, startYear, endYear);
      fridgeClimateCache.set(cacheKey, parsed);
      return parsed;
    }

    lastStatus = response.status;
    if (lastStatus === 429) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const waitMs =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : 1200 * Math.pow(2, attempt);
      await sleep(waitMs + Math.random() * 250);
      continue;
    }
  }

  if (lastStatus === 429) {
    throw new Error("Rate limited by climate API (429). Try again in about 30 seconds.");
  }

  throw new Error(`HTTP ${lastStatus || "request-failed"}`);
}

async function resolveFridgeClimateFromPrecision() {
  cancelFridgeClimateResolve();

  if (!state.fridgePrecision.enabled || !state.fridgePrecision.hasPinned) {
    resetFridgeClimateState();
    updateLoadCard("fridge");
    return false;
  }

  const requestId = ++fridgeClimateRequestNonce;
  fridgeClimateStatus = "loading";
  fridgeClimateError = "";
  fridgeClimateNightTempF = null;
  fridgeClimateYearsRange = "";
  updateLoadCard("fridge");
  calculate();

  try {
    const climate = await fetchFridgeMonthlyClimateAverages(
      state.fridgePrecision.lat,
      state.fridgePrecision.lon,
      state.fridgePrecision.month
    );
    if (requestId !== fridgeClimateRequestNonce) {
      return false;
    }

    state.fridgeAverageTempF = clamp(climate.dayTempF, -10, 118);
    fridgeClimateNightTempF = clamp(climate.nightTempF, -20, 105);
    fridgeClimateYearsRange = `${climate.startYear}-${climate.endYear}`;
    fridgeClimateStatus = "ready";
    fridgeClimateError = "";
  } catch (error) {
    if (requestId !== fridgeClimateRequestNonce) {
      return false;
    }

    fridgeClimateStatus = "error";
    fridgeClimateError = error instanceof Error ? error.message : "Climate lookup failed.";
    fridgeClimateNightTempF = null;
    fridgeClimateYearsRange = "";
    applyPrecisionTemperatureEstimate();
  }

  updateLoadCard("fridge");
  calculate();
  return fridgeClimateStatus === "ready";
}

async function fetchElevationFeet(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat.toFixed(6),
    longitude: lon.toFixed(6)
  });
  const response = await fetch(`https://api.open-meteo.com/v1/elevation?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = await response.json();
  let elevationMeters = null;
  if (Array.isArray(payload?.elevation)) {
    elevationMeters = Number(payload.elevation[0]);
  } else if (payload && payload.elevation !== undefined) {
    elevationMeters = Number(payload.elevation);
  }

  if (!Number.isFinite(elevationMeters)) {
    throw new Error("No elevation returned.");
  }

  return elevationMeters * 3.28084;
}

async function resolveFridgeElevationFromPin(lat, lon) {
  const requestId = ++fridgeElevationRequestNonce;
  fridgeElevationStatus = "loading";
  fridgeElevationError = "";
  updateLoadCard("fridge");
  updateMapSelectionLabel();

  try {
    const elevationFt = await fetchElevationFeet(lat, lon);
    if (requestId !== fridgeElevationRequestNonce) {
      return;
    }
    state.fridgePrecision.elevationFt = clamp(elevationFt, 0, 20000);
    fridgeElevationStatus = "ready";
    fridgeElevationError = "";
  } catch (error) {
    if (requestId !== fridgeElevationRequestNonce) {
      return;
    }
    fridgeElevationStatus = "error";
    fridgeElevationError = error instanceof Error ? error.message : "Lookup failed.";
  }

  if (fridgeClimateStatus !== "ready") {
    applyPrecisionTemperatureEstimate();
  }
  updateLoadCard("fridge");
  updateMapSelectionLabel();
  calculate();
}

function alternatorEffectiveWh(powerWatts, driveHours, efficiencyFactor) {
  // DC-DC chargers deliver full bulk power for roughly the first hour,
  // then taper into absorption/float as the battery fills. Model this
  // as full output for the first bulkHours, then declining to ~60% for
  // the remainder. This prevents long-drive estimates from being
  // unrealistically optimistic.
  const bulkHours = 1.0;
  if (driveHours <= bulkHours) {
    return powerWatts * driveHours * efficiencyFactor;
  }
  const bulkWh = powerWatts * bulkHours * efficiencyFactor;
  const taperHours = driveHours - bulkHours;
  const taperFactor = 0.6;
  const taperWh = powerWatts * taperHours * efficiencyFactor * taperFactor;
  return bulkWh + taperWh;
}

function getSolarSunHoursModel() {
  const exposure = state.assumptions.exposureMultipliers[state.solar.exposure] || 1;
  const manualBase = state.assumptions.baseSunHours || 4.8;
  const precision = state.solarPrecision;
  let baseHours = manualBase;
  let usingPvWatts = false;
  let source = `Manual assumption (${manualBase.toFixed(1)} sun-hr/day baseline).`;

  if (precision.enabled && precision.hasPinned && Array.isArray(precision.monthlySunHours)) {
    const month = clamp(Number(precision.month), 1, 12);
    const monthlyValue = Number(precision.monthlySunHours[month - 1]);
    if (Number.isFinite(monthlyValue) && monthlyValue > 0) {
      baseHours = monthlyValue;
      usingPvWatts = true;
      if (exposure < 1) {
        source = `PVWatts ${monthLabel(month)} sun-hours (${baseHours.toFixed(1)} hr) with ${Math.round(exposure * 100)}% shading override applied.`;
      } else {
        source = `PVWatts monthly sun-hours for ${monthLabel(month)} at your pinned location.`;
      }
    }
  }

  return {
    adjustedHours: baseHours * exposure,
    baseHours,
    exposure,
    usingPvWatts,
    source
  };
}

function getPvWattsApiKey() {
  const key = String(state.assumptions.pvWattsApiKey || "").trim();
  return key.length > 0 ? key : "DEMO_KEY";
}

async function fetchPvWattsMonthlySunHours(lat, lon) {
  const params = new URLSearchParams({
    api_key: getPvWattsApiKey(),
    lat: lat.toFixed(6),
    lon: lon.toFixed(6),
    system_capacity: "1",
    module_type: "0",
    losses: "0",
    array_type: "1",
    tilt: "0",
    azimuth: lat >= 0 ? "180" : "0",
    timeframe: "monthly",
    radius: "100"
  });

  const response = await fetch(`https://developer.nrel.gov/api/pvwatts/v8.json?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = await response.json();
  const errors = Array.isArray(payload?.errors) ? payload.errors.filter(Boolean) : [];
  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }

  const values = payload?.outputs?.solrad_monthly;
  if (!Array.isArray(values) || values.length !== 12) {
    throw new Error("No monthly solar data returned.");
  }

  const sanitized = values.map((value) => Number(value));
  if (sanitized.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error("PVWatts data was invalid.");
  }

  return sanitized;
}

function refreshSolarPrecisionUi() {
  const controls = byId("solarPrecisionControls");
  const yes = byId("solarPrecisionYes");
  const no = byId("solarPrecisionNo");
  const monthSelect = byId("solarMonthSelect");
  const pinButton = byId("solarPinLocation");
  const pinSummary = byId("solarPinSummary");
  const status = byId("solarPrecisionStatus");
  if (!controls || !yes || !no || !monthSelect || !pinButton || !pinSummary || !status) {
    return;
  }

  const precision = state.solarPrecision;
  const enabled = Boolean(state.solar.enabled);

  yes.classList.toggle("active", precision.enabled);
  no.classList.toggle("active", !precision.enabled);
  yes.disabled = !enabled;
  no.disabled = !enabled;

  controls.classList.toggle("hidden", !precision.enabled);
  controls.classList.toggle("disabled", !enabled);

  monthSelect.value = String(precision.month);
  monthSelect.disabled = !enabled || !precision.enabled;
  pinButton.disabled = !enabled || !precision.enabled;

  pinSummary.textContent = mapSelectionSummary("solar");

  if (!precision.enabled) {
    status.textContent = "Precision mode off. Using manual base sun-hours.";
    return;
  }

  if (!precision.hasPinned) {
    status.textContent = "Pin a map location to pull monthly sun-hours from PVWatts.";
    return;
  }

  if (precision.status === "loading") {
    status.textContent = "Loading PVWatts monthly sun-hours...";
    return;
  }

  if (precision.status === "error") {
    status.textContent = `PVWatts unavailable (${precision.error}). Using manual baseline.`;
    return;
  }

  status.textContent = `PVWatts ready for ${monthLabel(precision.month)} at this location.`;
}

async function ensureSolarPrecisionData() {
  const precision = state.solarPrecision;
  if (!precision.enabled || !precision.hasPinned) {
    refreshSolarPrecisionUi();
    return;
  }

  const locationKey = `${precision.lat.toFixed(4)},${precision.lon.toFixed(4)}`;
  if (Array.isArray(precision.monthlySunHours) && precision.lastFetchedKey === locationKey) {
    precision.status = "ready";
    precision.error = "";
    refreshSolarPrecisionUi();
    calculate();
    return;
  }

  const requestId = ++solarRequestNonce;
  precision.status = "loading";
  precision.error = "";
  refreshSolarPrecisionUi();

  try {
    const monthlySunHours = await fetchPvWattsMonthlySunHours(precision.lat, precision.lon);
    if (requestId !== solarRequestNonce) {
      return;
    }
    precision.monthlySunHours = monthlySunHours;
    precision.lastFetchedKey = locationKey;
    precision.status = "ready";
    precision.error = "";
  } catch (error) {
    if (requestId !== solarRequestNonce) {
      return;
    }
    precision.status = "error";
    precision.error = error instanceof Error ? error.message : "Request failed.";
    precision.monthlySunHours = null;
    precision.lastFetchedKey = "";
  }

  refreshSolarPrecisionUi();
  calculate();
}

function computeFridgeThermalModel() {
  const dayTempF = state.fridgeAverageTempF;
  const shouldUseClimateNight =
    state.fridgePrecision.enabled &&
    state.fridgePrecision.hasPinned &&
    fridgeClimateStatus === "ready" &&
    Number.isFinite(fridgeClimateNightTempF);
  const nightTempF = shouldUseClimateNight ? fridgeClimateNightTempF : inferNightTemperature(dayTempF);
  const dayDuty = fridgeDutyAtTemp(dayTempF);
  const nightDuty = fridgeDutyAtTemp(nightTempF);
  const dayWeight = state.assumptions.fridgeDayWeight;
  const nightWeight = 1 - dayWeight;
  const dailyDuty = clamp(dayDuty * dayWeight + nightDuty * nightWeight, 0.15, 0.95);
  const fridgeDevice = DEVICE_LIBRARY.find((device) => device.id === "fridge");
  const watts = fridgeDevice ? getDeviceWatts(fridgeDevice, state.loads.fridge) : 45;
  const dailyWh = watts * 24 * dailyDuty;

  return {
    dayTempF,
    nightTempF,
    dayDuty,
    nightDuty,
    dailyDuty,
    dailyWh
  };
}

function initStateFromLibrary() {
  DEVICE_LIBRARY.forEach((device) => {
    state.loads[device.id] = {
      enabled: device.defaultOn,
      hours: device.fixedDailyHours || device.defaultHours,
      lightType: device.supportsLightType ? "led" : null,
      customWatts: null
    };
  });
}

function createLoadCard(device) {
  const card = document.createElement("article");
  card.className = "load-card";
  card.dataset.device = device.id;

  card.innerHTML = `
    <div class="load-title">
      <h3>${device.name}</h3>
      <span class="watt-pill" data-watts>${device.watts}W</span>
      <input class="watt-edit" data-watt-edit type="number" min="1" max="5000" step="1" value="${device.watts}" />
    </div>
    <p class="load-note">
      ${device.note}
      ${
        device.id === "fridge"
          ? " Set the ambient temperature where you'll be parked to model compressor load."
          : ""
      }
    </p>
    <div class="segmented">
      <button type="button" class="seg-btn" data-toggle="yes">Yes</button>
      <button type="button" class="seg-btn" data-toggle="no">No</button>
    </div>
    ${
      device.supportsLightType
        ? `
      <div class="lighting-variant">
        <span>Lighting type</span>
        <div class="segmented">
          <button type="button" class="seg-btn" data-light-type="led">LED</button>
          <button type="button" class="seg-btn" data-light-type="halogen">Halogen</button>
        </div>
      </div>
    `
        : ""
    }
    ${
      device.id === "fridge"
        ? `
      <div class="fridge-temp-control" data-fridge-temp-wrap>
        <div class="fridge-temp-head">
        <label class="field-row" for="fridgeTempInput">
          <span>Average daytime temperature</span>
          <output data-fridge-temp-output>${formatFridgeTemperature(state.fridgeAverageTempF)}</output>
        </label>
          <div class="segmented temp-unit-toggle">
            <button type="button" class="seg-btn" data-temp-unit="f">&deg;F</button>
            <button type="button" class="seg-btn" data-temp-unit="c">&deg;C</button>
          </div>
        </div>
        <input
          id="fridgeTempInput"
          data-fridge-temp
          type="range"
          min="${getFridgeTempSliderBounds().min}"
          max="${getFridgeTempSliderBounds().max}"
          step="${getFridgeTempSliderBounds().step}"
          value="${getFridgeTempSliderValue(state.fridgeAverageTempF)}"
        />
        <p class="fridge-insight">
          Estimated compressor duty:
          <strong data-fridge-duty>${(computeFridgeThermalModel().dailyDuty * 100).toFixed(0)}%</strong>
        </p>
        <p class="fridge-insight">
          Estimated fridge draw:
          <strong data-fridge-draw>${formatEnergy(computeFridgeThermalModel().dailyWh)}/day</strong>
        </p>
        <p class="fridge-insight" data-fridge-source>Manual daytime temperature mode.</p>
        <div class="fridge-precision">
          <div class="fridge-precision-header">
            <span>Want to be precise on likely fridge draw?</span>
            <div class="segmented" data-fridge-precision-toggle>
              <button type="button" class="seg-btn" data-fridge-precision="yes">Yes</button>
              <button type="button" class="seg-btn" data-fridge-precision="no">No</button>
            </div>
          </div>
          <div class="fridge-precision-body hidden" data-fridge-precision-body>
            <label class="select-field" for="fridgeMonthSelect">
              <span>Month</span>
              <select id="fridgeMonthSelect" data-fridge-month>
                ${MONTH_OPTIONS.map((option) => `<option value="${option.value}">${option.label}</option>`).join("")}
              </select>
            </label>
            <p class="fridge-insight" data-fridge-pin-summary>${mapSelectionSummary()}</p>
          </div>
        </div>
      </div>
    `
        : ""
    }
    ${
      device.id !== "fridge"
        ? `
      <input
        data-load-hours
        type="range"
        min="${device.minHours || 0}"
        max="${device.maxHours}"
        step="${device.step}"
        value="${device.defaultHours}"
      />
      <div class="slider-meta">
        <span>Little</span>
        <output>${device.defaultHours.toFixed(1)} hr/day</output>
        <span>A lot</span>
      </div>
    `
        : ""
    }
  `;

  const yesButton = card.querySelector('[data-toggle="yes"]');
  const noButton = card.querySelector('[data-toggle="no"]');
  const slider = card.querySelector('[data-load-hours]');
  const output = card.querySelector(".slider-meta output");
  const wattsPill = card.querySelector('[data-watts]');
  const wattEdit = card.querySelector('[data-watt-edit]');
  const lightButtons = [...card.querySelectorAll('[data-light-type]')];
  const fridgeTempWrap = card.querySelector('[data-fridge-temp-wrap]');
  const fridgeTempSlider = card.querySelector('[data-fridge-temp]');
  const fridgeTempOutput = card.querySelector('[data-fridge-temp-output]');
  const fridgeTempUnitButtons = [...card.querySelectorAll('[data-temp-unit]')];
  const fridgeDuty = card.querySelector('[data-fridge-duty]');
  const fridgeDraw = card.querySelector('[data-fridge-draw]');
  const fridgeSource = card.querySelector('[data-fridge-source]');
  const fridgePrecisionBody = card.querySelector('[data-fridge-precision-body]');
  const fridgePrecisionButtons = [...card.querySelectorAll('[data-fridge-precision]')];
  const fridgeMonthSelect = card.querySelector('[data-fridge-month]');
  const fridgePinSummary = card.querySelector('[data-fridge-pin-summary]');

  yesButton.addEventListener("click", () => {
    state.loads[device.id].enabled = true;
    updateLoadCard(device.id);
    calculate();
  });

  noButton.addEventListener("click", () => {
    state.loads[device.id].enabled = false;
    updateLoadCard(device.id);
    calculate();
  });

  if (wattsPill && wattEdit) {
    wattsPill.addEventListener("click", () => {
      wattsPill.classList.add("hidden");
      wattEdit.classList.add("visible");
      wattEdit.focus();
      wattEdit.select();
    });

    const commitWattEdit = () => {
      const raw = parseInt(wattEdit.value, 10);
      if (Number.isFinite(raw) && raw > 0 && raw <= 5000) {
        const defaultWatts = device.id === "lights"
          ? (state.loads[device.id].lightType === "halogen" ? state.assumptions.halogenWatts : state.assumptions.ledWatts)
          : device.watts;
        state.loads[device.id].customWatts = raw === defaultWatts ? null : raw;
      } else {
        state.loads[device.id].customWatts = null;
      }
      wattEdit.classList.remove("visible");
      wattsPill.classList.remove("hidden");
      updateLoadCard(device.id);
      calculate();
    };

    wattEdit.addEventListener("blur", commitWattEdit);
    wattEdit.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        wattEdit.blur();
      }
      if (e.key === "Escape") {
        const watts = getDeviceWatts(device, state.loads[device.id]);
        wattEdit.value = String(Math.round(watts));
        state.loads[device.id].customWatts = null;
        wattEdit.classList.remove("visible");
        wattsPill.classList.remove("hidden");
        updateLoadCard(device.id);
        calculate();
      }
    });
  }

  if (slider) {
    slider.addEventListener("input", () => {
      state.loads[device.id].hours = parseFloat(slider.value);
      if (output) {
        output.textContent = `${state.loads[device.id].hours.toFixed(1)} hr/day`;
      }
      calculate();
    });
  }

  if (lightButtons.length > 0) {
    lightButtons.forEach((button) => {
      button.addEventListener("click", () => {
        state.loads[device.id].lightType = button.dataset.lightType;
        updateLoadCard(device.id);
        calculate();
      });
    });
  }

  if (fridgeTempSlider) {
    fridgeTempSlider.addEventListener("input", () => {
      state.fridgeAverageTempF = parseFridgeTempSliderValue(fridgeTempSlider.value);
      updateLoadCard("fridge");
      calculate();
    });
  }

  if (fridgeTempUnitButtons.length > 0) {
    fridgeTempUnitButtons.forEach((button) => {
      button.addEventListener("click", () => {
        state.fridgeTempUnit = button.dataset.tempUnit === "c" ? "c" : "f";
        updateLoadCard("fridge");
      });
    });
  }

  if (fridgePrecisionButtons.length > 0) {
    fridgePrecisionButtons.forEach((button) => {
      button.addEventListener("click", () => {
        state.fridgePrecision.enabled = button.dataset.fridgePrecision === "yes";
        if (state.fridgePrecision.enabled) {
          fridgeElevationStatus = "idle";
          fridgeElevationError = "";
          resetFridgeClimateState();
          if (state.fridgePrecision.hasPinned) {
            applyPrecisionTemperatureEstimate();
            scheduleFridgeClimateResolve(120);
          }
          openMapModal();
        } else {
          fridgeElevationStatus = "idle";
          fridgeElevationError = "";
          cancelFridgeClimateResolve();
          resetFridgeClimateState();
          closeMapModal();
        }
        updateLoadCard("fridge");
        calculate();
      });
    });
  }

  if (fridgeMonthSelect) {
    fridgeMonthSelect.addEventListener("change", () => {
      state.fridgePrecision.month = Number(fridgeMonthSelect.value);
      if (state.fridgePrecision.enabled && state.fridgePrecision.hasPinned) {
        applyPrecisionTemperatureEstimate();
        scheduleFridgeClimateResolve(120);
      } else {
        cancelFridgeClimateResolve();
        resetFridgeClimateState();
      }
      updateLoadCard("fridge");
      calculate();
    });
  }

  loadUiMap.set(device.id, {
    card,
    yesButton,
    noButton,
    slider,
    output,
    wattsPill,
    wattEdit,
    lightButtons,
    fridgeTempWrap,
    fridgeTempSlider,
    fridgeTempOutput,
    fridgeTempUnitButtons,
    fridgeDuty,
    fridgeDraw,
    fridgeSource,
    fridgePrecisionBody,
    fridgePrecisionButtons,
    fridgeMonthSelect,
    fridgePinSummary
  });

  updateLoadCard(device.id);
  return card;
}

function updateLoadCard(deviceId) {
  const ui = loadUiMap.get(deviceId);
  const device = DEVICE_LIBRARY.find((entry) => entry.id === deviceId);
  if (!ui || !device) {
    return;
  }

  const config = state.loads[deviceId];
  const watts = getDeviceWatts(device, config);
  const fridgeModel = deviceId === "fridge" ? computeFridgeThermalModel() : null;

  ui.card.classList.toggle("disabled", !config.enabled);
  ui.yesButton.classList.toggle("active", config.enabled);
  ui.noButton.classList.toggle("active", !config.enabled);
  if (ui.slider) {
    ui.slider.disabled = !config.enabled;
  }
  if (ui.output) {
    ui.output.textContent = `${config.hours.toFixed(1)} hr/day`;
  }
  const isCustom = config.customWatts !== null && config.customWatts !== undefined;
  ui.wattsPill.textContent = `${Math.round(watts)}W`;
  ui.wattsPill.classList.toggle("custom", isCustom);
  ui.wattsPill.title = isCustom ? "Custom wattage (click to edit, Esc to reset)" : "Click to customize wattage";
  if (ui.wattEdit) {
    ui.wattEdit.value = String(Math.round(watts));
  }

  if (ui.lightButtons.length > 0) {
    ui.lightButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.lightType === config.lightType);
    });
  }

  if (ui.fridgeTempSlider) {
    const precisionLocked = config.enabled && state.fridgePrecision.enabled && state.fridgePrecision.hasPinned;
    const sliderBounds = getFridgeTempSliderBounds();
    ui.fridgeTempSlider.disabled = !config.enabled || precisionLocked;
    ui.fridgeTempSlider.min = String(sliderBounds.min);
    ui.fridgeTempSlider.max = String(sliderBounds.max);
    ui.fridgeTempSlider.step = String(sliderBounds.step);
    ui.fridgeTempSlider.value = String(getFridgeTempSliderValue(state.fridgeAverageTempF));
    ui.fridgeTempOutput.textContent = formatFridgeTemperature(state.fridgeAverageTempF);
    if (ui.fridgeTempUnitButtons?.length > 0) {
      ui.fridgeTempUnitButtons.forEach((button) => {
        button.classList.toggle("active", button.dataset.tempUnit === state.fridgeTempUnit);
        button.disabled = !config.enabled;
      });
    }
    if (ui.fridgeDuty && fridgeModel) {
      ui.fridgeDuty.textContent = `${(fridgeModel.dailyDuty * 100).toFixed(0)}%`;
    }
    if (ui.fridgeDraw && fridgeModel) {
      ui.fridgeDraw.textContent = `${formatEnergy(fridgeModel.dailyWh)}/day`;
    }
    if (ui.fridgeSource) {
      if (!config.enabled) {
        ui.fridgeSource.textContent = "Turn fridge on to estimate compressor behavior.";
      } else if (state.fridgePrecision.enabled && state.fridgePrecision.hasPinned) {
        if (fridgeClimateStatus === "loading") {
          ui.fridgeSource.textContent = "Precision mode loading location climate averages...";
        } else if (fridgeClimateStatus === "ready") {
          const lowTempF = Number.isFinite(fridgeClimateNightTempF)
            ? fridgeClimateNightTempF
            : inferNightTemperature(state.fridgeAverageTempF);
          const years = fridgeClimateYearsRange ? ` (${fridgeClimateYearsRange})` : "";
          ui.fridgeSource.textContent = `Precision climate: ${monthLabel(state.fridgePrecision.month)} avg high ${formatFridgeTemperature(state.fridgeAverageTempF)} / low ${formatFridgeTemperature(lowTempF)}${years}.`;
        } else if (fridgeClimateStatus === "error") {
          ui.fridgeSource.textContent = `Precision climate unavailable (${fridgeClimateError}). Using location/elevation estimate.`;
        } else {
          ui.fridgeSource.textContent = `Precision mode: ${monthLabel(state.fridgePrecision.month)} + pinned map spot + elevation.`;
        }
      } else if (state.fridgePrecision.enabled) {
        ui.fridgeSource.textContent = "Precision mode on. Pin your map location to use monthly climate averages.";
      } else {
        ui.fridgeSource.textContent = "Manual daytime temperature mode.";
      }
    }
    ui.fridgeTempWrap.classList.toggle("disabled", !config.enabled);

    if (ui.fridgePrecisionBody) {
      ui.fridgePrecisionBody.classList.toggle("hidden", !state.fridgePrecision.enabled);
      ui.fridgePrecisionBody.classList.toggle("disabled", !config.enabled);
    }

    if (ui.fridgePrecisionButtons?.length > 0) {
      ui.fridgePrecisionButtons.forEach((button) => {
        const isYes = button.dataset.fridgePrecision === "yes";
        button.disabled = !config.enabled;
        button.classList.toggle(
          "active",
          (state.fridgePrecision.enabled && isYes) || (!state.fridgePrecision.enabled && !isYes)
        );
      });
    }

    if (ui.fridgeMonthSelect) {
      ui.fridgeMonthSelect.value = String(state.fridgePrecision.month);
      ui.fridgeMonthSelect.disabled = !config.enabled || !state.fridgePrecision.enabled;
    }

    if (ui.fridgePinSummary) {
      ui.fridgePinSummary.textContent = mapSelectionSummary();
    }

    updateMapSelectionLabel();
  }

  scheduleLoadGridLayout();
}

function buildLoadCards() {
  const grid = byId("loadsGrid");
  DEVICE_LIBRARY.forEach((device) => {
    grid.appendChild(createLoadCard(device));
  });
  scheduleLoadGridLayout();
}

function refreshLoadGridLayout() {
  const grid = byId("loadsGrid");
  if (!grid) {
    return;
  }

  const computed = window.getComputedStyle(grid);
  const autoRowSize = parseFloat(computed.getPropertyValue("grid-auto-rows"));
  const rowGap = parseFloat(computed.getPropertyValue("row-gap"));

  if (!Number.isFinite(autoRowSize) || autoRowSize <= 0) {
    return;
  }

  const gap = Number.isFinite(rowGap) ? rowGap : 0;

  loadUiMap.forEach((ui) => {
    if (!ui.card) {
      return;
    }

    ui.card.style.gridRowStart = "auto";
    ui.card.style.gridColumnStart = "auto";
    const cardHeight = ui.card.getBoundingClientRect().height;
    const span = Math.max(1, Math.ceil((cardHeight + gap) / (autoRowSize + gap)));
    ui.card.style.gridRowEnd = `span ${span}`;
  });
}

function scheduleLoadGridLayout() {
  if (loadGridLayoutFrame !== null) {
    return;
  }

  loadGridLayoutFrame = window.requestAnimationFrame(() => {
    loadGridLayoutFrame = null;
    refreshLoadGridLayout();
  });
}

function wireBooleanToggle(containerId, initialValue, onChange) {
  const container = byId(containerId);
  const yesButton = container.querySelector('[data-choice="yes"]');
  const noButton = container.querySelector('[data-choice="no"]');

  const setValue = (value, silent = false) => {
    yesButton.classList.toggle("active", value);
    noButton.classList.toggle("active", !value);

    if (!silent) {
      onChange(value);
      calculate();
    }
  };

  yesButton.addEventListener("click", () => setValue(true));
  noButton.addEventListener("click", () => setValue(false));
  setValue(initialValue, true);

  return (value) => setValue(Boolean(value), true);
}

function wireChoiceToggle(containerId, attrName, initialValue, onChange) {
  const container = byId(containerId);
  const buttons = [...container.querySelectorAll(`button[${attrName}]`)];

  const setValue = (value, silent = false) => {
    buttons.forEach((button) => {
      button.classList.toggle("active", button.getAttribute(attrName) === value);
    });

    if (!silent) {
      onChange(value);
      calculate();
    }
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => setValue(button.getAttribute(attrName)));
  });

  setValue(initialValue, true);
  return (value) => setValue(String(value), true);
}

function wireRange(inputId, outputId, formatter, onChange) {
  const input = byId(inputId);
  const output = byId(outputId);

  const setValue = (value) => {
    input.value = String(value);
    output.textContent = formatter(value);
  };

  input.addEventListener("input", () => {
    const value = parseFloat(input.value);
    onChange(value);
    output.textContent = formatter(value);
    calculate();
  });

  setValue(parseFloat(input.value));
  return setValue;
}

function wireSolarPrecisionControls() {
  const yes = byId("solarPrecisionYes");
  const no = byId("solarPrecisionNo");
  const monthSelect = byId("solarMonthSelect");
  const pinButton = byId("solarPinLocation");

  if (!yes || !no || !monthSelect || !pinButton) {
    return;
  }

  yes.addEventListener("click", () => {
    state.solarPrecision.enabled = true;
    refreshSolarPrecisionUi();
    ensureSolarPrecisionData();
    calculate();
  });

  no.addEventListener("click", () => {
    state.solarPrecision.enabled = false;
    state.solarPrecision.status = "idle";
    state.solarPrecision.error = "";
    refreshSolarPrecisionUi();
    calculate();
  });

  monthSelect.addEventListener("change", () => {
    state.solarPrecision.month = clamp(Number(monthSelect.value), 1, 12);
    refreshSolarPrecisionUi();
    calculate();
  });

  pinButton.addEventListener("click", () => {
    openMapModal("solar");
  });

  refreshSolarPrecisionUi();
}

function updateMapSelectionLabel() {
  const label = byId("mapSelectionLabel");
  if (label) {
    label.textContent = mapSelectionSummary(activeMapContext);
  }

  const title = byId("mapDialogTitle");
  const copy = byId("mapDialogCopy");
  if (!title || !copy) {
    return;
  }

  if (activeMapContext === "solar") {
    title.textContent = "Pin Your Solar Location";
    copy.textContent =
      "Click where you will spend most time this month. The app uses PVWatts monthly sun-hours for this pinned location.";
  } else {
    title.textContent = "Pin Your Likely Camp Spot";
    copy.textContent =
      "Pick your month in the fridge card, then click where you will spend most time. This helps estimate likely fridge draw more accurately than city-level assumptions.";
  }
}

function initPrecisionMap() {
  if (precisionMap || typeof window.L === "undefined") {
    return;
  }

  const mapState = activeMapContext === "solar" ? state.solarPrecision : state.fridgePrecision;

  precisionMap = window.L.map("precisionMap", { zoomControl: true }).setView(
    [mapState.lat, mapState.lon],
    6
  );

  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 16,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(precisionMap);

  if (mapState.hasPinned) {
    precisionMarker = window.L.marker([mapState.lat, mapState.lon]).addTo(precisionMap);
  }

  precisionMap.on("click", (event) => {
    const activeState = activeMapContext === "solar" ? state.solarPrecision : state.fridgePrecision;
    activeState.lat = event.latlng.lat;
    activeState.lon = event.latlng.lng;
    activeState.hasPinned = true;
    if (precisionMarker) {
      precisionMarker.setLatLng(event.latlng);
    } else {
      precisionMarker = window.L.marker(event.latlng).addTo(precisionMap);
    }
    if (activeMapContext === "solar") {
      state.solarPrecision.monthlySunHours = null;
      state.solarPrecision.lastFetchedKey = "";
      state.solarPrecision.status = "idle";
      state.solarPrecision.error = "";
      refreshSolarPrecisionUi();
      ensureSolarPrecisionData();
      calculate();
    } else {
      fridgeElevationStatus = "loading";
      fridgeElevationError = "";
      cancelFridgeClimateResolve();
      resetFridgeClimateState();
      applyPrecisionTemperatureEstimate();
      updateLoadCard("fridge");
      calculate();
      resolveFridgeElevationFromPin(activeState.lat, activeState.lon);
      scheduleFridgeClimateResolve(320);
    }
    updateMapSelectionLabel();
  });
}

function openMapModal(context = "fridge") {
  const modal = byId("mapModal");
  if (!modal) {
    return;
  }

  activeMapContext = context === "solar" ? "solar" : "fridge";
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  initPrecisionMap();
  updateMapSelectionLabel();

  const activeState = activeMapContext === "solar" ? state.solarPrecision : state.fridgePrecision;

  if (precisionMap) {
    setTimeout(() => {
      precisionMap.invalidateSize();
      precisionMap.setView([activeState.lat, activeState.lon]);
      if (activeState.hasPinned) {
        if (precisionMarker) {
          precisionMarker.setLatLng([activeState.lat, activeState.lon]);
        } else {
          precisionMarker = window.L.marker([activeState.lat, activeState.lon]).addTo(precisionMap);
        }
      } else if (precisionMarker) {
        precisionMap.removeLayer(precisionMarker);
        precisionMarker = null;
      }
    }, 60);
  }
}

function closeMapModal() {
  const modal = byId("mapModal");
  if (!modal) {
    return;
  }

  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function wireMapModal() {
  byId("closeMapModal").addEventListener("click", closeMapModal);
  byId("mapModal").addEventListener("click", (event) => {
    if (event.target.id === "mapModal") {
      closeMapModal();
    }
  });
}

function refreshRechargeVisibility() {
  byId("solarControls").classList.toggle("hidden", !state.solar.enabled);
  byId("alternatorControls").classList.toggle("hidden", !state.alternator.enabled);
  refreshSolarPrecisionUi();
}

function refreshAssumptionUi() {
  updateLoadCard("fridge");
}

function buildManualSelectOptions() {
  MANUAL_SELECT_CONFIG.forEach((config) => {
    const select = byId(config.selectId);
    if (!select) {
      return;
    }

    const currentSelection = state.manualComponents[config.key] || "auto";
    const tiers = state.componentTiers[config.tierKey] || [];

    const options = ['<option value="auto">Auto</option>'];

    if (config.includeZero) {
      options.push('<option value="0">None</option>');
    }

    tiers.forEach((tier) => {
      options.push(`<option value="${tier}">${tier} ${config.unit}</option>`);
    });

    select.innerHTML = options.join("");
    if (select.querySelector(`option[value="${currentSelection}"]`)) {
      select.value = currentSelection;
    } else {
      select.value = "auto";
      state.manualComponents[config.key] = "auto";
    }

    select.onchange = () => {
      state.manualComponents[config.key] = select.value;
      calculate();
    };

    manualSelectSetters[config.key] = (value) => {
      if (select.querySelector(`option[value="${value}"]`)) {
        select.value = String(value);
      } else {
        select.value = "auto";
      }
    };
  });
}

function resetManualSelections() {
  COMPONENT_KEYS.forEach((key) => {
    state.manualComponents[key] = "auto";
    if (manualSelectSetters[key]) {
      manualSelectSetters[key]("auto");
    }
  });
}

function refreshComponentModeVisibility() {
  byId("manualComponentControls").classList.toggle("hidden", state.componentMode !== "manual");
}

function wireComponentModeToggle() {
  const container = byId("componentModeToggle");
  const buttons = [...container.querySelectorAll("button[data-mode]")];

  const setMode = (mode, silent = false) => {
    state.componentMode = mode;
    buttons.forEach((button) => button.classList.toggle("active", button.dataset.mode === mode));
    refreshComponentModeVisibility();

    if (!silent) {
      calculate();
    }
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });

  byId("clearManualComponents").addEventListener("click", () => {
    resetManualSelections();
    calculate();
  });

  setMode(state.componentMode, true);
  return (mode) => setMode(mode, true);
}

function setModePill(id, manual) {
  const pill = byId(id);
  if (!pill) {
    return;
  }

  pill.textContent = manual ? "Manual" : "Auto";
  pill.classList.toggle("manual", manual);
}

function resolveComponentValue(key, autoValue) {
  const manualValue = state.manualComponents[key];
  const hasOverride = state.componentMode === "manual" && manualValue !== "auto";

  return {
    value: hasOverride ? Number(manualValue) : autoValue,
    manual: hasOverride
  };
}

function sanitizeTierArray(value, fallback) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const sanitized = value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0)
    .sort((a, b) => a - b);

  if (sanitized.length === 0) {
    return fallback;
  }

  return [...new Set(sanitized)];
}

function buildSettingsPayload() {
  return {
    version: 1,
    assumptions: cloneValue(state.assumptions),
    componentTiers: cloneValue(state.componentTiers),
    defaults: {
      solar: {
        ...cloneValue(state.solar),
        precision: cloneValue({
          enabled: state.solarPrecision.enabled,
          month: state.solarPrecision.month,
          lat: state.solarPrecision.lat,
          lon: state.solarPrecision.lon,
          hasPinned: state.solarPrecision.hasPinned
        })
      },
      alternator: cloneValue(state.alternator),
      fridge: {
        averageTempF: state.fridgeAverageTempF,
        tempUnit: state.fridgeTempUnit,
        precision: cloneValue(state.fridgePrecision)
      },
      battery: {
        autonomyDays: state.autonomyDays,
        chemistry: state.chemistry,
        voltage: state.voltage,
        installedAh: state.installedAh
      },
      loads: DEVICE_LIBRARY.reduce((acc, device) => {
        acc[device.id] =
          device.id === "fridge"
            ? { enabled: state.loads[device.id].enabled }
            : cloneValue(state.loads[device.id]);
        return acc;
      }, {})
    },
    notes: {
      description:
        "Edit this JSON and import it in the app to tune assumptions. Fridge supports manual daytime temperature or precision climate mode (month + pinned map spot) using historical monthly high/low averages, solar precision mode can pull PVWatts monthly sun-hours from pinned location, and AC loads include inverter efficiency + idle overhead."
    }
  };
}

function downloadSettingsFile() {
  const payload = buildSettingsPayload();
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "vanlife-power-settings.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  byId("settingsStatus").textContent = "Starter settings file downloaded.";
}

function applySettingsFromPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Settings file is not a JSON object.");
  }

  if (payload.assumptions && typeof payload.assumptions === "object") {
    const assumptions = payload.assumptions;
    const previousFridgeClimateLookbackYears = state.assumptions.fridgeClimateLookbackYears;

    state.assumptions.temperatureBaselineF = clamp(
      toPositiveNumber(assumptions.temperatureBaselineF, state.assumptions.temperatureBaselineF),
      0,
      120
    );

    state.assumptions.panelSystemEfficiencyPct = clamp(
      toPositiveNumber(assumptions.panelSystemEfficiencyPct, state.assumptions.panelSystemEfficiencyPct),
      40,
      99
    );

    state.assumptions.alternatorEfficiencyPct = clamp(
      toPositiveNumber(assumptions.alternatorEfficiencyPct, state.assumptions.alternatorEfficiencyPct),
      40,
      99
    );

    state.assumptions.inverterEfficiencyPct = clamp(
      toPositiveNumber(assumptions.inverterEfficiencyPct, state.assumptions.inverterEfficiencyPct),
      70,
      99
    );

    const inverterIdleCandidate = Number(
      assumptions.inverterIdleWatts ?? state.assumptions.inverterIdleWatts
    );
    if (Number.isFinite(inverterIdleCandidate)) {
      state.assumptions.inverterIdleWatts = clamp(inverterIdleCandidate, 0, 80);
    }

    state.assumptions.baseSunHours = clamp(
      toPositiveNumber(assumptions.baseSunHours, state.assumptions.baseSunHours),
      1,
      10
    );

    if (typeof assumptions.pvWattsApiKey === "string") {
      state.assumptions.pvWattsApiKey = assumptions.pvWattsApiKey.trim() || "DEMO_KEY";
      state.solarPrecision.monthlySunHours = null;
      state.solarPrecision.lastFetchedKey = "";
      state.solarPrecision.status = "idle";
      state.solarPrecision.error = "";
    }

    state.assumptions.ledWatts = clamp(
      toPositiveNumber(assumptions.ledWatts, state.assumptions.ledWatts),
      1,
      300
    );

    state.assumptions.halogenWatts = clamp(
      toPositiveNumber(assumptions.halogenWatts, state.assumptions.halogenWatts),
      1,
      500
    );

    state.assumptions.fridgeDutyFactor = clamp(
      Number(assumptions.fridgeDutyFactor ?? state.assumptions.fridgeDutyFactor),
      0.08,
      1
    );

    state.assumptions.fridgeReferenceAmbientF = clamp(
      Number(assumptions.fridgeReferenceAmbientF ?? state.assumptions.fridgeReferenceAmbientF),
      40,
      120
    );

    state.assumptions.fridgeClimateLookbackYears = clamp(
      toPositiveNumber(
        assumptions.fridgeClimateLookbackYears,
        state.assumptions.fridgeClimateLookbackYears
      ),
      3,
      30
    );
    if (state.assumptions.fridgeClimateLookbackYears !== previousFridgeClimateLookbackYears) {
      fridgeClimateCache.clear();
      resetFridgeClimateState();
    }

    state.assumptions.fridgeDayWeight = clamp(
      Number(assumptions.fridgeDayWeight ?? state.assumptions.fridgeDayWeight),
      0.45,
      0.8
    );

    state.assumptions.fridgeWarmSlope = clamp(
      Number(assumptions.fridgeWarmSlope ?? state.assumptions.fridgeWarmSlope),
      0.005,
      0.035
    );

    state.assumptions.fridgeCoolSlope = clamp(
      Number(assumptions.fridgeCoolSlope ?? state.assumptions.fridgeCoolSlope),
      0.002,
      0.02
    );

    if (assumptions.exposureMultipliers && typeof assumptions.exposureMultipliers === "object") {
      ["full", "partial", "minimal"].forEach((key) => {
        if (assumptions.exposureMultipliers[key] !== undefined) {
          state.assumptions.exposureMultipliers[key] = clamp(
            Number(assumptions.exposureMultipliers[key]),
            0.1,
            1.2
          );
        }
      });
    }

    state.solar.efficiencyPct = state.assumptions.panelSystemEfficiencyPct;
  }

  if (payload.componentTiers && typeof payload.componentTiers === "object") {
    Object.keys(state.componentTiers).forEach((key) => {
      state.componentTiers[key] = sanitizeTierArray(payload.componentTiers[key], state.componentTiers[key]);
    });
  }

  if (payload.defaults && typeof payload.defaults === "object") {
    if (payload.defaults.solar && typeof payload.defaults.solar === "object") {
      const solar = payload.defaults.solar;
      state.solar.watts = clamp(toPositiveNumber(solar.watts, state.solar.watts), 100, 1800);
      state.solar.efficiencyPct = clamp(
        toPositiveNumber(solar.efficiencyPct, state.solar.efficiencyPct),
        55,
        95
      );

      if (typeof solar.exposure === "string" && state.assumptions.exposureMultipliers[solar.exposure]) {
        state.solar.exposure = solar.exposure;
      }

      state.solar.enabled = Boolean(solar.enabled ?? state.solar.enabled);

      if (solar.precision && typeof solar.precision === "object") {
        state.solarPrecision.enabled = Boolean(solar.precision.enabled ?? state.solarPrecision.enabled);
        state.solarPrecision.month = clamp(
          Number(solar.precision.month ?? state.solarPrecision.month),
          1,
          12
        );
        state.solarPrecision.lat = clamp(
          Number(solar.precision.lat ?? state.solarPrecision.lat),
          -85,
          85
        );
        state.solarPrecision.lon = clamp(
          Number(solar.precision.lon ?? state.solarPrecision.lon),
          -180,
          180
        );
        state.solarPrecision.hasPinned = Boolean(
          solar.precision.hasPinned ?? state.solarPrecision.hasPinned
        );
        state.solarPrecision.status = "idle";
        state.solarPrecision.error = "";
        state.solarPrecision.monthlySunHours = null;
        state.solarPrecision.lastFetchedKey = "";
      }
    }

    if (payload.defaults.fridge && typeof payload.defaults.fridge === "object") {
      const fridge = payload.defaults.fridge;
      resetFridgeClimateState();
      state.fridgeAverageTempF = clamp(
        Number(fridge.averageTempF ?? state.fridgeAverageTempF),
        -10,
        110
      );
      if (typeof fridge.tempUnit === "string" && ["f", "c"].includes(fridge.tempUnit.toLowerCase())) {
        state.fridgeTempUnit = fridge.tempUnit.toLowerCase();
      }

      if (fridge.precision && typeof fridge.precision === "object") {
        state.fridgePrecision.enabled = Boolean(fridge.precision.enabled ?? state.fridgePrecision.enabled);
        state.fridgePrecision.month = clamp(
          Number(fridge.precision.month ?? state.fridgePrecision.month),
          1,
          12
        );
        state.fridgePrecision.lat = clamp(
          Number(fridge.precision.lat ?? state.fridgePrecision.lat),
          -85,
          85
        );
        state.fridgePrecision.lon = clamp(
          Number(fridge.precision.lon ?? state.fridgePrecision.lon),
          -180,
          180
        );
        state.fridgePrecision.elevationFt = clamp(
          Number(fridge.precision.elevationFt ?? state.fridgePrecision.elevationFt),
          0,
          20000
        );
        state.fridgePrecision.hasPinned = Boolean(
          fridge.precision.hasPinned ?? state.fridgePrecision.hasPinned
        );
        fridgeElevationStatus = "idle";
        fridgeElevationError = "";
        resetFridgeClimateState();

        if (state.fridgePrecision.enabled) {
          applyPrecisionTemperatureEstimate();
        }
      }
    } else if (
      payload.defaults.solar &&
      typeof payload.defaults.solar === "object" &&
      payload.defaults.solar.averageTempF !== undefined
    ) {
      // Backward compatibility with older settings files.
      state.fridgeAverageTempF = clamp(Number(payload.defaults.solar.averageTempF), -10, 110);
    }

    if (payload.defaults.alternator && typeof payload.defaults.alternator === "object") {
      const alternator = payload.defaults.alternator;
      state.alternator.enabled = Boolean(alternator.enabled ?? state.alternator.enabled);
      state.alternator.powerWatts = clamp(
        toPositiveNumber(alternator.powerWatts, state.alternator.powerWatts),
        200,
        3000
      );
      state.alternator.driveHoursDay = clamp(
        Number(alternator.driveHoursDay ?? state.alternator.driveHoursDay),
        0,
        10
      );
    }

    if (payload.defaults.battery && typeof payload.defaults.battery === "object") {
      const battery = payload.defaults.battery;
      state.autonomyDays = clamp(Number(battery.autonomyDays ?? state.autonomyDays), 1, 7);
      state.installedAh = clamp(Number(battery.installedAh ?? state.installedAh), 100, 1800);

      if (CHEMISTRY[battery.chemistry]) {
        state.chemistry = battery.chemistry;
      }

      if ([12, 24].includes(Number(battery.voltage))) {
        state.voltage = Number(battery.voltage);
      }
    }

    if (payload.defaults.loads && typeof payload.defaults.loads === "object") {
      DEVICE_LIBRARY.forEach((device) => {
        const nextLoad = payload.defaults.loads[device.id];
        if (!nextLoad || typeof nextLoad !== "object") {
          return;
        }

        state.loads[device.id].enabled = Boolean(nextLoad.enabled ?? state.loads[device.id].enabled);
        state.loads[device.id].hours =
          device.id === "fridge"
            ? device.fixedDailyHours || 24
            : clamp(Number(nextLoad.hours ?? state.loads[device.id].hours), 0, device.maxHours);

        if (device.supportsLightType && ["led", "halogen"].includes(nextLoad.lightType)) {
          state.loads[device.id].lightType = nextLoad.lightType;
        }
      });
    }
  }

  refreshAssumptionUi();
  setSolarToggleUi(state.solar.enabled);
  setAlternatorToggleUi(state.alternator.enabled);
  setExposureUi(state.solar.exposure);
  uiSetters.solarWatts(state.solar.watts);
  uiSetters.solarEfficiency(state.solar.efficiencyPct);
  uiSetters.altPower(state.alternator.powerWatts);
  uiSetters.driveHoursDay(state.alternator.driveHoursDay);
  uiSetters.autonomyDays(state.autonomyDays);
  uiSetters.installedAh(state.installedAh);

  byId("chemistry").value = state.chemistry;
  byId("batteryVoltage").value = String(state.voltage);

  DEVICE_LIBRARY.forEach((device) => {
    const ui = loadUiMap.get(device.id);
    if (!ui) {
      return;
    }

    if (ui.slider) {
      ui.slider.value = String(state.loads[device.id].hours);
    }
    updateLoadCard(device.id);
  });

  updateMapSelectionLabel();

  buildManualSelectOptions();
  refreshRechargeVisibility();
  refreshSolarPrecisionUi();
  if (state.solarPrecision.enabled && state.solarPrecision.hasPinned) {
    ensureSolarPrecisionData();
  }
  if (state.fridgePrecision.enabled && state.fridgePrecision.hasPinned) {
    scheduleFridgeClimateResolve(80);
  }
  calculate();
}

function applyPreset(presetName) {
  const preset = PRESETS[presetName];
  if (!preset) {
    return;
  }

  state.activePreset = presetName;

  DEVICE_LIBRARY.forEach((device) => {
    const presetValue = preset.loads[device.id];
    if (!presetValue) {
      return;
    }

    state.loads[device.id].enabled = presetValue.enabled;
    state.loads[device.id].hours =
      device.id === "fridge" ? device.fixedDailyHours || 24 : presetValue.hours;

    if (device.supportsLightType && presetValue.lightType) {
      state.loads[device.id].lightType = presetValue.lightType;
    }

    const ui = loadUiMap.get(device.id);
    if (ui) {
      if (ui.slider) {
        ui.slider.value = String(state.loads[device.id].hours);
      }
      updateLoadCard(device.id);
    }
  });

  state.solar.enabled = preset.solar.enabled;
  state.solar.watts = preset.solar.watts;
  state.solar.efficiencyPct = preset.solar.efficiencyPct;
  state.assumptions.panelSystemEfficiencyPct = preset.solar.efficiencyPct;
  state.solar.exposure = preset.solar.exposure;
  if (preset.solarPrecision) {
    state.solarPrecision = {
      ...state.solarPrecision,
      ...cloneValue(preset.solarPrecision),
      status: "idle",
      monthlySunHours: null,
      error: "",
      lastFetchedKey: ""
    };
  } else {
    state.solarPrecision.enabled = false;
    state.solarPrecision.status = "idle";
    state.solarPrecision.error = "";
    state.solarPrecision.monthlySunHours = null;
    state.solarPrecision.lastFetchedKey = "";
  }
  state.fridgeAverageTempF = preset.fridgeAverageTempF ?? state.assumptions.temperatureBaselineF;
  if (preset.fridgePrecision) {
    state.fridgePrecision = cloneValue(preset.fridgePrecision);
  }
  fridgeElevationStatus = "idle";
  fridgeElevationError = "";
  resetFridgeClimateState();
  if (state.fridgePrecision.enabled) {
    applyPrecisionTemperatureEstimate();
  }
  updateLoadCard("fridge");

  state.alternator.enabled = preset.alternator.enabled;
  state.alternator.powerWatts = preset.alternator.powerWatts;
  state.alternator.driveHoursDay = preset.alternator.driveHoursDay;

  state.autonomyDays = preset.autonomyDays;
  state.chemistry = preset.chemistry;
  state.voltage = preset.voltage;
  state.installedAh = preset.installedAh;

  setSolarToggleUi(state.solar.enabled);
  setAlternatorToggleUi(state.alternator.enabled);
  setExposureUi(state.solar.exposure);

  uiSetters.solarWatts(state.solar.watts);
  uiSetters.solarEfficiency(state.solar.efficiencyPct);
  uiSetters.altPower(state.alternator.powerWatts);
  uiSetters.driveHoursDay(state.alternator.driveHoursDay);
  uiSetters.autonomyDays(state.autonomyDays);
  uiSetters.installedAh(state.installedAh);

  byId("chemistry").value = state.chemistry;
  byId("batteryVoltage").value = String(state.voltage);

  byId("presets")
    .querySelectorAll(".preset-btn")
    .forEach((button) => button.classList.toggle("active", button.dataset.preset === presetName));

  refreshRechargeVisibility();
  refreshSolarPrecisionUi();
  if (state.solarPrecision.enabled && state.solarPrecision.hasPinned) {
    ensureSolarPrecisionData();
  }
  if (state.fridgePrecision.enabled && state.fridgePrecision.hasPinned) {
    scheduleFridgeClimateResolve(80);
  }
  updateMapSelectionLabel();
  calculate();
}

function wirePresetButtons() {
  byId("presets").querySelectorAll(".preset-btn").forEach((button) => {
    button.addEventListener("click", () => applyPreset(button.dataset.preset));
  });
}

function computeBreakdown() {
  const fridgeModel = computeFridgeThermalModel();
  const entries = [];
  let acDailyWh = 0;
  let acTotalHours = 0;

  DEVICE_LIBRARY.forEach((device) => {
    const load = state.loads[device.id];
    const watts = getDeviceWatts(device, load);
    const dutyFactor = getDeviceDutyFactor(device);
    const dailyWh = device.id === "fridge" ? fridgeModel.dailyWh : watts * load.hours * dutyFactor;

    if (!load.enabled || dailyWh <= 0) {
      return;
    }

    entries.push({
      id: device.id,
      name: device.name,
      wh: dailyWh
    });

    if (AC_LOAD_IDS.has(device.id)) {
      acDailyWh += dailyWh;
      // Sum hours across AC devices — the inverter stays on while any
      // AC load is active, and different devices may run at different times.
      acTotalHours += load.hours;
    }
  });

  if (acDailyWh > 0) {
    const inverterEfficiency = clamp(state.assumptions.inverterEfficiencyPct / 100, 0.7, 0.99);
    const conversionLossWh = acDailyWh * (1 / inverterEfficiency - 1);
    // Cap idle hours at 24 in case summed device hours exceed a full day
    const idleHours = Math.min(acTotalHours, 24);
    const idleWh = Math.max(0, state.assumptions.inverterIdleWatts) * idleHours;
    const inverterOverheadWh = conversionLossWh + idleWh;

    if (inverterOverheadWh > 0.1) {
      entries.push({
        id: "inverter-overhead",
        name: "Inverter overhead",
        wh: inverterOverheadWh
      });
    }
  }

  return entries;
}

function updateBreakdown(entries) {
  const container = byId("breakdown");

  if (entries.length === 0) {
    container.innerHTML = '<p class="empty-breakdown">Enable loads to see what is driving your battery needs.</p>';
    return;
  }

  const sorted = [...entries].sort((a, b) => b.wh - a.wh);
  const peak = sorted[0].wh || 1;

  container.innerHTML = sorted
    .map((entry) => {
      const width = (entry.wh / peak) * 100;

      return `
        <article class="break-row">
          <div class="break-top">
            <span>${entry.name}</span>
            <span>${formatEnergy(entry.wh)}</span>
          </div>
          <div class="break-track">
            <div class="break-fill" style="width: ${width.toFixed(1)}%"></div>
          </div>
        </article>
      `;
    })
    .join("");
}

function calculate() {
  const entries = computeBreakdown();

  const totalDailyWh = entries.reduce((sum, entry) => sum + entry.wh, 0);
  const sunHoursModel = getSolarSunHoursModel();
  const estimatedSunHours = sunHoursModel.adjustedHours;
  const solarEfficiencyFactor = state.solar.efficiencyPct / 100;
  const alternatorEfficiencyFactor = state.assumptions.alternatorEfficiencyPct / 100;

  const solarDailyWh = state.solar.enabled
    ? state.solar.watts * estimatedSunHours * solarEfficiencyFactor
    : 0;

  const alternatorDailyWh = state.alternator.enabled
    ? alternatorEffectiveWh(state.alternator.powerWatts, state.alternator.driveHoursDay, alternatorEfficiencyFactor)
    : 0;

  const rechargeWh = solarDailyWh + alternatorDailyWh;
  const rawNetWh = totalDailyWh - rechargeWh;
  const netBatteryWh = Math.max(rawNetWh, 0);

  const dod = CHEMISTRY[state.chemistry].dod;
  const coldDerating = batteryTempDeratingFactor(state.fridgeAverageTempF, state.chemistry);
  const effectiveDod = dod * coldDerating;
  const noRechargeWh = (totalDailyWh * state.autonomyDays) / effectiveDod;

  const overnightFloorWh = totalDailyWh * 0.2;
  const rechargeAdjustedDraw = Math.max(totalDailyWh - rechargeWh, overnightFloorWh);
  const rechargeWhRecommendation = (rechargeAdjustedDraw * state.autonomyDays) / effectiveDod;

  const recommendedAhNoRecharge = noRechargeWh / state.voltage;
  const recommendedAhRecharge = rechargeWhRecommendation / state.voltage;

  const installedNominalWh = state.installedAh * state.voltage;
  const installedUsableWh = installedNominalWh * effectiveDod;

  const runtimeNoRechargeDays = totalDailyWh > 0 ? installedUsableWh / totalDailyWh : Infinity;
  const runtimeWithRechargeDays = rawNetWh < 0.01 ? Infinity : installedUsableWh / rawNetWh;
  const dailyAh = state.voltage > 0 ? totalDailyWh / state.voltage : 0;

  lastResults = {
    recommendedAhNoRecharge,
    recommendedAhRecharge
  };

  byId("dailyUseBig").textContent = `${formatEnergy(totalDailyWh)}/day`;
  byId("dailyUseAh").textContent = `${dailyAh.toFixed(1)} Ah/day @ ${state.voltage}V`;
  byId("usagePersona").textContent = energyPersona(totalDailyWh);
  byId("dailyRecharge").textContent = formatEnergy(rechargeWh);
  byId("autonomyTarget").textContent = `${state.autonomyDays.toFixed(0)} days`;
  byId("estimatedSunHours").textContent = `${estimatedSunHours.toFixed(1)} hr`;
  const sunHoursSource = byId("sunHoursSource");
  if (sunHoursSource) {
    if (!state.solarPrecision.enabled) {
      sunHoursSource.textContent = sunHoursModel.source;
    } else if (!state.solarPrecision.hasPinned) {
      sunHoursSource.textContent = "Precision mode on. Pin a location to use PVWatts monthly sun-hours.";
    } else if (state.solarPrecision.status === "loading") {
      sunHoursSource.textContent = "Precision mode loading PVWatts data. Using manual baseline temporarily.";
    } else if (state.solarPrecision.status === "error") {
      sunHoursSource.textContent = `PVWatts request failed (${state.solarPrecision.error}). Using manual baseline.`;
    } else {
      sunHoursSource.textContent = sunHoursModel.source;
    }
  }

  if (rawNetWh >= 0) {
    byId("netFromBattery").textContent = formatEnergy(netBatteryWh);
  } else {
    byId("netFromBattery").textContent = `${formatEnergy(Math.abs(rawNetWh))} surplus`;
  }

  byId("recNoChargeAh").textContent = formatAh(recommendedAhNoRecharge);
  byId("recNoChargeWh").textContent = `${formatEnergy(noRechargeWh)} total bank`;
  byId("recRechargeAh").textContent = formatAh(recommendedAhRecharge);
  byId("recRechargeWh").textContent = `${formatEnergy(rechargeWhRecommendation)} total bank`;

  byId("runtimeNoCharge").textContent = formatDays(runtimeNoRechargeDays);
  byId("runtimeWithRecharge").textContent = formatDays(runtimeWithRechargeDays);

  if (totalDailyWh === 0) {
    byId("runwayText").textContent = "No active loads. Turn on appliances to begin sizing your battery.";
  } else if (runtimeNoRechargeDays >= state.autonomyDays) {
    byId("runwayText").textContent = "Your planned battery meets your reserve goal even with zero charging.";
  } else {
    byId("runwayText").textContent = "Your planned battery falls short of your reserve target without charging.";
  }

  if (rawNetWh <= 0) {
    byId("runwayText").textContent += " Daily recharge currently matches or beats daily consumption.";
  }

  if (coldDerating < 1) {
    byId("runwayText").textContent += ` Cold weather derating applied: ${Math.round(coldDerating * 100)}% effective capacity at ${formatFridgeTemperature(state.fridgeAverageTempF)}.`;
  }

  const batteryAutoAh = pickTier(Math.ceil(recommendedAhNoRecharge), state.componentTiers.batteryAh);
  const solarAutoWatts =
    totalDailyWh > 0
      ? pickTier(
          Math.ceil(totalDailyWh / Math.max(estimatedSunHours * solarEfficiencyFactor, 0.1)),
          state.componentTiers.solarWatts
        )
      : 0;

  const solarChargerAutoAmps =
    solarAutoWatts > 0
      ? pickTier(
          Math.ceil((solarAutoWatts / state.voltage) * 1.25),
          state.componentTiers.solarChargerAmps
        )
      : 0;

  const solarOffsetWh = solarAutoWatts * estimatedSunHours * solarEfficiencyFactor;
  const alternatorNeedWh = Math.max(totalDailyWh - solarOffsetWh, 0);
  const alternatorAutoWatts =
    state.alternator.driveHoursDay > 0 && alternatorNeedWh > 0
      ? pickTier(
          Math.ceil(
            alternatorNeedWh / Math.max(state.alternator.driveHoursDay * alternatorEfficiencyFactor, 0.1)
          ),
          state.componentTiers.alternatorWatts
        )
      : 0;

  const shoreAutoAmps =
    totalDailyWh > 0
      ? pickTier(
          Math.ceil(Math.max(dailyAh / 4, batteryAutoAh * (state.chemistry === "agm" ? 0.07 : 0.1))),
          state.componentTiers.shoreAmps
        )
      : 0;

  const acPeakWatts = DEVICE_LIBRARY.reduce((sum, device) => {
    const load = state.loads[device.id];
    if (!load || !load.enabled || !AC_LOAD_IDS.has(device.id)) {
      return sum;
    }

    return sum + getDeviceWatts(device, load);
  }, 0);

  const inverterAutoWatts = pickTier(
    Math.ceil(Math.max(acPeakWatts * 1.25, 600)),
    state.componentTiers.inverterWatts
  );

  const batterySelected = resolveComponentValue("batteryAh", batteryAutoAh);
  const solarSelected = resolveComponentValue("solarWatts", solarAutoWatts);
  const solarChargerSelected = resolveComponentValue("solarChargerAmps", solarChargerAutoAmps);
  const alternatorSelected = resolveComponentValue("alternatorWatts", alternatorAutoWatts);
  const shoreSelected = resolveComponentValue("shoreAmps", shoreAutoAmps);
  const inverterSelected = resolveComponentValue("inverterWatts", inverterAutoWatts);

  setModePill("componentBatteryMode", batterySelected.manual);
  setModePill("componentSolarMode", solarSelected.manual);
  setModePill("componentSolarChargerMode", solarChargerSelected.manual);
  setModePill("componentAlternatorMode", alternatorSelected.manual);
  setModePill("componentShoreMode", shoreSelected.manual);
  setModePill("componentInverterMode", inverterSelected.manual);

  byId("componentBattery").textContent =
    batterySelected.value > 0 ? `${batterySelected.value} Ah @ ${state.voltage}V` : "No battery selected";
  const batteryNoteBase = `${state.autonomyDays} days reserve using ${Math.round(dod * 100)}% usable capacity.`;
  const batteryNoteCold = coldDerating < 1 ? ` Cold derated to ${Math.round(effectiveDod * 100)}% at ${formatFridgeTemperature(state.fridgeAverageTempF)}.` : "";
  byId("componentBatteryNote").textContent = batterySelected.manual
    ? "Manual override enabled for battery bank sizing."
    : batteryNoteBase + batteryNoteCold;

  byId("componentSolar").textContent =
    solarSelected.value > 0 ? `${solarSelected.value} W` : "No solar panels";
  byId("componentSolarNote").textContent = solarSelected.manual
    ? "Manual override enabled for solar array size."
    : `Modeled with ${estimatedSunHours.toFixed(1)} sun-hr/day and ${state.solar.efficiencyPct}% efficiency (${sunHoursModel.usingPvWatts ? "PVWatts monthly model" : "manual baseline"}).`;

  byId("componentSolarCharger").textContent =
    solarChargerSelected.value > 0 ? `${solarChargerSelected.value} A MPPT` : "No MPPT";
  byId("componentSolarChargerNote").textContent = solarChargerSelected.manual
    ? "Manual override enabled for charge controller size."
    : solarChargerAutoAmps > 0
      ? "Includes 25% controller headroom."
      : "Controller appears once a solar array is sized.";

  const alternatorEquivalentAmps = alternatorSelected.value > 0 ? alternatorSelected.value / state.voltage : 0;

  if (alternatorSelected.manual) {
    byId("componentAlternator").textContent =
      alternatorSelected.value > 0 ? `${alternatorSelected.value} W DC-DC` : "No DC-DC";
    byId("componentAlternatorNote").textContent =
      alternatorSelected.value > 0
        ? `Manual override. About ${alternatorEquivalentAmps.toFixed(1)}A @ ${state.voltage}V.`
        : "Manual override set to no alternator charger.";
  } else if (state.alternator.driveHoursDay <= 0) {
    byId("componentAlternator").textContent = "Set drive time";
    byId("componentAlternatorNote").textContent =
      "Add drive hours/day to estimate alternator power sizing.";
  } else {
    byId("componentAlternator").textContent =
      alternatorAutoWatts > 0 ? `${alternatorAutoWatts} W DC-DC` : "300 W DC-DC";
    byId("componentAlternatorNote").textContent =
      alternatorAutoWatts > 0
        ? `Based on ${state.alternator.driveHoursDay.toFixed(1)} drive hr/day after solar offset.`
        : "Minimal alternator support because solar already covers most daily use.";

    if (!state.alternator.enabled) {
      byId("componentAlternatorNote").textContent += " Alternator charging is currently toggled off.";
    }
  }

  byId("componentShore").textContent =
    shoreSelected.value > 0 ? `${shoreSelected.value} A charger` : "No shore charger";
  byId("componentShoreNote").textContent = shoreSelected.manual
    ? "Manual override enabled for shore charger size."
    : shoreAutoAmps > 0
      ? `${formatEnergy(shoreAutoAmps * state.voltage * 4)} restored in ~4 hr on shore power.`
      : "Enable loads to estimate shore charging needs.";

  byId("componentInverter").textContent =
    inverterSelected.value > 0 ? `${inverterSelected.value} W pure sine` : "No inverter";
  byId("componentInverterNote").textContent = inverterSelected.manual
    ? "Manual override enabled for inverter size."
    : acPeakWatts > 0
      ? `Built from simultaneous AC loads with 25% headroom. Energy model uses ${state.assumptions.inverterEfficiencyPct}% efficiency + ${state.assumptions.inverterIdleWatts}W idle draw.`
      : "Base recommendation for light AC devices.";

  updateBreakdown(entries);
  updateSystemWarnings(totalDailyWh, acPeakWatts, dailyAh, coldDerating, inverterSelected.value);
}

function updateSystemWarnings(totalDailyWh, acPeakWatts, dailyAh, coldDerating, inverterWatts) {
  const warnings = [];

  // Peak current draw warning
  const peakAmps = acPeakWatts / state.voltage;
  if (peakAmps > 150 && state.voltage === 12) {
    warnings.push("Peak AC draw exceeds 150A at 12V. This requires very heavy cabling (2/0 AWG or larger). Consider a 24V system.");
  }

  // Total daily draw vs battery size
  const usableAh = state.installedAh * CHEMISTRY[state.chemistry].dod * coldDerating;
  if (totalDailyWh > 0 && totalDailyWh / state.voltage > usableAh) {
    warnings.push("Daily draw exceeds your usable battery capacity. You will fully discharge every day even with a full charge.");
  }

  // A/C on a small battery
  if (state.loads.ac && state.loads.ac.enabled && state.installedAh < 200) {
    warnings.push("Running A/C on a battery under 200Ah is impractical. A/C draws heavily and will drain small banks very quickly.");
  }

  // Induction + A/C simultaneous peak
  if (state.loads.ac && state.loads.ac.enabled && state.loads.induction && state.loads.induction.enabled) {
    const combinedPeak = getDeviceWatts(
      DEVICE_LIBRARY.find((d) => d.id === "ac"),
      state.loads.ac
    ) + getDeviceWatts(
      DEVICE_LIBRARY.find((d) => d.id === "induction"),
      state.loads.induction
    );
    if (combinedPeak > inverterWatts && inverterWatts > 0) {
      warnings.push(`A/C + induction cooktop combined peak (${combinedPeak}W) exceeds your inverter capacity (${inverterWatts}W). Avoid running both simultaneously.`);
    }
  }

  // Extremely high daily consumption
  if (totalDailyWh > 8000) {
    warnings.push("Daily consumption over 8 kWh is very high for a van build. Ensure your charging infrastructure can realistically keep up.");
  }

  // Cold weather charging warning for LiFePO4
  if (state.chemistry === "lifepo4" && state.fridgeAverageTempF < 32) {
    warnings.push("LiFePO4 batteries cannot safely charge below 32\u00B0F (0\u00B0C) without a heated battery system. Factor in a battery heater or insulated box.");
  }

  const container = byId("systemWarnings");
  if (!container) return;

  if (warnings.length === 0) {
    container.classList.add("hidden");
    container.innerHTML = "";
    return;
  }

  container.classList.remove("hidden");
  container.innerHTML = warnings
    .map((msg) => `<p class="system-warning">${msg}</p>`)
    .join("");
}

function init() {
  applyTheme(resolveInitialTheme());

  initStateFromLibrary();
  buildLoadCards();
  buildManualSelectOptions();
  setComponentModeUi = wireComponentModeToggle();
  wireMapModal();
  wireSolarPrecisionControls();

  const themeToggle = byId("themeToggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const current = document.body.dataset.theme === "dark" ? "dark" : "light";
      const next = current === "dark" ? "light" : "dark";
      applyTheme(next);
      safeLocalStorageSet(THEME_STORAGE_KEY, next);
    });
  }

  setSolarToggleUi = wireBooleanToggle("solarToggle", state.solar.enabled, (value) => {
    state.solar.enabled = value;
    refreshRechargeVisibility();
  });

  setAlternatorToggleUi = wireBooleanToggle("alternatorToggle", state.alternator.enabled, (value) => {
    state.alternator.enabled = value;
    refreshRechargeVisibility();
  });

  setExposureUi = wireChoiceToggle("exposureToggle", "data-exposure", state.solar.exposure, (value) => {
    state.solar.exposure = value;
  });

  uiSetters.solarWatts = wireRange("solarWatts", "solarWattsValue", (v) => `${v.toFixed(0)} W`, (value) => {
    state.solar.watts = value;
  });

  uiSetters.solarEfficiency = wireRange(
    "solarEfficiency",
    "solarEfficiencyValue",
    (v) => `${v.toFixed(0)}%`,
    (value) => {
      state.solar.efficiencyPct = value;
      state.assumptions.panelSystemEfficiencyPct = value;
    }
  );

  uiSetters.altPower = wireRange("altPower", "altPowerValue", (v) => `${v.toFixed(0)} W`, (value) => {
    state.alternator.powerWatts = value;
  });

  uiSetters.driveHoursDay = wireRange(
    "driveHoursDay",
    "driveHoursDayValue",
    (v) => `${v.toFixed(2)} hr`,
    (value) => {
      state.alternator.driveHoursDay = value;
    }
  );

  uiSetters.autonomyDays = wireRange(
    "autonomyDays",
    "autonomyDaysValue",
    (v) => `${v.toFixed(0)} days`,
    (value) => {
      state.autonomyDays = value;
    }
  );

  uiSetters.installedAh = wireRange("installedAh", "installedAhValue", (v) => `${v.toFixed(0)} Ah`, (value) => {
    state.installedAh = value;
  });

  byId("chemistry").addEventListener("change", (event) => {
    state.chemistry = event.target.value;
    calculate();
  });

  byId("batteryVoltage").addEventListener("change", (event) => {
    state.voltage = parseInt(event.target.value, 10);
    calculate();
  });

  byId("syncInstalled").addEventListener("click", () => {
    if (!lastResults) {
      return;
    }

    const recommendation = clamp(Math.ceil(lastResults.recommendedAhNoRecharge / 10) * 10, 100, 1800);
    state.installedAh = recommendation;
    uiSetters.installedAh(recommendation);
    calculate();
  });

  byId("downloadSettings").addEventListener("click", downloadSettingsFile);

  byId("uploadSettings").addEventListener("change", async (event) => {
    const [file] = event.target.files || [];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      applySettingsFromPayload(payload);
      byId("settingsStatus").textContent = `Imported settings from ${file.name}.`;
    } catch (error) {
      byId("settingsStatus").textContent = `Import failed: ${error.message}`;
    } finally {
      event.target.value = "";
    }
  });

  wirePresetButtons();
  window.addEventListener("resize", scheduleLoadGridLayout);
  refreshAssumptionUi();
  refreshRechargeVisibility();
  setComponentModeUi(state.componentMode);
  applyPreset("weekender");
}

document.addEventListener("DOMContentLoaded", init);
