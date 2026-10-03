import { pickSize, temperatureCapacity, buildLoadProfile, simulateTrip, sizeBatteryForTrip, validateSettings } from './model.js';

const DEVICE_LIBRARY = [
  {
    id: "fridge",
    name: "12V Fridge",
    watts: 45,
    dutyFactor: 0.26,
    note: "Compressor running power. Temperature estimates cycling; measured daily energy can override it.",
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
    dutyFactor: 0.65,
    note: "65% duty models burner cycling at medium-high power.",
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
const PLAN_STORAGE_KEY = "vanlife-power-plan-v2";
const BUILTIN_IDS = new Set(DEVICE_LIBRARY.map(device => device.id));
const LOAD_DEFAULTS = {
  fridge: { startHour: 0, powerPath: 'dc' }, lights: { startHour: 18, powerPath: 'dc' },
  induction: { startHour: 18, powerPath: 'ac' }, starlink: { startHour: 9, powerPath: 'ac' },
  ac: { startHour: 21, powerPath: 'ac' }, fan: { startHour: 18, powerPath: 'dc' },
  phones: { startHour: 18, powerPath: 'usb' }, laptop: { startHour: 9, powerPath: 'ac' },
  heaterFan: { startHour: 22, powerPath: 'dc' }
};

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
state.trip = {
  days: 7, startSocPct: 90, reservePct: 20, batteryTempF: 77, healthPct: 100,
  nominalVoltage: 12.8, chargeVoltage: 14.2, maxChargeAmps: 100, maxDischargeAmps: 200,
  chargeCutoffF: 41, daylightHours: 12, inverterOnHours: 0, shoreAmps: 20,
  roofSolarMax: 800, schedule: []
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
let initializing = true;
let applyingPreset = false;
let lastPlan = null;
let savedPlanTimer = null;
let mapReturnFocus = null;
let presetSignature = '';
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

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
  return pickSize(value, tiers).value;
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
  const rounded = Math.max(0, Math.ceil(ah / 10) * 10);
  return `${rounded.toFixed(0)} Ah`;
}

function formatDays(days) {
  if (!Number.isFinite(days)) {
    return "No consumption";
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
  if (state.loads[device.id]?.customDutyFactor != null) return state.loads[device.id].customDutyFactor;
  if (device.id === "fridge") {
    return state.assumptions.fridgeDutyFactor;
  }

  return device.dutyFactor;
}

function batteryTempDeratingFactor(tempF) {
  return temperatureCapacity(tempF);
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
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

  const annualMeanHigh = 88 - latAbs * 0.65 - (elevationFt / 1000) * 3.6;
  const seasonalAmplitude = clamp(2 + latAbs * 0.6, 2, 35);
  const seasonalOffset = seasonalAmplitude * Math.cos(monthAngle - seasonalPeak);

  return clamp(annualMeanHigh + seasonalOffset, -10, 118);
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
  fridgeClimateRequestNonce += 1;
  fridgeElevationRequestNonce += 1;
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
  return `${lat.toFixed(3)},${lon.toFixed(3)}|${startYear}-${endYear}`;
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

    if (highs[i] == null || lows[i] == null) continue;
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
    return parseFridgeClimatePayload(cached, month, startYear, endYear);
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
    const response = await fetchWithTimeout(`${baseUrl}?${params.toString()}`);
    if (response.ok) {
      const payload = await response.json();
      const parsed = parseFridgeClimatePayload(payload, month, startYear, endYear);
      fridgeClimateCache.set(cacheKey, payload);
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
  const response = await fetchWithTimeout(`https://api.open-meteo.com/v1/elevation?${params.toString()}`);
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

function getSolarSunHoursModel() {
  const exposure = state.assumptions.exposureMultipliers[state.solar.exposure] ?? 1;
  const manualBase = state.assumptions.baseSunHours ?? 4.8;
  const precision = state.solarPrecision;
  let baseHours = manualBase;
  let usingPvWatts = false;
  let source = `Manual assumption (${manualBase.toFixed(1)} sun-hr/day baseline).`;

  if (precision.enabled && precision.hasPinned && Array.isArray(precision.monthlySunHours)) {
    const month = clamp(Number(precision.month), 1, 12);
    const monthlyValue = Number(precision.monthlySunHours[month - 1]);
    if (Number.isFinite(monthlyValue) && monthlyValue >= 0) {
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

  const response = await fetchWithTimeout(`https://developer.nlr.gov/api/pvwatts/v8.json?${params.toString()}`);
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

  if (values.some(value => value == null)) throw new Error("Solar data contains missing months.");
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
  yes.setAttribute("aria-pressed", String(precision.enabled));
  no.setAttribute("aria-pressed", String(!precision.enabled));
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
      customWatts: null, customDutyFactor: null, quantity: 1, measuredWh: null, surgeWatts: device.watts,
      ...LOAD_DEFAULTS[device.id]
    };
  });
}

function createLoadCard(device) {
  const card = document.createElement("article");
  card.className = "load-card";
  card.dataset.device = device.id;

  card.innerHTML = `
    <div class="load-title">
      <h3>${escapeHtml(device.name)}</h3>
      <button type="button" class="watt-pill" data-watts aria-label="Edit ${escapeHtml(device.name)} watts">${device.watts}W ✎</button>
      <input class="watt-edit" data-watt-edit type="number" min="0" max="20000" step="1" value="${device.watts}" aria-label="${escapeHtml(device.name)} operating watts" />
    </div>
    <p class="load-note">
      ${escapeHtml(device.note)}
      ${
        device.id === "fridge"
          ? " Set the ambient temperature where you'll be parked to model compressor load."
          : ""
      }
    </p>
    <div class="segmented" aria-label="${escapeHtml(device.name)} enabled">
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
          Fridge draw per device:
          <strong data-fridge-draw>${formatEnergy(computeFridgeThermalModel().dailyWh)}/day</strong>
        </p>
        <p class="fridge-insight" data-fridge-source>Manual daytime temperature mode.</p>
        <div class="fridge-precision">
          <div class="fridge-precision-header">
            <span>Use historical climate for fridge cycling?</span>
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
            <button type="button" class="ghost-btn compact-btn" data-change-location>Change location</button>
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
        max="24"
        aria-label="${escapeHtml(device.name)} hours per day"
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
      if (Number.isFinite(raw) && raw >= 0 && raw <= 20000) {
        const defaultWatts = device.id === "lights"
          ? (state.loads[device.id].lightType === "halogen" ? state.assumptions.halogenWatts : state.assumptions.ledWatts)
          : device.watts;
        state.loads[device.id].customWatts = raw === defaultWatts ? null : raw;
      } else {
        wattEdit.value = String(getDeviceWatts(device, state.loads[device.id]));
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
      refreshLoadDetails(device);
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

  addLoadDetails(card, device);
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
  ui.yesButton.setAttribute("aria-pressed", String(config.enabled));
  ui.noButton.setAttribute("aria-pressed", String(!config.enabled));
  if (ui.slider) {
    ui.slider.disabled = !config.enabled;
  }
  if (ui.output) {
    ui.output.textContent = `${config.hours.toFixed(1)} hr/day`;
  }
  const isCustom = config.customWatts !== null && config.customWatts !== undefined;
  ui.wattsPill.textContent = `${Math.round(watts)}W ✎`;
  ui.wattsPill.classList.toggle("custom", isCustom);
  ui.wattsPill.title = isCustom ? "Custom wattage (click to edit, Esc to cancel)" : "Click to customize wattage";
  if (ui.wattEdit) {
    ui.wattEdit.value = String(Math.round(watts));
  }

  if (ui.lightButtons.length > 0) {
    ui.lightButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.lightType === config.lightType);
      button.setAttribute("aria-pressed", String(button.dataset.lightType === config.lightType));
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
      ui.fridgeDraw.textContent = `${formatEnergy(config.measuredWh ?? fridgeModel.dailyWh)}/day`;
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
        button.setAttribute("aria-pressed", String(state.fridgePrecision.enabled === isYes));
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

  refreshLoadDetails(device);
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
    yesButton.setAttribute("aria-pressed", String(value));
    noButton.setAttribute("aria-pressed", String(!value));

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
      button.setAttribute("aria-pressed", String(button.getAttribute(attrName) === value));
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

  const number = document.createElement('input');
  number.type = 'number'; number.required = true; number.className = 'exact-input'; number.min = input.min;
  number.max = ['installedAh', 'solarWatts', 'altPower'].includes(inputId) ? '20000' : inputId === 'driveHoursDay' ? '24' : input.max;
  number.step = 'any'; number.id = `${inputId}Exact`;
  const label = document.querySelector(`label[for="${inputId}"]`);
  number.setAttribute('aria-label', `${label?.querySelector('span')?.textContent ?? inputId} exact value`);
  input.after(number);
  const setValue = (value) => {
    input.max = String(Math.max(Number(input.max), value));
    input.step = 'any'; input.value = String(value); number.value = String(value);
    output.textContent = formatter(value);
  };
  number.addEventListener('input', () => {
    if (!number.checkValidity() || number.value === '') return;
    const value = Number(number.value); setValue(value); onChange(value); calculate();
  });

  input.addEventListener("input", () => {
    const value = parseFloat(input.value);
    onChange(value);
    number.value = String(value);
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
    if (state.fridgePrecision.enabled) {
      state.solarPrecision.month = state.fridgePrecision.month;
      monthSelect.value = String(state.solarPrecision.month);
    }
    if (!state.solarPrecision.hasPinned && state.fridgePrecision.hasPinned) {
      state.solarPrecision.lat = state.fridgePrecision.lat;
      state.solarPrecision.lon = state.fridgePrecision.lon;
      state.solarPrecision.hasPinned = true;
      state.solarPrecision.monthlySunHours = null;
      state.solarPrecision.lastFetchedKey = "";
      state.solarPrecision.status = "idle";
    }
    refreshSolarPrecisionUi();
    ensureSolarPrecisionData();
    calculate();
  });

  no.addEventListener("click", () => {
    state.solarPrecision.enabled = false;
    solarRequestNonce += 1;
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
      "Pick your month in the fridge card, then click where you will spend most time. This provides regional historical climate, not campsite or van-interior measurements.";
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
  mapReturnFocus = document.activeElement;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  initPrecisionMap();
  updateMapSelectionLabel();
  byId('closeMapModal').focus();

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
  mapReturnFocus?.focus();
}

function wireMapModal() {
  byId("closeMapModal").addEventListener("click", closeMapModal);
  byId("mapModal").addEventListener("click", (event) => {
    if (event.target.id === "mapModal") {
      closeMapModal();
    }
  });
  document.addEventListener('keydown', event => {
    const modal = byId('mapModal');
    if (modal.classList.contains('hidden')) return;
    if (event.key === 'Escape') { event.preventDefault(); closeMapModal(); }
    if (event.key === 'Tab') {
      const focusable = [...modal.querySelectorAll('button, a[href], input, select, [tabindex="0"]')].filter(element => !element.disabled);
      const first = focusable[0]; const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
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

    const currentSelection = state.manualComponents[config.key] ?? "auto";
    const tiers = state.componentTiers[config.tierKey] || [];

    const options = ['<option value="auto">Use input / sized value</option>'];

    if (config.includeZero) {
      options.push('<option value="0">None</option>');
    }

    tiers.forEach((tier) => {
      options.push(`<option value="${tier}">${tier} ${config.unit}</option>`);
    });

    if (currentSelection !== 'auto' && !tiers.includes(Number(currentSelection)) && Number(currentSelection) >= 0) {
      options.push(`<option value="${Number(currentSelection)}">${Number(currentSelection)} ${config.unit} (custom)</option>`);
    }
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
    buttons.forEach((button) => { button.classList.toggle("active", button.dataset.mode === mode); button.setAttribute("aria-pressed", String(button.dataset.mode === mode)); });
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
    version: 2,
    componentMode: state.componentMode,
    manualComponents: Object.fromEntries(Object.entries(state.manualComponents).map(([key, value]) => [key, value === "auto" ? value : Number(value)])),
    assumptions: { ...cloneValue(state.assumptions), pvWattsApiKey: "DEMO_KEY" },
    componentTiers: cloneValue(state.componentTiers),
    defaults: {
      trip: cloneValue(state.trip),
      customLoads: DEVICE_LIBRARY.filter(device => !BUILTIN_IDS.has(device.id)).map(device => ({ ...cloneValue(state.loads[device.id]), id: device.id, name: device.name, watts: device.watts })),
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
      loads: DEVICE_LIBRARY.filter(device => BUILTIN_IDS.has(device.id)).reduce((acc, device) => {
        acc[device.id] = cloneValue(state.loads[device.id]);
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

  byId("settingsStatus").textContent = "Complete plan exported. API keys excluded.";
}

function applySettingsFromPayload(payload) {
  validateSettings(payload);
  solarRequestNonce += 1;
  resetFridgeClimateState();

  if (payload.assumptions) {
    const previousYears = state.assumptions.fridgeClimateLookbackYears;
    for (const key of Object.keys(DEFAULT_ASSUMPTIONS)) {
      if (payload.assumptions[key] !== undefined) {
        state.assumptions[key] = key === 'exposureMultipliers'
          ? { ...state.assumptions.exposureMultipliers, ...payload.assumptions[key] }
          : cloneValue(payload.assumptions[key]);
      }
    }
    if (previousYears !== state.assumptions.fridgeClimateLookbackYears) fridgeClimateCache.clear();
    state.solar.efficiencyPct = state.assumptions.panelSystemEfficiencyPct;
    state.solarPrecision.monthlySunHours = null;
    state.solarPrecision.lastFetchedKey = '';
  }

  if (payload.componentTiers && typeof payload.componentTiers === "object") {
    Object.keys(state.componentTiers).forEach((key) => {
      state.componentTiers[key] = sanitizeTierArray(payload.componentTiers[key], state.componentTiers[key]);
    });
  }

  if (payload.defaults && typeof payload.defaults === "object") {
    if (payload.defaults.solar && typeof payload.defaults.solar === "object") {
      const solar = payload.defaults.solar;
      state.solar.watts = clamp(Number(solar.watts ?? state.solar.watts), 0, 20000);
      state.solar.efficiencyPct = clamp(
        toPositiveNumber(solar.efficiencyPct, state.solar.efficiencyPct),
        1,
        100
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
        -40,
        130
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
        Number(alternator.powerWatts ?? state.alternator.powerWatts),
        0,
        20000
      );
      state.alternator.driveHoursDay = clamp(
        Number(alternator.driveHoursDay ?? state.alternator.driveHoursDay),
        0,
        24
      );
    }

    if (payload.defaults.battery && typeof payload.defaults.battery === "object") {
      const battery = payload.defaults.battery;
      state.autonomyDays = clamp(Number(battery.autonomyDays ?? state.autonomyDays), 1, 30);
      state.installedAh = clamp(Number(battery.installedAh ?? state.installedAh), 1, 20000);

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

        for (const key of ['customWatts', 'customDutyFactor', 'measuredWh', 'quantity', 'startHour', 'powerPath', 'surgeWatts']) {
          if (nextLoad[key] !== undefined) state.loads[device.id][key] = nextLoad[key];
        }
        state.loads[device.id].enabled = Boolean(nextLoad.enabled ?? state.loads[device.id].enabled);
        state.loads[device.id].hours =
          device.id === "fridge"
            ? device.fixedDailyHours || 24
            : clamp(Number(nextLoad.hours ?? state.loads[device.id].hours), 0, 24);

        if (device.supportsLightType && ["led", "halogen"].includes(nextLoad.lightType)) {
          state.loads[device.id].lightType = nextLoad.lightType;
        }
      });
    }
  }

  if (payload.defaults?.customLoads) {
    for (const device of [...DEVICE_LIBRARY].filter(device => !BUILTIN_IDS.has(device.id))) {
      loadUiMap.get(device.id)?.card.remove(); loadUiMap.delete(device.id);
      DEVICE_LIBRARY.splice(DEVICE_LIBRARY.indexOf(device), 1); delete state.loads[device.id];
    }
    payload.defaults.customLoads.forEach(addCustomLoad);
  }
  if (payload.defaults?.trip) state.trip = { ...state.trip, ...cloneValue(payload.defaults.trip) };
  else {
    state.trip.nominalVoltage = state.voltage / 12 * (state.chemistry === 'lifepo4' ? 12.8 : 12);
    state.trip.chargeVoltage = state.voltage / 12 * 14.2;
  }
  if (payload.componentMode) state.componentMode = payload.componentMode;
  if (payload.manualComponents) for (const key of COMPONENT_KEYS) {
    if (payload.manualComponents[key] !== undefined) state.manualComponents[key] = String(payload.manualComponents[key]);
  }
  state.activePreset = null;
  setComponentModeUi(state.componentMode);
  renderTripControls();
  DEVICE_LIBRARY.forEach(refreshLoadDetails);
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

  applyingPreset = true;
  solarRequestNonce += 1;
  state.activePreset = presetName;

  DEVICE_LIBRARY.forEach((device) => {
    const presetValue = preset.loads[device.id];
    if (!presetValue) {
      return;
    }

    Object.assign(state.loads[device.id], { customWatts: null, customDutyFactor: null, quantity: 1, measuredWh: null,
      surgeWatts: device.watts, ...LOAD_DEFAULTS[device.id] });
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
    solarRequestNonce += 1;
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
  state.trip.nominalVoltage = state.voltage / 12 * (state.chemistry === 'lifepo4' ? 12.8 : 12);
  state.trip.chargeVoltage = state.voltage / 12 * 14.2;
  state.trip.schedule = [];
  renderTripControls();
  DEVICE_LIBRARY.forEach(refreshLoadDetails);
  resetManualSelections();
  setComponentModeUi('auto');
  byId('presetStatus').textContent = `${presetName === 'remote' ? 'Remote Work' : presetName === 'fulltime' ? 'Full-Time' : 'Weekender'} starting point.`;

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
  presetSignature = JSON.stringify(buildSettingsPayload());
  applyingPreset = false;
}

function wirePresetButtons() {
  byId("presets").querySelectorAll(".preset-btn").forEach((button) => {
    button.addEventListener("click", () => applyPreset(button.dataset.preset));
  });
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
            <span>${escapeHtml(entry.name)}</span>
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

function addLoadDetails(card, device) {
  const config = state.loads[device.id];
  const details = document.createElement('details');
  details.className = 'load-details';
  details.innerHTML = `<summary>Schedule, quantity & measured use</summary>
    <div class="planning-fields">
      <label>Quantity<input required data-detail="quantity" type="number" min="1" max="20" step="1" value="${config.quantity ?? 1}" /></label>
      <label>Starts at (0–23h)<input required data-detail="startHour" type="number" min="0" max="23" step="1" value="${config.startHour ?? 9}" /></label>
      <label>Power connection<select data-detail="powerPath"><option value="dc">Direct DC</option><option value="usb">USB / DC converter</option><option value="ac">AC inverter</option></select></label>
      ${device.id !== 'fridge' ? `<label>Daily runtime (hours)<input required data-detail="hours" type="number" min="0" max="24" step="any" value="${config.hours}" /></label><label>Running duty (%)<input required data-detail="customDutyFactor" type="number" min="0" max="100" step="any" value="${getDeviceDutyFactor(device) * 100}" /></label>` : ''}
      <label>Measured Wh/day per device<input data-detail="measuredWh" type="number" min="0" max="100000" placeholder="Optional" value="${config.measuredWh ?? ''}" /></label>
      <label>Startup / peak watts<input required data-detail="surgeWatts" type="number" min="0" max="30000" value="${config.surgeWatts ?? device.watts}" /></label>
    </div>
    <p class="load-note">Operating watts estimate daily energy; peak watts check inverter and battery limits. Measured energy overrides cycling and watts × hours, but keeps the schedule. Blank removes the override.</p>`;
  details.querySelector('select').value = config.powerPath ?? 'dc';
  details.querySelectorAll('input, select').forEach(input => {
    input.setAttribute('aria-label', `${device.name}: ${input.parentElement.firstChild.textContent.trim()}`);
    input.addEventListener('input', () => {
      if (!input.checkValidity()) return;
      const key = input.dataset.detail;
      state.loads[device.id][key] = key === 'powerPath' ? input.value : key === 'measuredWh' && input.value === '' ? null : Number(input.value) / (key === 'customDutyFactor' ? 100 : 1);
      if (key === 'hours') {
        const ui = loadUiMap.get(device.id);
        if (ui.slider) ui.slider.value = input.value;
        updateLoadCard(device.id);
      }
      if (device.id === 'fridge') updateLoadCard(device.id);
      calculate();
    });
  });
  card.append(details);
  if (device.id === 'starlink') {
    const label = document.createElement('label');
    label.className = 'select-field';
    label.innerHTML = `Hardware preset<select aria-label="Starlink hardware preset"><option value="">Custom / generic</option><option value="32">Mini (32 W planning average)</option><option value="88">Standard 4 (88 W planning average)</option></select>`;
    label.querySelector('select').addEventListener('change', event => {
      if (!event.target.value) return;
      config.customWatts = Number(event.target.value); config.surgeWatts = Number(event.target.value);
      updateLoadCard(device.id); calculate();
    });
    details.append(label);
    const note = document.createElement('p'); note.className = 'load-note';
    note.innerHTML = `Manufacturer average ranges: <a href="https://www.starlink.com/public-files/specification_sheet_mini.pdf" target="_blank" rel="noopener">Mini 25–40 W</a>, <a href="https://starlink.com/public-files/specification_sheet_standard4.pdf" target="_blank" rel="noopener">Standard 4 75–100 W</a>. Select your actual power connection and verify peak draw. Sources checked October 2026.`;
    details.append(note);
  }
  const pin = card.querySelector('[data-change-location]');
  if (pin) pin.addEventListener('click', () => openMapModal('fridge'));
  if (!BUILTIN_IDS.has(device.id)) {
    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'ghost-btn compact-btn'; remove.textContent = 'Remove appliance';
    remove.addEventListener('click', () => {
      DEVICE_LIBRARY.splice(DEVICE_LIBRARY.indexOf(device), 1);
      delete state.loads[device.id]; loadUiMap.delete(device.id); card.remove(); calculate();
    });
    card.append(remove);
  }
}

function refreshLoadDetails(device) {
  const card = loadUiMap.get(device.id)?.card;
  if (!card) return;
  for (const input of card.querySelectorAll('[data-detail]')) {
    input.value = input.dataset.detail === 'customDutyFactor' ? getDeviceDutyFactor(device) * 100 : state.loads[device.id][input.dataset.detail] ?? '';
  }
}

function addCustomLoad(load) {
  const device = { id: load.id, name: load.name, watts: load.watts ?? 50, dutyFactor: 1,
    note: 'Enter measured operating watts or daily energy. Choose how and when it is powered.',
    maxHours: 24, step: 0.25, defaultOn: true, defaultHours: 1 };
  DEVICE_LIBRARY.push(device);
  state.loads[device.id] = { enabled: true, hours: 1, lightType: null, customWatts: null,
    quantity: 1, measuredWh: null, startHour: 18, powerPath: 'dc', surgeWatts: device.watts, ...load };
  byId('loadsGrid').append(createLoadCard(device));
}

function ensureTripSchedule() {
  state.trip.days = Math.round(state.trip.days);
  while (state.trip.schedule.length < state.trip.days) state.trip.schedule.push({
    solarFactor: 1, driveHours: state.alternator.driveHoursDay, driveStartHour: 10, shoreHours: 0, shoreStartHour: 18
  });
  state.trip.schedule.length = state.trip.days;
}

function renderTripControls() {
  ensureTripSchedule();
  for (const key of Object.keys(state.trip)) {
    const input = byId(key === 'days' ? 'tripDays' : key);
    if (input) input.value = typeof state.trip[key] === 'number' ? Number(state.trip[key].toFixed(6)) : state.trip[key];
  }
  const wrap = byId('tripSchedule');
  wrap.innerHTML = `<table class="plan-table"><caption>Daily charging schedule</caption><thead><tr><th>Day</th><th>Solar %</th><th>Drive h</th><th>Start h</th><th>Shore h</th><th>Start h</th></tr></thead><tbody>${state.trip.schedule.map((day, index) => `<tr><th scope="row">${index + 1}</th>${[
    ['solarFactor', day.solarFactor * 100, 0, 120, 5, 'solar percent'],
    ['driveHours', day.driveHours, 0, 24, 0.25, 'driving hours'],
    ['driveStartHour', day.driveStartHour, 0, 23, 1, 'drive start hour'],
    ['shoreHours', day.shoreHours, 0, 24, 0.5, 'shore hours'],
    ['shoreStartHour', day.shoreStartHour, 0, 23, 1, 'shore start hour']
  ].map(([key, value, min, max, step, label]) => `<td><input type="number" required data-day="${index}" data-day-key="${key}" min="${min}" max="${max}" step="${key.endsWith('StartHour') ? 1 : 'any'}" value="${value}" aria-label="Day ${index + 1} ${label}" /></td>`).join('')}</tr>`).join('')}</tbody></table>`;
  wrap.querySelectorAll('input').forEach(input => input.addEventListener('input', () => {
    if (!input.checkValidity() || input.value === '') return;
    state.trip.schedule[Number(input.dataset.day)][input.dataset.dayKey] = Number(input.value) / (input.dataset.dayKey === 'solarFactor' ? 100 : 1);
    calculate();
  }));
}

function wirePlanningControls() {
  for (const key of Object.keys(state.trip).filter(key => key !== 'schedule')) {
    const input = byId(key === 'days' ? 'tripDays' : key);
    if (!input) continue;
    input.required = true;
    input.addEventListener('input', () => {
      if (!input.checkValidity()) return;
      state.trip[key] = Number(input.value);
      if (key === 'days') renderTripControls();
      calculate();
    });
  }
  byId('cloudyScenario').addEventListener('click', () => {
    ensureTripSchedule();
    state.trip.schedule.slice(0, 3).forEach(day => { day.solarFactor = 0.15; day.driveHours = 0; day.shoreHours = 0; });
    renderTripControls(); calculate();
  });
  byId('resetSchedule').addEventListener('click', () => { state.trip.schedule = []; renderTripControls(); calculate(); });
  byId('addLoadForm').addEventListener('submit', event => {
    event.preventDefault();
    const name = byId('customLoadName').value.trim();
    if (!name || DEVICE_LIBRARY.filter(device => !BUILTIN_IDS.has(device.id)).length >= 30) return;
    addCustomLoad({ id: `custom-${crypto.randomUUID()}`, name, watts: 50 });
    byId('customLoadName').value = ''; calculate();
  });
  byId('applySuggested').addEventListener('click', () => {
    if (!lastPlan) return;
    state.installedAh = lastPlan.batterySize.value;
    if (lastPlan.config.solarWatts > 0) {
      state.solar.enabled = true; state.solar.watts = lastPlan.suggestedSolar;
    }
    if (lastPlan.config.alternatorWatts > 0) {
      state.alternator.enabled = true;
      state.alternator.powerWatts = Math.max(lastPlan.alternatorSize.value, lastPlan.config.alternatorWatts);
    }
    resetManualSelections(); setComponentModeUi('auto');
    uiSetters.installedAh(state.installedAh); uiSetters.solarWatts(state.solar.watts); uiSetters.altPower(state.alternator.powerWatts);
    setSolarToggleUi(state.solar.enabled); setAlternatorToggleUi(state.alternator.enabled);
    refreshRechargeVisibility(); calculate();
  });
  byId('sharePlan').addEventListener('click', async () => {
    const encoded = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(buildSettingsPayload()))));
    const url = new URL(window.location.href); url.hash = `plan=${encoded}`;
    byId('shareLink').value = url.href;
    try {
      await navigator.clipboard.writeText(url.href);
      byId('settingsStatus').textContent = 'Share link copied. It contains your plan and any pinned locations; API keys are excluded.';
    } catch {
      byId('shareLink').classList.remove('hidden'); byId('shareLink').select();
      byId('settingsStatus').textContent = 'Copy the selected link. It includes your plan and pinned locations.';
    }
  });
  byId('printPlan').addEventListener('click', () => window.print());
  document.querySelector('label[for="uploadSettings"]').addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); byId('uploadSettings').click(); }
  });
  byId('loadsGrid').addEventListener('toggle', scheduleLoadGridLayout, true);
}

function makeLoadProfile() {
  const fridge = computeFridgeThermalModel();
  const fridgeWeights = Array.from({ length: 24 }, (_, hour) => hour >= 7 && hour < 21 ? fridge.dayDuty : fridge.nightDuty);
  const fridgeWeightTotal = fridgeWeights.reduce((sum, value) => sum + value, 0);
  return buildLoadProfile(DEVICE_LIBRARY.map(device => {
    const load = state.loads[device.id];
    return { ...load, id: device.id, name: device.name, watts: getDeviceWatts(device, load),
      dutyFactor: getDeviceDutyFactor(device),
      hourlyWh: device.id === 'fridge' && load.measuredWh == null ? fridgeWeights.map(value => fridge.dailyWh * value / fridgeWeightTotal) : undefined };
  }), { inverterEfficiency: state.assumptions.inverterEfficiencyPct / 100,
    inverterIdleWatts: state.assumptions.inverterIdleWatts, inverterOnHours: state.trip.inverterOnHours });
}

function makeSystem(profile) {
  const selected = {};
  selected.batteryAh = resolveComponentValue('batteryAh', state.installedAh);
  selected.solarWatts = resolveComponentValue('solarWatts', state.solar.enabled ? state.solar.watts : 0);
  selected.alternatorWatts = resolveComponentValue('alternatorWatts', state.alternator.enabled ? state.alternator.powerWatts : 0);
  selected.solarChargerAmps = resolveComponentValue('solarChargerAmps', pickTier(selected.solarWatts.value / state.trip.chargeVoltage * 1.25, state.componentTiers.solarChargerAmps));
  selected.shoreAmps = resolveComponentValue('shoreAmps', state.trip.shoreAmps);
  selected.inverterWatts = resolveComponentValue('inverterWatts', pickTier(Math.max(profile.peakAcWatts * 1.25, state.trip.inverterOnHours > 0 ? 600 : 0), state.componentTiers.inverterWatts));
  const sun = getSolarSunHoursModel();
  const config = { ...state.trip, batteryAh: selected.batteryAh.value, solarWatts: selected.solarWatts.value,
    solarChargerAmps: selected.solarChargerAmps.value, alternatorWatts: selected.alternatorWatts.value,
    shoreAmps: selected.shoreAmps.value, chemistry: state.chemistry, dod: CHEMISTRY[state.chemistry].dod,
    sunHours: sun.adjustedHours, solarEfficiency: state.solar.efficiencyPct / 100 };
  return { selected, config, sun };
}

function renderChart(trip) {
  const x = hour => 42 + hour / (state.trip.days * 24) * 500;
  const y = soc => 154 - soc * 1.3;
  const path = trip.samples.map((sample, index) => `${index ? 'L' : 'M'}${x(sample.hour).toFixed(1)},${y(sample.socPct).toFixed(1)}`).join(' ');
  const svg = byId('batteryChart');
  svg.innerHTML = `<title>Hourly battery charge: minimum ${trip.minimumSocPct.toFixed(1)}%, reserve ${trip.reservePct.toFixed(0)}%</title>
    ${[0, 50, 100].map(soc => `<line x1="42" x2="542" y1="${y(soc)}" y2="${y(soc)}" class="chart-grid"/><text x="4" y="${y(soc) + 4}">${soc}%</text>`).join('')}
    <rect x="42" y="${y(trip.reservePct)}" width="500" height="${154 - y(trip.reservePct)}" class="chart-reserve-area"/>
    <line x1="42" x2="542" y1="${y(trip.reservePct)}" y2="${y(trip.reservePct)}" class="chart-reserve"/>
    <path d="${path}" class="chart-battery"/>
    ${Array.from({length: Math.min(state.trip.days, 7) + 1}, (_, i) => {
      const day = i * state.trip.days / Math.min(state.trip.days, 7);
      return `<text x="${x(day * 24)}" y="178" text-anchor="middle">${day === 0 ? 'Start' : `Day ${Math.round(day)}`}</text>`;
    }).join('')}`;
  svg.setAttribute('aria-label', `Battery charge over ${state.trip.days} days. Minimum ${trip.minimumSocPct.toFixed(1)} percent. Reserve ${trip.reservePct.toFixed(0)} percent.`);
  byId('chartSummary').textContent = `Minimum ${trip.minimumSocPct.toFixed(1)}% · End ${trip.daily.at(-1).endSocPct.toFixed(1)}% · Reserve ${trip.reservePct.toFixed(0)}%. Shaded area is below reserve.`;
  byId('dailyResults').innerHTML = `<table class="plan-table"><caption>Daily energy at the battery bus</caption><thead><tr><th>Day</th><th>Use</th><th>Solar</th><th>Drive</th><th>Shore</th><th>Stored</th><th>Unused</th><th>End</th></tr></thead><tbody>${trip.daily.map(day => `<tr><th scope="row">${day.day}</th>${['loadWh','solarWh','alternatorWh','shoreWh','acceptedWh','curtailedWh'].map(key => `<td>${formatEnergy(day[key])}</td>`).join('')}<td>${day.endSocPct.toFixed(0)}%</td></tr>`).join('')}</tbody></table><p class="assumption-note">Stored is charging accepted by the battery after losses; other generation can serve loads directly. Unused generation is limited by full capacity, charger limits, or temperature.</p>`;
}

function calculate() {
  if (!byId('tripVerdict')) return;
  ensureTripSchedule();
  const profile = makeLoadProfile();
  const { selected, config, sun } = makeSystem(profile);
  const trip = simulateTrip(config, profile, state.trip.schedule);
  const tripMinimum = sizeBatteryForTrip(config, profile, state.trip.schedule);
  const floor = trip.reservePct / 100;
  const usableFraction = Math.max(0, config.startSocPct / 100 - floor);
  const capacityFactor = temperatureCapacity(config.batteryTempF) * config.healthPct / 100;
  const minimumAh = profile.dailyWh === 0 ? 0 : usableFraction > 0 ? profile.dailyWh * state.autonomyDays / (config.nominalVoltage * capacityFactor * usableFraction) : Infinity;
  const batterySize = pickSize(Math.max(Number.isFinite(minimumAh) ? minimumAh : 0, tripMinimum.value ?? 0), state.componentTiers.batteryAh);
  const solarRequired = config.solarWatts > 0 && sun.adjustedHours > 0 ? profile.dailyWh * 1.25 / (sun.adjustedHours * config.solarEfficiency) : 0;
  const solarSize = pickSize(solarRequired, state.componentTiers.solarWatts);
  const suggestedSolar = Math.min(solarSize.value, config.roofSolarMax);
  const averageDriveHours = state.trip.schedule.reduce((sum, day) => sum + day.driveHours, 0) / state.trip.days;
  const typicalGap = Math.max(0, profile.dailyWh - suggestedSolar * sun.adjustedHours * config.solarEfficiency);
  const alternatorSize = pickSize(config.alternatorWatts > 0 && averageDriveHours > 0 ? typicalGap / averageDriveHours : 0, state.componentTiers.alternatorWatts);
  const inverterSize = pickSize(profile.peakAcWatts * 1.25, state.componentTiers.inverterWatts);
  const controllerSize = pickSize(config.solarWatts / config.chargeVoltage * 1.25, state.componentTiers.solarChargerAmps);
  const warnings = [];
  const faults = [];
  if (profile.acEnergyWh > 0 && selected.inverterWatts.value === 0) faults.push('AC appliances need an inverter or a different power connection.');
  else if (selected.inverterWatts.value < profile.peakAcWatts) faults.push(`Scheduled AC peak (${Math.ceil(profile.peakAcWatts)} W) exceeds the selected ${selected.inverterWatts.value} W inverter. Change the schedule or inverter.`);
  const peakAmps = profile.peakBatteryWatts / (config.nominalVoltage * 0.9);
  if (peakAmps > config.maxDischargeAmps) faults.push(`Estimated battery peak is ${Math.ceil(peakAmps)} A at 90% of nominal voltage, above your ${config.maxDischargeAmps} A discharge limit. Check battery/BMS and surge ratings.`);
  if (config.solarWatts > 0 && config.solarChargerAmps === 0) faults.push('Solar panels have no charge controller. Solar contributes zero energy.');
  if (state.trip.schedule.some(day => day.shoreHours > 0) && config.shoreAmps === 0) warnings.push('Shore time is entered, but no shore charger is selected.');
  if (!trip.chargeAllowed) warnings.push(`Battery temperature is below your ${config.chargeCutoffF}°F lithium charge cutoff. Charging is blocked in this model. Follow your battery manufacturer's limit.`);
  if (config.solarWatts > config.roofSolarMax) warnings.push(`Selected solar exceeds your ${config.roofSolarMax} W space limit. Verify the layout or use portable panels.`);
  if (solarRequired > config.roofSolarMax) warnings.push(`Typical solar-only sizing needs about ${Math.ceil(solarRequired)} W, above your space limit. Plan driving, shore charging, or lower use.`);
  if (batterySize.exceeds) warnings.push(`Battery requirement exceeds listed single-bank tiers: at least ${batterySize.value} Ah. Check a multi-battery configuration.`);
  if (inverterSize.exceeds) warnings.push(`Required inverter size exceeds listed tiers: about ${inverterSize.value} W with headroom.`);
  if (controllerSize.exceeds) warnings.push(`Required MPPT output exceeds listed tiers: ${controllerSize.value} A. Consider multiple controllers.`);
  if (alternatorSize.exceeds) warnings.push(`Alternator sizing exceeds listed tiers: ${alternatorSize.value} W. Verify vehicle-side current and alternator capacity.`);
  if (controllerSize.value > config.solarChargerAmps && config.solarWatts > 0) warnings.push('The selected MPPT can clip solar output. Its output-current limit is included in the trip simulation; panel input voltage still needs checking.');
  if (state.voltage === 24 && DEVICE_LIBRARY.some(device => state.loads[device.id].enabled && state.loads[device.id].powerPath === 'dc' && BUILTIN_IDS.has(device.id))) warnings.push('A 24 V bank may need a 24-to-12 V converter for direct DC appliances. Select USB / DC converter to include conversion losses and confirm device voltage.');
  if (state.chemistry === 'agm') warnings.push('AGM capacity uses a generic temperature curve. High discharge current and absorption taper can reduce performance beyond this estimate.');
  const fallback = state.solarPrecision.enabled && (!sun.usingPvWatts || state.solarPrecision.status !== 'ready');
  if (fallback) warnings.push('Historical solar data is unavailable or loading. Solar sizing uses your manual baseline.');
  if (state.fridgePrecision.enabled && fridgeClimateStatus !== 'ready' && state.loads.fridge.enabled) warnings.push('Fridge climate data is unavailable or loading. Cycling uses a temperature estimate.');
  const totals = trip.daily.reduce((sum, day) => ({ solar: sum.solar + day.solarWh, drive: sum.drive + day.alternatorWh, shore: sum.shore + day.shoreWh, stored: sum.stored + day.acceptedWh }), {solar:0, drive:0, shore:0, stored:0});
  const averageRecharge = (totals.solar + totals.drive + totals.shore) / state.trip.days;
  const balance = averageRecharge - profile.dailyWh;
  byId('dailyUseBig').textContent = `${formatEnergy(profile.dailyWh)}/day`;
  byId('mobileDailyUse').textContent = `${formatEnergy(profile.dailyWh)}/day`;
  byId('dailyUseAh').textContent = `${(profile.dailyWh / config.nominalVoltage).toFixed(1)} Ah/day @ ${config.nominalVoltage.toFixed(1)} V nominal`;
  byId('usagePersona').textContent = energyPersona(profile.dailyWh);
  byId('dailyRecharge').textContent = formatEnergy(averageRecharge);
  byId('netFromBattery').textContent = `${formatEnergy(Math.abs(balance))} ${balance >= 0 ? 'surplus' : 'deficit'}`;
  byId('autonomyTarget').textContent = `${state.autonomyDays} days`;
  byId('estimatedSunHours').textContent = `${sun.adjustedHours.toFixed(1)} hr`;
  byId('sunHoursSource').textContent = fallback ? `Solar data ${state.solarPrecision.status === 'loading' ? 'loading' : 'unavailable'}; using ${sun.adjustedHours.toFixed(1)} peak sun-hours. ${state.solarPrecision.error}` : sun.source;
  byId('dataQuality').textContent = `Solar: ${sun.usingPvWatts ? 'historical monthly irradiation + generic system losses' : 'manual baseline'} · Daily weather: scenario assumptions · Battery: generic temperature curve.`;
  byId('dataQuality').classList.toggle('is-fallback', fallback);
  byId('recNoChargeAh').textContent = Number.isFinite(minimumAh) ? formatAh(minimumAh) : 'Raise starting charge';
  byId('recNoChargeWh').textContent = Number.isFinite(minimumAh) ? `${formatEnergy(Math.ceil(minimumAh / 10) * 10 * config.nominalVoltage)} nominal bank · starts at ${config.startSocPct}%` : 'Starting charge must exceed the reserve.';
  byId('recRechargeAh').textContent = tripMinimum.possible ? formatAh(tripMinimum.value) : 'No feasible size';
  byId('recRechargeWh').textContent = tripMinimum.possible ? `${formatEnergy(tripMinimum.value * config.nominalVoltage)} nominal bank · keeps ${trip.reservePct.toFixed(0)}% reserve` : 'Raise starting charge or adjust your charging limits and schedule.';
  byId('runtimeNoCharge').textContent = profile.dailyWh > 0 ? formatDays(Math.max(0, trip.capacityWh * usableFraction) / profile.dailyWh) : 'No consumption';
  byId('runtimeWithRecharge').textContent = trip.firstReserveHour == null ? `Not within ${state.trip.days} days` : trip.firstReserveHour === 0 ? 'At trip start' : `Day ${Math.floor(trip.firstReserveHour / 24) + 1}, ${String(trip.firstReserveHour % 24).padStart(2, '0')}:00`;
  byId('runwayText').textContent = `Available above reserve at departure: ${formatEnergy(Math.max(0, trip.capacityWh * usableFraction))}. Average solar ${formatEnergy(totals.solar / state.trip.days)}, driving ${formatEnergy(totals.drive / state.trip.days)}, shore ${formatEnergy(totals.shore / state.trip.days)} per day. Battery accepts ${formatEnergy(totals.stored / state.trip.days)}/day after charging losses.`;
  const verdict = byId('tripVerdict');
  verdict.textContent = faults.length ? 'Equipment needs attention' : trip.passes ? `Stays above reserve for ${state.trip.days} days` : trip.unservedWh > 0 ? `Energy runs out during this ${state.trip.days}-day trip` : `Reserve is reached during this ${state.trip.days}-day trip`;
  verdict.closest('.trip-result').classList.toggle('trip-fails', !trip.passes || faults.length > 0);
  byId('tripAdvice').textContent = faults.length ? `${faults[0]} The chart shows requested energy, assuming compatible equipment.` : trip.passes ? `${trip.minimumSocPct.toFixed(1)}% is the lowest modeled charge. Try the cloudy-day scenario to test a harder trip.` : tripMinimum.possible ? `For this schedule, try at least ${formatAh(tripMinimum.value)} at ${config.nominalVoltage.toFixed(1)} V, add charging before the reserve is reached, or reduce the largest loads.` : 'Start above your reserve and check charging limits before sizing a larger bank.';
  const display = [
    ['batteryAh','Battery',`${selected.batteryAh.value} Ah @ ${config.nominalVoltage.toFixed(1)} V`,`${formatEnergy(trip.nominalWh)} nominal; ${formatEnergy(trip.capacityWh)} temperature/health-adjusted.`],
    ['solarWatts','Solar',config.solarWatts ? `${config.solarWatts} W` : 'No solar panels',`${sun.adjustedHours.toFixed(1)} peak sun-hours before each day's weather percentage.`],
    ['solarChargerAmps','SolarCharger',config.solarChargerAmps ? `${config.solarChargerAmps} A MPPT` : 'No MPPT','Output limit is modeled. Verify cold panel voltage and input current separately.'],
    ['alternatorWatts','Alternator',config.alternatorWatts ? `${config.alternatorWatts} W DC-DC` : 'No DC-DC',`Output at battery bus; vehicle-side demand is about ${Math.ceil(config.alternatorWatts / (state.assumptions.alternatorEfficiencyPct / 100))} W before vehicle wiring losses.`],
    ['shoreAmps','Shore',config.shoreAmps ? `${config.shoreAmps} A charger` : 'No shore charger','Only contributes during entered shore hours; charge acceptance is limited by the battery.'],
    ['inverterWatts','Inverter',selected.inverterWatts.value ? `${selected.inverterWatts.value} W pure sine` : 'No inverter',`Scheduled AC peak ${Math.ceil(profile.peakAcWatts)} W. ${state.assumptions.inverterEfficiencyPct}% conversion efficiency + ${state.assumptions.inverterIdleWatts} W standby.`]
  ];
  for (const [key, suffix, value, note] of display) {
    byId(`component${suffix}`).textContent = value;
    byId(`component${suffix}Note`).textContent = note;
    const pill = byId(`component${suffix}Mode`);
    pill.textContent = selected[key].manual ? 'Override' : ['batteryAh','solarWatts','alternatorWatts','shoreAmps'].includes(key) ? 'Input' : 'Sized';
    pill.classList.toggle('manual', selected[key].manual);
  }
  byId('suggestedSystem').textContent = `${batterySize.value} Ah bank covers the larger of your reserve-day and trip targets. ${config.solarWatts > 0 ? `${suggestedSolar} W solar${solarRequired > config.roofSolarMax ? ' (space-limited)' : ''}.` : 'Solar stays off.'} ${config.alternatorWatts > 0 ? `${Math.max(alternatorSize.value, config.alternatorWatts)} W DC-DC.` : 'Alternator charging stays off.'} Apply, then check the trip again. These sizes do not verify hardware compatibility.`;
  byId('applySuggested').disabled = !Number.isFinite(minimumAh) || !tripMinimum.possible || batterySize.value > 20000;
  byId('syncInstalled').disabled = !Number.isFinite(minimumAh);
  const warningBox = byId('systemWarnings');
  warningBox.classList.toggle('hidden', warnings.length + faults.length === 0);
  warningBox.innerHTML = [...faults, ...warnings].map(message => `<p class="system-warning">${escapeHtml(message)}</p>`).join('');
  updateBreakdown(profile.entries);
  renderChart(trip);
  lastResults = { recommendedAhNoRecharge: minimumAh, recommendedAhRecharge: tripMinimum.value };
  lastPlan = { profile, selected, config, trip, batterySize, suggestedSolar, alternatorSize, inverterSize };
  if (!initializing && !applyingPreset && JSON.stringify(buildSettingsPayload()) !== presetSignature) {
    state.activePreset = null;
    byId('presets').querySelectorAll('button').forEach(button => button.classList.remove('active'));
    byId('presetStatus').textContent = 'Customized plan.';
  }
  if (!initializing) {
    clearTimeout(savedPlanTimer);
    savedPlanTimer = setTimeout(() => safeLocalStorageSet(PLAN_STORAGE_KEY, JSON.stringify(buildSettingsPayload())), 250);
  }
}

function init() {
  window.addEventListener('pagehide', () => {
    clearTimeout(savedPlanTimer);
    if (!initializing) safeLocalStorageSet(PLAN_STORAGE_KEY, JSON.stringify(buildSettingsPayload()));
  });
  const mobileSteps = [...document.querySelectorAll("[data-mobile-step]")];
  mobileSteps.forEach((section, index) => {
    const button = section.querySelector(".mobile-step-toggle");
    if (window.matchMedia("(max-width: 760px)").matches && index > 0) {
      section.classList.add("mobile-step-collapsed");
      button.setAttribute("aria-expanded", "false");
      button.querySelector(".mobile-step-icon").textContent = "+";
    }

    button.addEventListener("click", () => {
      const isCollapsed = section.classList.toggle("mobile-step-collapsed");
      button.setAttribute("aria-expanded", String(!isCollapsed));
      button.querySelector(".mobile-step-icon").textContent = isCollapsed ? "+" : "−";
    });
  });

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
      state.trip.schedule.forEach(day => { day.driveHours = value; });
      renderTripControls();
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
    state.trip.nominalVoltage = state.voltage / 12 * (state.chemistry === 'lifepo4' ? 12.8 : 12);
    renderTripControls();
    calculate();
  });

  byId("batteryVoltage").addEventListener("change", (event) => {
    const previous = state.voltage;
    state.voltage = parseInt(event.target.value, 10);
    state.trip.nominalVoltage *= state.voltage / previous;
    state.trip.chargeVoltage *= state.voltage / previous;
    renderTripControls();
    calculate();
  });

  byId("syncInstalled").addEventListener("click", () => {
    if (!lastResults) {
      return;
    }

    const recommendation = pickTier(lastResults.recommendedAhNoRecharge, state.componentTiers.batteryAh);
    state.installedAh = recommendation;
    state.manualComponents.batteryAh = 'auto';
    buildManualSelectOptions();
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
  wirePlanningControls();
  window.addEventListener("resize", scheduleLoadGridLayout);
  refreshAssumptionUi();
  refreshRechargeVisibility();
  setComponentModeUi(state.componentMode);
  applyPreset("weekender");
  try {
    const shared = window.location.hash.startsWith('#plan=') ? window.location.hash.slice(6) : null;
    if (shared && shared.length > 100000) throw new Error('This shared plan is too large.');
    const stored = shared ? new TextDecoder().decode(Uint8Array.from(atob(shared), char => char.charCodeAt(0))) : safeLocalStorageGet(PLAN_STORAGE_KEY);
    if (stored) {
      applySettingsFromPayload(JSON.parse(stored));
      byId('settingsStatus').textContent = shared ? 'Shared plan loaded. Future edits save in this browser.' : 'Your saved plan has been restored.';
    }
  } catch (error) {
    byId('settingsStatus').textContent = `Saved/shared plan could not be loaded: ${error.message}`;
  }
  initializing = false;
  calculate();
}

document.addEventListener("DOMContentLoaded", init);
