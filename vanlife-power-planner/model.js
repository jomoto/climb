// All energy is Wh at the battery bus; component power is rated output power.
// This is a deterministic planning model, not a weather forecast or wiring design.
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function pickSize(required, tiers) {
  if (required <= 0) return { value: 0, required: 0, exceeds: false };
  const rounded = Math.ceil(required);
  const value = [...tiers].sort((a, b) => a - b).find(tier => tier >= rounded);
  return { value: value ?? rounded, required: rounded, exceeds: value === undefined };
}

export function temperatureCapacity(tempF) {
  const c = (tempF - 32) * 5 / 9;
  // Generic interpolation; actual capacity depends on battery model and discharge rate.
  if (c <= -20) return 0.5;
  if (c <= 0) return 0.5 + (c + 20) * 0.015;
  return clamp(0.8 + c * 0.008, 0.8, 1);
}

function durationInHour(start, hours, hour) {
  let duration = 0;
  for (const offset of [-24, 0, 24]) {
    duration += Math.max(0, Math.min(hour + 1, start + hours + offset) - Math.max(hour, start + offset));
  }
  return Math.min(duration, 1);
}

export function buildLoadProfile(loads, options = {}) {
  const efficiency = options.inverterEfficiency ?? 0.92;
  const dcEfficiency = options.dcEfficiency ?? 0.95;
  const idleWatts = options.inverterIdleWatts ?? 8;
  const idleHours = options.inverterOnHours ?? 0;
  const hourlyWh = Array(24).fill(0);
  const hourlyPeakAc = Array(24).fill(0);
  const hourlyPeakDc = Array(24).fill(0);
  const acOn = Array(24).fill(false);
  const entries = [];
  let overheadWh = 0;
  let acEnergyWh = 0;

  for (const load of loads.filter(load => load.enabled)) {
    const quantity = load.quantity ?? 1;
    const hours = load.hours;
    const watts = load.watts * quantity;
    const path = load.powerPath ?? 'dc';
    const conversion = path === 'ac' ? efficiency : path === 'usb' ? dcEfficiency : 1;
    const start = load.startHour ?? 9;
    let energy = 0;
    for (let hour = 0; hour < 24; hour++) {
      const duration = durationInHour(start, hours, hour);
      const deviceWh = load.hourlyWh
        ? load.hourlyWh[hour] * quantity
        : load.measuredWh != null
          ? load.measuredWh * quantity * (hours > 0 ? duration / hours : 1 / 24)
          : watts * (load.dutyFactor ?? 1) * duration;
      energy += deviceWh;
      hourlyWh[hour] += deviceWh / conversion;
      overheadWh += deviceWh * (1 / conversion - 1);
      if (path === 'ac') {
        acEnergyWh += deviceWh;
        if (duration > 0 || deviceWh > 0) {
          acOn[hour] = true;
          hourlyPeakAc[hour] += Math.max(watts, (load.surgeWatts ?? load.watts) * quantity);
        }
      } else if (duration > 0 || deviceWh > 0) {
        hourlyPeakDc[hour] += Math.max(watts, (load.surgeWatts ?? load.watts) * quantity) / conversion;
      }
    }
    entries.push({ id: load.id, name: load.name, wh: energy });
  }
  // Explicit on-time is an additional window starting at midnight; automatic
  // on-time is the union of all scheduled AC use, including non-overlapping use.
  for (let hour = 0; hour < 24; hour++) {
    const onFraction = Math.max(acOn[hour] ? 1 : 0, durationInHour(0, idleHours, hour));
    const idle = onFraction * idleWatts;
    hourlyWh[hour] += idle;
    overheadWh += idle;
    if (onFraction > 0) hourlyPeakDc[hour] += idleWatts;
  }
  if (overheadWh > 0) entries.push({ id: 'conversion-overhead', name: 'Conversion & inverter standby', wh: overheadWh });
  return {
    hourlyWh, entries, acEnergyWh,
    dailyWh: hourlyWh.reduce((a, b) => a + b, 0),
    peakAcWatts: Math.max(...hourlyPeakAc),
    peakBatteryWatts: Math.max(...hourlyPeakAc.map((ac, hour) => ac / efficiency + hourlyPeakDc[hour]))
  };
}

