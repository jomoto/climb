import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLoadProfile, simulateTrip, sizeBatteryForTrip, pickSize, temperatureCapacity, solarProfile, validateSettings } from '../model.js';

const config = {
  batteryAh: 100, nominalVoltage: 12.8, chargeVoltage: 14.2, chemistry: 'lifepo4', dod: 0.9,
  batteryTempF: 77, healthPct: 100, startSocPct: 90, reservePct: 20,
  solarWatts: 0, solarChargerAmps: 30, alternatorWatts: 0, shoreAmps: 0,
  sunHours: 4.8, solarEfficiency: 0.75, daylightHours: 12, maxChargeAmps: 100, chargeCutoffF: 41
};
const days = (n = 7, overrides = {}) => Array.from({ length: n }, () => ({ solarFactor: 1, driveHours: 0, driveStartHour: 10, shoreHours: 0, shoreStartHour: 18, ...overrides }));
const load = (overrides = {}) => ({ id: 'light', name: 'Light', enabled: true, watts: 12, hours: 4, startHour: 18, powerPath: 'dc', ...overrides });
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);

test('fractional runtime, quantity, duty, and a midnight-spanning load conserve energy', () => {
  const profile = buildLoadProfile([load({ watts: 80, hours: 2.25, quantity: 2, dutyFactor: 0.5, startHour: 23 })], { inverterIdleWatts: 0 });
  close(profile.dailyWh, 180);
  close(profile.hourlyWh[23], 80); close(profile.hourlyWh[0], 80); close(profile.hourlyWh[1], 20);
});
test('measured daily energy overrides nameplate energy and still includes conversion losses', () => {
  const profile = buildLoadProfile([load({ watts: 100, measuredWh: 200, powerPath: 'ac' })], { inverterEfficiency: 0.8, inverterIdleWatts: 0 });
  close(profile.dailyWh, 250); close(profile.entries[0].wh, 200);
});
test('inverter idle time is the union of separate AC schedules', () => {
  const profile = buildLoadProfile([load({ powerPath: 'ac', startHour: 8 }), load({ id: 'second', powerPath: 'ac', startHour: 18 })], { inverterEfficiency: 1, inverterIdleWatts: 10 });
  close(profile.dailyWh, 176);
});
test('peak sizing follows overlap and quantities, independent of average duty', () => {
  const a = load({ watts: 100, surgeWatts: 300, quantity: 2, dutyFactor: 0.2, powerPath: 'ac', startHour: 8 });
  const b = load({ id: 'b', watts: 500, powerPath: 'ac', startHour: 18 });
  assert.equal(buildLoadProfile([a, b]).peakAcWatts, 600);
  assert.equal(buildLoadProfile([a, { ...b, startHour: 8 }]).peakAcWatts, 1100);
});
test('battery tier overflow never returns an undersized component', () => {
  assert.deepEqual(pickSize(5000, [600, 2000, 4000]), { value: 5000, required: 5000, exceeds: true });
  assert.equal(pickSize(140.2, [100, 200]).value, 200);
  assert.equal(pickSize(0, [100, 200]).value, 0);
});
test('temperature curve is continuous through freezing', () => {
  close(temperatureCapacity(32), 0.8);
  assert.ok(Math.abs(temperatureCapacity(32.001) - temperatureCapacity(31.999)) < 0.0001);
});
test('a night-only load requires storage even with a positive daily solar balance', () => {
  const profile = buildLoadProfile([load({ watts: 200, startHour: 20 })]);
  const system = { ...config, batteryAh: 10, solarWatts: 1000, solarChargerAmps: 100 };
  assert.equal(simulateTrip(system, profile, days()).passes, false);
  const size = sizeBatteryForTrip(system, profile, days());
  assert.ok(size.value > 10); assert.equal(simulateTrip({ ...system, batteryAh: size.value }, profile, days()).passes, true);
});
test('driving on a later day cannot rescue an earlier reserve failure', () => {
  const profile = buildLoadProfile([load({ watts: 200, hours: 8, startHour: 18 })]);
  const schedule = days(3); schedule[2].driveHours = 4;
  const trip = simulateTrip({ ...config, alternatorWatts: 700 }, profile, schedule);
  assert.ok(trip.firstReserveHour < 48);
});
test('charging events crossing midnight carry forward, never backward to departure', () => {
  const profile = buildLoadProfile([]);
  const schedule = days(2); schedule[0].driveHours = 2; schedule[0].driveStartHour = 23;
  const trip = simulateTrip({ ...config, alternatorWatts: 100 }, profile, schedule);
  close(trip.daily[0].alternatorWh, 100); close(trip.daily[1].alternatorWh, 100);
  close(trip.samples[1].socPct, 90);
});
test('cold charging lockout prevents modeled solar, alternator, and shore recharge', () => {
  const trip = simulateTrip({ ...config, batteryTempF: 32, solarWatts: 500, alternatorWatts: 700, shoreAmps: 30 }, buildLoadProfile([load()]), days(1, { driveHours: 2, shoreHours: 4 }));
  assert.equal(trip.chargeAllowed, false);
  assert.equal(trip.daily[0].solarWh + trip.daily[0].alternatorWh + trip.daily[0].shoreWh, 0);
});
test('full batteries clip generation and current limits cap charge acceptance', () => {
  const trip = simulateTrip({ ...config, batteryAh: 10, startSocPct: 100, solarWatts: 1000 }, buildLoadProfile([]), days(1));
  assert.ok(trip.curtailedWh > 0); close(trip.storedWh, trip.capacityWh);
  assert.ok(trip.samples.every(sample => sample.socPct <= 100));
  const limited = simulateTrip({ ...config, startSocPct: 0, alternatorWatts: 1000, maxChargeAmps: 1 }, buildLoadProfile([]), days(1, { driveHours: 1 }));
  close(limited.daily[0].acceptedWh, 14.2 * 0.98);
});
test('MPPT output limit is applied and no MPPT means no solar', () => {
  const profile = buildLoadProfile([]);
  assert.equal(simulateTrip({ ...config, solarWatts: 500, solarChargerAmps: 0 }, profile, days(1)).daily[0].solarWh, 0);
  const trip = simulateTrip({ ...config, solarWatts: 5000, solarChargerAmps: 1 }, profile, days(1));
  assert.ok(trip.daily[0].solarWh <= 14.2 * 12);
});
test('zero irradiation and zero loads are valid', () => {
  assert.ok(solarProfile(0).every(value => value === 0));
  assert.equal(simulateTrip(config, buildLoadProfile([]), days()).passes, true);
  assert.deepEqual(sizeBatteryForTrip(config, buildLoadProfile([]), days()), { value: 0, possible: true });
});
test('starting below reserve is a failure even with no consumption', () => {
  assert.equal(simulateTrip({ ...config, startSocPct: 10 }, buildLoadProfile([]), days()).firstReserveHour, 0);
});
test('chemistry reserve floors and starting state are included', () => {
  const trip = simulateTrip({ ...config, chemistry: 'agm', dod: 0.5 }, buildLoadProfile([load()]), days(1));
  assert.equal(trip.reservePct, 50);
  assert.deepEqual(sizeBatteryForTrip({ ...config, startSocPct: 20 }, buildLoadProfile([load()]), days()), { value: null, possible: false });
});
test('equivalent energy at 12.8 and 25.6 V gives equivalent no-charge runtime', () => {
  const profile = buildLoadProfile([load()]);
  const a = simulateTrip(config, profile, days());
  const b = simulateTrip({ ...config, nominalVoltage: 25.6, batteryAh: 50 }, profile, days());
  close(a.minimumSocPct, b.minimumSocPct);
});
test('energy is conserved across varied charge, weather, and battery conditions', () => {
  for (let i = 0; i < 50; i++) {
    const system = { ...config, batteryAh: 20 + i * 7, solarWatts: i * 30, alternatorWatts: i * 10, startSocPct: i * 2, maxChargeAmps: i };
    const profile = buildLoadProfile([load({ watts: 100 + i, hours: 8 })]);
    const trip = simulateTrip(system, profile, days(3, { solarFactor: i / 50, driveHours: 1.25 }));
    const generated = trip.daily.reduce((sum, day) => sum + day.solarWh + day.alternatorWh + day.shoreWh, 0);
    const initial = trip.capacityWh * system.startSocPct / 100;
    close(initial + generated + trip.unservedWh, trip.storedWh + profile.dailyWh * 3 + trip.curtailedWh + trip.chargeLossWh);
  }
});
test('settings reject missing, nonfinite, out-of-range, and wrong-type values', () => {
  for (const value of [null, 'oops', NaN, Infinity, -1, 2]) assert.throws(() => validateSettings({ assumptions: { fridgeDutyFactor: value } }));
  assert.throws(() => validateSettings({ defaults: { battery: { installedAh: null } } }));
  assert.throws(() => validateSettings({ defaults: { trip: { nominalVoltage: 0 } } }));
  assert.throws(() => validateSettings({ defaults: { solar: { enabled: 'false' } } }));
  assert.throws(() => validateSettings({ defaults: { trip: { days: 1.2 } } }));
  assert.throws(() => validateSettings({ defaults: [] }));
});
test('settings permit zero generation and nullable measured/custom power overrides', () => {
  const plan = { version: 2, assumptions: { baseSunHours: 0 }, defaults: { solar: { watts: 0 }, loads: { fridge: { customWatts: null, measuredWh: null, customDutyFactor: null } } } };
  assert.equal(validateSettings(plan), plan);
});
test('unsupported versions and duplicate custom IDs are rejected', () => {
  assert.throws(() => validateSettings({ version: 3 }));
  assert.throws(() => validateSettings({ defaults: { customLoads: [{ id: 'custom-a', name: 'A' }, { id: 'custom-a', name: 'B' }] } }));
});