export function solarProfile(dailyWh, daylightHours = 12) {
  const sunrise = 12 - daylightHours / 2;
  const weights = Array.from({ length: 24 }, (_, hour) => {
    // Four midpoint samples make short winter days and fractional sunrise smooth.
    let sum = 0;
    for (let sample = 0; sample < 4; sample++) {
      const phase = (hour + (sample + 0.5) / 4 - sunrise) / daylightHours;
      if (phase > 0 && phase < 1) sum += Math.sin(Math.PI * phase);
    }
    return sum;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  return weights.map(weight => total ? dailyWh * weight / total : 0);
}

export function simulateTrip(config, profile, days) {
  const nominalWh = config.batteryAh * config.nominalVoltage;
  const capacityWh = nominalWh * (config.healthPct / 100) * temperatureCapacity(config.batteryTempF);
  const reservePct = Math.max(config.reservePct, (1 - config.dod) * 100);
  const reserveWh = capacityWh * reservePct / 100;
  let storedWh = capacityWh * config.startSocPct / 100;
  let minimumWh = storedWh;
  let firstReserveHour = storedWh < reserveWh ? 0 : null;
  let unservedWh = 0;
  let curtailedWh = 0;
  let chargeLossWh = 0;
  const chargeAllowed = config.batteryTempF >= config.chargeCutoffF || config.chemistry === 'agm';
  const maxChargeWatts = config.maxChargeAmps * config.chargeVoltage;
  const samples = [{ hour: 0, socPct: config.startSocPct }];
  const daily = [];
  const solarBaseWh = config.solarWatts * config.sunHours * config.solarEfficiency;
  const solarTemplate = solarProfile(solarBaseWh, config.daylightHours);
  const chargeEfficiency = config.chargeEfficiency ?? 0.98;
  const events = key => days.map((day, index) => ({ start: index * 24 + (day[`${key}StartHour`] ?? (key === 'drive' ? 10 : 18)), hours: day[`${key}Hours`] }));
  const driving = events('drive');
  const shore = events('shore');
  const eventDuration = (schedule, hour) => Math.min(1, schedule.reduce((sum, event) => sum + Math.max(0, Math.min(hour + 1, event.start + event.hours) - Math.max(hour, event.start)), 0));

  days.forEach((day, index) => {
    const summary = { day: index + 1, loadWh: 0, solarWh: 0, alternatorWh: 0, shoreWh: 0, acceptedWh: 0, curtailedWh: 0, unservedWh: 0 };
    for (let hour = 0; hour < 24; hour++) {
      const solarWh = chargeAllowed ? Math.min(solarTemplate[hour] * day.solarFactor, config.solarChargerAmps * config.chargeVoltage) : 0;
      const alternatorWh = chargeAllowed ? config.alternatorWatts * eventDuration(driving, index * 24 + hour) : 0;
      const shoreWh = chargeAllowed ? config.shoreAmps * config.chargeVoltage * eventDuration(shore, index * 24 + hour) : 0;
      const generationWh = solarWh + alternatorWh + shoreWh;
      const loadWh = profile.hourlyWh[hour];
      const directWh = Math.min(generationWh, loadWh);
      const surplusWh = generationWh - directWh;
      const chargeInputWh = chargeAllowed ? Math.min(surplusWh, maxChargeWatts, Math.max(0, capacityWh - storedWh) / chargeEfficiency) : 0;
      const chargedWh = chargeInputWh * chargeEfficiency;
      const deficitWh = loadWh - directWh;
      const dischargedWh = Math.min(storedWh, deficitWh);
      const missingWh = deficitWh - dischargedWh;
      storedWh = clamp(storedWh + chargedWh - dischargedWh, 0, capacityWh);
      minimumWh = Math.min(minimumWh, storedWh);
      if (firstReserveHour == null && storedWh < reserveWh - 0.001) firstReserveHour = index * 24 + hour + 1;
      const wastedWh = surplusWh - chargeInputWh;
      unservedWh += missingWh;
      curtailedWh += wastedWh;
      chargeLossWh += chargeInputWh - chargedWh;
      summary.loadWh += loadWh;
      summary.solarWh += solarWh;
      summary.alternatorWh += alternatorWh;
      summary.shoreWh += shoreWh;
      summary.acceptedWh += chargedWh;
      summary.curtailedWh += wastedWh;
      summary.unservedWh += missingWh;
      samples.push({ hour: index * 24 + hour + 1, socPct: capacityWh ? storedWh / capacityWh * 100 : 0 });
    }
    summary.endSocPct = capacityWh ? storedWh / capacityWh * 100 : 0;
    daily.push(summary);
  });
  return {
    samples, daily, reservePct, nominalWh, capacityWh, storedWh, reserveWh,
    minimumSocPct: capacityWh ? minimumWh / capacityWh * 100 : 0,
    firstReserveHour, unservedWh, curtailedWh, chargeLossWh, chargeAllowed,
    passes: firstReserveHour == null && unservedWh < 0.001
  };
}

export function sizeBatteryForTrip(config, profile, days, maxAh = 20000) {
  if (config.startSocPct < Math.max(config.reservePct, (1 - config.dod) * 100)) return { value: null, possible: false };
  if (profile.dailyWh === 0) return { value: 0, possible: true };
  if (config.startSocPct <= Math.max(config.reservePct, (1 - config.dod) * 100)) return { value: null, possible: false };
  if (!simulateTrip({ ...config, batteryAh: maxAh }, profile, days).passes) return { value: null, possible: false };
  let low = 0;
  let high = maxAh;
  for (let i = 0; i < 24; i++) {
    const middle = (low + high) / 2;
    if (simulateTrip({ ...config, batteryAh: middle }, profile, days).passes) high = middle;
    else low = middle;
  }
  return { value: Math.ceil(high / 10) * 10, possible: true };
}

// Validate before any mutation. Version 1 plans remain importable.
export function validateSettings(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Choose a settings object.');
  if (payload.version != null && ![1, 2].includes(payload.version)) throw new Error('This plan version is not supported.');
  const finite = (value, min, max, path) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`${path} must be a number from ${min} to ${max}.`);
  };
  const visit = (value, path = '') => {
    if (value == null) {
      if (path.endsWith('.customWatts') || path.endsWith('.customDutyFactor') || path.endsWith('.measuredWh') || path.endsWith('.lightType')) return;
      throw new Error(`${path || 'Settings'} cannot be empty.`);
    }
    if (typeof value === 'number') finite(value, -1000000, 1000000, path);
    if (typeof value === 'object') for (const [key, child] of Object.entries(value)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Invalid settings key.');
      visit(child, path ? `${path}.${key}` : key);
    }
  };
  visit(payload);
  for (const key of ['assumptions', 'componentTiers', 'defaults', 'manualComponents']) {
    if (payload[key] !== undefined && (typeof payload[key] !== 'object' || Array.isArray(payload[key]))) throw new Error(`${key} must be an object.`);
  }
  for (const key of ['solar', 'alternator', 'fridge', 'battery', 'loads', 'trip']) {
    if (payload.defaults?.[key] !== undefined && (typeof payload.defaults[key] !== 'object' || Array.isArray(payload.defaults[key]))) throw new Error(`${key} must be an object.`);
  }
  const ranges = { temperatureBaselineF: [-40, 130], panelSystemEfficiencyPct: [1, 100], alternatorEfficiencyPct: [1, 100], inverterEfficiencyPct: [1, 100], inverterIdleWatts: [0, 1000], baseSunHours: [0, 12], ledWatts: [0, 5000], halogenWatts: [0, 5000], fridgeDutyFactor: [0, 1], fridgeReferenceAmbientF: [-40, 130], fridgeClimateLookbackYears: [3, 30], fridgeDayWeight: [0, 1], fridgeWarmSlope: [0, 0.1], fridgeCoolSlope: [0, 0.1] };
  for (const [key, bounds] of Object.entries(ranges)) if (payload.assumptions?.[key] != null) finite(payload.assumptions[key], ...bounds, `assumptions.${key}`);
  for (const [key, value] of Object.entries(payload.assumptions?.exposureMultipliers ?? {})) finite(value, 0, 1.2, `exposureMultipliers.${key}`);
  for (const [key, tiers] of Object.entries(payload.componentTiers ?? {})) {
    if (!Array.isArray(tiers) || !tiers.length || tiers.length > 100) throw new Error(`${key} must contain component sizes.`);
    tiers.forEach(value => finite(value, 1, 100000, key));
  }
  const rules = {
    solar: { watts: [0, 20000], efficiencyPct: [1, 100] },
    alternator: { powerWatts: [0, 20000], driveHoursDay: [0, 24] },
    fridge: { averageTempF: [-40, 130] },
    battery: { autonomyDays: [1, 30], installedAh: [1, 20000], voltage: [12, 24] },
    trip: { days: [1, 30], startSocPct: [0, 100], reservePct: [0, 99], batteryTempF: [-40, 130], healthPct: [10, 100], nominalVoltage: [1, 60], chargeVoltage: [1, 60], maxChargeAmps: [0, 1000], maxDischargeAmps: [0, 2000], chargeCutoffF: [-40, 130], daylightHours: [1, 24], inverterOnHours: [0, 24], shoreAmps: [0, 200], roofSolarMax: [0, 20000] }
  };
  for (const [section, fields] of Object.entries(rules)) for (const [key, bounds] of Object.entries(fields)) {
    if (payload.defaults?.[section]?.[key] !== undefined) finite(payload.defaults[section][key], ...bounds, `${section}.${key}`);
  }
  if (payload.defaults?.battery?.chemistry !== undefined && !['lifepo4', 'agm', 'nmc'].includes(payload.defaults.battery.chemistry)) throw new Error('Unknown battery chemistry.');
  if (payload.defaults?.battery?.voltage !== undefined && ![12, 24].includes(payload.defaults.battery.voltage)) throw new Error('Bank voltage must be 12 or 24.');
  if (payload.defaults?.trip?.days !== undefined && !Number.isInteger(payload.defaults.trip.days)) throw new Error('Trip days must be a whole number.');
  for (const section of ['solar', 'alternator', 'fridge']) {
    const config = payload.defaults?.[section];
    if (config?.enabled !== undefined && typeof config.enabled !== 'boolean') throw new Error(`${section}.enabled must be true or false.`);
    if (config?.precision) {
      for (const [key, bounds] of Object.entries({ month: [1, 12], lat: [-85, 85], lon: [-180, 180], elevationFt: [-1500, 20000] })) if (config.precision[key] !== undefined) finite(config.precision[key], ...bounds, `${section}.precision.${key}`);
      if (config.precision.month !== undefined && !Number.isInteger(config.precision.month)) throw new Error('Month must be a whole number.');
      for (const key of ['enabled', 'hasPinned']) if (config.precision[key] !== undefined && typeof config.precision[key] !== 'boolean') throw new Error(`${section}.precision.${key} must be true or false.`);
    }
  }
  const validateLoad = (load, name) => {
    if (!load || typeof load !== 'object' || Array.isArray(load)) throw new Error(`${name} must be an appliance.`);
    if (load.enabled !== undefined && typeof load.enabled !== 'boolean') throw new Error(`${name}.enabled must be true or false.`);
    for (const [key, bounds] of Object.entries({ hours: [0, 24], customWatts: [0, 20000], watts: [0, 20000], measuredWh: [0, 100000], quantity: [1, 20], startHour: [0, 23], surgeWatts: [0, 30000], customDutyFactor: [0, 1] })) if (load[key] != null) finite(load[key], ...bounds, `${name}.${key}`);
    if (load.powerPath != null && !['ac', 'dc', 'usb'].includes(load.powerPath)) throw new Error(`${name}.powerPath must be AC, DC, or USB.`);
    for (const key of ['quantity', 'startHour']) if (load[key] != null && !Number.isInteger(load[key])) throw new Error(`${name}.${key} must be a whole number.`);
  };
  for (const [id, load] of Object.entries(payload.defaults?.loads ?? {})) validateLoad(load, id);
  const custom = payload.defaults?.customLoads ?? [];
  if (!Array.isArray(custom) || custom.length > 30) throw new Error('Use at most 30 custom appliances.');
  const ids = new Set();
  for (const load of custom) {
    validateLoad(load, 'Custom appliance');
    if (typeof load.id !== 'string' || !/^custom-[a-z0-9-]+$/.test(load.id) || ids.has(load.id)) throw new Error('Custom appliance IDs must be unique.');
    ids.add(load.id);
    if (typeof load.name !== 'string' || !load.name.trim() || load.name.length > 80) throw new Error('Custom appliances need a name of up to 80 characters.');
  }
  if (payload.defaults?.trip?.schedule !== undefined && (!Array.isArray(payload.defaults.trip.schedule) || payload.defaults.trip.schedule.length > 30)) throw new Error('Trip schedule must contain at most 30 days.');
  for (const day of payload.defaults?.trip?.schedule ?? []) {
    for (const [key, bounds] of Object.entries({ solarFactor: [0, 1.2], driveHours: [0, 24], shoreHours: [0, 24], driveStartHour: [0, 23], shoreStartHour: [0, 23] })) finite(day[key], ...bounds, `Trip day ${key}`);
  }
  if (payload.componentMode != null && !['auto', 'manual'].includes(payload.componentMode)) throw new Error('Invalid component mode.');
  for (const [key, value] of Object.entries(payload.manualComponents ?? {})) if (value !== 'auto') finite(value, key === 'batteryAh' ? 1 : 0, 20000, key);
  return payload;
}
